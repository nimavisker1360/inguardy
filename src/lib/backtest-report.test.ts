import assert from "node:assert/strict";
import test from "node:test";
import { buildBacktestPerformanceSeries, calculateBacktestPerformance } from "./backtest-report";

const trades = [
  { status: "WON", resultR: 2, profitLoss: 100, closedAt: new Date("2026-09-01T10:00:00Z") },
  { status: "LOST", resultR: -1, profitLoss: -50, closedAt: new Date("2026-09-01T11:00:00Z") },
  { status: "LOST", resultR: -1, profitLoss: -50, closedAt: new Date("2026-09-01T12:00:00Z") },
  { status: "OPEN", resultR: null, profitLoss: null, closedAt: null },
];

test("calculates closed-trade performance metrics", () => {
  assert.deepEqual(calculateBacktestPerformance(trades), {
    totalTrades: 3,
    wins: 1,
    losses: 2,
    winRate: (1 / 3) * 100,
    netProfitLoss: 0,
    netR: 0,
    profitFactor: 1,
    expectancyR: 0,
  });
});

test("builds cumulative equity and drawdown without counting open trades", () => {
  assert.deepEqual(
    buildBacktestPerformanceSeries(trades).map(({ trade, equity, totalR, drawdown }) => ({ trade, equity, totalR, drawdown })),
    [
      { trade: 1, equity: 100, totalR: 2, drawdown: 0 },
      { trade: 2, equity: 50, totalR: 1, drawdown: 50 },
      { trade: 3, equity: 0, totalR: 0, drawdown: 100 },
    ]
  );
});
