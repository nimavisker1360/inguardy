import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import {
  buildTradeWhere,
  journalTradeInclude,
  serializeJournalTrade,
} from "@/lib/journal/prisma-trades";

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
      include: journalTradeInclude,
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
    });
    const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
    const openTrades = trades.filter((trade) => trade.status === "OPEN");
    const wins = closedTrades.filter((trade) => toNumber(trade.profitLoss) > 0);
    const losses = closedTrades.filter((trade) => toNumber(trade.profitLoss) < 0);
    const breakEven = closedTrades.filter(
      (trade) => toNumber(trade.profitLoss) === 0
    );
    const totalPnL = trades.reduce(
      (total, trade) => total + toNumber(trade.profitLoss),
      0
    );
    const grossProfit = wins.reduce(
      (total, trade) => total + toNumber(trade.profitLoss),
      0
    );
    const grossLoss = losses.reduce(
      (total, trade) => total + Math.abs(toNumber(trade.profitLoss)),
      0
    );
    const bestTrade = trades.reduce<(typeof trades)[number] | null>(
      (best, trade) =>
        !best || toNumber(trade.profitLoss) > toNumber(best.profitLoss)
          ? trade
          : best,
      null
    );
    const worstTrade = trades.reduce<(typeof trades)[number] | null>(
      (worst, trade) =>
        !worst || toNumber(trade.profitLoss) < toNumber(worst.profitLoss)
          ? trade
          : worst,
      null
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalTrades: trades.length,
        winningTrades: wins.length,
        losingTrades: losses.length,
        breakEvenTrades: breakEven.length,
        winRate:
          closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0,
        totalPnL,
        averageWin: wins.length > 0 ? grossProfit / wins.length : 0,
        averageLoss:
          losses.length > 0
            ? losses.reduce(
                (total, trade) => total + toNumber(trade.profitLoss),
                0
              ) / losses.length
            : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : null,
        bestTrade: bestTrade ? serializeJournalTrade(bestTrade) : null,
        worstTrade: worstTrade ? serializeJournalTrade(worstTrade) : null,
        openTrades: openTrades.length,
        closedTrades: closedTrades.length,
      },
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load journal summary" },
      { status: 500 }
    );
  }
}
