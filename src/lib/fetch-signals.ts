import type {
  DisplaySignal,
  SignalListResponse,
  SignalQueryOptions,
} from "@/lib/signal-types";

type SignalApiResponse = Partial<Omit<SignalListResponse, "signals">> & {
  success?: boolean;
  message?: string;
  signals?: unknown;
};

const DEFAULT_SUMMARY = {
  today: 0,
  open: 0,
  tpHit: 0,
  slHit: 0,
};

const DEFAULT_DAILY_SUMMARIES: SignalListResponse["dailySummaries"] = [];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getOptionalNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
}

function getString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function normalizeDirection(value: unknown): DisplaySignal["type"] {
  return String(value || "").trim().toLowerCase() === "sell" ? "sell" : "buy";
}

function normalizeStatus(value: unknown): DisplaySignal["status"] {
  return String(value || "").trim().toUpperCase() === "CLOSED"
    ? "CLOSED"
    : "OPEN";
}

function normalizeTakeProfit(value: unknown, takeProfit1: unknown) {
  const takeProfitValues = Array.isArray(value) ? value : [value];
  const normalizedValues = takeProfitValues
    .map((target) => getOptionalNumber(target))
    .filter((target): target is number => target !== undefined);
  const primaryTarget = getOptionalNumber(
    takeProfit1,
    normalizedValues[0],
    value
  );

  if (primaryTarget === undefined) {
    return normalizedValues;
  }

  return [
    primaryTarget,
    ...normalizedValues.filter((target) => target !== primaryTarget),
  ];
}

function normalizeSignal(value: unknown): DisplaySignal | null {
  if (!isRecord(value)) {
    return null;
  }

  const pair = getString(value.symbol, value.pair);
  const price = getOptionalNumber(value.entry, value.price);
  const stopLoss = getOptionalNumber(value.stopLoss);
  const takeProfit = normalizeTakeProfit(value.takeProfit, value.takeProfit1);

  if (!pair || price === undefined || stopLoss === undefined) {
    return null;
  }

  const type = normalizeDirection(value.direction || value.type);
  const status = normalizeStatus(value.status);
  const createdAt = getString(value.createdAt) || undefined;

  return {
    id: getString(value.id) || `${pair}-${createdAt || value.timestamp || price}`,
    pair,
    type,
    direction: type === "buy" ? "BUY" : "SELL",
    price,
    takeProfit,
    stopLoss,
    timestamp: getString(value.timestamp, createdAt) || "-",
    success:
      typeof value.success === "boolean" ? value.success : undefined,
    isPremium:
      typeof value.isPremium === "boolean" ? value.isPremium : undefined,
    pairColor: getString(value.pairColor) || "text-white",
    isOpen:
      typeof value.isOpen === "boolean" ? value.isOpen : status !== "CLOSED",
    closeReason:
      String(value.closeReason || "").trim().toUpperCase() === "TP"
        ? "TP"
        : String(value.closeReason || "").trim().toUpperCase() === "SL"
          ? "SL"
          : undefined,
    closePrice: getOptionalNumber(value.closePrice),
    closedAt: getString(value.closedAt) || undefined,
    createdAt,
    source: getString(value.source) || undefined,
    status,
    timeframe: getString(value.timeframe) || undefined,
    ticket: getString(value.ticket) || undefined,
    resultSource:
      value.resultSource === "stored" ||
      value.resultSource === "derived" ||
      value.resultSource === "python"
        ? value.resultSource
        : undefined,
  };
}

function normalizeSignals(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeSignal)
    .filter((signal): signal is DisplaySignal => Boolean(signal));
}

function normalizeDailySummaries(value: unknown) {
  if (!Array.isArray(value)) {
    return DEFAULT_DAILY_SUMMARIES;
  }

  return value.filter(isRecord).map((summary) => ({
    dateKey: typeof summary.dateKey === "string" ? summary.dateKey : "",
    label: typeof summary.label === "string" ? summary.label : "",
    signalCount: getNumber(summary.signalCount, 0),
    open: getNumber(summary.open, 0),
    tpHit: getNumber(summary.tpHit, 0),
    slHit: getNumber(summary.slHit, 0),
    profitPips: getNumber(summary.profitPips, 0),
    lossPips: getNumber(summary.lossPips, 0),
    netPips: getNumber(summary.netPips, 0),
  }));
}

function normalizeSignalResponse(
  data: unknown,
  options: SignalQueryOptions
): SignalListResponse {
  if (!isRecord(data)) {
    return {
      signals: [],
      pagination: {
        page: options.page || 1,
        limit: options.limit || 12,
        total: 0,
        totalPages: 1,
        hasMore: false,
      },
      summary: DEFAULT_SUMMARY,
      dailySummaries: DEFAULT_DAILY_SUMMARIES,
    };
  }

  const pagination = isRecord(data.pagination) ? data.pagination : {};
  const summary = isRecord(data.summary) ? data.summary : {};
  const signals = normalizeSignals(data.signals);

  return {
    signals,
    pagination: {
      page: getNumber(pagination.page, options.page || 1),
      limit: getNumber(pagination.limit, options.limit || 12),
      total: getNumber(pagination.total, 0),
      totalPages: getNumber(pagination.totalPages, 1),
      hasMore:
        typeof pagination.hasMore === "boolean" ? pagination.hasMore : false,
    },
    summary: {
      today: getNumber(summary.today, DEFAULT_SUMMARY.today),
      open: getNumber(summary.open, DEFAULT_SUMMARY.open),
      tpHit: getNumber(summary.tpHit, DEFAULT_SUMMARY.tpHit),
      slHit: getNumber(summary.slHit, DEFAULT_SUMMARY.slHit),
    },
    dailySummaries: normalizeDailySummaries(data.dailySummaries),
  };
}

function currentUrlIncludesTestSignals() {
  if (typeof window === "undefined") {
    return false;
  }

  return new URLSearchParams(window.location.search).has("includeTest");
}

function shouldIncludeTestSignals(options: SignalQueryOptions) {
  return (
    options.includeTestSignals ||
    process.env.NODE_ENV === "development" ||
    currentUrlIncludesTestSignals()
  );
}

export async function fetchWebsiteSignals(
  options: SignalQueryOptions = {},
  signal?: AbortSignal
) {
  const params = new URLSearchParams();

  if (options.limit) {
    params.set("limit", String(options.limit));
  }

  if (options.page) {
    params.set("page", String(options.page));
  }

  if (options.status && options.status !== "all") {
    params.set("status", options.status);
  }

  if (options.symbol && options.symbol !== "all") {
    params.set("symbol", options.symbol);
  }

  if (options.direction && options.direction !== "all") {
    params.set("direction", options.direction);
  }

  if (options.date && options.date !== "all") {
    params.set("date", options.date);
  }

  if (shouldIncludeTestSignals(options)) {
    params.set("includeTest", "true");
  }

  const query = params.toString();
  const response = await fetch(`/api/signals${query ? `?${query}` : ""}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch signals");
  }

  const body = await response.text();
  let data: SignalApiResponse;

  try {
    data = (body ? JSON.parse(body) : {}) as SignalApiResponse;
  } catch {
    throw new Error("Invalid signals response");
  }

  if (data.success === false) {
    throw new Error(data.message || "Failed to fetch signals");
  }

  return normalizeSignalResponse(data, options);
}
