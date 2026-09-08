import json
import os
import sys
import tempfile
import time
from datetime import datetime, timedelta, timezone

from mt5_chart import render_mt5_chart
from mt5_bridge_contract import collect_symbol_infos


ID_FIELDS = {
    "ticket",
    "order",
    "position_id",
    "position_by_id",
    "identifier",
    "magic",
    "login",
}
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

LOCK_PATH = os.path.join(tempfile.gettempdir(), "tradivix-mt5-bridge.lock")
LOCK_WAIT_SECONDS = 60
LOCK_STALE_SECONDS = 180


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True, separators=(",", ":")))
    sys.stdout.flush()


def parse_datetime(value):
    if not value:
        return None
    parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def serialize_tuple(value):
    if value is None:
        return None
    data = value._asdict()
    serialized = {}
    for key, item in data.items():
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


def safe_error(code, message):
    return {
        "ok": False,
        "errorCode": code,
        "error": message,
    }


def to_mt5_server_time(value):
    return value + timedelta(hours=MT5_TIME_OFFSET_HOURS) if value else None


def acquire_terminal_lock():
    deadline = time.monotonic() + LOCK_WAIT_SECONDS
    while time.monotonic() < deadline:
        try:
            descriptor = os.open(LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(descriptor, f"{os.getpid()} {time.time()}".encode("ascii"))
            os.close(descriptor)
            return True
        except FileExistsError:
            try:
                if time.time() - os.path.getmtime(LOCK_PATH) > LOCK_STALE_SECONDS:
                    os.remove(LOCK_PATH)
                    continue
            except FileNotFoundError:
                continue
            time.sleep(0.25)
    return False


def release_terminal_lock():
    try:
        os.remove(LOCK_PATH)
    except FileNotFoundError:
        pass


def main():
    try:
        request = json.loads(sys.stdin.read() or "{}")
    except json.JSONDecodeError:
        emit(safe_error("INVALID_INPUT", "Bridge input is not valid JSON."))
        return 2

    operation = str(request.get("operation") or "snapshot")
    terminal_path = str(request.get("terminalPath") or "").strip()
    login = str(request.get("login") or "").strip()
    password = str(request.get("password") or "")
    server = str(request.get("server") or "").strip()

    if not terminal_path or not login or not password or not server:
        emit(safe_error("MISSING_CONFIGURATION", "Terminal path, server, login and password are required."))
        return 2

    try:
        import MetaTrader5 as mt5
    except ImportError:
        emit(safe_error("MT5_PACKAGE_MISSING", "The MetaTrader5 Python package is not installed."))
        return 3

    try:
        numeric_login = int(login)
    except ValueError:
        emit(safe_error("INVALID_LOGIN", "The MetaTrader login must be numeric."))
        return 2

    initialized = False
    locked = acquire_terminal_lock()
    if not locked:
        emit(safe_error("MT5_TERMINAL_BUSY", "The MT5 terminal is busy with another synchronization."))
        return 9

    try:
        initialized = bool(
            mt5.initialize(
                terminal_path,
                timeout=10000,
            )
        )
        if not initialized:
            error = mt5.last_error()
            emit(safe_error("MT5_INITIALIZE_FAILED", f"MetaTrader initialization failed ({error[0]}): {error[1]}"))
            return 4

        account = mt5.account_info()
        account_matches = (
            account is not None
            and int(account.login) == numeric_login
            and str(account.server).casefold() == server.casefold()
        )

        if not account_matches:
            authorized = bool(
                mt5.login(
                    numeric_login,
                    password=password,
                    server=server,
                    timeout=10000,
                )
            )
            account = mt5.account_info()
        else:
            authorized = True

        if not authorized:
            account_matches = (
                account is not None
                and int(account.login) == numeric_login
                and str(account.server).casefold() == server.casefold()
            )
            if not account_matches:
                error = mt5.last_error()
                emit(safe_error("MT5_AUTH_FAILED", f"MetaTrader account authorization failed ({error[0]}): {error[1]}"))
                return 5

        terminal = mt5.terminal_info()
        if account is None or terminal is None or not terminal.connected:
            error = mt5.last_error()
            emit(safe_error("MT5_NOT_CONNECTED", f"MetaTrader could not establish a broker connection ({error[0]}): {error[1]}"))
            return 5

        response = {
            "ok": True,
            "account": serialize_tuple(account),
            "terminal": serialize_tuple(terminal),
            "positions": [],
            "orders": [],
            "deals": [],
            "historyOrders": [],
            "symbols": [],
        }

        deals = []
        history_orders = []
        positions = mt5.positions_get()
        if positions is None:
            error = mt5.last_error()
            emit(safe_error("POSITIONS_FAILED", f"Could not read open positions ({error[0]}): {error[1]}"))
            return 6
        response["positions"] = [serialize_tuple(position) for position in positions]
        orders = mt5.orders_get()
        if orders is None:
            error = mt5.last_error()
            emit(safe_error("ORDERS_FAILED", f"Could not read pending orders ({error[0]}): {error[1]}"))
            return 6
        response["orders"] = [serialize_tuple(order) for order in orders]

        if operation == "chart":
            try:
                response["chart"] = render_mt5_chart(mt5, request)
            except Exception as error:
                emit(safe_error("CHART_CAPTURE_FAILED", f"Could not render MT5 chart: {error}"))
                return 10

        if operation == "sync":
            date_from = to_mt5_server_time(parse_datetime(request.get("from")))
            date_to = to_mt5_server_time(parse_datetime(request.get("to")))
            if date_from is None or date_to is None or date_from >= date_to:
                emit(safe_error("INVALID_RANGE", "A valid synchronization date range is required."))
                return 2

            deals = mt5.history_deals_get(date_from, date_to)
            if deals is None:
                error = mt5.last_error()
                emit(safe_error("HISTORY_FAILED", f"Could not read trading history ({error[0]}): {error[1]}"))
                return 7
            response["deals"] = [serialize_tuple(deal) for deal in deals]
            history_orders = mt5.history_orders_get(date_from, date_to)
            if history_orders is None:
                error = mt5.last_error()
                emit(safe_error("ORDER_HISTORY_FAILED", f"Could not read order history ({error[0]}): {error[1]}"))
                return 7
            response["historyOrders"] = [serialize_tuple(order) for order in history_orders]

        response["symbols"] = [
            serialize_tuple(info)
            for info in collect_symbol_infos(mt5, positions, orders, deals, history_orders)
        ]

        emit(response)
        return 0
    except Exception as error:
        emit(safe_error("BRIDGE_FAILURE", f"MT5 bridge failed: {type(error).__name__}: {error}"))
        return 8
    finally:
        if initialized:
            mt5.shutdown()
        release_terminal_lock()


if __name__ == "__main__":
    sys.exit(main())
