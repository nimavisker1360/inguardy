export type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type MarketTimeframe = "M5" | "M15" | "H1" | "H4" | "D1";

export class MarketDataProviderError extends Error {
  status: number;

  constructor(message = "Market data provider is not configured", status = 503) {
    super(message);
    this.name = "MarketDataProviderError";
    this.status = status;
  }
}

const TIMEFRAME_MAP: Record<string, MarketTimeframe> = {
  "5": "M5",
  M5: "M5",
  "15": "M15",
  M15: "M15",
  "60": "H1",
  H1: "H1",
  "240": "H4",
  H4: "H4",
  D: "D1",
  "1D": "D1",
  D1: "D1",
};

const SYMBOL_ALIASES: Record<string, string> = {
  GOLD: "XAUUSD",
  XAUUSD: "XAUUSD",
  "OANDA:XAUUSD": "XAUUSD",
  EURUSD: "EURUSD",
  "OANDA:EURUSD": "EURUSD",
  GBPUSD: "GBPUSD",
  "OANDA:GBPUSD": "GBPUSD",
  USDJPY: "USDJPY",
  "OANDA:USDJPY": "USDJPY",
  AUDUSD: "AUDUSD",
  "OANDA:AUDUSD": "AUDUSD",
  USDCAD: "USDCAD",
  "OANDA:USDCAD": "USDCAD",
  EURJPY: "EURJPY",
  "OANDA:EURJPY": "EURJPY",
  GBPJPY: "GBPJPY",
  "OANDA:GBPJPY": "GBPJPY",
  BTCUSD: "BTCUSD",
  BTCUSDT: "BTCUSD",
  "BINANCE:BTCUSDT": "BTCUSD",
  ETHUSD: "ETHUSD",
  ETHUSDT: "ETHUSD",
  "BINANCE:ETHUSDT": "ETHUSD",
  NAS100: "NAS100",
  "CAPITALCOM:US100": "NAS100",
  US30: "US30",
  "CAPITALCOM:US30": "US30",
  DXY: "DXY",
  "TVC:DXY": "DXY",
};

const TWELVE_DATA_INTERVALS: Record<MarketTimeframe, string> = {
  M5: "5min",
  M15: "15min",
  H1: "1h",
  H4: "4h",
  D1: "1day",
};

const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  XAUUSD: "XAU/USD",
  EURUSD: "EUR/USD",
  GBPUSD: "GBP/USD",
  USDJPY: "USD/JPY",
  AUDUSD: "AUD/USD",
  USDCAD: "USD/CAD",
  EURJPY: "EUR/JPY",
  GBPJPY: "GBP/JPY",
  BTCUSD: "BTC/USD",
  ETHUSD: "ETH/USD",
  NAS100: "NDX",
  US30: "DJI",
  DXY: "DXY",
};

const ALWAYS_OPEN_SYMBOLS = new Set(["BTCUSD", "ETHUSD"]);

type TwelveDataCandle = {
  datetime?: string;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
};

type TwelveDataTimeSeriesResponse = {
  status?: string;
  message?: string;
  code?: number;
  values?: TwelveDataCandle[];
};

export function normalizeMarketSymbol(symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  return SYMBOL_ALIASES[normalized] ?? normalized.replace(/^[A-Z]+:/, "");
}

export function normalizeMarketTimeframe(timeframe: string) {
  const normalized = timeframe.trim().toUpperCase();
  return TIMEFRAME_MAP[normalized] ?? null;
}

function ensureCandle(value: Candle) {
  const numbers = [value.open, value.high, value.low, value.close];

  if (!value.time || numbers.some((item) => !Number.isFinite(item))) {
    throw new MarketDataProviderError("Market data provider returned invalid candle data", 502);
  }

  return {
    time: value.time,
    open: Number(value.open),
    high: Number(value.high),
    low: Number(value.low),
    close: Number(value.close),
    volume: value.volume === undefined ? undefined : Number(value.volume),
  };
}

function toProviderSymbol(symbol: string) {
  return TWELVE_DATA_SYMBOLS[symbol] ?? symbol;
}

function parseNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTwelveDataCandles(values: TwelveDataCandle[] | undefined) {
  if (!values?.length) {
    return [];
  }

  return values.map((value) => {
    const open = parseNumber(value.open);
    const high = parseNumber(value.high);
    const low = parseNumber(value.low);
    const close = parseNumber(value.close);
    const volume = parseNumber(value.volume);

    if (!value.datetime || open === null || high === null || low === null || close === null) {
      throw new MarketDataProviderError("Market data provider returned invalid candle data", 502);
    }

    return {
      time: new Date(value.datetime).toISOString(),
      open,
      high,
      low,
      close,
      volume: volume ?? undefined,
    };
  });
}

async function fetchTwelveDataCandles({
  symbol,
  timeframe,
  limit,
  startDate,
  endDate,
}: {
  symbol: string;
  timeframe: MarketTimeframe;
  limit: number;
  startDate?: string;
  endDate?: string;
}) {
  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    throw new MarketDataProviderError();
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", toProviderSymbol(symbol));
  url.searchParams.set("interval", TWELVE_DATA_INTERVALS[timeframe]);
  if (startDate && endDate) {
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
  } else {
    url.searchParams.set("outputsize", String(Math.max(Math.min(limit, 5000), 1)));
    if (startDate) url.searchParams.set("start_date", startDate);
    if (endDate) url.searchParams.set("end_date", endDate);
  }
  url.searchParams.set("format", "JSON");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new MarketDataProviderError("Market data provider request failed", 502);
  }

  const data = (await response.json()) as TwelveDataTimeSeriesResponse;

  if (data.status === "error") {
    throw new MarketDataProviderError(
      data.message || "Market data is not available for this symbol yet.",
      data.code && data.code >= 400 && data.code < 500 ? 400 : 502
    );
  }

  return parseTwelveDataCandles(data.values);
}

export async function getLatestCandles({
  symbol,
  timeframe,
  limit = 200,
}: {
  symbol: string;
  timeframe: MarketTimeframe;
  limit?: number;
}): Promise<Candle[]> {
  return fetchTwelveDataCandles({ symbol, timeframe, limit });
}

export async function getHistoricalCandles({
  symbol,
  timeframe,
  endDate,
  limit = 500,
}: {
  symbol: string;
  timeframe: MarketTimeframe;
  endDate: string;
  limit?: number;
}): Promise<Candle[]> {
  const providerLimit = ALWAYS_OPEN_SYMBOLS.has(symbol)
    ? limit
    : Math.min(Math.ceil(limit * 1.5) + 24, 5000);
  const candles = normalizeProviderCandles(
    await fetchTwelveDataCandles({ symbol, timeframe, limit: providerLimit, endDate })
  );

  return filterClosedSessionCandles(candles, symbol).slice(-limit);
}

/**
 * Twelve Data can return indicative weekend bars for FX, metals, and indices.
 * They are not tradable replay candles and can compress the chart into a flat line.
 */
export function filterClosedSessionCandles(candles: Candle[], symbol: string) {
  if (ALWAYS_OPEN_SYMBOLS.has(normalizeMarketSymbol(symbol))) {
    return candles;
  }

  return candles.filter((candle) => {
    const time = new Date(candle.time);
    if (Number.isNaN(time.getTime())) return false;

    const day = time.getUTCDay();
    const hour = time.getUTCHours();
    if (day === 6) return false;
    if (day === 5 && hour >= 22) return false;
    if (day === 0 && hour < 22) return false;
    return true;
  });
}

export function normalizeProviderCandles(candles: Candle[]) {
  return candles.map(ensureCandle).sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
}
