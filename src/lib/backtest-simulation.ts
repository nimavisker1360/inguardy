export type BacktestDirection = "LONG" | "SHORT";
export type BacktestPositionStatus = "DRAFT" | "PENDING" | "OPEN" | "WON" | "LOST";
export type BacktestPriceLevel = "entry" | "stopLoss" | "takeProfit";

export type BacktestCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type SimulatedPosition = {
  id: string;
  direction: BacktestDirection;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  status: BacktestPositionStatus;
  placedAtIndex: number;
  lastEvaluatedIndex: number;
  openedAtIndex?: number;
  closedAtIndex?: number;
  exitPrice?: number;
  resultR?: number;
};

export function positionLevelsAreValid(position: Pick<SimulatedPosition, "direction" | "entry" | "stopLoss" | "takeProfit">) {
  const values = [position.entry, position.stopLoss, position.takeProfit];
  if (values.some((value) => !Number.isFinite(value) || value <= 0)) return false;
  return position.direction === "LONG"
    ? position.stopLoss < position.entry && position.entry < position.takeProfit
    : position.takeProfit < position.entry && position.entry < position.stopLoss;
}

export function positionRiskReward(position: Pick<SimulatedPosition, "entry" | "stopLoss" | "takeProfit">) {
  const risk = Math.abs(position.entry - position.stopLoss);
  if (!Number.isFinite(risk) || risk <= 0) return 0;
  return Math.abs(position.takeProfit - position.entry) / risk;
}

export function currentPositionR(
  position: Pick<SimulatedPosition, "direction" | "entry" | "stopLoss">,
  currentPrice: number
) {
  const risk = Math.abs(position.entry - position.stopLoss);
  if (!Number.isFinite(currentPrice) || risk <= 0) return 0;
  return position.direction === "LONG"
    ? (currentPrice - position.entry) / risk
    : (position.entry - currentPrice) / risk;
}

function closeAtStop(position: SimulatedPosition, candleIndex: number): SimulatedPosition {
  return {
    ...position,
    status: "LOST",
    closedAtIndex: candleIndex,
    exitPrice: position.stopLoss,
    resultR: -1,
    lastEvaluatedIndex: candleIndex,
  };
}

function closeAtTarget(position: SimulatedPosition, candleIndex: number): SimulatedPosition {
  return {
    ...position,
    status: "WON",
    closedAtIndex: candleIndex,
    exitPrice: position.takeProfit,
    resultR: positionRiskReward(position),
    lastEvaluatedIndex: candleIndex,
  };
}

export function evaluatePositionOnCandle(
  position: SimulatedPosition,
  candle: BacktestCandle,
  candleIndex: number
): SimulatedPosition {
  if (
    !positionLevelsAreValid(position) ||
    !["PENDING", "OPEN"].includes(position.status) ||
    candleIndex <= position.placedAtIndex ||
    candleIndex <= position.lastEvaluatedIndex
  ) {
    return position;
  }

  let next = { ...position, lastEvaluatedIndex: candleIndex };

  if (next.status === "PENDING") {
    const entryTouched = candle.low <= next.entry && candle.high >= next.entry;
    if (!entryTouched) return next;
    next = { ...next, status: "OPEN", openedAtIndex: candleIndex };
  }

  const stopHit = next.direction === "LONG"
    ? candle.low <= next.stopLoss
    : candle.high >= next.stopLoss;
  const targetHit = next.direction === "LONG"
    ? candle.high >= next.takeProfit
    : candle.low <= next.takeProfit;

  // OHLC data does not reveal which level was touched first inside one candle.
  // A conservative backtest counts a simultaneous SL/TP touch as a stop loss.
  if (stopHit) return closeAtStop(next, candleIndex);
  if (targetHit) return closeAtTarget(next, candleIndex);
  return next;
}
