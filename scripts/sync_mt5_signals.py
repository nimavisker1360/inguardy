import argparse
import os
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import matplotlib

matplotlib.use("Agg")

import MetaTrader5 as mt5
import mplfinance as mpf
import pandas as pd
import psycopg2
import psycopg2.extras
import requests
from pymongo import MongoClient
from uuid import uuid4

DEFAULT_INTERVAL_SECONDS = 5
DEFAULT_MT5_TIME_OFFSET_HOURS = 3
DEFAULT_TIMEFRAME = "M1"
PRICE_MATCH_TOLERANCE = 0.00001

MT5_TIMEFRAMES = {
    "M1": mt5.TIMEFRAME_M1,
    "M5": mt5.TIMEFRAME_M5,
    "M15": mt5.TIMEFRAME_M15,
    "M30": mt5.TIMEFRAME_M30,
    "H1": mt5.TIMEFRAME_H1,
    "H4": mt5.TIMEFRAME_H4,
    "D1": mt5.TIMEFRAME_D1,
}


class UpdateResult:
    def __init__(self, modified_count=0, upserted_id=None):
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class SignalRows(list):
    def sort(self, field=None, direction=1):
        if field is None:
            super().sort()
            return self

        reverse = int(direction) < 0
        super().sort(key=lambda row: row.get(field) or datetime.min, reverse=reverse)
        return self


