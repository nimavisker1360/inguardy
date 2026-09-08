import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { deleteUserTrade } from "@/lib/journal/delete-trades";
import { prisma } from "@/lib/prisma";
import { closeTriggeredPropFirmChallenges } from "@/lib/prop-firms";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import {
  buildManualTradeUpdateData,
  journalTradeInclude,
  lockImportedBrokerUpdate,
  serializeJournalTrade,
} from "@/lib/journal/prisma-trades";
import {
  completeTradeReview,
  requirementFailureResponse,
} from "@/lib/journal/review-requirements";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

function wantsCompleteReview(body: Record<string, unknown>) {
  return (
    body.completeReview === true ||
    body.action === "COMPLETE_REVIEW" ||
    body.reviewStatus === "REVIEWED"
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const trade = await prisma.trade.findFirst({
      where: { id, userId },
      include: journalTradeInclude,
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trade: serializeJournalTrade(trade),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load journal trade" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const built = buildManualTradeUpdateData(body);

    if (built.errors) {
      return validationResponse(built.errors);
    }

    if (wantsCompleteReview(body)) {
      const result = await prisma.$transaction(async (tx) => {
        const completed = await completeTradeReview(tx, userId, id);

        if (!completed.ok) {
          return completed;
        }

        const trade = await tx.trade.findUniqueOrThrow({
          where: { id },
          include: journalTradeInclude,
        });

        return {
          ok: true as const,
          requirements: completed.requirements,
          trade,
        };
      });

      if (!result.ok) {
        return NextResponse.json(
          {
            success: false,
            ...requirementFailureResponse(
              result.requirements.missingRequirements
            ),
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        success: true,
        trade: serializeJournalTrade(result.trade),
      });
    }

    const trade = await prisma.$transaction(async (tx) => {
      const existing = await tx.trade.findFirst({
        where: { id, userId },
        select: { source: true, setup: true, userId: true },
      });

      if (!existing) {
        throw new Prisma.PrismaClientKnownRequestError("Trade not found", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      if (built.data.accountId) {
        const account = await tx.tradingAccount.findFirst({
          where: { id: String(built.data.accountId), userId },
          select: { id: true },
        });

        if (!account) {
          throw new Prisma.PrismaClientKnownRequestError("Invalid accountId", {
            code: "P2003",
            clientVersion: Prisma.prismaVersion.client,
          });
        }
      }

      return tx.trade.update({
        where: { id },
        data: lockImportedBrokerUpdate(existing, built.data),
        include: journalTradeInclude,
      });
    });

    if (trade.status === "CLOSED") {
      await closeTriggeredPropFirmChallenges(userId, { accountId: trade.accountId });
    }

    return NextResponse.json({
      success: true,
      trade: serializeJournalTrade(trade),
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return validationResponse(["accountId does not match an existing trading account"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to update journal trade" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;

    const result = await deleteUserTrade(userId, id);

    if (result.deletedTrades === 0) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trade deleted",
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to delete journal trade" },
      { status: 500 }
    );
  }
}
