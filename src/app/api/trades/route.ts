import { Prisma, TradeStatus } from "@prisma/client";
import { serializeTrade, tradeListInclude } from "@/lib/dashboard-data";
import { deleteAllUserTrades } from "@/lib/journal/delete-trades";
import { prisma } from "@/lib/prisma";
import { closeTriggeredPropFirmChallenges } from "@/lib/prop-firms";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import { applyManualReviewStatusFilter } from "@/lib/trade-review-status";
import {
  apiResponse,
  calculateTradeMetrics,
  decimalValue,
  normalizeTagIds,
  parseDate,
  parsePositiveInt,
  parseTradeDirection,
  parseTradeStatus,
} from "@/lib/journal/api-utils";
import { getTradingSessionLabel } from "@/lib/journal/trading-session";

export const dynamic = "force-dynamic";

function endOfDayIfDateOnly(value: string | null, date: Date | null | undefined) {
  if (!value || !date || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return date;
  }

  const copy = new Date(date);
  copy.setUTCHours(23, 59, 59, 999);
  return copy;
}

function buildTradeCreateData(body: Record<string, unknown>) {
  const direction = parseTradeDirection(body.direction);
  const status = body.status ? parseTradeStatus(body.status) : TradeStatus.OPEN;
  const openedAt = parseDate(body.openedAt);
  const closedAt = parseDate(body.closedAt);

  if (!direction) {
    return { error: "Invalid trade direction" };
  }

  if (!status) {
    return { error: "Invalid trade status" };
  }

  if (openedAt === null || closedAt === null) {
    return { error: "Invalid trade date" };
  }

  const metrics = calculateTradeMetrics({
    ...body,
    direction,
    status,
  });

  return {
    data: {
      userId: String(body.userId),
      accountId: String(body.accountId),
      symbol: String(body.symbol).trim().toUpperCase(),
      direction,
      status,
      entryPrice: decimalValue(body.entryPrice),
      exitPrice: decimalValue(body.exitPrice),
      stopLoss: decimalValue(body.stopLoss),
      takeProfit: decimalValue(body.takeProfit),
      lotSize: decimalValue(body.lotSize),
      riskAmount: decimalValue(body.riskAmount),
      profitLoss: decimalValue(body.profitLoss) ?? metrics.profitLoss,
      commission: decimalValue(body.commission),
      swap: decimalValue(body.swap),
      rr: decimalValue(body.rr) ?? metrics.rr,
      source: "MANUAL",
      mt5Ticket: body.mt5Ticket ? String(body.mt5Ticket).trim() : undefined,
      setup: body.setup ?? undefined,
      session: getTradingSessionLabel(openedAt),
      emotion: body.emotion ?? undefined,
      mistake: body.mistake ?? undefined,
      notes: body.notes ?? undefined,
      openedAt,
      closedAt,
    },
  };
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const reviewStatus = searchParams.get("reviewStatus");
    const source = searchParams.get("source");
    const minAiScore = parsePositiveInt(searchParams.get("minAiScore"), 0);
    const maxAiScore = parsePositiveInt(searchParams.get("maxAiScore"), 0);
    const direction = searchParams.get("direction");
    const dateFrom = parseDate(searchParams.get("from") ?? searchParams.get("dateFrom"));
    const rawDateTo = searchParams.get("to") ?? searchParams.get("dateTo");
    const dateTo = endOfDayIfDateOnly(rawDateTo, parseDate(rawDateTo));
    const where: Prisma.TradeWhereInput = {};
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 50), 100);

    where.userId = userId;

    const accountId = searchParams.get("accountId");
    if (accountId) {
      where.accountId = accountId;
    }

    const symbol = searchParams.get("symbol");
    if (symbol) {
      where.symbol = { contains: symbol.trim(), mode: "insensitive" };
    }

    if (status) {
      const parsedStatus = parseTradeStatus(status);
      if (!parsedStatus) {
        return apiResponse({ success: false, message: "Invalid trade status" }, 400);
      }

      where.status = parsedStatus;
    }

    if (direction) {
      const parsedDirection = parseTradeDirection(direction);
      if (!parsedDirection) {
        return apiResponse(
          { success: false, message: "Invalid trade direction" },
          400
        );
      }

      where.direction = parsedDirection;
    }

    if (reviewStatus) {
      if (!applyManualReviewStatusFilter(where, reviewStatus)) {
        return apiResponse({ success: false, message: "Invalid review status" }, 400);
      }
    }

    if (source) {
      const normalizedSource = source.trim().toUpperCase();

      if (normalizedSource === "MANUAL") {
        where.source = "MANUAL";
      } else if (normalizedSource === "MT5") {
        where.source = { in: ["MT5", "MT5_EA", "EA_IMPORT", "MT5_DIRECT"] };
      } else if (normalizedSource === "CTRADER") {
        where.source = "CTRADER_DIRECT";
      } else {
        return apiResponse({ success: false, message: "Invalid source filter" }, 400);
      }
    }

    if (minAiScore || maxAiScore) {
      where.aiReviewScore = {
        ...(minAiScore ? { gte: Math.min(minAiScore, 100) } : {}),
        ...(maxAiScore ? { lte: Math.min(maxAiScore, 100) } : {}),
      };
    }

    if (dateFrom === null || dateTo === null) {
      return apiResponse({ success: false, message: "Invalid date filter" }, 400);
    }

    if (dateFrom || dateTo) {
      where.openedAt = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      };
    }

    const db = prisma as any;
    const [total, trades] = await prisma.$transaction([
      prisma.trade.count({ where }),
      db.trade.findMany({
        where,
        include: tradeListInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return apiResponse({
      success: true,
      data: {
        trades: trades.map(serializeTrade),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
    });
  } catch {

    return apiResponse({ success: false, message: "Failed to load trades" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "trades");

    const body = await request.json();
    const { accountId, symbol } = body;

    if (!accountId || !symbol || !body.direction) {
      return apiResponse(
        {
          success: false,
          message: "accountId, symbol, and direction are required",
        },
        400
      );
    }

    const account = await prisma.tradingAccount.findFirst({
      where: { id: String(accountId), userId },
      select: { id: true },
    });

    if (!account) {
      return apiResponse({ success: false, message: "Trading account not found" }, 404);
    }

    const built = buildTradeCreateData({ ...body, userId });
    if ("error" in built) {
      return apiResponse({ success: false, message: built.error }, 400);
    }

    const tagIds = normalizeTagIds(body.tagIds);
    const trade = await prisma.$transaction(async (tx) => {
      const txDb = tx as any;
      if (tagIds.length > 0) {
        const ownedTagCount = await txDb.tag.count({
          where: { userId, id: { in: tagIds } },
        });

        if (ownedTagCount !== tagIds.length) {
          throw new Prisma.PrismaClientKnownRequestError("Invalid tagId", {
            code: "P2003",
            clientVersion: Prisma.prismaVersion.client,
          });
        }
      }

      const created = await txDb.trade.create({
        data: built.data,
      });

      if (tagIds.length > 0) {
        await txDb.tradeTag.createMany({
          data: tagIds.map((tagId) => ({ tradeId: created.id, tagId })),
          skipDuplicates: true,
        });
      }

      return txDb.trade.findUnique({
        where: { id: created.id },
        include: tradeListInclude,
      });
    });

    if (trade?.status === TradeStatus.CLOSED) {
      await closeTriggeredPropFirmChallenges(userId, { accountId: trade.accountId });
    }

    return apiResponse({ success: true, data: trade }, 201);
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return apiResponse(
        { success: false, message: "Invalid accountId or tagId" },
        400
      );
    }

    return apiResponse({ success: false, message: "Failed to create trade" }, 500);
  }
}

export async function DELETE() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const result = await deleteAllUserTrades(userId);

    return apiResponse({
      success: true,
      data: result,
    });
  } catch {

    return apiResponse(
      { success: false, message: "Failed to delete all trades" },
      500
    );
  }
}
