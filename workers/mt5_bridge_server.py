import json
import os
import subprocess
import tempfile
import time
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
TERMINAL_START_SECONDS = 10
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


def secure_remove(path):
    if not path:
        return
    try:
        size = os.path.getsize(path)
        with open(path, "r+b") as config_file:
            config_file.write(b"\x00" * size)
            config_file.flush()
            os.fsync(config_file.fileno())
    except OSError:
        pass
    try:
        os.remove(path)
    except OSError:
        pass


def create_startup_config(login, password, server):
    descriptor, path = tempfile.mkstemp(prefix="tradivix-mt5-", suffix=".ini")
    config = (
        "[Common]\r\n"
        f"Login={login}\r\n"
        f"Password={password}\r\n"
        f"Server={server}\r\n"
        "KeepPrivate=0\r\n"
        "ProxyEnable=0\r\n"
        "CertInstall=0\r\n"
        "NewsEnable=0\r\n"
        "[Experts]\r\n"
        "Enabled=1\r\n"
        "AllowLiveTrading=0\r\n"
        "AllowDllImport=0\r\n"
        "Api=1\r\n"
    )
    with os.fdopen(descriptor, "w", encoding="utf-16", newline="") as config_file:
        config_file.write(config)
        config_file.flush()
        os.fsync(config_file.fileno())
    os.chmod(path, 0o600)
    return path


class TerminalSession:
    def __init__(self):
        self.initialized = False
        self.terminal_path = None

    def restart_terminal(self, terminal_path, login=None, password=None, server=None):
        if self.initialized:
            mt5.shutdown()
            self.initialized = False

        subprocess.run(
            ["taskkill", "/IM", "terminal64.exe", "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        config_path = None
        command = [terminal_path]
        try:
            if login is not None and password is not None and server is not None:
                config_path = create_startup_config(login, password, server)
                command.append(f"/config:{config_path}")
            subprocess.Popen(
                command,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                close_fds=True,
                creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
            )
            time.sleep(TERMINAL_START_SECONDS)
        finally:
            secure_remove(config_path)

    def ensure_initialized(self, terminal_path, numeric_login, password, server):
        if self.initialized and self.terminal_path == terminal_path:
            return True

        if self.initialized:
            mt5.shutdown()
            self.initialized = False

        self.initialized = bool(mt5.initialize(terminal_path, timeout=30000))
        self.terminal_path = terminal_path
        if self.initialized:
            return True

        # A fresh terminal must receive the account configuration on startup.
        # Starting it without credentials leaves the terminal offline and the
        # MetaTrader Python IPC handshake can time out indefinitely on retries.
        self.restart_terminal(terminal_path, numeric_login, password, server)
        self.initialized = bool(mt5.initialize(terminal_path, timeout=30000))
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

        self.restart_terminal(terminal_path, numeric_login, password, server)
        self.initialized = bool(mt5.initialize(terminal_path, timeout=30000))
        self.terminal_path = terminal_path
        if not self.initialized:
            return None
        return self.wait_for_connection(numeric_login, server)

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
