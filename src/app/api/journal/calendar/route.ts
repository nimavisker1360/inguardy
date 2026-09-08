import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseMonthYear(searchParams: URLSearchParams) {
  const now = new Date();
  const month = Number(searchParams.get("month") || now.getUTCMonth() + 1);
  const year = Number(searchParams.get("year") || now.getUTCFullYear());

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { errors: ["month must be an integer from 1 to 12"] };
  }

  if (!Number.isInteger(year) || year < 1970 || year > 3000) {
    return { errors: ["year must be a valid four-digit year"] };
  }

  return { month, year, errors: [] };
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const parsed = parseMonthYear(searchParams);

    if (parsed.errors.length > 0 || !parsed.month || !parsed.year) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: parsed.errors,
        },
        { status: 400 }
      );
    }

    const { month, year } = parsed;
    const accountId = searchParams.get("accountId")?.trim();
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));
    const where: Prisma.TradeWhereInput = {
      userId,
      openedAt: {
        gte: start,
        lt: end,
      },
    };

    if (accountId) {
      where.accountId = accountId;
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
    });
    const grouped = new Map<string, typeof trades>();

    for (const trade of trades) {
      if (!trade.openedAt) {
        continue;
      }

      const key = dateKey(trade.openedAt);
      grouped.set(key, [...(grouped.get(key) || []), trade]);
    }

    const days = Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayTrades]) => {
        const closedTrades = dayTrades.filter((trade) => trade.status === "CLOSED");
        const winningTrades = closedTrades.filter(
          (trade) => toNumber(trade.profitLoss) > 0
        );
        const losingTrades = closedTrades.filter(
          (trade) => toNumber(trade.profitLoss) < 0
        );
        const breakEvenTrades = closedTrades.filter(
          (trade) => toNumber(trade.profitLoss) === 0
        );
        const totalPnL = dayTrades.reduce(
          (total, trade) => total + toNumber(trade.profitLoss),
          0
        );
        const grossProfit = winningTrades.reduce(
          (total, trade) => total + toNumber(trade.profitLoss),
          0
        );
        const grossLoss = losingTrades.reduce(
          (total, trade) => total + Math.abs(toNumber(trade.profitLoss)),
          0
        );
        const pnlValues = dayTrades.map((trade) => toNumber(trade.profitLoss));

        return {
          date,
          totalTrades: dayTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          breakEvenTrades: breakEvenTrades.length,
          totalPnL: round(totalPnL),
          winRate:
            closedTrades.length > 0
              ? round((winningTrades.length / closedTrades.length) * 100, 1)
              : 0,
          profitFactor:
            grossLoss > 0 ? round(grossProfit / grossLoss, 2) : grossProfit > 0 ? round(grossProfit, 2) : 0,
          bestTrade: pnlValues.length > 0 ? round(Math.max(...pnlValues)) : 0,
          worstTrade: pnlValues.length > 0 ? round(Math.min(...pnlValues)) : 0,
        };
      });

    return NextResponse.json({
      success: true,
      month,
      year,
      days,
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load journal calendar" },
      { status: 500 }
    );
  }
}
