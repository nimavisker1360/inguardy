import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildTradeWhere } from "@/lib/journal/prisma-trades";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const { where, errors } = buildTradeWhere(searchParams);
    where.userId = userId;

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
    });
    const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
    const openTrades = trades.filter((trade) => trade.status === "OPEN");
    const wins = closedTrades.filter((trade) => toNumber(trade.profitLoss) > 0);
    const grossProfit = wins.reduce(
      (total, trade) => total + toNumber(trade.profitLoss),
      0
    );
    const grossLoss = closedTrades.reduce((total, trade) => {
      const pnl = toNumber(trade.profitLoss);
      return pnl < 0 ? total + Math.abs(pnl) : total;
    }, 0);
    const totalProfit = trades.reduce(
      (total, trade) => total + toNumber(trade.profitLoss),
      0
    );
    const rrTrades = closedTrades.filter((trade) => trade.rr !== null);
    const symbolTotals = closedTrades.reduce<Record<string, number>>((totals, trade) => {
      totals[trade.symbol] = (totals[trade.symbol] || 0) + toNumber(trade.profitLoss);
      return totals;
    }, {});
    const rankedSymbols = Object.entries(symbolTotals).sort((a, b) => b[1] - a[1]);

    return NextResponse.json({
      success: true,
      stats: {
        totalTrades: trades.length,
        closedTrades: closedTrades.length,
        openTrades: openTrades.length,
        winRate:
          closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
        totalProfit,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
        averageRR:
          rrTrades.length > 0
            ? rrTrades.reduce((total, trade) => total + toNumber(trade.rr), 0) /
              rrTrades.length
            : null,
        expectancy:
          closedTrades.length > 0
            ? closedTrades.reduce(
                (total, trade) => total + toNumber(trade.profitLoss),
                0
              ) / closedTrades.length
            : null,
        bestSymbol: rankedSymbols[0]?.[0] || null,
        worstSymbol: rankedSymbols[rankedSymbols.length - 1]?.[0] || null,
      },
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load journal stats" },
      { status: 500 }
    );
  }
}
