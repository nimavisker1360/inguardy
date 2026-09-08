import { Prisma, TradeDirection } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  analyticsTradeInclude,
  buildAnalyticsMetadata,
  buildTradeAnalytics,
} from "@/lib/analytics/tradeAnalytics";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function parseDateParam(value: string | null, end = false) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return end ? endOfDay(parsed) : startOfDay(parsed);
  }

  return parsed;
}

function rangeFromPreset(value: string | null) {
  const now = new Date();

  if (!value || value === "all") {
    return {};
  }

  if (value === "today") {
    return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
  }

  if (value === "thisWeek") {
    return { dateFrom: startOfWeek(now), dateTo: endOfDay(now) };
  }

  if (value === "thisMonth") {
    return {
      dateFrom: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      dateTo: endOfDay(now),
    };
  }

  if (value === "thisYear") {
    return {
      dateFrom: startOfDay(new Date(now.getFullYear(), 0, 1)),
      dateTo: endOfDay(now),
    };
  }

  if (value === "custom") {
    return {};
  }

  return null;
}

function parseDirection(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === TradeDirection.BUY || normalized === TradeDirection.SELL) {
    return normalized;
  }

  return null;
}

function sessionHourRange(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes("asia")) {
    return { gte: 0, lt: 7 };
  }

  if (normalized.includes("london")) {
    return { gte: 7, lt: 13 };
  }

  if (normalized.includes("new york") || normalized.includes("ny")) {
    return { gte: 13, lt: 21 };
  }

  if (normalized.includes("other")) {
    return "other" as const;
  }

  return null;
}

function tradeSession(date: Date | null) {
  if (!date) {
    return "Other";
  }

  const hour = date.getUTCHours();

  if (hour >= 0 && hour < 7) return "Asia Session";
  if (hour >= 7 && hour < 13) return "London Session";
  if (hour >= 13 && hour < 21) return "New York Session";
  return "Other";
}

function buildAnalyticsWhere(searchParams: URLSearchParams, userId: string) {
  const errors: string[] = [];
  const and: Prisma.TradeWhereInput[] = [
    {
      OR: [
        { status: "CLOSED" },
        { closedAt: { not: null } },
        { exitPrice: { not: null } },
      ],
    },
  ];
  const accountId = searchParams.get("accountId")?.trim();
  const symbol = searchParams.get("symbol")?.trim();
  const strategy = searchParams.get("strategy")?.trim();
  const setup = searchParams.get("setup")?.trim();
  const mistake = searchParams.get("mistake")?.trim();
  const emotion = searchParams.get("emotion")?.trim();
  const reviewStatus = searchParams.get("reviewStatus")?.trim();
  const checklistStatus = searchParams.get("checklistStatus")?.trim();
  const session = sessionHourRange(searchParams.get("session"));
  const dateRange = searchParams.get("dateRange");
  const presetRange = rangeFromPreset(dateRange);
  const direction = parseDirection(
    searchParams.get("direction") || searchParams.get("side")
  );

  if (presetRange === null) {
    errors.push("dateRange must be all, today, thisWeek, thisMonth, thisYear, or custom");
  }

  if (direction === null) {
    errors.push("direction must be BUY or SELL");
  }

  if (session === null) {
    errors.push("session must be Asia Session, London Session, New York Session, or Other");
  }

  const customDateFrom = parseDateParam(
    searchParams.get("dateFrom") || searchParams.get("from")
  );
  const customDateTo = parseDateParam(
    searchParams.get("dateTo") || searchParams.get("to"),
    true
  );

  if (customDateFrom === null) {
    errors.push("dateFrom must be a valid date");
  }

  if (customDateTo === null) {
    errors.push("dateTo must be a valid date");
  }

  const dateFrom = customDateFrom || presetRange?.dateFrom;
  const dateTo = customDateTo || presetRange?.dateTo;

  and.push({ userId });

  if (accountId) {
    and.push({ accountId });
  }

  if (symbol) {
    and.push({ symbol: { contains: symbol, mode: "insensitive" } });
  }

  if (direction) {
    and.push({ direction });
  }

  if (strategy) {
    and.push({
      OR: [
        { session: { contains: strategy, mode: "insensitive" } },
        { setup: { contains: strategy, mode: "insensitive" } },
      ],
    });
  }

  if (setup) {
    and.push({ setup: { contains: setup, mode: "insensitive" } });
  }

  if (mistake) {
    and.push({ mistake: { contains: mistake, mode: "insensitive" } });
  }

  if (emotion) {
    and.push({ emotion: { contains: emotion, mode: "insensitive" } });
  }

  if (reviewStatus === "reviewed") {
    and.push({
      strategyReview: {
        is: {
          followedPlan: {
            not: "NOT_REVIEWED",
          },
        },
      },
    });
  } else if (reviewStatus === "notReviewed") {
    and.push({
      OR: [
        { strategyReview: null },
        {
          strategyReview: {
            is: {
              followedPlan: "NOT_REVIEWED",
            },
          },
        },
      ],
    });
  } else if (reviewStatus) {
    errors.push("reviewStatus must be reviewed or notReviewed");
  }

  if (checklistStatus === "completed") {
    and.push({ checklists: { some: { completionPercent: { gte: 100 } } } });
  } else if (checklistStatus === "incomplete") {
    and.push({
      OR: [
        { checklists: { none: {} } },
        { checklists: { some: { completionPercent: { lt: 100 } } } },
      ],
    });
  } else if (checklistStatus) {
    errors.push("checklistStatus must be completed or incomplete");
  }

  if (dateFrom || dateTo) {
    and.push({
      openedAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }

  return {
    where: { AND: and } satisfies Prisma.TradeWhereInput,
    errors,
    session,
  };
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "advancedAnalytics");

    const { searchParams } = new URL(request.url);
    const { where, errors, session } = buildAnalyticsWhere(searchParams, userId);

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: "Validation failed", errors },
        { status: 400 }
      );
    }

    const metadataWhere: Prisma.TradeWhereInput = {
      userId,
      OR: [
        { status: "CLOSED" },
        { closedAt: { not: null } },
        { exitPrice: { not: null } },
      ],
    };
    const accountId = searchParams.get("accountId")?.trim();

    if (accountId) {
      metadataWhere.accountId = accountId;
    }

    const [trades, metadataTrades] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: analyticsTradeInclude,
        orderBy: [{ closedAt: "asc" }, { openedAt: "asc" }, { createdAt: "asc" }],
      }),
      prisma.trade.findMany({
        where: metadataWhere,
        include: analyticsTradeInclude,
        orderBy: [{ symbol: "asc" }, { openedAt: "asc" }],
      }),
    ]);
    const filteredTrades = session
      ? trades.filter((trade) => {
          const label = tradeSession(trade.openedAt || trade.closedAt || trade.createdAt);

          if (session === "other") {
            return label === "Other";
          }

          if (session.gte === 0) return label === "Asia Session";
          if (session.gte === 7) return label === "London Session";
          return label === "New York Session";
        })
      : trades;
    const metadata = buildAnalyticsMetadata(metadataTrades);
    const analytics = buildTradeAnalytics(filteredTrades, metadata);

    return NextResponse.json(analytics);
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    return NextResponse.json(
      { success: false, message: "Failed to load journal analytics" },
      { status: 500 }
    );
  }
}
