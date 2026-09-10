import ctypes
import json
import os
import time
from ctypes import wintypes
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

import MetaTrader5 as mt5
from mt5_chart import render_mt5_chart
from mt5_bridge_contract import collect_symbol_infos


ID_FIELDS = {"ticket", "order", "position_id", "position_by_id", "identifier", "magic", "login"}
HOST = "127.0.0.1"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_local_env():
    path = os.path.join(ROOT, ".env")
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8-sig") as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            name, value = line.split("=", 1)
            os.environ.setdefault(name.strip(), value.strip())


load_local_env()
PORT = int(os.environ.get("MT5_BRIDGE_PORT", "8765"))
BRIDGE_SECRET = os.environ.get("MT5_BRIDGE_SECRET", "")
AUTH_WAIT_SECONDS = 30
MT5_TIME_OFFSET_HOURS = float(os.environ.get("MT5_TIME_OFFSET_HOURS", "0"))
MT5_TIME_OFFSET_SECONDS = int(MT5_TIME_OFFSET_HOURS * 60 * 60)
SECOND_TIME_FIELDS = {
    "time",
    "time_update",
    "time_setup",
    "time_done",
    "time_expiration",
}
MILLISECOND_TIME_FIELDS = {
    "time_msc",
    "time_update_msc",
    "time_setup_msc",
    "time_done_msc",
}


def serialize_tuple(value):
    if value is None:
        return None
    serialized = {}
    for key, item in value._asdict().items():
        if key in ID_FIELDS:
            serialized[key] = str(item)
        elif key in SECOND_TIME_FIELDS and isinstance(item, (int, float)) and item:
            serialized[key] = item - MT5_TIME_OFFSET_SECONDS
        elif key in MILLISECOND_TIME_FIELDS and isinstance(item, (int, float)) and item:
            serialized[key] = item - MT5_TIME_OFFSET_SECONDS * 1000
        elif isinstance(item, datetime):
            serialized[key] = item.astimezone(timezone.utc).isoformat()
        else:
            serialized[key] = item
    return serialized


def parse_datetime(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def to_mt5_server_time(value):
    return value + timedelta(hours=MT5_TIME_OFFSET_HOURS) if value else None


def failure(code, message):
    return {"ok": False, "errorCode": code, "error": message}


TH32CS_SNAPPROCESS = 0x00000002
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value


class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", wintypes.DWORD),
        ("cntUsage", wintypes.DWORD),
        ("th32ProcessID", wintypes.DWORD),
        ("th32DefaultHeapID", ctypes.c_size_t),
        ("th32ModuleID", wintypes.DWORD),
        ("cntThreads", wintypes.DWORD),
        ("th32ParentProcessID", wintypes.DWORD),
        ("pcPriClassBase", wintypes.LONG),
        ("dwFlags", wintypes.DWORD),
        ("szExeFile", wintypes.WCHAR * 260),
    ]


def normalized_windows_path(path):
    return os.path.normcase(os.path.abspath(path))


def terminal_process_is_running(terminal_path):
    """Return True only when the configured terminal executable is already running.

    This check intentionally happens before calling MetaTrader5.initialize because
    initialize launches the terminal when it cannot find a running instance.
    """
    if os.name != "nt" or not terminal_path:
        return False

    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel32.CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
    kernel32.CreateToolhelp32Snapshot.restype = wintypes.HANDLE
    kernel32.Process32FirstW.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32W)]
    kernel32.Process32FirstW.restype = wintypes.BOOL
    kernel32.Process32NextW.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32W)]
    kernel32.Process32NextW.restype = wintypes.BOOL
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
    kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
    kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel32.CloseHandle.restype = wintypes.BOOL

    target_path = normalized_windows_path(terminal_path)
    target_name = os.path.basename(target_path).casefold()
    snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snapshot == INVALID_HANDLE_VALUE:
        return False

    try:
        entry = PROCESSENTRY32W()
        entry.dwSize = ctypes.sizeof(PROCESSENTRY32W)
        has_process = bool(kernel32.Process32FirstW(snapshot, ctypes.byref(entry)))
        while has_process:
            if entry.szExeFile.casefold() == target_name:
                process = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, entry.th32ProcessID)
                if process:
                    try:
                        size = wintypes.DWORD(32768)
                        buffer = ctypes.create_unicode_buffer(size.value)
                        if kernel32.QueryFullProcessImageNameW(process, 0, buffer, ctypes.byref(size)):
                            if normalized_windows_path(buffer.value) == target_path:
                                return True
                    finally:
                        kernel32.CloseHandle(process)
            has_process = bool(kernel32.Process32NextW(snapshot, ctypes.byref(entry)))
    finally:
        kernel32.CloseHandle(snapshot)

    return False


