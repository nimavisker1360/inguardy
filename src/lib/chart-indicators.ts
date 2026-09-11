export type IndicatorCandle = {
  time: string;
  close: number;
};

export type IndicatorPoint = {
  time: string;
  value: number;
};

export function calculateEma(candles: IndicatorCandle[], period: number): IndicatorPoint[] {
  if (!Number.isInteger(period) || period <= 0 || candles.length < period) return [];

  const seed = candles
    .slice(0, period)
    .reduce((sum, candle) => sum + candle.close, 0) / period;
  const multiplier = 2 / (period + 1);
  const points: IndicatorPoint[] = [{ time: candles[period - 1].time, value: seed }];
  let previous = seed;

  for (let index = period; index < candles.length; index += 1) {
    previous = (candles[index].close - previous) * multiplier + previous;
    points.push({ time: candles[index].time, value: previous });
  }

  return points;
}
