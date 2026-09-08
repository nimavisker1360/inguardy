import { NextResponse } from "next/server";
import {
  saveTradingSignal,
  SignalValidationError,
} from "@/lib/signal-store";

export const dynamic = "force-dynamic";

type Mt5EventPayload = {
  event: "OPEN" | "CLOSED";
  ticket: string;
  symbol: string;
  side?: string;
  entry?: number;
  sl?: number;
  tp?: number;
  lot?: number;
  timeframe?: string;
  magic?: number;
  orderId?: string;
  dealId?: string;
  openTimestamp?: number;
  closeTimestamp?: number;
  exitPrice?: number;
  profit?: number;
  commission?: number;
  swap?: number;
  closeReason?: string;
};

function getFirstParam(url: URL, ...names: string[]) {
  for (const name of names) {
    const value = url.searchParams.get(name);

    if (value !== null && value.trim() !== "") {
      return value.trim();
    }
  }

  return "";
}

function parseOptionalNumber(value: string) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toIsoString(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return new Date().toISOString();
  }

  const timestampMs = Math.abs(timestamp) < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
  const date = new Date(timestampMs);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeEvent(value: string) {
  const normalized = value.toUpperCase();

  if (normalized === "OPEN" || normalized === "START") {
    return "OPEN";
  }

  if (normalized === "CLOSED" || normalized === "CLOSE" || normalized === "END") {
    return "CLOSED";
  }

  return "";
}

function getResult(payload: Mt5EventPayload) {
  if (payload.profit !== undefined) {
    return payload.profit > 0 ? "WIN" : payload.profit < 0 ? "LOSS" : "BE";
  }

  const reason = payload.closeReason?.trim().toUpperCase();

  if (reason === "TP" || reason === "WIN") {
    return "WIN";
  }

  if (reason === "SL" || reason === "LOSS") {
    return "LOSS";
  }

  return null;
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  ) as Partial<T>;
}

function getPayloadFromUrl(url: URL): Mt5EventPayload {
  const event = normalizeEvent(getFirstParam(url, "event", "status"));
  const ticket = getFirstParam(url, "ticket", "positionId", "position_id");
  const symbol = getFirstParam(url, "symbol", "pair").toUpperCase();

  if (event !== "OPEN" && event !== "CLOSED") {
    throw new SignalValidationError("event must be OPEN or CLOSED");
  }

  if (!ticket) {
    throw new SignalValidationError("ticket is required");
  }

  if (!symbol) {
    throw new SignalValidationError("symbol is required");
  }

  return {
    event,
    ticket,
    symbol,
    side: getFirstParam(url, "side", "type", "direction").toUpperCase() || undefined,
    entry: parseOptionalNumber(getFirstParam(url, "entry", "entryPrice", "price")),
    sl: parseOptionalNumber(getFirstParam(url, "sl", "stopLoss")),
    tp: parseOptionalNumber(getFirstParam(url, "tp", "takeProfit")),
    lot: parseOptionalNumber(getFirstParam(url, "lot", "volume")),
    timeframe: getFirstParam(url, "timeframe", "tf") || undefined,
    magic: parseOptionalNumber(getFirstParam(url, "magic")),
    orderId: getFirstParam(url, "orderId", "order") || undefined,
    dealId: getFirstParam(url, "dealId", "deal") || undefined,
    openTimestamp: parseOptionalNumber(getFirstParam(url, "openTimestamp", "openedAt", "time")),
    closeTimestamp: parseOptionalNumber(getFirstParam(url, "closeTimestamp", "closedAt", "time")),
    exitPrice: parseOptionalNumber(getFirstParam(url, "exitPrice", "closePrice")),
    profit: parseOptionalNumber(getFirstParam(url, "profit")),
    commission: parseOptionalNumber(getFirstParam(url, "commission")),
    swap: parseOptionalNumber(getFirstParam(url, "swap")),
    closeReason: getFirstParam(url, "closeReason", "reason", "result").toUpperCase() || undefined,
  };
}

