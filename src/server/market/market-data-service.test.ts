import assert from "node:assert/strict";
import test from "node:test";
import {
  filterClosedSessionCandles,
  normalizeMarketSymbol,
  synthesizeRatioCandles,
  type Candle,
} from "./market-data-service";

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

test("removes an MT5 broker suffix while normalizing a market symbol", () => {
  assert.equal(normalizeMarketSymbol("XAUEUR!"), "XAUEUR");
  assert.equal(normalizeMarketSymbol("oanda:XAUUSD!"), "XAUUSD");
});

test("synthesizes a cross candle from matching USD legs", () => {
  const result = synthesizeRatioCandles(
    [{ time: "2026-09-30T10:00:00.000Z", open: 4000, high: 4020, low: 3980, close: 4010 }],
    [{ time: "2026-09-30T10:00:00.000Z", open: 1.2, high: 1.21, low: 1.19, close: 1.205 }]
  );

  assert.equal(result.length, 1);
  assert.equal(result[0].open, 4000 / 1.2);
  assert.equal(result[0].high, 4020 / 1.19);
  assert.equal(result[0].low, 3980 / 1.21);
  assert.equal(result[0].close, 4010 / 1.205);
});
