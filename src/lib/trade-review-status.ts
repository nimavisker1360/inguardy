import type { Prisma } from "@prisma/client";
import type { TradeDto } from "@/components/dashboard/types";

type TradeReviewLike = Pick<TradeDto, "strategyReview" | "reviewStatus">;

export function isTradeManuallyReviewed(trade: TradeReviewLike) {
  if (trade.reviewStatus === "REVIEWED") {
    return true;
  }

  const review = trade.strategyReview;

  return Boolean(
    review &&
      (review.strategyId ||
        review.strategyNameSnapshot ||
        (review.followedPlan && review.followedPlan !== "NOT_REVIEWED"))
  );
}

export function applyManualReviewStatusFilter(
  where: Prisma.TradeWhereInput,
  reviewStatus: string
) {
  if (reviewStatus === "not-reviewed") {
    where.OR = [
      { reviewStatus: { not: "REVIEWED" } },
      { strategyReview: null },
      {
        strategyReview: {
          is: {
            followedPlan: "NOT_REVIEWED",
            strategyId: null,
            strategyNameSnapshot: null,
          },
        },
      },
    ];
    return true;
  }

  if (reviewStatus === "reviewed") {
    where.OR = [
      { reviewStatus: "REVIEWED" },
      {
        strategyReview: {
          is: {
            OR: [
              { strategyId: { not: null } },
              { strategyNameSnapshot: { not: null } },
              { followedPlan: { not: "NOT_REVIEWED" } },
            ],
          },
        },
      },
    ];
    return true;
  }

  return false;
}
