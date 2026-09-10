export type PositionSizingDirection = "BUY" | "SELL";
export type PositionSizingRiskMode = "PERCENT" | "AMOUNT";

export type PositionSizingIssueCode =
  | "INVALID_BALANCE"
  | "INVALID_RISK"
  | "RISK_EXCEEDS_BALANCE"
  | "INVALID_ENTRY"
  | "INVALID_STOP_LOSS"
  | "BUY_STOP_MUST_BE_BELOW_ENTRY"
  | "SELL_STOP_MUST_BE_ABOVE_ENTRY"
  | "INVALID_RISK_REWARD"
  | "INVALID_TICK_SIZE"
  | "INVALID_TICK_VALUE"
  | "INVALID_VOLUME_RULES";

export type PositionSizingWarningCode =
  | "HIGH_RISK_PERCENT"
  | "BELOW_MIN_VOLUME"
  | "CAPPED_AT_MAX_VOLUME";

export type PositionSizingInput = {
  balance: number;
  riskMode: PositionSizingRiskMode;
  riskValue: number;
  direction: PositionSizingDirection;
  entryPrice: number;
  stopLoss: number;
  riskReward: number;
  tickSize: number;
  tickValue: number;
  minVolume?: number | null;
  maxVolume?: number | null;
  volumeStep?: number | null;
};

export type PositionSizingResult = {
  valid: boolean;
  errors: PositionSizingIssueCode[];
  warnings: PositionSizingWarningCode[];
  targetRiskAmount: number;
  stopDistance: number;
  stopTicks: number;
  riskPerLot: number;
  rawLotSize: number;
  lotSize: number;
  volumePrecision: number;
  actualRiskAmount: number;
  potentialReward: number;
  takeProfit: number;
};

const DEFAULT_MIN_VOLUME = 0.01;
const DEFAULT_VOLUME_STEP = 0.01;

function finitePositive(value: number) {
  return Number.isFinite(value) && value > 0;
}

function decimalPlaces(value: number) {
  for (let precision = 0; precision <= 8; precision += 1) {
    const scaled = value * 10 ** precision;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-8) {
      return precision;
    }
  }
  return 8;
}

function round(value: number, precision = 12) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function normalizeVolumeDown(rawVolume: number, minimum: number, step: number) {
  if (rawVolume < minimum) return 0;
  const increments = Math.floor((rawVolume - minimum + step * 1e-9) / step);
  return round(minimum + increments * step, decimalPlaces(step));
}

function emptyResult(errors: PositionSizingIssueCode[]): PositionSizingResult {
  return {
    valid: false,
    errors,
    warnings: [],
    targetRiskAmount: 0,
    stopDistance: 0,
    stopTicks: 0,
    riskPerLot: 0,
    rawLotSize: 0,
    lotSize: 0,
    volumePrecision: 2,
    actualRiskAmount: 0,
    potentialReward: 0,
    takeProfit: 0,
  };
}

export function calculatePositionSize(input: PositionSizingInput): PositionSizingResult {
  const errors: PositionSizingIssueCode[] = [];
  const minimum = input.minVolume ?? DEFAULT_MIN_VOLUME;
  const maximum = input.maxVolume ?? null;
  const step = input.volumeStep ?? DEFAULT_VOLUME_STEP;

  if (!finitePositive(input.balance)) errors.push("INVALID_BALANCE");
  if (!finitePositive(input.riskValue) || (input.riskMode === "PERCENT" && input.riskValue > 100)) {
    errors.push("INVALID_RISK");
  }
  if (!finitePositive(input.entryPrice)) errors.push("INVALID_ENTRY");
  if (!finitePositive(input.stopLoss)) errors.push("INVALID_STOP_LOSS");
  if (!finitePositive(input.riskReward)) errors.push("INVALID_RISK_REWARD");
  if (!finitePositive(input.tickSize)) errors.push("INVALID_TICK_SIZE");
  if (!finitePositive(input.tickValue)) errors.push("INVALID_TICK_VALUE");
  if (
    !finitePositive(minimum) ||
    !finitePositive(step) ||
    (maximum !== null && (!finitePositive(maximum) || maximum < minimum))
  ) {
    errors.push("INVALID_VOLUME_RULES");
  }

  if (finitePositive(input.entryPrice) && finitePositive(input.stopLoss)) {
    if (input.direction === "BUY" && input.stopLoss >= input.entryPrice) {
      errors.push("BUY_STOP_MUST_BE_BELOW_ENTRY");
    }
    if (input.direction === "SELL" && input.stopLoss <= input.entryPrice) {
      errors.push("SELL_STOP_MUST_BE_ABOVE_ENTRY");
    }
  }

  const targetRiskAmount = input.riskMode === "PERCENT"
    ? input.balance * (input.riskValue / 100)
    : input.riskValue;

  if (Number.isFinite(targetRiskAmount) && targetRiskAmount > input.balance) {
    errors.push("RISK_EXCEEDS_BALANCE");
  }

  if (errors.length) return emptyResult([...new Set(errors)]);

  const stopDistance = Math.abs(input.entryPrice - input.stopLoss);
  const stopTicks = stopDistance / input.tickSize;
  const riskPerLot = stopTicks * input.tickValue;

  if (!finitePositive(stopDistance) || !finitePositive(stopTicks) || !finitePositive(riskPerLot)) {
    return emptyResult(["INVALID_STOP_LOSS"]);
  }

  const warnings: PositionSizingWarningCode[] = [];
  if (input.riskMode === "PERCENT" && input.riskValue > 5) {
    warnings.push("HIGH_RISK_PERCENT");
  }

  const rawLotSize = targetRiskAmount / riskPerLot;
  let lotSize = normalizeVolumeDown(rawLotSize, minimum, step);

  if (lotSize === 0) {
    warnings.push("BELOW_MIN_VOLUME");
  } else if (maximum !== null && lotSize > maximum) {
    lotSize = normalizeVolumeDown(maximum, minimum, step);
    warnings.push("CAPPED_AT_MAX_VOLUME");
  }

  const actualRiskAmount = riskPerLot * lotSize;
  const takeProfit = input.direction === "BUY"
    ? input.entryPrice + stopDistance * input.riskReward
    : input.entryPrice - stopDistance * input.riskReward;

  return {
    valid: true,
    errors: [],
    warnings,
    targetRiskAmount: round(targetRiskAmount, 8),
    stopDistance: round(stopDistance),
    stopTicks: round(stopTicks),
    riskPerLot: round(riskPerLot, 8),
    rawLotSize: round(rawLotSize),
    lotSize,
    volumePrecision: decimalPlaces(step),
    actualRiskAmount: round(actualRiskAmount, 8),
    potentialReward: round(actualRiskAmount * input.riskReward, 8),
    takeProfit: round(takeProfit),
  };
}
