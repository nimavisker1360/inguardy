import type { RiskLevel, RiskReason } from "./engine";

const RANK: Record<RiskLevel, number> = { SAFE: 0, WARNING: 1, HIGH_RISK: 2, CRITICAL: 3 };
const SCORE_FLOOR: Record<RiskLevel, number> = { SAFE: 0, WARNING: 31, HIGH_RISK: 51, CRITICAL: 86 };
const SCORE_CEILING: Record<RiskLevel, number> = { SAFE: 30, WARNING: 50, HIGH_RISK: 85, CRITICAL: 100 };

// Older Risk Guardian builds promoted these behavioural signals to HIGH_RISK.
// They are warnings under the current policy; material account-risk reasons
// (margin, drawdown, exposure, free margin and loss velocity) remain untouched.
const CURRENT_WARNING_CODES = new Set([
  "SYMBOL_CONCENTRATION_HIGH",
  "LOT_SIZE_ABOVE_NORMAL",
  "POSITION_COUNT_ABOVE_NORMAL",
  "TRADING_FREQUENCY_ABOVE_NORMAL",
  "DAILY_LOSS_ABOVE_NORMAL",
  "RISK_PER_TRADE_ABOVE_NORMAL",
  "RAPID_MARGIN_DECLINE",
]);

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === "SAFE" || value === "WARNING" || value === "HIGH_RISK" || value === "CRITICAL";
}

function isReasonSeverity(value: unknown): value is Exclude<RiskLevel, "SAFE"> {
  return value === "WARNING" || value === "HIGH_RISK" || value === "CRITICAL";
}

export function normalizeStoredRiskReasons(value: unknown): RiskReason[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item !== "object") return [];
    const reason = item as Partial<RiskReason>;
    if (typeof reason.code !== "string" || !isReasonSeverity(reason.severity) || typeof reason.currentValue !== "number") return [];
    return [{ ...reason, severity: CURRENT_WARNING_CODES.has(reason.code) ? "WARNING" : reason.severity } as RiskReason];
  });
}

type StoredRiskAlert = { riskLevel: string; riskScore: number; reasons: unknown };
type NormalizedStoredRiskAlert<T extends StoredRiskAlert> = Omit<T, keyof StoredRiskAlert> & {
  riskLevel: string;
  riskScore: number;
  reasons: RiskReason[];
};

export function normalizeStoredRiskAlert<T extends StoredRiskAlert>(event: T): NormalizedStoredRiskAlert<T> {
  const reasons = normalizeStoredRiskReasons(event.reasons);
  if (event.riskLevel === "SAFE" || reasons.length === 0) return { ...event, reasons } as NormalizedStoredRiskAlert<T>;

  const riskLevel = reasons.reduce<RiskLevel>((level, reason) =>
    RANK[reason.severity] > RANK[level] ? reason.severity : level, "SAFE");
  if (riskLevel === event.riskLevel) return { ...event, reasons } as NormalizedStoredRiskAlert<T>;

  const previousLevel = isRiskLevel(event.riskLevel) ? event.riskLevel : riskLevel;
  const riskScore = event.riskScore === SCORE_FLOOR[previousLevel]
    ? SCORE_FLOOR[riskLevel]
    : Math.min(SCORE_CEILING[riskLevel], Math.max(SCORE_FLOOR[riskLevel], event.riskScore));
  return { ...event, riskLevel, riskScore, reasons } as NormalizedStoredRiskAlert<T>;
}
