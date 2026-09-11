type NumericValue = number | string | { toString(): string } | null;

export type BacktestReportTrade = {
  status: string;
  resultR: NumericValue;
  profitLoss: NumericValue;
  closedAt?: Date | null;
  createdAt?: Date;
};

function numberValue(value: NumericValue) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateBacktestPerformance(trades: BacktestReportTrade[]) {
  const closed = trades.filter((trade) => trade.status === "WON" || trade.status === "LOST");
  const wins = closed.filter((trade) => trade.status === "WON").length;
  const losses = closed.filter((trade) => trade.status === "LOST").length;
  const grossProfit = closed.reduce((sum, trade) => sum + Math.max(numberValue(trade.profitLoss), 0), 0);
  const grossLoss = closed.reduce((sum, trade) => sum + Math.min(numberValue(trade.profitLoss), 0), 0);
  const netProfitLoss = grossProfit + grossLoss;
  const netR = closed.reduce((sum, trade) => sum + numberValue(trade.resultR), 0);

  return {
    totalTrades: closed.length,
    wins,
    losses,
    winRate: closed.length ? (wins / closed.length) * 100 : 0,
    netProfitLoss,
    netR,
    profitFactor: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : null,
    expectancyR: closed.length ? netR / closed.length : 0,
  };
}

export function buildBacktestPerformanceSeries(trades: BacktestReportTrade[]) {
  let cumulativePnl = 0;
  let cumulativeR = 0;
  let peak = 0;

  return trades
    .filter((trade) => trade.status === "WON" || trade.status === "LOST")
    .map((trade, index) => {
      cumulativePnl += numberValue(trade.profitLoss);
      cumulativeR += numberValue(trade.resultR);
      peak = Math.max(peak, cumulativePnl);
      return {
        trade: index + 1,
        time: (trade.closedAt ?? trade.createdAt ?? new Date(0)).toISOString(),
        equity: cumulativePnl,
        totalR: cumulativeR,
        drawdown: Math.max(peak - cumulativePnl, 0),
      };
    });
}
