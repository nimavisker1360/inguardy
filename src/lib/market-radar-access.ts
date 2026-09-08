import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isAdminUser } from "@/lib/server-auth";
import { getUserPlanLimits, SubscriptionAccessError } from "@/lib/subscription";

const PAID_ANALYSIS_STATUSES = ["ACTIVE", "MANUAL"];

export type MarketRadarAccessState = {
  aiAnalysisEnabled: boolean;
  hasUsedFreeAnalysis: boolean;
  canAnalyze: boolean;
};

function isPaidAiAnalysisPlan(access: Awaited<ReturnType<typeof getUserPlanLimits>>) {
  const subscription = access.subscription;
  const plan = access.plan;

  return Boolean(
    subscription &&
      PAID_ANALYSIS_STATUSES.includes(subscription.status) &&
      plan?.aiAnalysis &&
      !plan.isFree &&
      !plan.isTrial
  );
}

export async function getMarketRadarAccess(userId: string): Promise<MarketRadarAccessState> {
  const [access, user, usage] = await Promise.all([
    getUserPlanLimits(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    }),
    prisma.marketRadarAnalysisUsage.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);

  const aiAnalysisEnabled = isAdminUser(user) || isPaidAiAnalysisPlan(access);
  const hasUsedFreeAnalysis = Boolean(usage);

  return {
    aiAnalysisEnabled,
    hasUsedFreeAnalysis,
    canAnalyze: aiAnalysisEnabled || !hasUsedFreeAnalysis,
  };
}

export async function claimMarketRadarAnalysis(userId: string): Promise<MarketRadarAccessState> {
  const access = await getMarketRadarAccess(userId);

  if (access.aiAnalysisEnabled) {
    return access;
  }

  if (access.hasUsedFreeAnalysis) {
    throw new SubscriptionAccessError(
      "You have used your free AI market analysis. Upgrade to Pro to unlock this button again.",
      403
    );
  }

  try {
    await prisma.marketRadarAnalysisUsage.create({
      data: { userId },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new SubscriptionAccessError(
        "You have used your free AI market analysis. Upgrade to Pro to unlock this button again.",
        403
      );
    }

    throw error;
  }

  return {
    aiAnalysisEnabled: false,
    hasUsedFreeAnalysis: true,
    canAnalyze: false,
  };
}
