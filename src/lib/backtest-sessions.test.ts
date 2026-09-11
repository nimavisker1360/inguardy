import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import {
  createBacktestSessionSchema,
  summarizeBacktestTrades,
  type BacktestSessionRecord,
} from "./backtest-sessions";

test("validates replay session boundaries", () => {
  assert.equal(createBacktestSessionSchema.safeParse({
    symbol: "XAUUSD",
    timeframe: "H1",
    endDate: "2026-09-10",
    historySize: 1000,
    speed: 700,
  }).success, true);

  assert.equal(createBacktestSessionSchema.safeParse({
    symbol: "XAUUSD",
    timeframe: "H2",
    endDate: "2026-09-10",
    historySize: 1001,
    speed: 700,
  }).success, false);
});

test("summarizes only completed backtest trades", () => {
  const trades = [
    { status: "WON", resultR: new Prisma.Decimal(2), profitLoss: new Prisma.Decimal(100) },
    { status: "LOST", resultR: new Prisma.Decimal(-1), profitLoss: new Prisma.Decimal(-50) },
    { status: "OPEN", resultR: null, profitLoss: null },
  ] as BacktestSessionRecord["trades"];

  assert.deepEqual(summarizeBacktestTrades(trades), {
    totalTrades: 2,
    wins: 1,
    losses: 1,
    winRate: 50,
    netR: 1,
    netProfitLoss: 50,
  });
});
