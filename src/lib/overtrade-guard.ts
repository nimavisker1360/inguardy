export type OvertradeGuardReason =
  | "PROP_RULE_BREACHED"
  | "CHALLENGE_PASSED"
  | "MANUAL_PAUSE"
  | "DAILY_ENTRY_LIMIT"
  | "CONSECUTIVE_LOSS_LIMIT"
  | "LOSS_COOLDOWN"
  | "PROP_RISK_WARNING"
  | "STALE_BROKER_DATA";

export type OvertradeGuardStatus = "DISABLED" | "OPEN" | "CAUTION" | "LOCKED";

export type OvertradeGuardDecision = {
  status: OvertradeGuardStatus;
  entryAllowed: boolean;
  reasons: OvertradeGuardReason[];
  dailyEntries: number;
  consecutiveLosses: number;
  cooldownUntil: string | null;
  manualPauseUntil: string | null;
};

export function countConsecutiveLosses(
  closedTrades: Array<{ profitLoss?: unknown; commission?: unknown; swap?: unknown }>,
  netPnl: (trade: { profitLoss?: unknown; commission?: unknown; swap?: unknown }) => number
) {
  let losses = 0;
  for (const trade of closedTrades) {
    if (netPnl(trade) >= 0) break;
    losses += 1;
  }
  return losses;
}

export function evaluateOvertradeGuard(input: {
  now: Date;
  enabled: boolean;
  challengeStatus: "Active" | "Passed" | "Failed - Daily Loss" | "Failed - Max Loss";
  propRiskLevel: "SAFE" | "WARNING" | "BREACHED" | "PASSED";
  syncStatus: "LIVE" | "STALE" | "NO_TELEMETRY" | "MANUAL";
  maxDailyEntries: number | null;
  maxConsecutiveLosses: number | null;
  lossCooldownMinutes: number | null;
  manualPauseUntil: Date | null;
  dailyEntries: number;
  consecutiveLosses: number;
  lastLossAt: Date | null;
}): OvertradeGuardDecision {
  const reasons: OvertradeGuardReason[] = [];
  const push = (reason: OvertradeGuardReason) => {
    if (!reasons.includes(reason)) reasons.push(reason);
  };

  if (input.challengeStatus.startsWith("Failed") || input.propRiskLevel === "BREACHED") {
    push("PROP_RULE_BREACHED");
  } else if (input.challengeStatus === "Passed" || input.propRiskLevel === "PASSED") {
    push("CHALLENGE_PASSED");
  }

  const activePause = input.manualPauseUntil && input.manualPauseUntil > input.now
    ? input.manualPauseUntil
    : null;
  let cooldownUntil: Date | null = null;

  if (input.enabled) {
    if (activePause) push("MANUAL_PAUSE");
    if (input.maxDailyEntries !== null && input.dailyEntries >= input.maxDailyEntries) {
      push("DAILY_ENTRY_LIMIT");
    }
    if (
      input.maxConsecutiveLosses !== null &&
      input.consecutiveLosses >= input.maxConsecutiveLosses
    ) {
      push("CONSECUTIVE_LOSS_LIMIT");
    }
    if (input.lastLossAt && input.lossCooldownMinutes) {
      const until = new Date(input.lastLossAt.getTime() + input.lossCooldownMinutes * 60_000);
      if (until > input.now) {
        cooldownUntil = until;
        push("LOSS_COOLDOWN");
      }
    }
    if (input.propRiskLevel === "WARNING") push("PROP_RISK_WARNING");
    if (input.syncStatus === "STALE" || input.syncStatus === "NO_TELEMETRY") {
      push("STALE_BROKER_DATA");
    }
  }

  const locked = reasons.some((reason) =>
    reason === "PROP_RULE_BREACHED" ||
    reason === "CHALLENGE_PASSED" ||
    reason === "MANUAL_PAUSE" ||
    reason === "DAILY_ENTRY_LIMIT" ||
    reason === "CONSECUTIVE_LOSS_LIMIT" ||
    reason === "LOSS_COOLDOWN"
  );
  const status: OvertradeGuardStatus = locked
    ? "LOCKED"
    : !input.enabled
      ? "DISABLED"
      : reasons.length
        ? "CAUTION"
        : "OPEN";

  return {
    status,
    entryAllowed: !locked,
    reasons,
    dailyEntries: input.dailyEntries,
    consecutiveLosses: input.consecutiveLosses,
    cooldownUntil: cooldownUntil?.toISOString() ?? null,
    manualPauseUntil: activePause?.toISOString() ?? null,
  };
}
