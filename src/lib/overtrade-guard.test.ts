import assert from "node:assert/strict";
import test from "node:test";
import { countConsecutiveLosses, evaluateOvertradeGuard } from "./overtrade-guard";
import { netTradePnl } from "./prop-firm-rule-sync";

const now = new Date("2026-09-12T10:00:00.000Z");
const base = {
  now,
  enabled: true,
  challengeStatus: "Active" as const,
  propRiskLevel: "SAFE" as const,
  syncStatus: "LIVE" as const,
  maxDailyEntries: 3,
  maxConsecutiveLosses: 2,
  lossCooldownMinutes: 30,
  manualPauseUntil: null,
  dailyEntries: 0,
  consecutiveLosses: 0,
  lastLossAt: null,
};

test("daily entry cap locks at the exact threshold", () => {
  const decision = evaluateOvertradeGuard({ ...base, dailyEntries: 3 });
  assert.equal(decision.status, "LOCKED");
  assert.deepEqual(decision.reasons, ["DAILY_ENTRY_LIMIT"]);
});

test("cooldown expires and a manual pause is temporary", () => {
  const paused = evaluateOvertradeGuard({
    ...base,
    manualPauseUntil: new Date("2026-09-12T10:10:00.000Z"),
    lastLossAt: new Date("2026-09-12T09:40:00.000Z"),
  });
  assert.equal(paused.entryAllowed, false);
  assert.deepEqual(paused.reasons, ["MANUAL_PAUSE", "LOSS_COOLDOWN"]);

  const resumed = evaluateOvertradeGuard({
    ...base,
    manualPauseUntil: new Date("2026-09-12T09:59:00.000Z"),
    lastLossAt: new Date("2026-09-12T09:29:00.000Z"),
  });
  assert.equal(resumed.status, "OPEN");
});

test("broker data staleness warns but does not claim to block external trading", () => {
  const decision = evaluateOvertradeGuard({ ...base, syncStatus: "STALE" });
  assert.equal(decision.status, "CAUTION");
  assert.equal(decision.entryAllowed, true);
});

test("a breached prop rule stays locked when optional guard is disabled", () => {
  const decision = evaluateOvertradeGuard({
    ...base,
    enabled: false,
    challengeStatus: "Failed - Daily Loss",
  });
  assert.equal(decision.status, "LOCKED");
  assert.deepEqual(decision.reasons, ["PROP_RULE_BREACHED"]);
});

test("loss streak includes commission and stops at a non-loss", () => {
  const streak = countConsecutiveLosses(
    [
      { profitLoss: 1, commission: -3 },
      { profitLoss: -5, commission: -1 },
      { profitLoss: 2, commission: 0 },
      { profitLoss: -9 },
    ],
    netTradePnl
  );
  assert.equal(streak, 2);
});
