import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStoredRiskAlert } from "./history";

test("legacy behavioural high risk events are shown as warnings", () => {
  const event = normalizeStoredRiskAlert({
    riskLevel: "HIGH_RISK", riskScore: 51,
    reasons: [{ code: "SYMBOL_CONCENTRATION_HIGH", severity: "HIGH_RISK", currentValue: 100 }],
  });
  assert.equal(event.riskLevel, "WARNING");
  assert.equal(event.riskScore, 31);
  assert.equal(event.reasons[0]?.severity, "WARNING");
});

test("a material high-risk reason keeps the historical event high risk", () => {
  const event = normalizeStoredRiskAlert({
    riskLevel: "HIGH_RISK", riskScore: 62,
    reasons: [
      { code: "TRADING_FREQUENCY_ABOVE_NORMAL", severity: "HIGH_RISK", currentValue: 12 },
      { code: "RAPID_EQUITY_LOSS", severity: "HIGH_RISK", currentValue: 8_000 },
    ],
  });
  assert.equal(event.riskLevel, "HIGH_RISK");
  assert.equal(event.riskScore, 62);
  assert.equal(event.reasons[0]?.severity, "WARNING");
});

test("safe recovery events and malformed legacy reasons remain safe to display", () => {
  const event = normalizeStoredRiskAlert({ riskLevel: "SAFE", riskScore: 0, reasons: null });
  assert.equal(event.riskLevel, "SAFE");
  assert.equal(event.riskScore, 0);
  assert.deepEqual(event.reasons, []);
});
