import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { calculateStrategyCompliance } from "@/lib/playbooks/calculateStrategyCompliance";
import {
  normalizeFollowedPlan,
  normalizeRuleReviewStatus,
  optionalString,
  serializeTradeStrategyReview,
  tradeStrategyReviewInclude,
} from "@/lib/playbooks/api";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function validationResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, message: "Validation failed", errors },
    { status: 400 }
  );
}

function followedPlanFromCompliance(percent: number) {
  if (percent >= 80) {
    return "YES" as const;
  }

  if (percent >= 50) {
    return "PARTIAL" as const;
  }

  return "NO" as const;
}

async function loadReview(tradeId: string, userId: string) {
  return prisma.tradeStrategyReview.findFirst({
    where: { tradeId, trade: { userId } },
    include: tradeStrategyReviewInclude,
  });
}

async function loadSerializedTrade(userId: string, id: string) {
  const trade = await prisma.trade.findFirst({
    where: { id, userId },
    include: journalTradeInclude,
  });

  return trade ? serializeJournalTrade(trade) : null;
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
      select: { id: true },
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: "Trade not found" },
        { status: 404 }
      );
    }

    const review = await loadReview(id, userId);

    return NextResponse.json({
      success: true,
      review: review ? serializeTradeStrategyReview(review) : null,
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load strategy review" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const strategyId = optionalString(body.strategyId);
    const followedPlan = normalizeFollowedPlan(body.followedPlan);

    if (!strategyId) {
      return validationResponse(["strategyId is required"]);
    }

    if (!followedPlan) {
      return validationResponse(["followedPlan must be YES, PARTIAL, NO, or NOT_REVIEWED"]);
    }

    const review = await prisma.$transaction(async (tx) => {
      const [trade, strategy] = await Promise.all([
        tx.trade.findFirst({ where: { id, userId } }),
        tx.playbookStrategy.findFirst({
          where: { id: strategyId, userId },
          include: {
            rules: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
            checklistItems: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        }),
      ]);

      if (!trade) {
        throw new Error("TRADE_NOT_FOUND");
      }

      if (!strategy) {
        throw new Error("STRATEGY_NOT_FOUND");
      }

      const planItems =
        strategy.checklistItems.length > 0
          ? strategy.checklistItems.map((item, index) => ({
              originalRuleId: item.id,
              ruleTitleSnapshot: item.title,
              ruleDescriptionSnapshot: item.description,
              ruleSectionSnapshot: "ENTRY",
              isRequiredSnapshot: item.isRequired,
              status: "NOT_REVIEWED",
              sortOrder: item.sortOrder ?? index,
            }))
          : strategy.rules.map((rule, index) => ({
              originalRuleId: rule.id,
              ruleTitleSnapshot: rule.title,
              ruleDescriptionSnapshot: rule.description,
              ruleSectionSnapshot: rule.section,
              isRequiredSnapshot: rule.isRequired,
              status: "NOT_REVIEWED",
              sortOrder: rule.sortOrder ?? index,
            }));
      const ruleSnapshots = planItems;
      const compliance = calculateStrategyCompliance(ruleSnapshots);
      const existing = await tx.tradeStrategyReview.findUnique({
        where: { tradeId: id },
        select: { id: true },
      });

      await tx.trade.update({
        where: { id },
        data: {
          session: strategy.name,
          playbookId: strategy.id,
          reviewStatus: trade.source === "MT5" ? "NEEDS_REVIEW" : "DRAFT",
        },
      });

      if (existing) {
        await tx.tradeStrategyRuleReview.deleteMany({
          where: { tradeStrategyReviewId: existing.id },
        });

        return tx.tradeStrategyReview.update({
          where: { id: existing.id },
          data: {
            strategyId: strategy.id,
            strategyNameSnapshot: strategy.name,
            followedPlan: "NOT_REVIEWED",
            notes: optionalString(body.notes),
            ...compliance,
            ruleReviews: {
              create: ruleSnapshots,
            },
          },
          include: tradeStrategyReviewInclude,
        });
      }

      return tx.tradeStrategyReview.create({
        data: {
          tradeId: id,
          strategyId: strategy.id,
          strategyNameSnapshot: strategy.name,
          followedPlan: "NOT_REVIEWED",
          notes: optionalString(body.notes),
          ...compliance,
          ruleReviews: {
            create: ruleSnapshots,
          },
        },
        include: tradeStrategyReviewInclude,
      });
    });

    return NextResponse.json(
      {
        success: true,
        review: serializeTradeStrategyReview(review),
        trade: await loadSerializedTrade(userId, id),
      },
      { status: 201 }
    );
  } catch (error) {

    if (error instanceof Error && error.message === "TRADE_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Trade not found" },
        { status: 404 }
      );
    }

    if (error instanceof Error && error.message === "STRATEGY_NOT_FOUND") {
      return validationResponse(["strategyId does not match an existing playbook"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to create strategy review" },
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
    const followedPlan = normalizeFollowedPlan(body.followedPlan);
    const rawRuleReviews = Array.isArray(body.ruleReviews)
      ? body.ruleReviews
      : Array.isArray(body.checklistItems)
        ? body.checklistItems
        : [];
    const errors: string[] = [];

    if (!followedPlan) {
      errors.push("followedPlan must be YES, PARTIAL, NO, or NOT_REVIEWED");
    }

    const updates = rawRuleReviews.flatMap((rawReview) => {
      const review =
        rawReview && typeof rawReview === "object"
          ? (rawReview as Record<string, unknown>)
          : {};
      const reviewId = optionalString(review.id);
      const checked =
        typeof review.checked === "boolean" ? review.checked : undefined;
      const status =
        checked === undefined
          ? normalizeRuleReviewStatus(review.status)
          : checked
            ? "FOLLOWED"
            : "VIOLATED";

      if (!reviewId) {
        return [];
      }

      if (!status) {
        errors.push("Rule review status must be FOLLOWED, VIOLATED, NOT_APPLICABLE, or NOT_REVIEWED");
        return [];
      }

      return [
        {
          id: reviewId,
          status,
          note: optionalString(review.note),
        },
      ];
    });

    if (errors.length > 0 || !followedPlan) {
      return validationResponse(errors);
    }

    const review = await prisma.$transaction(async (tx) => {
      const existing = await tx.tradeStrategyReview.findUnique({
        where: { tradeId: id },
        include: {
          trade: true,
          ruleReviews: true,
        },
      });

      if (!existing || existing.trade.userId !== userId) {
        throw new Error("REVIEW_NOT_FOUND");
      }

      await Promise.all(
        updates.map((update) =>
          tx.tradeStrategyRuleReview.updateMany({
            where: {
              id: update.id,
              tradeStrategyReviewId: existing.id,
            },
            data: {
              status: update.status,
              note: update.note,
            },
          })
        )
      );

      const refreshedRules = await tx.tradeStrategyRuleReview.findMany({
        where: { tradeStrategyReviewId: existing.id },
      });
      const compliance = calculateStrategyCompliance(refreshedRules);
      const autoFollowedPlan = followedPlanFromCompliance(compliance.compliancePercent);

      return tx.tradeStrategyReview.update({
        where: { id: existing.id },
        data: {
          followedPlan: autoFollowedPlan,
          notes: optionalString(body.notes),
          ...compliance,
        },
        include: tradeStrategyReviewInclude,
      });
    });

    if (review.followedPlan !== "NOT_REVIEWED") {
      await prisma.trade.updateMany({
        where: { id, userId },
        data: {
          strategyReviewCompletedAt: new Date(),
          playbookId: review.strategyId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      review: serializeTradeStrategyReview(review),
      trade: await loadSerializedTrade(userId, id),
    });
  } catch (error) {

    if (error instanceof Error && error.message === "REVIEW_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Strategy review not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Strategy review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update strategy review" },
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
    const existing = await prisma.tradeStrategyReview.findUnique({
      where: { tradeId: id },
      include: { trade: true },
    });

    if (!existing || existing.trade.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Strategy review not found" },
        { status: 404 }
      );
    }

    await prisma.tradeStrategyReview.delete({
      where: { tradeId: id },
    });

    return NextResponse.json({
      success: true,
      message: "Strategy review removed",
      trade: await loadSerializedTrade(userId, id),
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Strategy review not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to remove strategy review" },
      { status: 500 }
    );
  }
}
