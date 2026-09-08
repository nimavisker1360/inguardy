import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { apiError, apiJson, handleApiError, serializeSubscription } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const db = prisma as any;
    const existing = await db.subscription.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return apiError("Subscription not found", 404);
    }

    const now = new Date();

    await db.subscription.updateMany({
      where: {
        userId: existing.userId,
        status: { in: ["ACTIVE", "TRIAL", "FREE", "MANUAL"] },
      },
      data: {
        status: "CANCELED",
        canceledAt: now,
      },
    });

    const subscription = await db.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        payment: true,
      },
    });

    return apiJson({
      success: true,
      subscription: serializeSubscription(subscription),
    });
  } catch (error) {
    return handleApiError(error, "Failed to cancel subscription");
  }
}