class TerminalSession:
    def __init__(self):
        self.initialized = False
        self.terminal_path = None

    def refresh_process_state(self):
        if self.initialized and self.terminal_path and not terminal_process_is_running(self.terminal_path):
            mt5.shutdown()
            self.initialized = False

    def ensure_initialized(self, terminal_path, numeric_login, password, server):
        if not terminal_process_is_running(terminal_path):
            if self.initialized:
                mt5.shutdown()
            self.initialized = False
            self.terminal_path = terminal_path
            return False

        if self.initialized and self.terminal_path == terminal_path:
            return True

        if self.initialized:
            mt5.shutdown()
            self.initialized = False

        self.initialized = bool(mt5.initialize(terminal_path, timeout=30000))
        self.terminal_path = terminal_path
        return self.initialized

    def connected_account(self, numeric_login, server):
        terminal = mt5.terminal_info()
        account = mt5.account_info()
        if (
            terminal is not None
            and bool(terminal.connected)
            and account is not None
            and int(account.login) == numeric_login
            and str(account.server).casefold() == server.casefold()
        ):
            return account
        return None

    def wait_for_connection(self, numeric_login, server, timeout=AUTH_WAIT_SECONDS):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            account = self.connected_account(numeric_login, server)
            if account is not None:
                return account
            time.sleep(0.5)
        return None

    def authorize(self, terminal_path, numeric_login, password, server):
        account = self.connected_account(numeric_login, server)
        if account is not None:
            return account

        mt5.login(
            numeric_login,
            password=password,
            server=server,
            timeout=15000,
        )
        account = self.wait_for_connection(numeric_login, server, timeout=5)
        if account is not None:
            return account

        return None

    def execute(self, request):
        operation = str(request.get("operation") or "snapshot")
        terminal_path = str(request.get("terminalPath") or "").strip()
        login = str(request.get("login") or "").strip()
        password = str(request.get("password") or "")
        server = str(request.get("server") or "").strip()

        if not terminal_path or not login or not password or not server:
            return failure("MISSING_CONFIGURATION", "Terminal path, server, login and password are required.")
        if any("\r" in value or "\n" in value for value in (login, password, server)):
            return failure("INVALID_CONFIGURATION", "MT5 connection values contain invalid characters.")
        try:
            numeric_login = int(login)
        except ValueError:
            return failure("INVALID_LOGIN", "The MetaTrader login must be numeric.")

        if not self.ensure_initialized(terminal_path, numeric_login, password, server):
            if not terminal_process_is_running(terminal_path):
                return failure(
                    "MT5_TERMINAL_CLOSED",
                    "MetaTrader is closed. Start the configured terminal manually to resume synchronization.",
                )
            error = mt5.last_error()
            return failure("MT5_INITIALIZE_FAILED", f"MetaTrader initialization failed ({error[0]}): {error[1]}")

        account = self.authorize(terminal_path, numeric_login, password, server)
        if account is None:
            error = mt5.last_error()
            return failure(
                "MT5_NOT_CONNECTED",
                f"MetaTrader could not establish a broker connection ({error[0]}): {error[1]}",
            )

        positions = mt5.positions_get()
        if positions is None:
            error = mt5.last_error()
            return failure("POSITIONS_FAILED", f"Could not read open positions ({error[0]}): {error[1]}")
        orders = mt5.orders_get()
        if orders is None:
            error = mt5.last_error()
            return failure("ORDERS_FAILED", f"Could not read pending orders ({error[0]}): {error[1]}")

        deals = []
        history_orders = []
        response = {
            "ok": True,
            "account": serialize_tuple(account),
            "terminal": serialize_tuple(mt5.terminal_info()),
            "positions": [serialize_tuple(position) for position in positions],
            "orders": [serialize_tuple(order) for order in orders],
            "deals": [],
            "historyOrders": [],
            "symbols": [],
        }

        if operation == "chart":
            try:
                response["chart"] = render_mt5_chart(mt5, request)
            except Exception as error:
                return failure("CHART_CAPTURE_FAILED", f"Could not render MT5 chart: {error}")

        if operation == "sync":
            date_from = to_mt5_server_time(parse_datetime(request.get("from")))
            date_to = to_mt5_server_time(parse_datetime(request.get("to")))
            if date_from is None or date_to is None or date_from >= date_to:
                return failure("INVALID_RANGE", "A valid synchronization date range is required.")
            deals = mt5.history_deals_get(date_from, date_to)
            if deals is None:
                error = mt5.last_error()
                return failure("HISTORY_FAILED", f"Could not read trading history ({error[0]}): {error[1]}")
            history_orders = mt5.history_orders_get(date_from, date_to)
            if history_orders is None:
                error = mt5.last_error()
                return failure("ORDER_HISTORY_FAILED", f"Could not read order history ({error[0]}): {error[1]}")
            response["deals"] = [serialize_tuple(deal) for deal in deals]
            response["historyOrders"] = [serialize_tuple(order) for order in history_orders]

        response["symbols"] = [
            serialize_tuple(info)
            for info in collect_symbol_infos(mt5, positions, orders, deals, history_orders)
        ]

        return response


SESSION = TerminalSession()


class BridgeHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        return

    def send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=True, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            SESSION.refresh_process_state()
            terminal = mt5.terminal_info() if SESSION.initialized else None
            self.send_json(
                200,
                {
                    "ok": True,
                    "initialized": SESSION.initialized,
                    "connected": bool(terminal and terminal.connected),
                },
            )
            return
        self.send_json(404, failure("NOT_FOUND", "Not found"))

    def do_POST(self):
        if self.path != "/bridge":
            self.send_json(404, failure("NOT_FOUND", "Not found"))
            return
        if BRIDGE_SECRET and self.headers.get("X-MT5-Bridge-Secret") != BRIDGE_SECRET:
            self.send_json(401, failure("UNAUTHORIZED", "Unauthorized"))
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 50 * 1024 * 1024:
                self.send_json(400, failure("INVALID_INPUT", "Invalid request size"))
                return
            request = json.loads(self.rfile.read(length).decode("utf-8"))
            self.send_json(200, SESSION.execute(request))
        except Exception as error:
            self.send_json(500, failure("BRIDGE_FAILURE", f"MT5 bridge failed: {type(error).__name__}: {error}"))


if __name__ == "__main__":
    server = HTTPServer((HOST, PORT), BridgeHandler)
    print(json.dumps({"event": "mt5_bridge_started", "host": HOST, "port": PORT}), flush=True)
    try:
        server.serve_forever()
    finally:
        mt5.shutdown()
