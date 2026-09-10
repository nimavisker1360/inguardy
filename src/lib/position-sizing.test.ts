import assert from "node:assert/strict";
import test from "node:test";
import { calculatePositionSize } from "./position-sizing";

test("calculates a forex BUY position from broker tick values", () => {
  const result = calculatePositionSize({
    balance: 10_000,
    riskMode: "PERCENT",
    riskValue: 1,
    direction: "BUY",
    entryPrice: 1.085,
    stopLoss: 1.08,
    riskReward: 2,
    tickSize: 0.00001,
    tickValue: 1,
    minVolume: 0.01,
    maxVolume: 100,
    volumeStep: 0.01,
  });

  assert.equal(result.valid, true);
  assert.equal(result.targetRiskAmount, 100);
  assert.equal(result.lotSize, 0.2);
  assert.equal(result.actualRiskAmount, 100);
  assert.equal(result.potentialReward, 200);
  assert.ok(Math.abs(result.takeProfit - 1.095) < 1e-10);
});

test("calculates a SELL take profit and floors volume to the broker step", () => {
  const result = calculatePositionSize({
    balance: 25_000,
    riskMode: "AMOUNT",
    riskValue: 250,
    direction: "SELL",
    entryPrice: 2400,
    stopLoss: 2405,
    riskReward: 3,
    tickSize: 0.01,
    tickValue: 1,
    minVolume: 0.01,
    maxVolume: 100,
    volumeStep: 0.01,
  });

  assert.equal(result.valid, true);
  assert.equal(result.lotSize, 0.5);
  assert.equal(result.takeProfit, 2385);
  assert.equal(result.potentialReward, 750);
});

test("never rounds volume above the requested risk", () => {
  const result = calculatePositionSize({
    balance: 10_000,
    riskMode: "PERCENT",
    riskValue: 1,
    direction: "BUY",
    entryPrice: 150,
    stopLoss: 149.5,
    riskReward: 2,
    tickSize: 0.001,
    tickValue: 0.67,
    minVolume: 0.01,
    volumeStep: 0.01,
  });

  assert.equal(result.lotSize, 0.29);
  assert.ok(result.actualRiskAmount <= result.targetRiskAmount);
});

test("returns zero volume when the requested risk is below the broker minimum", () => {
  const result = calculatePositionSize({
    balance: 100,
    riskMode: "AMOUNT",
    riskValue: 1,
    direction: "BUY",
    entryPrice: 100,
    stopLoss: 90,
    riskReward: 2,
    tickSize: 1,
    tickValue: 10,
    minVolume: 0.1,
    volumeStep: 0.1,
  });

  assert.equal(result.valid, true);
  assert.equal(result.lotSize, 0);
  assert.ok(result.warnings.includes("BELOW_MIN_VOLUME"));
});

test("caps volume at the broker maximum", () => {
  const result = calculatePositionSize({
    balance: 100_000,
    riskMode: "AMOUNT",
    riskValue: 10_000,
    direction: "BUY",
    entryPrice: 100,
    stopLoss: 99,
    riskReward: 2,
    tickSize: 1,
    tickValue: 1,
    minVolume: 0.1,
    maxVolume: 5,
    volumeStep: 0.1,
  });

  assert.equal(result.lotSize, 5);
  assert.ok(result.warnings.includes("CAPPED_AT_MAX_VOLUME"));
});

test("rejects a stop loss on the wrong side of the entry", () => {
  const result = calculatePositionSize({
    balance: 10_000,
    riskMode: "PERCENT",
    riskValue: 1,
    direction: "BUY",
    entryPrice: 1.1,
    stopLoss: 1.2,
    riskReward: 2,
    tickSize: 0.00001,
    tickValue: 1,
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("BUY_STOP_MUST_BE_BELOW_ENTRY"));
});
