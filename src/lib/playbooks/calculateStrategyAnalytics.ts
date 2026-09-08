type ReviewGroup = "YES" | "PARTIAL" | "NO" | "NOT_REVIEWED";

export type StrategyAnalyticsTradeInput = {
  id: string;
  symbol: string;
  direction?: string;
  profitLoss: unknown;
  rr?: unknown;
  openedAt?: Date | string | null;
  closedAt?: Date | string | null;
  strategyReview?: {
    followedPlan: string;
    compliancePercent?: number | null;
  } | null;
};

type TradeSummary = {
  id: string;
  symbol: string;
  pnl: number;
  rr: number | null;
  openedAt: string | null;
};

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serializeDate(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function summarizeTrade(trade: StrategyAnalyticsTradeInput): TradeSummary {
  return {
    id: trade.id,
    symbol: trade.symbol,
    pnl: toNumber(trade.profitLoss),
    rr: toNullableNumber(trade.rr),
    openedAt: serializeDate(trade.openedAt),
  };
}

function calculateGroupStats(trades: StrategyAnalyticsTradeInput[]) {
  const totalTrades = trades.length;
  const pnlValues = trades.map((trade) => toNumber(trade.profitLoss));
  const wins = pnlValues.filter((pnl) => pnl > 0);
  const netPnl = pnlValues.reduce((sum, pnl) => sum + pnl, 0);

  return {
    totalTrades,
    winRate: totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0,
    netPnl,
    averagePnl: totalTrades > 0 ? netPnl / totalTrades : 0,
  };
}

export function calculateStrategyAnalytics(trades: StrategyAnalyticsTradeInput[]) {
  const totalTrades = trades.length;
  const pnlValues = trades.map((trade) => toNumber(trade.profitLoss));
  const wins = pnlValues.filter((pnl) => pnl > 0);
  const losses = pnlValues.filter((pnl) => pnl < 0);
  const grossProfit = wins.reduce((sum, pnl) => sum + pnl, 0);
  const grossLossAbs = Math.abs(losses.reduce((sum, pnl) => sum + pnl, 0));
  const netPnl = pnlValues.reduce((sum, pnl) => sum + pnl, 0);
  const rrValues = trades
    .map((trade) => toNullableNumber(trade.rr))
    .filter((value): value is number => value !== null);
  const bestTrade = trades.reduce<StrategyAnalyticsTradeInput | null>(
    (best, trade) => (!best || toNumber(trade.profitLoss) > toNumber(best.profitLoss) ? trade : best),
    null
  );
  const worstTrade = trades.reduce<StrategyAnalyticsTradeInput | null>(
    (worst, trade) => (!worst || toNumber(trade.profitLoss) < toNumber(worst.profitLoss) ? trade : worst),
    null
  );
  const byFollowedPlan = (["YES", "PARTIAL", "NO", "NOT_REVIEWED"] as ReviewGroup[]).reduce(
    (groups, status) => {
      groups[status] = calculateGroupStats(
        trades.filter(
          (trade) => (trade.strategyReview?.followedPlan || "NOT_REVIEWED") === status
        )
      );
      return groups;
    },
    {} as Record<ReviewGroup, ReturnType<typeof calculateGroupStats>>
  );
  const sortedWinningTrades = trades
    .filter((trade) => toNumber(trade.profitLoss) > 0)
    .sort((a, b) => toNumber(b.profitLoss) - toNumber(a.profitLoss))
    .slice(0, 5)
    .map(summarizeTrade);
  const sortedLosingTrades = trades
    .filter((trade) => toNumber(trade.profitLoss) < 0)
    .sort((a, b) => toNumber(a.profitLoss) - toNumber(b.profitLoss))
    .slice(0, 5)
    .map(summarizeTrade);
  const recentTrades = [...trades]
    .sort((a, b) => {
      const left = new Date(a.closedAt || a.openedAt || 0).getTime();
      const right = new Date(b.closedAt || b.openedAt || 0).getTime();
      return right - left;
    })
    .slice(0, 10)
    .map(summarizeTrade);

  return {
    totalTrades,
    netPnl,
    winRate: totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0,
    lossRate: totalTrades > 0 ? (losses.length / totalTrades) * 100 : 0,
    averageWin: wins.length > 0 ? grossProfit / wins.length : 0,
    averageLoss:
      losses.length > 0 ? losses.reduce((sum, pnl) => sum + pnl, 0) / losses.length : 0,
    profitFactor: grossLossAbs > 0 ? grossProfit / grossLossAbs : grossProfit > 0 ? null : 0,
    averageRR:
      rrValues.length > 0
        ? rrValues.reduce((sum, value) => sum + value, 0) / rrValues.length
        : 0,
    bestTrade: bestTrade ? summarizeTrade(bestTrade) : null,
    worstTrade: worstTrade ? summarizeTrade(worstTrade) : null,
    followedPlanStats: byFollowedPlan.YES,
    partialFollowedPlanStats: byFollowedPlan.PARTIAL,
    notFollowedPlanStats: byFollowedPlan.NO,
    notReviewedPlanStats: byFollowedPlan.NOT_REVIEWED,
    exampleWinningTrades: sortedWinningTrades,
    exampleLosingTrades: sortedLosingTrades,
    recentTrades,
  };
}