class PostgresSignalStore:
    def __init__(self, database_url):
        self.connection = psycopg2.connect(database_url)
        self.connection.autocommit = True

    def close(self):
        self.connection.close()

    def _row_to_signal(self, row):
        if not row:
            return None

        signal = dict(row)
        signal["_id"] = signal["id"]
        signal["type"] = signal["direction"]
        signal["sl"] = float(signal["stopLoss"] or 0)
        signal["tp"] = float(signal["takeProfit"] or 0)
        signal["entry"] = float(signal["entry"] or 0)
        signal["closePrice"] = (
            float(signal["closePrice"]) if signal.get("closePrice") is not None else None
        )
        return signal

    def _select(self, where_sql, params=(), order_sql=""):
        sql = f'''
            SELECT
                "id", "symbol", "direction", "entry", "stopLoss", "takeProfit",
                "timeframe", "source", "status", "ticket", "closeReason",
                "closePrice", "resultSource", "createdAt", "closedAt"
            FROM "WebsiteSignal"
            WHERE {where_sql}
            {order_sql}
        '''
        with self.connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(sql, params)
            return SignalRows(
                self._row_to_signal(row)
                for row in cursor.fetchall()
                if row is not None
            )

    def find_one(self, query, projection=None):
        if "ticket" in query:
            rows = self._select('"ticket" = %s', (str(query["ticket"]),), 'LIMIT 1')
            return rows[0] if rows else None

        if "_id" in query:
            rows = self._select('"id" = %s', (str(query["_id"]),), 'LIMIT 1')
            return rows[0] if rows else None

        raise NotImplementedError(f"Unsupported find_one query: {query}")

    def find(self, query, projection=None):
        if (
            query.get("source") == "MT5_BOT"
            and query.get("status") == "OPEN"
            and query.get("ticket") == {"$exists": False}
        ):
            return self._select(
                '"source" = %s AND "status" = %s::"WebsiteSignalStatus" '
                'AND ("ticket" IS NULL OR "ticket" = %s) '
                'AND "symbol" = %s AND "direction" = %s::"WebsiteSignalDirection"',
                (
                    "MT5_BOT",
                    "OPEN",
                    "",
                    query["symbol"],
                    query["type"],
                ),
            )

        if query.get("source") == {"$ne": "LOCAL_TEST"} and query.get("status") == "OPEN":
            ticket_query = query.get("ticket")
            ticket_filter = ""
            params = ["LOCAL_TEST", "OPEN"]

            if ticket_query == {"$exists": True, "$ne": ""}:
                ticket_filter = 'AND "ticket" IS NOT NULL AND "ticket" <> %s'
                params.append("")

            return self._select(
                f'"source" <> %s AND "status" = %s::"WebsiteSignalStatus" {ticket_filter}',
                tuple(params),
            )

        raise NotImplementedError(f"Unsupported find query: {query}")

    def update_one(self, query, update, upsert=False):
        set_values = update.get("$set", {})
        set_on_insert = update.get("$setOnInsert", {})

        if "_id" in query:
            return self._update_by_id(str(query["_id"]), query.get("status"), set_values)

        if "ticket" in query:
            ticket = str(query["ticket"])
            existing = self.find_one({"ticket": ticket})

            if existing:
                return self._update_by_id(existing["id"], None, set_values)

            if upsert:
                inserted_id = self._insert_signal({**set_values, **set_on_insert, "ticket": ticket})
                return UpdateResult(modified_count=0, upserted_id=inserted_id)

            return UpdateResult()

        raise NotImplementedError(f"Unsupported update_one query: {query}")

    def _insert_signal(self, signal):
        signal_id = f"sig_{uuid4().hex}"
        with self.connection.cursor() as cursor:
            cursor.execute(
                '''
                INSERT INTO "WebsiteSignal" (
                    "id", "symbol", "direction", "entry", "stopLoss", "takeProfit",
                    "timeframe", "source", "status", "ticket", "createdAt"
                )
                VALUES (
                    %s, %s, %s::"WebsiteSignalDirection", %s, %s, %s,
                    %s, %s, %s::"WebsiteSignalStatus", %s, %s
                )
                ''',
                (
                    signal_id,
                    signal["symbol"],
                    signal["type"],
                    signal["entry"],
                    signal["sl"],
                    signal["tp"],
                    signal.get("timeframe", DEFAULT_TIMEFRAME),
                    signal.get("source", "MT5_BOT"),
                    signal.get("status", "OPEN"),
                    signal.get("ticket"),
                    signal.get("createdAt") or datetime.now(timezone.utc).replace(tzinfo=None),
                ),
            )

        return signal_id

    def _update_by_id(self, signal_id, expected_status, set_values):
        field_map = {
            "symbol": '"symbol" = %s',
            "type": '"direction" = %s::"WebsiteSignalDirection"',
            "entry": '"entry" = %s',
            "sl": '"stopLoss" = %s',
            "tp": '"takeProfit" = %s',
            "timeframe": '"timeframe" = %s',
            "source": '"source" = %s',
            "status": '"status" = %s::"WebsiteSignalStatus"',
            "ticket": '"ticket" = %s',
            "closeReason": '"closeReason" = %s::"WebsiteSignalCloseReason"',
            "closePrice": '"closePrice" = %s',
            "closedAt": '"closedAt" = %s',
            "resultSource": '"resultSource" = %s',
            "createdAt": '"createdAt" = %s',
        }
        assignments = []
        params = []

        for key, value in set_values.items():
            if key not in field_map:
                continue

            assignments.append(field_map[key])
            params.append(value)

        if not assignments:
            return UpdateResult()

        params.append(signal_id)
        where_sql = '"id" = %s'

        if expected_status:
            where_sql += ' AND "status" = %s::"WebsiteSignalStatus"'
            params.append(expected_status)

        with self.connection.cursor() as cursor:
            cursor.execute(
                f'UPDATE "WebsiteSignal" SET {", ".join(assignments)} WHERE {where_sql}',
                tuple(params),
            )
            return UpdateResult(modified_count=cursor.rowcount)


def load_env_file(path=".env"):
    if not os.path.exists(path):
        return

    with open(path, "r", encoding="utf-8") as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


def get_database_collection():
    uri = os.environ.get("DATABASE_URL") or os.environ.get("DIRECT_URL")

    if not uri:
        raise RuntimeError("DATABASE_URL or DIRECT_URL is required")

    store = PostgresSignalStore(uri)
    return store, store


