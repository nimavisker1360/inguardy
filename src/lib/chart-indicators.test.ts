import assert from "node:assert/strict";
import test from "node:test";
import { calculateEma } from "./chart-indicators";

const candles = [1, 2, 3, 4, 5].map((close, index) => ({
  time: `2026-09-10T0${index}:00:00.000Z`,
  close,
}));

test("EMA uses an SMA seed and advances with the standard multiplier", () => {
  const result = calculateEma(candles, 3);

  assert.deepEqual(result, [
    { time: "2026-09-10T02:00:00.000Z", value: 2 },
    { time: "2026-09-10T03:00:00.000Z", value: 3 },
    { time: "2026-09-10T04:00:00.000Z", value: 4 },
  ]);
});

test("EMA stays hidden until enough candles are visible", () => {
  assert.deepEqual(calculateEma(candles, 20), []);
  assert.deepEqual(calculateEma(candles, 0), []);
});
