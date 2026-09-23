import { NextResponse } from "next/server";
import { getPropFirmChallengesForUser } from "@/lib/dashboard-data";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorizedResponse();

  try {
    const { id } = await context.params;
    const data = await getPropFirmChallengesForUser(userId);
    const challenge = data.challenges.find((item) => item.id === id);
    if (!challenge) {
      return NextResponse.json(
        { success: false, message: "Prop firm challenge not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        challengeId: challenge.id,
        accountId: challenge.accountId,
        guard: challenge.guard,
        ruleStatus: challenge.computedStatus,
        syncStatus: challenge.syncStatus,
        dataAsOf: challenge.dataAsOf,
        evaluatedAt: new Date().toISOString(),
        enforcement: "ADVISORY_ONLY",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to evaluate guard" },
      { status: 500 }
    );
  }
}
