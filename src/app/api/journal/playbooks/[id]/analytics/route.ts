import { NextResponse } from "next/server";
import { calculateStrategyAnalytics } from "@/lib/playbooks/calculateStrategyAnalytics";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "advancedAnalytics");

    const { id } = await context.params;
    const strategy = await prisma.playbookStrategy.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!strategy) {
      return NextResponse.json(
        { success: false, message: "Playbook not found" },
        { status: 404 }
      );
    }

    const reviews = await prisma.tradeStrategyReview.findMany({
      where: { strategyId: id, trade: { userId } },
      include: {
        trade: true,
      },
    });
    const analytics = calculateStrategyAnalytics(
      reviews.map((review) => ({
        ...review.trade,
        strategyReview: review,
      }))
    );

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    return NextResponse.json(
      { success: false, message: "Failed to load playbook analytics" },
      { status: 500 }
    );
  }
}
