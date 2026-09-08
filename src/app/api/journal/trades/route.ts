import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteAllUserTrades } from "@/lib/journal/delete-trades";
import { closeTriggeredPropFirmChallenges } from "@/lib/prop-firms";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import {
  buildManualTradeCreateData,
  buildTradeWhere,
  ensureManualTradingAccount,
  getPagination,
  journalTradeInclude,
  serializeJournalTrade,
} from "@/lib/journal/prisma-trades";
import { attachDefaultChecklistsToTrade } from "@/lib/checklists/trade-checklists";

export const dynamic = "force-dynamic";

function validationResponse(errors: string[]) {
  return NextResponse.json(
    {
      success: false,
      message: "Validation failed",
      errors,
    },
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
    const { where, errors } = buildTradeWhere(searchParams);
    where.userId = userId;

    if (errors.length > 0) {
      return validationResponse(errors);
    }

    const { page, limit, skip, totalPages } = getPagination(searchParams);
    const [total, trades] = await prisma.$transaction([
      prisma.trade.count({ where }),
      prisma.trade.findMany({
        where,
        include: journalTradeInclude,
        orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: limit,
      }),
    ]);
    const pages = totalPages(total);

    return NextResponse.json({
      success: true,
      trades: trades.map(serializeJournalTrade),
      pagination: {
        page,
        limit,
        total,
        totalPages: pages,
        hasMore: page < pages,
      },
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load journal trades" },
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

    await requireFeatureAccess(userId, "trades");

    const body = (await request.json()) as Record<string, unknown>;
    const built = buildManualTradeCreateData({ ...body, userId });

    if (built.errors) {
      return validationResponse(built.errors);
    }

    if (built.data.accountId) {
      const account = await prisma.tradingAccount.findFirst({
        where: { id: built.data.accountId, userId },
        select: { id: true },
      });

      if (!account) {
        return validationResponse(["accountId does not match an existing trading account"]);
      }
    }

    const accountId =
      built.data.accountId || (await ensureManualTradingAccount(userId));
    const trade = await prisma.$transaction(async (tx) => {
      const createdTrade = await tx.trade.create({
        data: {
          ...built.data,
          accountId,
        },
      });

      await attachDefaultChecklistsToTrade(tx, createdTrade.id);

      return tx.trade.findUniqueOrThrow({
        where: { id: createdTrade.id },
        include: journalTradeInclude,
      });
    });

    if (trade.status === "CLOSED") {
      await closeTriggeredPropFirmChallenges(userId, { accountId });
    }

    return NextResponse.json(
      {
        success: true,
        trade: serializeJournalTrade(trade),
      },
      { status: 201 }
    );
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return validationResponse(["accountId does not match an existing trading account"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to create journal trade" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const result = await deleteAllUserTrades(userId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to delete all journal trades" },
      { status: 500 }
    );
  }
}
