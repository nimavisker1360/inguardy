export type RiskLevel = "SAFE" | "WARNING" | "HIGH_RISK" | "CRITICAL";
export type RiskMode = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "CUSTOM";
export type RiskReason = {
  code: string;
  severity: Exclude<RiskLevel, "SAFE">;
  currentValue: number;
  threshold?: number;
  previousValue?: number;
  changePercent?: number;
  periodMinutes?: number;
  baselineValue?: number;
  multiplier?: number;
  symbol?: string;
};
export type RiskSettingsValues = {
  enabled: boolean; riskMode: RiskMode;
  warningMarginLevel: number; highRiskMarginLevel: number; criticalMarginLevel: number;
  marginCallLevel: number | null; stopOutLevel: number | null;
  maxDailyDrawdown: number; maxTotalDrawdown: number; maxOpenPositions: number;
  maxTotalLots: number; maxExposurePercent: number; lossVelocityThreshold: number;
  emailAlerts: boolean; inAppAlerts: boolean; pushAlerts: boolean; telegramAlerts: boolean;
  notificationCooldownMinutes: number;
};
export type RiskSnapshot = {
  timestamp: Date; balance: number; equity: number; margin: number | null;
  freeMargin: number | null; marginLevel: number | null;
};
export type RiskPosition = { symbol: string; direction: "BUY" | "SELL"; lots: number; pnl: number | null; riskAmount?: number | null };
export type RiskMetrics = {
  balance: number; equity: number; usedMargin: number | null; freeMargin: number | null;
  marginLevel: number | null; marginCallLevel: number; stopOutLevel: number;
  stopOutSource: "BROKER" | "USER" | "DEFAULT";
  dailyDrawdown: number | null; totalDrawdown: number | null;
  totalLots: number; openPositions: number; longLots: number; shortLots: number;
  perSymbol: { symbol: string; lots: number; percent: number }[];
  totalFloatingLoss: number; marginUtilizationPercent: number | null;
  equityChange5m: number | null; equityChange15m: number | null; equityChange30m: number | null;
  marginChange5m: number | null; marginChange15m: number | null; marginChange30m: number | null;
  equityChangePercent: number | null; marginChangePercent: number | null;
  rapidLossDetected: boolean;
  distanceToCriticalMargin: number | null; distanceToStopOut: number | null;
  estimatedEquityBuffer: number | null;
};
export type RiskEvaluation = { level: RiskLevel; score: number; reasons: RiskReason[]; metrics: RiskMetrics; evaluatedAt: Date };

export const PRESETS: Record<Exclude<RiskMode, "CUSTOM">, Pick<RiskSettingsValues,
  "warningMarginLevel" | "highRiskMarginLevel" | "criticalMarginLevel" | "maxDailyDrawdown" |
  "maxTotalDrawdown" | "maxOpenPositions" | "maxTotalLots" | "maxExposurePercent" | "lossVelocityThreshold">> = {
  CONSERVATIVE: { warningMarginLevel: 400, highRiskMarginLevel: 300, criticalMarginLevel: 200, maxDailyDrawdown: 3, maxTotalDrawdown: 6, maxOpenPositions: 5, maxTotalLots: 2, maxExposurePercent: 35, lossVelocityThreshold: 6 },
  BALANCED: { warningMarginLevel: 300, highRiskMarginLevel: 200, criticalMarginLevel: 150, maxDailyDrawdown: 5, maxTotalDrawdown: 10, maxOpenPositions: 10, maxTotalLots: 5, maxExposurePercent: 50, lossVelocityThreshold: 10 },
  AGGRESSIVE: { warningMarginLevel: 200, highRiskMarginLevel: 150, criticalMarginLevel: 120, maxDailyDrawdown: 8, maxTotalDrawdown: 20, maxOpenPositions: 20, maxTotalLots: 15, maxExposurePercent: 70, lossVelocityThreshold: 15 },
};
export const DEFAULT_SETTINGS: RiskSettingsValues = {
  enabled: true, riskMode: "BALANCED", ...PRESETS.BALANCED,
  marginCallLevel: null, stopOutLevel: null, emailAlerts: true, inAppAlerts: true,
  pushAlerts: false, telegramAlerts: false, notificationCooldownMinutes: 15,
};

