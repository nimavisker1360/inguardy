import assert from "node:assert/strict";
import test from "node:test";
import {
  currentPositionR,
  evaluatePositionOnCandle,
  positionLevelsAreValid,
  positionRiskReward,
  type SimulatedPosition,
} from "./backtest-simulation";

function position(overrides: Partial<SimulatedPosition> = {}): SimulatedPosition {
  return {
    id: "position-1",
    direction: "LONG",
    entry: 100,
    stopLoss: 95,
    takeProfit: 110,
    riskAmount: 100,
    status: "OPEN",
    placedAtIndex: 10,
    lastEvaluatedIndex: 10,
    ...overrides,
  };
}

test("validates long and short level order", () => {
  assert.equal(positionLevelsAreValid(position()), true);
  assert.equal(positionLevelsAreValid(position({ stopLoss: 105 })), false);
  assert.equal(positionLevelsAreValid(position({ direction: "SHORT", stopLoss: 105, takeProfit: 90 })), true);
});

test("calculates risk reward and live R", () => {
  assert.equal(positionRiskReward(position()), 2);
  assert.equal(currentPositionR(position(), 105), 1);
  assert.equal(currentPositionR(position({ direction: "SHORT", stopLoss: 105, takeProfit: 90 }), 95), 1);
});

test("closes a long position at its target", () => {
  const result = evaluatePositionOnCandle(position(), { time: "x", open: 101, high: 111, low: 99, close: 108 }, 11);
  assert.equal(result.status, "WON");
  assert.equal(result.resultR, 2);
  assert.equal(result.exitPrice, 110);
});

test("uses stop loss when both stop and target occur in one candle", () => {
  const result = evaluatePositionOnCandle(position(), { time: "x", open: 100, high: 111, low: 94, close: 105 }, 11);
  assert.equal(result.status, "LOST");
  assert.equal(result.resultR, -1);
});

test("keeps a pending order hidden from results until entry is touched", () => {
  const pending = position({ status: "PENDING", entry: 110, stopLoss: 105, takeProfit: 120 });
  const untouched = evaluatePositionOnCandle(pending, { time: "x", open: 100, high: 109, low: 99, close: 108 }, 11);
  assert.equal(untouched.status, "PENDING");

  const opened = evaluatePositionOnCandle(untouched, { time: "y", open: 109, high: 113, low: 108, close: 112 }, 12);
  assert.equal(opened.status, "OPEN");
  assert.equal(opened.openedAtIndex, 12);
});
