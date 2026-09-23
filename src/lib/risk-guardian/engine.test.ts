import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, evaluateRisk, marginCallReasonCodes, marginCallTransition, shouldNotify, simulateLoss, type RiskSnapshot } from "./engine";

const now = new Date("2026-09-19T12:00:00Z");
const current: RiskSnapshot = { timestamp: now, balance: 10_000, equity: 10_000, margin: 2_000, freeMargin: 8_000, marginLevel: 500 };
const settings = { ...DEFAULT_SETTINGS };
const run = (overrides: Partial<Parameters<typeof evaluateRisk>[0]> = {}) => evaluateRisk({
  current, history: [], positions: [], settings, dayOpeningBalance: 10_000,
  peakEquity: 10_000, averageLotSize: null, ...overrides,
});
const at = (minutesAgo: number, equity: number, margin: number): RiskSnapshot => ({ ...current, timestamp: new Date(now.getTime() - minutesAgo * 60_000), equity, margin });

test("safe account and no positions", () => { const result = run(); assert.equal(result.level, "SAFE"); assert.equal(result.metrics.totalLots, 0); });
test("warning, high risk, and critical margin thresholds", () => {
  const warning = run({ current: { ...current, margin: 4_000 } });
  const high = run({ current: { ...current, margin: 5_500 } });
  const critical = run({ current: { ...current, margin: 7_000 } });
  assert.equal(warning.level, "WARNING"); assert.ok(warning.score >= 31);
  assert.equal(high.level, "HIGH_RISK"); assert.ok(high.score >= 51);
  assert.equal(critical.level, "CRITICAL"); assert.ok(critical.score >= 86);
});
test("zero margin avoids division and margin risk", () => { const result = run({ current: { ...current, margin: 0 } }); assert.equal(result.metrics.marginLevel, null); assert.equal(result.level, "SAFE"); });
test("broker margin call creates distinct approach and reached reasons only with margin in use", () => {
  const approaching = run({ current: { ...current, equity: 1_000, margin: 1_000 }, brokerMarginCallLevel: 80 });
  const reached = run({ current: { ...current, equity: 800, margin: 1_000 }, brokerMarginCallLevel: 80 });
  const unused = run({ current: { ...current, margin: 0 }, brokerMarginCallLevel: 80 });
  assert.deepEqual(marginCallReasonCodes(approaching.reasons), ["MARGIN_CALL_APPROACHING"]);
  assert.deepEqual(marginCallReasonCodes(reached.reasons), ["MARGIN_CALL_REACHED"]);
  assert.deepEqual(marginCallReasonCodes(unused.reasons), []);
  assert.deepEqual(marginCallTransition(approaching.reasons, approaching.reasons), { changed: false, newAlert: false });
  assert.deepEqual(marginCallTransition(approaching.reasons, reached.reasons), { changed: true, newAlert: true });
  assert.deepEqual(marginCallTransition(reached.reasons, unused.reasons), { changed: true, newAlert: false });
});
test("rapid margin decline with a valid 15 minute baseline", () => {
  const result = run({ current: { ...current, margin: 3_800 }, history: [at(15, 10_000, 2_000)] });
  assert.ok(result.reasons.some(reason => reason.code === "RAPID_MARGIN_DECLINE"));
});
test("rapid equity decline", () => {
  const result = run({ current: { ...current, equity: 8_000 }, history: [at(15, 10_000, 2_000)] });
  assert.ok(result.reasons.some(reason => reason.code === "RAPID_EQUITY_LOSS"));
});
test("daily and total drawdown", () => {
  const result = run({ current: { ...current, equity: 8_000 }, dayOpeningBalance: 10_000, peakEquity: 12_000 });
  assert.ok(result.reasons.some(reason => reason.code === "DAILY_DRAWDOWN_HIGH"));
  assert.ok(result.reasons.some(reason => reason.code === "TOTAL_DRAWDOWN_HIGH"));
});
test("unusual lot size and open position count", () => {
  const positions = Array.from({ length: 12 }, () => ({ symbol: "EURUSD", direction: "BUY" as const, lots: 2, pnl: -1 }));
  const result = run({ positions, averageLotSize: 0.5 });
  assert.ok(result.reasons.some(reason => reason.code === "LOT_SIZE_ABOVE_NORMAL"));
  assert.ok(result.reasons.some(reason => reason.code === "POSITION_COUNT_ABOVE_NORMAL"));
});
test("unusual trade frequency uses a sufficient rolling baseline", () => {
  const result = run({ averageTradesPerDay: 2, tradesToday: 8 });
  assert.ok(result.reasons.some(reason => reason.code === "TRADING_FREQUENCY_ABOVE_NORMAL" && reason.multiplier === 4));
});
test("daily loss and per-trade risk compare with available baselines", () => {
  const result = run({ averageDailyLoss: 100, lossToday: 400, averageRiskPerTrade: 50,
    positions: [{ symbol: "EURUSD", direction: "BUY", lots: 0.5, pnl: -20, riskAmount: 200 }] });
  assert.ok(result.reasons.some(reason => reason.code === "DAILY_LOSS_ABOVE_NORMAL" && reason.severity === "WARNING" && reason.multiplier === 4));
  assert.ok(result.reasons.some(reason => reason.code === "RISK_PER_TRADE_ABOVE_NORMAL" && reason.multiplier === 4));
  assert.equal(result.level, "WARNING");
  assert.equal(result.score, 31);
});
test("an unusual loss does not hide a material drawdown", () => {
  const result = run({ current: { ...current, equity: 9_000 }, averageDailyLoss: 100, lossToday: 400 });
  assert.ok(result.reasons.some(reason => reason.code === "DAILY_LOSS_ABOVE_NORMAL" && reason.severity === "WARNING"));
  assert.ok(result.reasons.some(reason => reason.code === "DAILY_DRAWDOWN_HIGH" && reason.severity === "CRITICAL"));
  assert.equal(result.level, "CRITICAL");
});
test("broker, user, and default stop-out sources", () => {
  assert.equal(run().metrics.stopOutSource, "DEFAULT");
  assert.equal(run({ settings: { ...settings, stopOutLevel: 70 } }).metrics.stopOutSource, "USER");
  assert.equal(run({ brokerStopOutLevel: 30 }).metrics.stopOutSource, "BROKER");
});
test("insufficient or irregular history does not create velocity alert", () => {
  assert.equal(run({ current: { ...current, equity: 8_000 }, history: [at(9, 10_000, 2_000)] }).metrics.rapidLossDetected, false);
  assert.equal(run({ current: { ...current, equity: 8_000 }, history: [] }).metrics.equityChange15m, null);
});
test("risk escalation, cooldown, and recovery", () => {
  assert.equal(shouldNotify("SAFE", "WARNING", null, now, 15), true);
  assert.equal(shouldNotify("HIGH_RISK", "HIGH_RISK", now, now, 15), false);
  assert.equal(shouldNotify("HIGH_RISK", "CRITICAL", now, now, 15), true);
  assert.equal(shouldNotify("HIGH_RISK", "SAFE", now, now, 15), false);
  assert.equal(shouldNotify("HIGH_RISK", "HIGH_RISK", new Date(now.getTime() - 16 * 60_000), now, 15, true), true);
});
test("what-if simulation only projects values", () => {
  const result = simulateLoss(run(), settings, 500);
  assert.equal(result.projectedEquity, 9_500);
  assert.equal(result.projectedMarginLevel, 475);
  assert.equal(result.estimated, true);
});