const RANK: Record<RiskLevel, number> = { SAFE: 0, WARNING: 1, HIGH_RISK: 2, CRITICAL: 3 };
const WEIGHTS = { margin: 35, drawdown: 30, exposure: 15, velocity: 10, positions: 5, dailyLoss: 5 } as const;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const percentLoss = (current: number, baseline: number | null) => baseline !== null && baseline > 0
  ? Math.max(0, (baseline - current) / baseline * 100) : null;
function baselineAt(history: RiskSnapshot[], now: Date, minutes: number) {
  const target = now.getTime() - minutes * 60_000;
  const tolerance = Math.min(5, minutes * 0.5) * 60_000;
  return history.filter(row => Math.abs(row.timestamp.getTime() - target) <= tolerance)
    .sort((a, b) => Math.abs(a.timestamp.getTime() - target) - Math.abs(b.timestamp.getTime() - target))[0] ?? null;
}
function levelAtMargin(value: number, settings: RiskSettingsValues): RiskLevel {
  if (value <= settings.criticalMarginLevel) return "CRITICAL";
  if (value <= settings.highRiskMarginLevel) return "HIGH_RISK";
  if (value <= settings.warningMarginLevel) return "WARNING";
  return "SAFE";
}
export function calculateDrawdown(equity: number, dayOpeningBalance: number | null, peakEquity: number | null) {
  return { dailyDrawdown: percentLoss(equity, dayOpeningBalance), totalDrawdown: percentLoss(equity, peakEquity) };
}
export function evaluateRisk(input: {
  current: RiskSnapshot; history: RiskSnapshot[]; positions: RiskPosition[];
  settings: RiskSettingsValues; dayOpeningBalance: number | null; peakEquity: number | null;
  averageLotSize: number | null; averageTradesPerDay?: number | null; tradesToday?: number | null;
  averageDailyLoss?: number | null; lossToday?: number | null; averageRiskPerTrade?: number | null;
  brokerMarginCallLevel?: number | null; brokerStopOutLevel?: number | null;
}): RiskEvaluation {
  const { current, settings, positions } = input;
  const usedMargin = current.margin !== null && current.margin >= 0 ? current.margin : null;
  const marginLevel = usedMargin !== null && usedMargin > 0 ? current.equity / usedMargin * 100 : null;
  const brokerStop = input.brokerStopOutLevel;
  const stopOutSource = brokerStop != null && brokerStop > 0 ? "BROKER" : settings.stopOutLevel != null ? "USER" : "DEFAULT";
  const stopOutLevel = stopOutSource === "BROKER" ? brokerStop! : stopOutSource === "USER" ? settings.stopOutLevel! : 50;
  const marginCallLevel = input.brokerMarginCallLevel && input.brokerMarginCallLevel > 0
    ? input.brokerMarginCallLevel : settings.marginCallLevel ?? 100;
  const { dailyDrawdown, totalDrawdown } = calculateDrawdown(current.equity, input.dayOpeningBalance, input.peakEquity);
  const totalLots = positions.reduce((sum, row) => sum + Math.max(0, row.lots), 0);
  const longLots = positions.filter(row => row.direction === "BUY").reduce((sum, row) => sum + Math.max(0, row.lots), 0);
  const bySymbol = new Map<string, number>();
  for (const row of positions) bySymbol.set(row.symbol, (bySymbol.get(row.symbol) ?? 0) + Math.max(0, row.lots));
  const perSymbol = [...bySymbol].map(([symbol, lots]) => ({ symbol, lots, percent: totalLots > 0 ? lots / totalLots * 100 : 0 })).sort((a, b) => b.lots - a.lots);
  const changes = [5, 15, 30].map(minutes => {
    const previous = baselineAt(input.history, current.timestamp, minutes);
    return previous ? { equity: current.equity - previous.equity,
      equityPercent: previous.equity > 0 ? (current.equity - previous.equity) / previous.equity * 100 : null,
      margin: marginLevel !== null && previous.margin !== null && previous.margin > 0 ? marginLevel - previous.equity / previous.margin * 100 : null,
      marginPercent: marginLevel !== null && previous.margin !== null && previous.margin > 0 ? (marginLevel / (previous.equity / previous.margin * 100) - 1) * 100 : null,
      previousMargin: previous.margin !== null && previous.margin > 0 ? previous.equity / previous.margin * 100 : null,
    } : null;
  });
  const trend = changes[1] ?? changes[2] ?? changes[0];
  const rapidEquity = changes.some(change => change?.equityPercent !== null && change?.equityPercent !== undefined && change.equityPercent <= -settings.lossVelocityThreshold);
  const rapidMargin = changes.some(change => change?.marginPercent !== null && change?.marginPercent !== undefined && change.marginPercent <= -settings.lossVelocityThreshold);
  const marginUtilizationPercent = usedMargin !== null && current.equity > 0 ? usedMargin / current.equity * 100 : null;
  const metrics: RiskMetrics = {
    balance: current.balance, equity: current.equity, usedMargin, freeMargin: current.freeMargin,
    marginLevel, marginCallLevel, stopOutLevel, stopOutSource, dailyDrawdown, totalDrawdown,
    totalLots, openPositions: positions.length, longLots, shortLots: totalLots - longLots,
    perSymbol, totalFloatingLoss: positions.reduce((sum, row) => sum + Math.min(0, row.pnl ?? 0), 0),
    marginUtilizationPercent,
    equityChange5m: changes[0]?.equity ?? null, equityChange15m: changes[1]?.equity ?? null, equityChange30m: changes[2]?.equity ?? null,
    marginChange5m: changes[0]?.margin ?? null, marginChange15m: changes[1]?.margin ?? null, marginChange30m: changes[2]?.margin ?? null,
    equityChangePercent: trend?.equityPercent ?? null, marginChangePercent: trend?.marginPercent ?? null,
    rapidLossDetected: rapidEquity || rapidMargin,
    distanceToCriticalMargin: marginLevel === null ? null : marginLevel - settings.criticalMarginLevel,
    distanceToStopOut: marginLevel === null ? null : marginLevel - stopOutLevel,
    estimatedEquityBuffer: usedMargin !== null && usedMargin > 0 ? current.equity - usedMargin * settings.criticalMarginLevel / 100 : null,
  };
  const reasons: RiskReason[] = [];
  const add = (reason: RiskReason) => reasons.push(reason);
  if (current.equity <= 0) add({ code: "EQUITY_NON_POSITIVE", severity: "CRITICAL", currentValue: current.equity });
  if (marginLevel !== null) {
    const severity = levelAtMargin(marginLevel, settings);
    if (severity !== "SAFE") add({ code: severity === "CRITICAL" ? "MARGIN_LEVEL_CRITICAL" : "MARGIN_LEVEL_LOW", severity, currentValue: marginLevel, threshold: settings[severity === "CRITICAL" ? "criticalMarginLevel" : severity === "HIGH_RISK" ? "highRiskMarginLevel" : "warningMarginLevel"] });
    if (marginLevel <= marginCallLevel) add({ code: "MARGIN_CALL_REACHED", severity: "CRITICAL", currentValue: marginLevel, threshold: marginCallLevel });
    else if (marginLevel <= marginCallLevel * 1.25) add({ code: "MARGIN_CALL_APPROACHING", severity: "HIGH_RISK", currentValue: marginLevel, threshold: marginCallLevel });
    if (marginLevel <= stopOutLevel * 1.25) add({ code: "STOP_OUT_PROXIMITY", severity: marginLevel <= stopOutLevel ? "CRITICAL" : "HIGH_RISK", currentValue: marginLevel, threshold: stopOutLevel });
  }
  if (dailyDrawdown !== null && dailyDrawdown >= settings.maxDailyDrawdown) add({ code: "DAILY_DRAWDOWN_HIGH", severity: dailyDrawdown >= settings.maxDailyDrawdown * 1.5 ? "CRITICAL" : "HIGH_RISK", currentValue: dailyDrawdown, threshold: settings.maxDailyDrawdown });
  if (totalDrawdown !== null && totalDrawdown >= settings.maxTotalDrawdown) add({ code: "TOTAL_DRAWDOWN_HIGH", severity: totalDrawdown >= settings.maxTotalDrawdown * 1.5 ? "CRITICAL" : "HIGH_RISK", currentValue: totalDrawdown, threshold: settings.maxTotalDrawdown });
  if (current.freeMargin !== null && current.equity > 0 && current.freeMargin / current.equity < 0.1) add({ code: "FREE_MARGIN_LOW", severity: current.freeMargin <= 0 ? "CRITICAL" : "HIGH_RISK", currentValue: current.freeMargin, threshold: current.equity * 0.1 });
  if (marginUtilizationPercent !== null && marginUtilizationPercent >= settings.maxExposurePercent) add({ code: "EXCESSIVE_EXPOSURE", severity: "HIGH_RISK", currentValue: marginUtilizationPercent, threshold: settings.maxExposurePercent });
  if (totalLots > settings.maxTotalLots) add({ code: "EXCESSIVE_EXPOSURE", severity: "WARNING", currentValue: totalLots, threshold: settings.maxTotalLots });
  if (positions.length > settings.maxOpenPositions) add({ code: "POSITION_COUNT_ABOVE_NORMAL", severity: "WARNING", currentValue: positions.length, threshold: settings.maxOpenPositions });
  if (perSymbol[0]?.percent >= 70 && positions.length > 1) add({ code: "SYMBOL_CONCENTRATION_HIGH", severity: "WARNING", currentValue: perSymbol[0].percent, threshold: 70, symbol: perSymbol[0].symbol });
  const currentAverageLot = positions.length ? totalLots / positions.length : 0;
  if (input.averageLotSize !== null && input.averageLotSize > 0 && currentAverageLot >= input.averageLotSize * 3) add({ code: "LOT_SIZE_ABOVE_NORMAL", severity: "WARNING", currentValue: currentAverageLot, baselineValue: input.averageLotSize, multiplier: currentAverageLot / input.averageLotSize });
  if (input.averageTradesPerDay != null && input.averageTradesPerDay > 0 && input.tradesToday != null && input.tradesToday >= Math.max(5, input.averageTradesPerDay * 3)) add({ code: "TRADING_FREQUENCY_ABOVE_NORMAL", severity: "WARNING", currentValue: input.tradesToday, baselineValue: input.averageTradesPerDay, multiplier: input.tradesToday / input.averageTradesPerDay });
  // A loss can be unusual relative to a trader's own history while still being
  // small compared with the account. Treat that behavioral signal as a warning;
  // material account risk is promoted separately by the drawdown, margin,
  // exposure, free-margin, and loss-velocity rules above.
  if (input.averageDailyLoss != null && input.averageDailyLoss > 0 && input.lossToday != null && input.lossToday >= input.averageDailyLoss * 3) add({ code: "DAILY_LOSS_ABOVE_NORMAL", severity: "WARNING", currentValue: input.lossToday, baselineValue: input.averageDailyLoss, multiplier: input.lossToday / input.averageDailyLoss });
  const openRiskAmounts = positions.map(row => row.riskAmount).filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  const averageOpenRisk = openRiskAmounts.length ? openRiskAmounts.reduce((sum, value) => sum + value, 0) / openRiskAmounts.length : null;
  if (input.averageRiskPerTrade != null && input.averageRiskPerTrade > 0 && averageOpenRisk != null && averageOpenRisk >= input.averageRiskPerTrade * 3) add({ code: "RISK_PER_TRADE_ABOVE_NORMAL", severity: "WARNING", currentValue: averageOpenRisk, baselineValue: input.averageRiskPerTrade, multiplier: averageOpenRisk / input.averageRiskPerTrade });
  if (rapidEquity) add({ code: "RAPID_EQUITY_LOSS", severity: "HIGH_RISK", currentValue: current.equity, previousValue: current.equity - (trend?.equity ?? 0), changePercent: trend?.equityPercent ?? undefined, periodMinutes: changes[1] ? 15 : changes[2] ? 30 : 5 });
  // A fast percentage change can happen while the absolute margin level is
  // still very safe (for example 4,800% to 3,900%). Keep the velocity signal
  // visible as a warning; the absolute margin rules above promote the account
  // when it actually crosses a high-risk or critical threshold.
  if (rapidMargin && marginLevel !== null) add({ code: "RAPID_MARGIN_DECLINE", severity: "WARNING", currentValue: marginLevel, previousValue: trend?.previousMargin ?? undefined, changePercent: trend?.marginPercent ?? undefined, periodMinutes: changes[1] ? 15 : changes[2] ? 30 : 5 });
  const level = reasons.reduce<RiskLevel>((acc, reason) => RANK[reason.severity] > RANK[acc] ? reason.severity : acc, "SAFE");
  const marginRisk = marginLevel === null ? 0 : clamp((settings.warningMarginLevel - marginLevel) / Math.max(1, settings.warningMarginLevel - stopOutLevel));
  const score = Math.round(
    WEIGHTS.margin * marginRisk + WEIGHTS.drawdown * Math.max(clamp((totalDrawdown ?? 0) / settings.maxTotalDrawdown), clamp((dailyDrawdown ?? 0) / settings.maxDailyDrawdown)) +
    WEIGHTS.exposure * Math.max(clamp(totalLots / settings.maxTotalLots), clamp((marginUtilizationPercent ?? 0) / settings.maxExposurePercent)) +
    WEIGHTS.velocity * clamp(Math.abs(Math.min(0, trend?.equityPercent ?? 0, trend?.marginPercent ?? 0)) / settings.lossVelocityThreshold) +
    WEIGHTS.positions * clamp(positions.length / settings.maxOpenPositions) +
    WEIGHTS.dailyLoss * clamp((dailyDrawdown ?? 0) / settings.maxDailyDrawdown)
  );
  const levelFloor: Record<RiskLevel, number> = { SAFE: 0, WARNING: 31, HIGH_RISK: 51, CRITICAL: 86 };
  return { level, score: Math.min(100, Math.max(levelFloor[level], score)), reasons, metrics, evaluatedAt: current.timestamp };
}

