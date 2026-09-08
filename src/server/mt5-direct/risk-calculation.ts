export function calculateInitialRiskAmount(input: {
  entryPrice: number | null | undefined;
  initialStopLoss: number | null | undefined;
  lotSize: number | null | undefined;
  tickSize: number | null | undefined;
  tickValue: number | null | undefined;
}) {
  const values = [input.entryPrice, input.initialStopLoss, input.lotSize, input.tickSize, input.tickValue];
  if (values.some((value) => value === null || value === undefined || !Number.isFinite(value))) {
    return null;
  }
  const [entryPrice, initialStopLoss, lotSize, tickSize, tickValue] = values as number[];
  if (initialStopLoss <= 0 || lotSize <= 0 || tickSize <= 0 || tickValue <= 0) return null;
  const amount = Math.abs(entryPrice - initialStopLoss) / tickSize * tickValue * lotSize;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}
