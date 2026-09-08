import type { Candle } from "@/server/market/market-data-service";

export type MarketIndicatorContext = {
  currentPrice: number;
  previousClose: number;
  priceChangePercent: number;
  ema20: number | null;
  ema50: number | null;
  ema200: number | null;
  rsi14: number | null;
  atr14: number | null;
  recentHigh: number;
  recentLow: number;
  supportLevels: number[];
  resistanceLevels: number[];
  trendCondition: "BULLISH" | "BEARISH" | "MIXED";
  volatilityCondition: "LOW" | "NORMAL" | "HIGH" | "UNKNOWN";
  volumeCondition: "RISING" | "FALLING" | "NORMAL" | "UNAVAILABLE";
};

function round(value: number, decimals = 5) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function ema(values: number[], period: number) {
  if (values.length < period) {
    return null;
  }

  const multiplier = 2 / (period + 1);
  let result = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (const value of values.slice(period)) {
    result = value * multiplier + result * (1 - multiplier);
  }

  return round(result);
}

function rsi(values: number[], period: number) {
  if (values.length <= period) {
    return null;
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    gains += Math.max(change, 0);
    losses += Math.max(-change, 0);
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  return round(100 - 100 / (1 + averageGain / averageLoss), 2);
}

function atr(candles: Candle[], period: number) {
  if (candles.length <= period) {
    return null;
  }

  const ranges: number[] = [];

  for (let index = 1; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];
    ranges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previous.close),
        Math.abs(candle.low - previous.close)
      )
    );
  }

  return ema(ranges, period);
}

function clusteredLevels(values: number[], currentPrice: number) {
  const tolerance = Math.max(currentPrice * 0.0015, Number.EPSILON);
  const sorted = [...values].sort((a, b) => a - b);
  const clusters: number[][] = [];

  for (const value of sorted) {
    const last = clusters[clusters.length - 1];

    if (!last || Math.abs(value - last[last.length - 1]) > tolerance) {
      clusters.push([value]);
    } else {
      last.push(value);
    }
  }

  return clusters
    .map((cluster) => round(cluster.reduce((sum, value) => sum + value, 0) / cluster.length))
    .filter((value, index, levels) => levels.indexOf(value) === index);
}

function swingLevels(candles: Candle[], currentPrice: number) {
  const lows: number[] = [];
  const highs: number[] = [];

  for (let index = 2; index < candles.length - 2; index += 1) {
    const candle = candles[index];

    if (
      candle.low <= candles[index - 1].low &&
      candle.low <= candles[index - 2].low &&
      candle.low <= candles[index + 1].low &&
      candle.low <= candles[index + 2].low
    ) {
      lows.push(candle.low);
    }

    if (
      candle.high >= candles[index - 1].high &&
      candle.high >= candles[index - 2].high &&
      candle.high >= candles[index + 1].high &&
      candle.high >= candles[index + 2].high
    ) {
      highs.push(candle.high);
    }
  }

  return {
    supportLevels: clusteredLevels(lows.filter((level) => level <= currentPrice), currentPrice)
      .slice(-5)
      .reverse(),
    resistanceLevels: clusteredLevels(highs.filter((level) => level >= currentPrice), currentPrice).slice(0, 5),
  };
}

function volumeCondition(candles: Candle[]) {
  const volumes = candles.map((candle) => candle.volume).filter((value): value is number => Number.isFinite(value));

  if (volumes.length < 20) {
    return "UNAVAILABLE" as const;
  }

  const recent = volumes.slice(-5).reduce((sum, value) => sum + value, 0) / 5;
  const baseline = volumes.slice(-20).reduce((sum, value) => sum + value, 0) / 20;

  if (recent > baseline * 1.2) {
    return "RISING" as const;
  }

  if (recent < baseline * 0.8) {
    return "FALLING" as const;
  }

  return "NORMAL" as const;
}

export function calculateMarketIndicators(candles: Candle[]): MarketIndicatorContext {
  const closes = candles.map((candle) => candle.close);
  const currentPrice = closes[closes.length - 1];
  const previousClose = closes[closes.length - 2] ?? currentPrice;
  const recent = candles.slice(-50);
  const recentHigh = Math.max(...recent.map((candle) => candle.high));
  const recentLow = Math.min(...recent.map((candle) => candle.low));
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema200 = ema(closes, 200);
  const atr14 = atr(candles, 14);
  const levels = swingLevels(recent, currentPrice);

  const trendCondition =
    ema20 !== null && ema50 !== null && ema200 !== null && currentPrice > ema20 && ema20 > ema50 && ema50 > ema200
      ? "BULLISH"
      : ema20 !== null && ema50 !== null && ema200 !== null && currentPrice < ema20 && ema20 < ema50 && ema50 < ema200
        ? "BEARISH"
        : "MIXED";

  const atrPercent = atr14 && currentPrice ? atr14 / currentPrice : null;
  const volatilityCondition =
    atrPercent === null ? "UNKNOWN" : atrPercent > 0.018 ? "HIGH" : atrPercent < 0.004 ? "LOW" : "NORMAL";

  return {
    currentPrice: round(currentPrice),
    previousClose: round(previousClose),
    priceChangePercent: previousClose ? round(((currentPrice - previousClose) / previousClose) * 100, 3) : 0,
    ema20,
    ema50,
    ema200,
    rsi14: rsi(closes, 14),
    atr14,
    recentHigh: round(recentHigh),
    recentLow: round(recentLow),
    ...levels,
    trendCondition,
    volatilityCondition,
    volumeCondition: volumeCondition(candles),
  };
}
