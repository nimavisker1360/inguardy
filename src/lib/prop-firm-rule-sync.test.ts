import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePropFirmRuleMetrics,
  getPropFirmDayKey,
  getPropFirmDayStart,
  netTradePnl,
} from "./prop-firm-rule-sync";

test("prop firm metrics include floating P/L in daily and total loss", () => {
  const metrics = calculatePropFirmRuleMetrics({
    startingBalance: 10_000,
    currentBalance: 9_800,
    currentEquity: 9_500,
    floatingPnl: -300,
    challengeClosedPnl: -200,
    todayClosedPnl: -100,
    dayStartBalance: 9_900,
    profitTarget: 1_000,
    maxDailyLoss: 500,
    maxTotalLoss: 1_000,
    warningThreshold: 80,
  });

  assert.equal(metrics.todayPnl, -400);
  assert.equal(metrics.dailyLossUsed, 400);
  assert.equal(metrics.dailyLossUsedPercent, 80);
  assert.equal(metrics.totalLossUsed, 500);
  assert.equal(metrics.riskLevel, "WARNING");
});

test("a loss exactly at the limit is a breach and takes priority over target", () => {
  const metrics = calculatePropFirmRuleMetrics({
    startingBalance: 10_000,
    currentBalance: 11_000,
    currentEquity: 10_500,
    floatingPnl: -500,
    challengeClosedPnl: 1_000,
    todayClosedPnl: 0,
    dayStartBalance: 11_000,
    profitTarget: 1_000,
    maxDailyLoss: 500,
    maxTotalLoss: 1_000,
  });

  assert.equal(metrics.computedStatus, "Failed - Daily Loss");
  assert.equal(metrics.riskLevel, "BREACHED");
});

test("broker day boundaries respect the configured IANA time zone", () => {
  const now = new Date("2026-09-11T02:30:00.000Z");
  const start = getPropFirmDayStart(now, "America/New_York");

  assert.equal(start.toISOString(), "2026-09-10T04:00:00.000Z");
  assert.equal(getPropFirmDayKey(now, "America/New_York"), "2026-09-10");
});

test("net trade P/L includes commission and swap", () => {
  assert.equal(netTradePnl({ profitLoss: 100, commission: -4, swap: -1.5 }), 94.5);
});
