import assert from "node:assert/strict";
import test from "node:test";
import { filterClosedSessionCandles, type Candle } from "./market-data-service";

function candle(time: string): Candle {
  return { time, open: 1, high: 2, low: 0.5, close: 1.5 };
}

test("removes closed weekend sessions from non-crypto replay data", () => {
  const values = [
    candle("2026-09-04T21:45:00.000Z"),
    candle("2026-09-04T22:00:00.000Z"),
    candle("2026-09-05T12:00:00.000Z"),
    candle("2026-09-06T21:45:00.000Z"),
    candle("2026-09-06T22:00:00.000Z"),
  ];

  assert.deepEqual(
    filterClosedSessionCandles(values, "XAUUSD").map((value) => value.time),
    ["2026-09-04T21:45:00.000Z", "2026-09-06T22:00:00.000Z"]
  );
});

test("keeps weekend candles for continuously traded crypto symbols", () => {
  const values = [candle("2026-09-05T12:00:00.000Z"), candle("2026-09-06T12:00:00.000Z")];

  assert.equal(filterClosedSessionCandles(values, "BTCUSD").length, 2);
  assert.equal(filterClosedSessionCandles(values, "ETHUSD").length, 2);
});
