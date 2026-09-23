import assert from "node:assert/strict";
import test from "node:test";
import { buildTradeCoachComparison, evaluateCoachAction, plannedRiskReward, type ComparisonInput } from "./trade-coach-comparison";

const openedAt = new Date("2026-09-19T10:00:00.000Z");
const base: ComparisonInput = {
  direction: "BUY",
  openedAt,
  entryPrice: 100,
  initialStopLoss: 98,
  initialTakeProfit: 104,
  riskAmount: 120,
  balanceAtOpen: 10_000,
  setup: "Pullback",
  notes: "Entered after confirmation",
  playbook: { name: "Pullback", direction: "BUY_ONLY", riskPerTrade: 1, minRiskReward: 1.5 },
  strategyReview: { followedPlan: "YES", compliancePercent: 100, requiredCompliancePercent: 80 },
  requiredAnswers: [{ checked: true, answeredAt: new Date("2026-09-19T09:59:00.000Z") }],
  sameDayPreparation: null,
};

test("compares the planned risk and target, not realized P&L", () => {
  assert.equal(plannedRiskReward(base), 2);
  const rows = buildTradeCoachComparison(base);
  assert.equal(rows.find((row) => row.id === "risk")?.status, "ALERT");
  assert.equal(rows.find((row) => row.id === "risk")?.actual, "1.2%");
  assert.equal(rows.find((row) => row.id === "reward")?.status, "PASS");
});

test("a checklist completed after entry is not counted as pre-entry completion", () => {
  const rows = buildTradeCoachComparison({
    ...base,
    requiredAnswers: [{ checked: true, answeredAt: new Date("2026-09-19T10:01:00.000Z") }],
  });
  assert.equal(rows.find((row) => row.id === "checklist")?.status, "ALERT");
  assert.equal(rows.find((row) => row.id === "checklist")?.actual, "0/1");
});

test("missing plan evidence stays missing and same-day preparation stays context", () => {
  const rows = buildTradeCoachComparison({
    ...base,
    playbook: null,
    balanceAtOpen: null,
    sameDayPreparation: { selectedPlaybook: "Breakout", decision: "wait" },
  });
  assert.equal(rows.find((row) => row.id === "risk")?.status, "MISSING");
  assert.equal(rows.find((row) => row.id === "preparation")?.status, "CONTEXT");
});

test("follow-up reports a verdict only when the next trade has evidence", () => {
  const rows = buildTradeCoachComparison(base);
  assert.equal(evaluateCoachAction(rows.find((row) => row.id === "risk"), "en").verdict, "NOT_MET");
  assert.equal(evaluateCoachAction(rows.find((row) => row.id === "reward"), "en").verdict, "MET");
  const missing = buildTradeCoachComparison({ ...base, balanceAtOpen: null });
  assert.equal(evaluateCoachAction(missing.find((row) => row.id === "risk"), "en").verdict, "UNCLEAR");
});