function assertAuthorized(request: Request, url: URL) {
  const expectedSecret =
    process.env.MT5_EVENT_SECRET || process.env.JOURNAL_UPLOAD_SECRET || "";

  if (!expectedSecret) {
    return;
  }

  const providedSecret =
    request.headers.get("x-mt5-event-secret") ||
    request.headers.get("x-journal-upload-secret") ||
    url.searchParams.get("secret") ||
    "";

  if (providedSecret !== expectedSecret) {
    throw new SignalValidationError("Unauthorized MT5 event");
  }
}

async function saveJournalEvent(payload: Mt5EventPayload) {
  const { getJournalCollection } = await import("@/lib/journal-store");
  const collection = await getJournalCollection();
  const now = new Date().toISOString();
  const openTime = toIsoString(payload.openTimestamp);

  if (payload.event === "OPEN") {
    const journalTrade = omitUndefined({
      tradeId: payload.ticket,
      positionId: payload.ticket,
      orderId: payload.orderId,
      dealId: payload.dealId,
      symbol: payload.symbol,
      side: payload.side,
      entry: payload.entry,
      sl: payload.sl,
      tp: payload.tp,
      lot: payload.lot,
      timeframe: payload.timeframe,
      strategy: "Stoch+RSI+CCI EA",
      magic: payload.magic,
      openTime,
      closeTime: null,
      exitPrice: null,
      source: "MT5_EA",
      status: "OPEN",
      result: null,
      profit: payload.profit,
      updatedAt: now,
    });

    await collection.updateOne(
      { tradeId: payload.ticket },
      {
        $set: journalTrade,
        $setOnInsert: {
          createdAt: now,
          startUploadStatus: "EA_EVENT",
          endUploadStatus: null,
        },
      },
      { upsert: true }
    );

    return journalTrade;
  }

  const closeTime = toIsoString(payload.closeTimestamp);
  const result = getResult(payload);
  const update = omitUndefined({
    tradeId: payload.ticket,
    positionId: payload.ticket,
    orderId: payload.orderId,
    dealId: payload.dealId,
    symbol: payload.symbol,
    side: payload.side,
    entry: payload.entry,
    sl: payload.sl,
    tp: payload.tp,
    lot: payload.lot,
    timeframe: payload.timeframe,
    strategy: "Stoch+RSI+CCI EA",
    magic: payload.magic,
    closeTime,
    exitPrice: payload.exitPrice,
    profit: payload.profit,
    commission: payload.commission,
    swap: payload.swap,
    source: "MT5_EA",
    status: "CLOSED",
    result,
    updatedAt: now,
  });

  await collection.updateOne(
    { tradeId: payload.ticket },
    {
      $set: update,
      $setOnInsert: {
        createdAt: now,
        openTime,
        startUploadStatus: "EA_EVENT",
        endUploadStatus: "EA_EVENT",
      },
    },
    { upsert: true }
  );

  return update;
}

async function saveSignalEvent(payload: Mt5EventPayload) {
  return saveTradingSignal(omitUndefined({
    ticket: payload.ticket,
    positionId: payload.ticket,
    symbol: payload.symbol,
    type: payload.side,
    entry: payload.entry,
    sl: payload.sl,
    tp: payload.tp,
    timeframe: payload.timeframe,
    source: "MT5_EA",
    status: payload.event,
    openTimestamp: payload.openTimestamp,
    closeTimestamp: payload.closeTimestamp,
    exitPrice: payload.exitPrice,
    closePrice: payload.exitPrice,
    closeReason: payload.closeReason,
    result: payload.closeReason,
  }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    assertAuthorized(request, url);

    const payload = getPayloadFromUrl(url);
    const [signal, journal] = await Promise.all([
      saveSignalEvent(payload),
      saveJournalEvent(payload),
    ]);

    return NextResponse.json({
      success: true,
      event: payload.event,
      ticket: payload.ticket,
      signal,
      journal,
    });
  } catch (error) {
    if (error instanceof SignalValidationError) {
      const status = error.message.startsWith("Unauthorized") ? 401 : 400;

      return NextResponse.json(
        { success: false, message: error.message },
        { status }
      );
    }


    return NextResponse.json(
      { success: false, message: "Failed to save MT5 event" },
      { status: 500 }
    );
  }
}
