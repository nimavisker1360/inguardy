export const PROP_FIRM_RULE_PROFILES = [
  {
    id: "CUSTOM",
    labelEn: "Custom rules",
    labelFa: "قوانین سفارشی",
    profitTargetPercent: null,
    maxDailyLossPercent: null,
    maxTotalLossPercent: null,
  },
  {
    id: "STANDARD_10_5_10",
    labelEn: "Standard 10 / 5 / 10",
    labelFa: "استاندارد ۱۰ / ۵ / ۱۰",
    profitTargetPercent: 10,
    maxDailyLossPercent: 5,
    maxTotalLossPercent: 10,
  },
  {
    id: "TWO_STEP_8_5_10",
    labelEn: "Two-step 8 / 5 / 10",
    labelFa: "دو مرحله‌ای ۸ / ۵ / ۱۰",
    profitTargetPercent: 8,
    maxDailyLossPercent: 5,
    maxTotalLossPercent: 10,
  },
  {
    id: "CONSERVATIVE_8_4_8",
    labelEn: "Conservative 8 / 4 / 8",
    labelFa: "محافظه‌کارانه ۸ / ۴ / ۸",
    profitTargetPercent: 8,
    maxDailyLossPercent: 4,
    maxTotalLossPercent: 8,
  },
] as const;

export const PROP_FIRM_TIME_ZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "Asia/Dubai",
  "Asia/Tehran",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

export type PropFirmComputedStatus =
  | "Active"
  | "Passed"
  | "Failed - Daily Loss"
  | "Failed - Max Loss";

export type PropFirmRiskLevel = "SAFE" | "WARNING" | "BREACHED" | "PASSED";

export function isPropFirmRuleProfile(value: string) {
  return PROP_FIRM_RULE_PROFILES.some((profile) => profile.id === value);
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtc(
  input: { year: number; month: number; day: number; hour: number; minute: number },
  timeZone: string
) {
  const desired = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute, 0, 0);
  let guess = desired;

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const actual = zonedParts(new Date(guess), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second,
      0
    );
    guess -= represented - desired;
  }

  return new Date(guess);
}

export function getPropFirmDayStart(now: Date, timeZone: string) {
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const local = zonedParts(now, safeTimeZone);

  return zonedDateTimeToUtc(
    { year: local.year, month: local.month, day: local.day, hour: 0, minute: 0 },
    safeTimeZone
  );
}

export function getPropFirmDayKey(date: Date, timeZone: string) {
  const safeTimeZone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const local = zonedParts(date, safeTimeZone);
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
}

export function netTradePnl(trade: {
  profitLoss?: unknown;
  commission?: unknown;
  swap?: unknown;
}) {
  const number = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  return number(trade.profitLoss) + number(trade.commission) + number(trade.swap);
}

export function calculatePropFirmRuleMetrics(input: {
  startingBalance: number;
  currentBalance: number;
  currentEquity: number;
  floatingPnl: number;
  challengeClosedPnl: number;
  todayClosedPnl: number;
  dayStartBalance?: number | null;
  profitTarget?: number | null;
  maxDailyLoss?: number | null;
  maxTotalLoss?: number | null;
  warningThreshold?: number;
}) {
  const profitTarget = input.profitTarget && input.profitTarget > 0 ? input.profitTarget : null;
  const maxDailyLoss = input.maxDailyLoss && input.maxDailyLoss > 0 ? input.maxDailyLoss : null;
  const maxTotalLoss = input.maxTotalLoss && input.maxTotalLoss > 0 ? input.maxTotalLoss : null;
  const warningThreshold = Math.min(Math.max(input.warningThreshold ?? 80, 1), 100);
  const challengeProfit = input.currentBalance - input.startingBalance;
  const todayPnl =
    input.dayStartBalance !== null && input.dayStartBalance !== undefined
      ? input.currentEquity - input.dayStartBalance
      : input.todayClosedPnl + input.floatingPnl;
  const dailyLossUsed = Math.max(0, -todayPnl);
  const totalLossUsed = Math.max(0, input.startingBalance - input.currentEquity);
  const dailyLossUsedPercent = maxDailyLoss ? (dailyLossUsed / maxDailyLoss) * 100 : 0;
  const totalLossUsedPercent = maxTotalLoss ? (totalLossUsed / maxTotalLoss) * 100 : 0;
  const progress = profitTarget ? (challengeProfit / profitTarget) * 100 : 0;

  let computedStatus: PropFirmComputedStatus = "Active";
  if (maxDailyLoss && dailyLossUsed >= maxDailyLoss) {
    computedStatus = "Failed - Daily Loss";
  } else if (maxTotalLoss && totalLossUsed >= maxTotalLoss) {
    computedStatus = "Failed - Max Loss";
  } else if (profitTarget && challengeProfit >= profitTarget) {
    computedStatus = "Passed";
  }

  const riskLevel: PropFirmRiskLevel =
    computedStatus.startsWith("Failed")
      ? "BREACHED"
      : computedStatus === "Passed"
        ? "PASSED"
        : Math.max(dailyLossUsedPercent, totalLossUsedPercent) >= warningThreshold
          ? "WARNING"
          : "SAFE";

  return {
    currentBalance: input.currentBalance,
    currentEquity: input.currentEquity,
    floatingPnl: input.floatingPnl,
    challengeClosedPnl: input.challengeClosedPnl,
    challengeProfit,
    todayPnl,
    dailyLossUsed,
    dailyLossUsedPercent,
    dailyLossRemaining: maxDailyLoss === null ? null : Math.max(maxDailyLoss - dailyLossUsed, 0),
    totalLossUsed,
    totalLossUsedPercent,
    totalLossRemaining: maxTotalLoss === null ? null : Math.max(maxTotalLoss - totalLossUsed, 0),
    profitTargetRemaining: profitTarget === null ? null : Math.max(profitTarget - challengeProfit, 0),
    progress,
    computedStatus,
    riskLevel,
  };
}