def get_journal_collection():
    if os.environ.get("JOURNAL_USE_MONGODB", "").strip().lower() not in {
        "1",
        "true",
        "yes",
    }:
        return None, None

    mongo_uri = os.environ.get("MONGODB_URI")

    if not mongo_uri:
        return None, None

    client = MongoClient(mongo_uri)
    collection_name = os.environ.get("MONGODB_COLLECTION_JOURNAL", "journal_trades")
    return client, client.get_default_database()[collection_name]


def is_enabled_env(name):
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes"}


def sanitize_filename_part(value):
    return "".join(
        char if char.isalnum() or char in {"_", "-", "."} else "_"
        for char in str(value or "unknown")
    )


def get_journal_timeframe():
    value = os.environ.get("JOURNAL_SCREENSHOT_TIMEFRAME", "M5").strip().upper()
    return MT5_TIMEFRAMES.get(value, mt5.TIMEFRAME_M5), value


def get_journal_screenshot_bars():
    try:
        return max(int(os.environ.get("JOURNAL_SCREENSHOT_BARS", "160")), 20)
    except ValueError:
        return 160


def mt5_server_time_to_stored_utc(timestamp, mt5_time_offset_hours):
    return datetime.fromtimestamp(int(timestamp), timezone.utc) - timedelta(
        hours=mt5_time_offset_hours
    )


def get_position_type(position):
    if position.type == mt5.POSITION_TYPE_BUY:
        return "BUY"

    if position.type == mt5.POSITION_TYPE_SELL:
        return "SELL"

    return None


def get_position_open_time(position, mt5_time_offset_hours):
    timestamp = getattr(position, "time", None)

    if timestamp is None:
        return datetime.now(timezone.utc)

    return mt5_server_time_to_stored_utc(timestamp, mt5_time_offset_hours)


def build_position_signal(position, mt5_time_offset_hours, timeframe):
    position_type = get_position_type(position)

    if not position_type:
        return None

    opened_at = get_position_open_time(position, mt5_time_offset_hours)

    return {
        "symbol": str(position.symbol).upper(),
        "type": position_type,
        "entry": float(position.price_open),
        "sl": float(position.sl or 0),
        "tp": float(position.tp or 0),
        "timeframe": timeframe,
        "source": "MT5_BOT",
        "status": "OPEN",
        "ticket": str(position.ticket),
        "createdAt": opened_at.replace(tzinfo=None),
    }


def render_journal_screenshot(trade, stage):
    symbol = trade["symbol"]
    trade_id = trade["tradeId"]
    timeframe, timeframe_label = get_journal_timeframe()
    bars = get_journal_screenshot_bars()
    screenshot_dir = Path(os.environ.get("JOURNAL_SCREENSHOT_DIR", "journal_screenshots"))
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    file_path = (
        screenshot_dir
        / sanitize_filename_part(symbol)
        / sanitize_filename_part(trade_id)
        / f"{stage}_{sanitize_filename_part(symbol)}_{sanitize_filename_part(trade_id)}_{timestamp}.png"
    )

    mt5.symbol_select(symbol, True)
    rates = mt5.copy_rates_from_pos(symbol, timeframe, 0, bars)

    if rates is None or len(rates) == 0:
        raise RuntimeError(f"MT5 copy_rates_from_pos failed for {symbol}: {mt5.last_error()}")

    data = pd.DataFrame(rates)
    data["time"] = pd.to_datetime(data["time"], unit="s")
    data = data.rename(
        columns={
            "open": "Open",
            "high": "High",
            "low": "Low",
            "close": "Close",
            "tick_volume": "Volume",
        }
    )
    data = data.set_index("time")
    hlines = []
    colors = []

    for key, color, style in [
        ("entry", "#60a5fa", "-"),
        ("sl", "#f87171", "--"),
        ("tp", "#4ade80", "--"),
    ]:
        value = float(trade.get(key) or 0)

        if value:
            hlines.append(value)
            colors.append(color)

    file_path.parent.mkdir(parents=True, exist_ok=True)
    mpf.plot(
        data[["Open", "High", "Low", "Close", "Volume"]],
        type="candle",
        style="nightclouds",
        volume=True,
        title=f"{stage} {symbol} {trade.get('side', '')} #{trade_id} {timeframe_label}",
        hlines=dict(hlines=hlines, colors=colors, linestyle="--")
        if hlines
        else None,
        savefig=dict(fname=str(file_path), dpi=140, bbox_inches="tight"),
    )

    return str(file_path)


