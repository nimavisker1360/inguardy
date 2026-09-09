export const MANUAL_TRADE_SOURCE = "MANUAL";
export const MT5_TRADE_SOURCE = "MT5";
export const EA_IMPORT_TRADE_SOURCE = "EA_IMPORT";
export const MT5_HTML_IMPORT_SOURCE = "MT5_HTML";
export const EXCEL_JOURNAL_IMPORT_SOURCE = "EXCEL_JOURNAL";
export const CTRADER_DIRECT_TRADE_SOURCE = "CTRADER_DIRECT";
export const MT5_DIRECT_TRADE_SOURCE = "MT5_DIRECT";
export const TRADELOCKER_DIRECT_TRADE_SOURCE = "TRADELOCKER_DIRECT";

const LEGACY_MT5_SOURCE = "MT5_EA";
const MT5_SETUP_PREFIX = "MT5:";

export const IMPORTED_TRADE_SOURCES = new Set([
  MT5_TRADE_SOURCE,
  EA_IMPORT_TRADE_SOURCE,
  MT5_HTML_IMPORT_SOURCE,
  LEGACY_MT5_SOURCE,
  CTRADER_DIRECT_TRADE_SOURCE,
  MT5_DIRECT_TRADE_SOURCE,
  TRADELOCKER_DIRECT_TRADE_SOURCE,
]);

export const BROKER_DATA_FIELDS = [
  "accountId",
  "mt5Ticket",
  "symbol",
  "direction",
  "status",
  "entryPrice",
  "exitPrice",
  "stopLoss",
  "takeProfit",
  "initialStopLoss",
  "initialTakeProfit",
  "currentStopLoss",
  "currentTakeProfit",
  "lotSize",
  "riskAmount",
  "profitLoss",
  "commission",
  "swap",
  "rr",
  "openedAt",
  "closedAt",
  "source",
] as const;

export type TradeSource =
  | typeof MANUAL_TRADE_SOURCE
  | typeof MT5_TRADE_SOURCE
  | typeof EA_IMPORT_TRADE_SOURCE
  | typeof MT5_HTML_IMPORT_SOURCE
  | typeof EXCEL_JOURNAL_IMPORT_SOURCE
  | typeof CTRADER_DIRECT_TRADE_SOURCE
  | typeof TRADELOCKER_DIRECT_TRADE_SOURCE;

export function normalizeTradeSource(
  source: string | null | undefined,
  setup?: string | null
): TradeSource {
  const normalized = String(source || "").trim().toUpperCase();

  if (
    normalized === MT5_TRADE_SOURCE ||
    normalized === LEGACY_MT5_SOURCE ||
    normalized === MT5_DIRECT_TRADE_SOURCE
  ) {
    return MT5_TRADE_SOURCE;
  }

  if (normalized === EA_IMPORT_TRADE_SOURCE) {
    return EA_IMPORT_TRADE_SOURCE;
  }

  if (normalized === MT5_HTML_IMPORT_SOURCE) {
    return MT5_HTML_IMPORT_SOURCE;
  }

  if (normalized === EXCEL_JOURNAL_IMPORT_SOURCE) {
    return EXCEL_JOURNAL_IMPORT_SOURCE;
  }

  if (normalized === CTRADER_DIRECT_TRADE_SOURCE) {
    return CTRADER_DIRECT_TRADE_SOURCE;
  }

  if (normalized === TRADELOCKER_DIRECT_TRADE_SOURCE) {
    return TRADELOCKER_DIRECT_TRADE_SOURCE;
  }

  if (setup?.trim().toUpperCase().startsWith(MT5_SETUP_PREFIX)) {
    return MT5_TRADE_SOURCE;
  }

  return MANUAL_TRADE_SOURCE;
}

export function isImportedTradeSource(source: string | null | undefined, setup?: string | null) {
  return IMPORTED_TRADE_SOURCES.has(normalizeTradeSource(source, setup));
}

export function stripBrokerDataFields<T extends Record<string, unknown>>(data: T) {
  const next = { ...data };

  for (const field of BROKER_DATA_FIELDS) {
    delete next[field];
  }

  return next;
}
