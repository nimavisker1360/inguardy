import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import {
  loadDailyJournalRequirements,
  requirementFailureResponse,
} from "@/lib/journal/review-requirements";

export const dynamic = "force-dynamic";

const textFields = [
  "marketBias",
  "todayFocus",
  "mainPlaybookId",
  "symbolsToTrade",
  "newsToWatch",
  "preMarketNotes",
  "mood",
  "sleepQuality",
  "checklistNotes",
  "whatWentWell",
  "mistakesSummary",
  "followedPlanReview",
  "improvementPlan",
  "tomorrowPlan",
  "endOfDayNotes",
] as const;

const scoreFields = [
  "focusLevel",
  "confidenceLevel",
  "stressLevel",
  "disciplineScore",
] as const;

const booleanFields = [
  "respectedRisk",
  "waitedForConfirmation",
  "avoidedRevengeTrading",
  "stoppedAfterDailyLimit",
  "followedPlaybook",
  "avoidedOvertrading",
] as const;

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

function parseDateKey(value: unknown) {
  const text = String(value || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextDate(date: Date) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function textValue(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function optionalInteger(value: unknown, field: string, errors: string[]) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    errors.push(`${field} must be an integer`);
    return null;
  }

  return parsed;
}

function optionalFloat(value: unknown, field: string, errors: string[]) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${field} must be a number`);
    return null;
  }

  return parsed;
}

function optionalScore(value: unknown, field: string, errors: string[]) {
  const parsed = optionalInteger(value, field, errors);

  if (parsed !== null && (parsed < 1 || parsed > 10)) {
    errors.push(`${field} must be between 1 and 10`);
    return null;
  }

  return parsed;
}

function serializeJournal<T extends { date: Date; createdAt: Date; updatedAt: Date } | null>(journal: T) {
  if (!journal) {
    return null;
  }

  return {
    ...journal,
    date: journal.date.toISOString(),
    createdAt: journal.createdAt.toISOString(),
    updatedAt: journal.updatedAt.toISOString(),
  };
}

const dailyJournalTradeInclude = {
  account: true,
  checklists: {
    select: {
      completedCount: true,
      totalCount: true,
      completionPercent: true,
    },
  },
} satisfies Prisma.TradeInclude;

type DailyJournalTrade = Prisma.TradeGetPayload<{
  include: typeof dailyJournalTradeInclude;
}>;

function serializeTrade(trade: DailyJournalTrade) {
  const checklist = trade.checklists[0] || null;

  return {
    id: trade.id,
    openTime: trade.openedAt?.toISOString() || null,
    symbol: trade.symbol,
    direction: trade.direction,
    account: trade.account
      ? {
          id: trade.account.id,
          name: trade.account.name,
          broker: trade.account.broker,
          platform: trade.account.platform,
          currency: trade.account.currency,
        }
      : null,
    entry: trade.entryPrice === null ? null : Number(trade.entryPrice),
    exit: trade.exitPrice === null ? null : Number(trade.exitPrice),
    stopLoss: trade.currentStopLoss === null && trade.stopLoss === null ? null : Number(trade.currentStopLoss ?? trade.stopLoss),
    pnl: trade.profitLoss === null ? null : Number(trade.profitLoss),
    rMultiple: trade.rr === null ? null : Number(trade.rr),
    status: trade.status,
    setup: trade.setup,
    emotion: trade.emotion,
    mistake: trade.mistake,
    notes: trade.notes,
    checklistCompletionPercent: checklist?.completionPercent ?? null,
    reviewStatus: trade.reviewStatus,
  };
}

function mostCommon(values: Array<string | null>) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value?.trim();

    if (!label) {
      continue;
    }

    counts.set(label, (counts.get(label) || 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function buildStats(date: Date, trades: DailyJournalTrade[]) {
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const wins = closedTrades.filter((trade) => toNumber(trade.profitLoss) > 0);
  const losses = closedTrades.filter((trade) => toNumber(trade.profitLoss) < 0);
  const breakeven = closedTrades.filter((trade) => toNumber(trade.profitLoss) === 0);
  const rrValues = closedTrades
    .map((trade) => (trade.rr === null ? null : Number(trade.rr)))
    .filter((value): value is number => Number.isFinite(value));
  const pnlValues = closedTrades.map((trade) => toNumber(trade.profitLoss));
  const netPnl = pnlValues.reduce((total, value) => total + value, 0);
  const checklistTrades = trades.filter((trade) => trade.checklists.length > 0);
  const bestTrade = closedTrades.reduce<DailyJournalTrade | null>(
    (best, trade) => (!best || toNumber(trade.profitLoss) > toNumber(best.profitLoss) ? trade : best),
    null
  );
  const worstTrade = closedTrades.reduce<DailyJournalTrade | null>(
    (worst, trade) => (!worst || toNumber(trade.profitLoss) < toNumber(worst.profitLoss) ? trade : worst),
    null
  );

  return {
    date: dateKey(date),
    totalTrades: trades.length,
    closedTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakeven.length,
    netPnl: round(netPnl),
    winRate: closedTrades.length > 0 ? round((wins.length / closedTrades.length) * 100, 1) : 0,
    averageRR: rrValues.length > 0 ? round(rrValues.reduce((total, value) => total + value, 0) / rrValues.length, 2) : 0,
    bestTradePnl: pnlValues.length > 0 ? round(Math.max(...pnlValues)) : 0,
    worstTradePnl: pnlValues.length > 0 ? round(Math.min(...pnlValues)) : 0,
    bestTrade: bestTrade ? { id: bestTrade.id, symbol: bestTrade.symbol, pnl: toNumber(bestTrade.profitLoss) } : null,
    worstTrade: worstTrade ? { id: worstTrade.id, symbol: worstTrade.symbol, pnl: toNumber(worstTrade.profitLoss) } : null,
    checklistCompletionRate:
      trades.length > 0 ? round((checklistTrades.length / trades.length) * 100, 1) : 0,
    mostRepeatedMistake: mostCommon(trades.map((trade) => trade.mistake)),
    mostCommonEmotion: mostCommon(trades.map((trade) => trade.emotion)),
  };
}

function validationResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, message: "Validation failed", errors },
    { status: 400 }
  );
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const date = parseDateKey(searchParams.get("date"));
    const accountId = searchParams.get("accountId")?.trim();

    if (!date) {
      return validationResponse(["date must use YYYY-MM-DD"]);
    }

    const where: Prisma.TradeWhereInput = {
      userId,
      openedAt: {
        gte: date,
        lt: nextDate(date),
      },
      ...(accountId ? { accountId } : {}),
    };

    const [journal, trades, playbooks] = await Promise.all([
      prisma.dailyJournal.findUnique({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
      }),
      prisma.trade.findMany({
        where,
        include: dailyJournalTradeInclude,
        orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
      }),
      prisma.playbookStrategy.findMany({
        where: { userId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    const requirements = await loadDailyJournalRequirements(prisma, {
      userId,
      date,
      accountId,
    });

    return NextResponse.json({
      success: true,
      journal: serializeJournal(journal),
      stats: buildStats(date, trades),
      trades: trades.map(serializeTrade),
      playbooks,
      requirements,
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load daily journal" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as Record<string, unknown>;
    const date = parseDateKey(body.date);
    const accountId = textValue(body.accountId);

    if (!date) {
      return validationResponse(["date must use YYYY-MM-DD"]);
    }

    const result = await prisma.$transaction(async (tx) => {
      const requirements = await loadDailyJournalRequirements(tx, {
        userId,
        date,
        accountId,
      });

      if (!requirements.readyToComplete) {
        return { ok: false as const, requirements };
      }

      const completedAt = new Date();
      const journal = await tx.dailyJournal.upsert({
        where: {
          userId_date: {
            userId,
            date,
          },
        },
        create: {
          userId,
          date,
          status: "COMPLETED",
          completedAt,
        },
        update: {
          status: "COMPLETED",
          completedAt,
        },
      });

      return { ok: true as const, journal, requirements };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          success: false,
          ...requirementFailureResponse(result.requirements.missingRequirements),
          requirements: result.requirements,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      journal: serializeJournal(result.journal),
      requirements: result.requirements,
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to complete daily journal" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const body = (await request.json()) as Record<string, unknown>;
    const date = parseDateKey(body.date);
    const errors: string[] = [];

    if (!date) {
      errors.push("date must use YYYY-MM-DD");
    }

    const data: Prisma.DailyJournalUncheckedCreateInput = {
      userId,
      date: date || new Date(0),
      maxTradesAllowed: optionalInteger(body.maxTradesAllowed, "maxTradesAllowed", errors),
      maxDailyLoss: optionalFloat(body.maxDailyLoss, "maxDailyLoss", errors),
    };

    for (const field of textFields) {
      data[field] = textValue(body[field]);
    }

    for (const field of scoreFields) {
      data[field] = optionalScore(body[field], field, errors);
    }

    for (const field of booleanFields) {
      data[field] = body[field] === true;
    }

    if (data.mainPlaybookId) {
      const playbook = await prisma.playbookStrategy.findFirst({
        where: { id: data.mainPlaybookId, userId },
        select: { id: true },
      });

      if (!playbook) {
        errors.push("mainPlaybookId does not match an existing playbook");
      }
    }

    if (errors.length > 0 || !date) {
      return validationResponse(errors);
    }

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== "userId" && key !== "date")
    ) as Prisma.DailyJournalUncheckedUpdateInput;
    const journal = await prisma.dailyJournal.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      create: data,
      update: updateData,
    });

    return NextResponse.json({
      success: true,
      journal: serializeJournal(journal),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to save daily journal" },
      { status: 500 }
    );
  }
}
