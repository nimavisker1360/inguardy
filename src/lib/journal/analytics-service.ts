import { getJournalCollection } from "@/lib/journal/db";
import type { JournalQueryOptions, JournalSummary, JournalTrade } from "@/lib/journal/types";

function buildAnalyticsMatch(options: JournalQueryOptions) {
  const match: Partial<Record<keyof JournalTrade, unknown>> = {};

  if (options.accountNumber) {
    match.accountNumber = options.accountNumber;
  }

  if (options.broker) {
    match.broker = options.broker;
  }

  if (options.serverName) {
    match.serverName = options.serverName;
  }

  if (options.symbol) {
    match.symbol = options.symbol.trim().toUpperCase();
  }

  if (options.status) {
    match.status = options.status;
  }

  if (options.result) {
    match.result = options.result;
  }

  if (options.tradeType) {
    match.tradeType = options.tradeType;
  }

  if (options.from || options.to) {
    match.openTime = {
      ...(options.from ? { $gte: options.from } : {}),
      ...(options.to ? { $lte: options.to } : {}),
    };
  }

  return match;
}

export async function getJournalSummary(
  options: JournalQueryOptions = {}
): Promise<JournalSummary> {
  const collection = await getJournalCollection();
  const [summary] = await collection
    .aggregate<JournalSummary>([
      { $match: buildAnalyticsMatch(options) },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] } },
          closed: { $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] } },
          partiallyClosed: {
            $sum: {
              $cond: [{ $eq: ["$status", "partially_closed"] }, 1, 0],
            },
          },
          wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
          losses: { $sum: { $cond: [{ $eq: ["$result", "loss"] }, 1, 0] } },
          breakeven: {
            $sum: { $cond: [{ $eq: ["$result", "breakeven"] }, 1, 0] },
          },
          netProfit: { $sum: { $ifNull: ["$profit", 0] } },
        },
      },
      { $project: { _id: 0 } },
    ])
    .toArray();

  return (
    summary || {
      total: 0,
      open: 0,
      closed: 0,
      partiallyClosed: 0,
      wins: 0,
      losses: 0,
      breakeven: 0,
      netProfit: 0,
    }
  );
}

export type JournalStats = {
  totalTrades: number;
  closedTrades: number;
  openTrades: number;
  winRate: number;
  totalProfit: number;
  profitFactor: number | null;
  averageRR: number | null;
  expectancy: number | null;
  bestSymbol: string | null;
  worstSymbol: string | null;
};

export async function getJournalStats(
  options: JournalQueryOptions = {}
): Promise<JournalStats> {
  const collection = await getJournalCollection();
  const match = buildAnalyticsMatch(options);
  const [summaryRows, symbolRows] = await Promise.all([
    collection
      .aggregate<{
        totalTrades: number;
        closedTrades: number;
        openTrades: number;
        wins: number;
        totalProfit: number;
        grossProfit: number;
        grossLoss: number;
        rrCount: number;
        rrSum: number;
        closedProfitSum: number;
      }>([
        { $match: match },
        {
          $group: {
            _id: null,
            totalTrades: { $sum: 1 },
            closedTrades: {
              $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
            },
            openTrades: {
              $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
            },
            wins: { $sum: { $cond: [{ $eq: ["$result", "win"] }, 1, 0] } },
            totalProfit: { $sum: { $ifNull: ["$profit", 0] } },
            grossProfit: {
              $sum: {
                $cond: [
                  { $gt: [{ $ifNull: ["$profit", 0] }, 0] },
                  { $ifNull: ["$profit", 0] },
                  0,
                ],
              },
            },
            grossLoss: {
              $sum: {
                $cond: [
                  { $lt: [{ $ifNull: ["$profit", 0] }, 0] },
                  { $abs: { $ifNull: ["$profit", 0] } },
                  0,
                ],
              },
            },
            rrCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "closed"] },
                      { $ne: ["$actualRR", null] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            rrSum: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "closed"] },
                      { $ne: ["$actualRR", null] },
                    ],
                  },
                  "$actualRR",
                  0,
                ],
              },
            },
            closedProfitSum: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "closed"] },
                  { $ifNull: ["$profit", 0] },
                  0,
                ],
              },
            },
          },
        },
      ])
      .toArray(),
    collection
      .aggregate<{ _id: string; totalProfit: number }>([
        { $match: { ...match, status: "closed" } },
        {
          $group: {
            _id: "$symbol",
            totalProfit: { $sum: { $ifNull: ["$profit", 0] } },
          },
        },
        { $sort: { totalProfit: -1 } },
      ])
      .toArray(),
  ]);
  const summary = summaryRows[0];

  if (!summary) {
    return {
      totalTrades: 0,
      closedTrades: 0,
      openTrades: 0,
      winRate: 0,
      totalProfit: 0,
      profitFactor: null,
      averageRR: null,
      expectancy: null,
      bestSymbol: null,
      worstSymbol: null,
    };
  }

  return {
    totalTrades: summary.totalTrades,
    closedTrades: summary.closedTrades,
    openTrades: summary.openTrades,
    winRate:
      summary.closedTrades > 0 ? (summary.wins / summary.closedTrades) * 100 : 0,
    totalProfit: summary.totalProfit,
    profitFactor:
      summary.grossLoss > 0 ? summary.grossProfit / summary.grossLoss : null,
    averageRR: summary.rrCount > 0 ? summary.rrSum / summary.rrCount : null,
    expectancy:
      summary.closedTrades > 0
        ? summary.closedProfitSum / summary.closedTrades
        : null,
    bestSymbol: symbolRows[0]?._id || null,
    worstSymbol: symbolRows[symbolRows.length - 1]?._id || null,
  };
}