def upload_journal_screenshot(file_path, trade_id, symbol, stage):
    if not is_enabled_env("JOURNAL_UPLOAD_ENABLED"):
        return None

    api_base_url = os.environ.get("JOURNAL_API_BASE_URL", "").rstrip("/")
    upload_secret = os.environ.get("JOURNAL_UPLOAD_SECRET", "")

    if not api_base_url or not upload_secret:
        raise RuntimeError("JOURNAL_API_BASE_URL and JOURNAL_UPLOAD_SECRET are required")

    with open(file_path, "rb") as image_file:
        response = requests.post(
            f"{api_base_url}/api/journal/upload-screenshot",
            headers={"x-journal-upload-secret": upload_secret},
            data={
                "tradeId": trade_id,
                "symbol": symbol,
                "stage": stage,
            },
            files={"file": (Path(file_path).name, image_file, "image/png")},
            timeout=30,
        )

    if response.status_code >= 400:
        raise RuntimeError(
            f"Screenshot upload failed: {response.status_code} {response.text[:300]}"
        )

    data = response.json()

    if not data.get("success"):
        raise RuntimeError(f"Screenshot upload failed: {data}")

    return {
        "url": data.get("url"),
        "pathname": data.get("pathname"),
    }


def capture_and_store_journal_screenshot(journal_collection, trade, stage):
    if journal_collection is None:
        return None

    prefix = "start" if stage == "START" else "end"
    status_field = f"{prefix}UploadStatus"
    path_field = f"{prefix}ScreenshotPath"
    url_field = f"{prefix}ScreenshotUrl"
    error_field = f"{prefix}UploadError"
    blob_path_field = f"{prefix}BlobPath"

    try:
        journal_collection.update_one(
            {"tradeId": trade["tradeId"]},
            {"$set": {status_field: "CAPTURING", "updatedAt": datetime.now(timezone.utc).isoformat()}},
        )
        file_path = render_journal_screenshot(trade, stage)
        update_fields = {
            path_field: file_path,
            status_field: "LOCAL_SAVED",
            error_field: None,
            "updatedAt": datetime.now(timezone.utc).isoformat(),
        }
        upload = upload_journal_screenshot(file_path, trade["tradeId"], trade["symbol"], stage)

        if upload:
            update_fields[url_field] = upload.get("url")
            update_fields[blob_path_field] = upload.get("pathname")
            update_fields[status_field] = "UPLOADED"

        journal_collection.update_one({"tradeId": trade["tradeId"]}, {"$set": update_fields})

        return {
            "event": "journal_screenshot_saved",
            "stage": stage,
            "tradeId": trade["tradeId"],
            "symbol": trade["symbol"],
            "path": file_path,
            "uploaded": bool(upload),
        }
    except Exception as error:
        journal_collection.update_one(
            {"tradeId": trade["tradeId"]},
            {
                "$set": {
                    status_field: "FAILED",
                    error_field: repr(error),
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        return {
            "event": "journal_screenshot_failed",
            "stage": stage,
            "tradeId": trade.get("tradeId"),
            "symbol": trade.get("symbol"),
            "error": repr(error),
        }


def sync_journal_open_position(journal_collection, position, signal):
    if journal_collection is None:
        return None

    existing = journal_collection.find_one(
        {"tradeId": signal["ticket"]},
        {"startScreenshotPath": 1, "startScreenshotUrl": 1},
    )
    now = datetime.now(timezone.utc).isoformat()
    opened_at = signal["createdAt"].replace(tzinfo=timezone.utc).isoformat()
    journal_trade = {
        "tradeId": signal["ticket"],
        "positionId": signal["ticket"],
        "symbol": signal["symbol"],
        "side": signal["type"],
        "entry": signal["entry"],
        "sl": signal["sl"],
        "tp": signal["tp"],
        "lot": float(getattr(position, "volume", 0) or 0),
        "timeframe": signal["timeframe"],
        "source": "MT5_BOT",
        "status": "OPEN",
        "profit": float(getattr(position, "profit", 0) or 0),
        "openTime": opened_at,
        "updatedAt": now,
    }
    result = journal_collection.update_one(
        {"tradeId": signal["ticket"]},
        {
            "$set": journal_trade,
            "$setOnInsert": {
                "createdAt": now,
                "startUploadStatus": "PENDING",
                "endUploadStatus": None,
            },
        },
        upsert=True,
    )
    screenshot_update = None

    if not existing or not (
        existing.get("startScreenshotPath") or existing.get("startScreenshotUrl")
    ):
        screenshot_update = capture_and_store_journal_screenshot(
            journal_collection,
            journal_trade,
            "START",
        )

    if result.upserted_id:
        update = {
            "event": "journal_trade_started",
            "tradeId": signal["ticket"],
            "symbol": signal["symbol"],
            "openedAt": opened_at,
        }

        if screenshot_update:
            update["screenshot"] = screenshot_update

        return update

    return screenshot_update


def sync_journal_closed_trade(
    journal_collection,
    signal,
    close_price,
    closed_at,
    close_reason=None,
    close_deal=None,
):
    if journal_collection is None:
        return None

    ticket = str(signal.get("ticket") or "")

    if not ticket:
        return None

    existing = journal_collection.find_one(
        {"tradeId": ticket},
        {"endScreenshotPath": 1, "endScreenshotUrl": 1},
    )
    profit = (
        float(getattr(close_deal, "profit", 0) or 0)
        if close_deal is not None
        else None
    )
    result = None

    if profit is not None:
        result = "WIN" if profit > 0 else "LOSS" if profit < 0 else "BE"
    elif close_reason == "TP":
        result = "WIN"
    elif close_reason == "SL":
        result = "LOSS"

    trade_update = {
        "tradeId": ticket,
        "positionId": ticket,
        "symbol": signal.get("symbol"),
        "side": signal.get("type"),
        "entry": float(signal.get("entry") or 0),
        "sl": float(signal.get("sl") or 0),
        "tp": float(signal.get("tp") or 0),
        "status": "CLOSED",
        "result": result,
        "exitPrice": close_price,
        "closeTime": closed_at.replace(tzinfo=timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }

    if profit is not None:
        trade_update["profit"] = profit
        trade_update["commission"] = float(getattr(close_deal, "commission", 0) or 0)
        trade_update["swap"] = float(getattr(close_deal, "swap", 0) or 0)

    journal_collection.update_one(
        {"tradeId": ticket},
        {
            "$set": trade_update,
            "$setOnInsert": {
                "createdAt": datetime.now(timezone.utc).isoformat(),
                "openTime": signal.get("createdAt")
                .replace(tzinfo=timezone.utc)
                .isoformat()
                if signal.get("createdAt")
                else None,
                "source": "MT5_BOT",
                "timeframe": signal.get("timeframe", DEFAULT_TIMEFRAME),
            },
        },
        upsert=True,
    )

    if existing and (existing.get("endScreenshotPath") or existing.get("endScreenshotUrl")):
        return {
            "event": "journal_trade_closed",
            "tradeId": ticket,
            "symbol": signal.get("symbol"),
        }

    screenshot_update = capture_and_store_journal_screenshot(
        journal_collection,
        trade_update,
        "END",
    )

    return {
        "event": "journal_trade_closed",
        "tradeId": ticket,
        "symbol": signal.get("symbol"),
        "screenshot": screenshot_update,
    }


def price_matches(left, right):
    return abs(float(left or 0) - float(right or 0)) <= PRICE_MATCH_TOLERANCE


def backfill_matching_signal_ticket(collection, signal):
    existing = collection.find_one({"ticket": signal["ticket"]})

    if existing:
        return False

    candidates = collection.find(
        {
            "source": "MT5_BOT",
            "status": "OPEN",
            "ticket": {"$exists": False},
            "symbol": signal["symbol"],
            "type": signal["type"],
        },
        {
            "entry": 1,
            "sl": 1,
            "tp": 1,
        },
    ).sort("createdAt", -1)

    for candidate in candidates:
        if (
            price_matches(candidate.get("entry"), signal["entry"])
            and price_matches(candidate.get("sl"), signal["sl"])
            and price_matches(candidate.get("tp"), signal["tp"])
        ):
            collection.update_one(
                {"_id": candidate["_id"]},
                {
                    "$set": {
                        "ticket": signal["ticket"],
                        "createdAt": signal["createdAt"],
                    }
                },
            )

            return True

    return False


def sync_open_positions(collection, journal_collection, mt5_time_offset_hours, timeframe):
    positions = mt5.positions_get()

    if positions is None:
        raise RuntimeError(f"MT5 positions_get failed: {mt5.last_error()}")

    updates = []
    open_tickets = set()

    for position in positions:
        signal = build_position_signal(position, mt5_time_offset_hours, timeframe)

        if not signal:
            continue

        open_tickets.add(signal["ticket"])
        journal_update = sync_journal_open_position(
            journal_collection,
            position,
            signal,
        )

        if journal_update:
            updates.append(journal_update)

        backfilled = backfill_matching_signal_ticket(collection, signal)
        result = collection.update_one(
            {"ticket": signal["ticket"]},
            {
                "$set": {
                    "symbol": signal["symbol"],
                    "type": signal["type"],
                    "entry": signal["entry"],
                    "sl": signal["sl"],
                    "tp": signal["tp"],
                    "timeframe": signal["timeframe"],
                    "source": signal["source"],
                    "status": "OPEN",
                },
                "$setOnInsert": {
                    "ticket": signal["ticket"],
                    "createdAt": signal["createdAt"],
                },
            },
            upsert=True,
        )

        if backfilled:
            updates.append(
                {
                    "event": "signal_open_time_backfilled",
                    "ticket": signal["ticket"],
                    "symbol": signal["symbol"],
                    "openedAt": signal["createdAt"].isoformat(),
                }
            )
        elif result.upserted_id:
            updates.append(
                {
                    "event": "signal_opened",
                    "ticket": signal["ticket"],
                    "symbol": signal["symbol"],
                    "openedAt": signal["createdAt"].isoformat(),
                }
            )

    return updates, open_tickets


def infer_close_reason_from_price(signal, close_price):
    if close_price is None:
        return None

    signal_type = signal.get("type")
    tp = float(signal.get("tp") or 0)
    sl = float(signal.get("sl") or 0)

    if signal_type == "BUY":
        if tp and close_price >= tp:
            return "TP"
        if sl and close_price <= sl:
            return "SL"

    if signal_type == "SELL":
        if tp and close_price <= tp:
            return "TP"
        if sl and close_price >= sl:
            return "SL"

    return None


def get_close_deal_for_signal(signal, mt5_time_offset_hours):
    ticket = signal.get("ticket")

    if not ticket:
        return None

    try:
        position_id = int(ticket)
    except (TypeError, ValueError):
        return None

    opened_at = signal.get("createdAt")

    if opened_at is None:
        date_from = datetime.now(timezone.utc) - timedelta(days=7)
    else:
        date_from = opened_at.replace(tzinfo=timezone.utc) + timedelta(
            hours=mt5_time_offset_hours, minutes=-5
        )

    date_to = datetime.now(timezone.utc) + timedelta(
        hours=mt5_time_offset_hours, minutes=5
    )
    deals = mt5.history_deals_get(date_from, date_to)

    if deals is None:
        return None

    out_entries = {
        getattr(mt5, "DEAL_ENTRY_OUT", 1),
        getattr(mt5, "DEAL_ENTRY_OUT_BY", 3),
    }
    matching_deals = [
        deal
        for deal in deals
        if int(getattr(deal, "position_id", 0) or 0) == position_id
        and int(getattr(deal, "entry", -1)) in out_entries
    ]

    if not matching_deals:
        return None

    matching_deals.sort(key=lambda deal: int(getattr(deal, "time", 0) or 0))
    return matching_deals[-1]


def sync_missing_closed_positions(
    collection,
    journal_collection,
    open_tickets,
    mt5_time_offset_hours,
):
    open_signals_with_tickets = list(
        collection.find(
            {
                "source": {"$ne": "LOCAL_TEST"},
                "status": "OPEN",
                "ticket": {"$exists": True, "$ne": ""},
            },
            {
                "symbol": 1,
                "type": 1,
                "entry": 1,
                "sl": 1,
                "tp": 1,
                "ticket": 1,
                "createdAt": 1,
            },
        )
    )
    updates = []

    for signal in open_signals_with_tickets:
        ticket = str(signal.get("ticket") or "")

        if not ticket or ticket in open_tickets:
            continue

        close_deal = get_close_deal_for_signal(signal, mt5_time_offset_hours)

        if close_deal is None:
            closed_at = datetime.now(timezone.utc) - timedelta(
                hours=mt5_time_offset_hours
            )
            close_price = None
        else:
            close_price = float(getattr(close_deal, "price", 0) or 0)
            hit_time = datetime.fromtimestamp(
                int(getattr(close_deal, "time", time.time())), timezone.utc
            )
            closed_at = hit_time - timedelta(hours=mt5_time_offset_hours)

        close_reason = infer_close_reason_from_price(signal, close_price)
        update_fields = {
            "status": "CLOSED",
            "closedAt": closed_at.replace(tzinfo=None),
            "resultSource": "MT5_POSITION_HISTORY",
        }

        if close_price is not None:
            update_fields["closePrice"] = close_price

        if close_reason:
            update_fields["closeReason"] = close_reason

        result = collection.update_one(
            {"_id": signal["_id"], "status": "OPEN"},
            {"$set": update_fields},
        )

        if result.modified_count:
            journal_update = sync_journal_closed_trade(
                journal_collection,
                signal,
                close_price,
                update_fields["closedAt"],
                close_reason,
                close_deal,
            )
            updates.append(
                {
                    "id": str(signal["_id"]),
                    "ticket": ticket,
                    "symbol": signal.get("symbol"),
                    "reason": close_reason or "CLOSED",
                    "closePrice": close_price,
                    "closedAt": update_fields["closedAt"].isoformat(),
                    "journal": journal_update,
                }
            )

    return updates


def get_first_hit(signal, ticks):
    for tick in ticks:
        bid = float(tick["bid"])
        ask = float(tick["ask"])

        if signal["type"] == "BUY":
            if bid >= signal["tp"]:
                return "TP", bid, tick
            if bid <= signal["sl"]:
                return "SL", bid, tick
        else:
            if ask <= signal["tp"]:
                return "TP", ask, tick
            if ask >= signal["sl"]:
                return "SL", ask, tick

    return None


def sync_open_signals(collection, journal_collection, mt5_time_offset_hours):
    open_signals = list(
        collection.find(
            {"source": {"$ne": "LOCAL_TEST"}, "status": "OPEN"},
            {
                "symbol": 1,
                "type": 1,
                "entry": 1,
                "sl": 1,
                "tp": 1,
                "ticket": 1,
                "createdAt": 1,
            },
        ).sort("createdAt", 1)
    )
    updates = []

    for signal in open_signals:
        symbol = signal["symbol"]
        mt5.symbol_select(symbol, True)
        current_tick = mt5.symbol_info_tick(symbol)

        if current_tick is None:
            continue

        start = signal["createdAt"].replace(tzinfo=timezone.utc) + timedelta(
            hours=mt5_time_offset_hours
        )
        end = datetime.fromtimestamp(current_tick.time, timezone.utc) + timedelta(
            minutes=1
        )
        ticks = mt5.copy_ticks_range(symbol, start, end, mt5.COPY_TICKS_ALL)

        if ticks is None or len(ticks) == 0:
            continue

        first_hit = get_first_hit(signal, ticks)

        if not first_hit:
            continue

        reason, close_price, tick = first_hit
        hit_time = datetime.fromtimestamp(int(tick["time"]), timezone.utc)
        stored_closed_at = hit_time - timedelta(hours=mt5_time_offset_hours)
        result = collection.update_one(
            {"_id": signal["_id"], "status": "OPEN"},
            {
                "$set": {
                    "status": "CLOSED",
                    "closeReason": reason,
                    "closePrice": close_price,
                    "closedAt": stored_closed_at.replace(tzinfo=None),
                    "resultSource": "PYTHON_MT5_TICKS",
                }
            },
        )

        if result.modified_count:
            journal_update = sync_journal_closed_trade(
                journal_collection,
                signal,
                close_price,
                stored_closed_at.replace(tzinfo=None),
                reason,
            )
            updates.append(
                {
                    "id": str(signal["_id"]),
                    "symbol": symbol,
                    "reason": reason,
                    "closePrice": close_price,
                    "mt5HitTime": hit_time.isoformat(),
                    "journal": journal_update,
                }
            )

    return updates


def main():
    load_env_file()

    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument(
        "--interval",
        type=int,
        default=int(os.environ.get("MT5_SYNC_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS)),
    )
    parser.add_argument(
        "--mt5-offset-hours",
        type=int,
        default=int(
            os.environ.get("MT5_TIME_OFFSET_HOURS", DEFAULT_MT5_TIME_OFFSET_HOURS)
        ),
    )
    parser.add_argument(
        "--timeframe",
        default=os.environ.get("MT5_SIGNAL_TIMEFRAME", DEFAULT_TIMEFRAME),
    )
    parser.add_argument(
        "--mt5-terminal-path",
        default=os.environ.get("MT5_TERMINAL_PATH"),
    )
    args = parser.parse_args()

    client, collection = get_database_collection()
    journal_client, journal_collection = get_journal_collection()

    initialize_kwargs = {}

    if args.mt5_terminal_path:
        initialize_kwargs["path"] = args.mt5_terminal_path

    if not mt5.initialize(**initialize_kwargs):
        raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")

    print(
        {
            "event": "mt5_signal_sync_started",
            "interval": args.interval,
            "mt5OffsetHours": args.mt5_offset_hours,
            "timeframe": args.timeframe,
            "terminalPath": args.mt5_terminal_path,
        },
        flush=True,
    )

    try:
        while True:
            try:
                position_updates, open_tickets = sync_open_positions(
                    collection,
                    journal_collection,
                    args.mt5_offset_hours,
                    args.timeframe,
                )
                for update in position_updates:
                    print(update, flush=True)

                missing_position_updates = sync_missing_closed_positions(
                    collection,
                    journal_collection,
                    open_tickets,
                    args.mt5_offset_hours,
                )
                for update in missing_position_updates:
                    print(
                        {"event": "signal_closed_from_position_history", **update},
                        flush=True,
                    )

                updates = sync_open_signals(
                    collection,
                    journal_collection,
                    args.mt5_offset_hours,
                )
                for update in updates:
                    print({"event": "signal_closed", **update}, flush=True)
            except Exception as error:
                print(
                    {
                        "event": "mt5_signal_sync_iteration_error",
                        "error": repr(error),
                    },
                    flush=True,
                )

                if args.once:
                    raise

            if args.once:
                break

            time.sleep(args.interval)
    finally:
        mt5.shutdown()
        client.close()
        if journal_client is not None:
            journal_client.close()


if __name__ == "__main__":
    main()