const MARGIN_CALL_REASONS = ["MARGIN_CALL_APPROACHING", "MARGIN_CALL_REACHED"];
export function marginCallReasonCodes(reasons: readonly RiskReason[]): string[] {
  return MARGIN_CALL_REASONS.filter(code => reasons.some(reason => reason.code === code));
}
export function marginCallTransition(previous: readonly RiskReason[], current: readonly RiskReason[]) {
  const previousCodes = marginCallReasonCodes(previous);
  const currentCodes = marginCallReasonCodes(current);
  return {
    changed: previousCodes.join() !== currentCodes.join(),
    newAlert: currentCodes.some(code => !previousCodes.includes(code)),
  };
}

export function simulateLoss(evaluation: RiskEvaluation, settings: RiskSettingsValues, additionalLoss: number) {
  if (!Number.isFinite(additionalLoss) || additionalLoss < 0) throw new Error("Loss must be nonnegative");
  const { equity, usedMargin, freeMargin } = evaluation.metrics;
  const projectedEquity = equity - additionalLoss;
  const projectedFreeMargin = freeMargin === null ? null : freeMargin - additionalLoss;
  const projectedMarginLevel = usedMargin !== null && usedMargin > 0 ? projectedEquity / usedMargin * 100 : null;
  const projectedRiskLevel = projectedEquity <= 0 ? "CRITICAL" : projectedMarginLevel === null ? evaluation.level
    : RANK[levelAtMargin(projectedMarginLevel, settings)] > RANK[evaluation.level] ? levelAtMargin(projectedMarginLevel, settings) : evaluation.level;
  return { projectedEquity, projectedFreeMargin, projectedMarginLevel, projectedRiskLevel, estimated: true };
}

export function shouldNotify(previous: RiskLevel, next: RiskLevel, lastNotifiedAt: Date | null, now: Date, cooldownMinutes: number, materiallyWorse = false) {
  if (next === "SAFE") return false;
  if (RANK[next] > RANK[previous]) return true;
  return materiallyWorse && (!lastNotifiedAt || now.getTime() - lastNotifiedAt.getTime() >= cooldownMinutes * 60_000);
}
