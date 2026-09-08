import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import {
  PAID_SUBSCRIPTION_STATUSES,
  addDays,
  apiError,
  apiJson,
  handleApiError,
  serializePayment,
  serializeSubscription,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const CONFIRMABLE_STATUSES = ["UNDER_REVIEW", "WAITING_TXID"];

export async function POST(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const db = prisma as any;
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        user: true,
        plan: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!payment) {
      return apiError("Payment not found", 404);
    }

    if (payment.status === "CONFIRMED" && payment.subscription) {
      return apiJson({
        success: true,
        payment: serializePayment(payment),
        subscription: serializeSubscription(payment.subscription),
      });
    }

    if (!CONFIRMABLE_STATUSES.includes(payment.status)) {
      return apiError("Payment cannot be confirmed from its current status", 400);
    }

    const durationDays = Number(payment.plan.durationDays);

    if (!Number.isInteger(durationDays) || durationDays <= 0) {
      return apiError("Paid plan durationDays must be greater than zero", 400);
    }

    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const txDb = tx as any;
      const existingPaidSubscription = await txDb.subscription.findFirst({
        where: {
          userId: payment.userId,
          status: { in: [...PAID_SUBSCRIPTION_STATUSES] },
          expiresAt: { gt: now },
        },
        orderBy: { expiresAt: "desc" },
      });
      const baseDate =
        existingPaidSubscription && existingPaidSubscription.expiresAt > now
          ? existingPaidSubscription.expiresAt
          : now;

      await txDb.subscription.updateMany({
        where: {
          userId: payment.userId,
          status: { in: ["TRIAL", "FREE"] },
          expiresAt: { gt: now },
        },
        data: {
          status: "CANCELED",
          canceledAt: now,
        },
      });

      await txDb.payment.update({
        where: { id: payment.id },
        data: {
          status: "CONFIRMED",
          confirmedAt: now,
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      const subscription = await txDb.subscription.create({
        data: {
          userId: payment.userId,
          planId: payment.planId,
          paymentId: payment.id,
          status: "ACTIVE",
          startedAt: baseDate,
          expiresAt: addDays(baseDate, durationDays),
        },
        include: {
          plan: true,
          payment: true,
        },
      });

      const updatedPayment = await txDb.payment.findUnique({
        where: { id: payment.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          plan: true,
          subscription: {
            include: { plan: true },
          },
        },
      });

      return { payment: updatedPayment, subscription };
    });

    return apiJson({
      success: true,
      payment: serializePayment(result.payment),
      subscription: serializeSubscription(result.subscription),
    });
  } catch (error) {
    return handleApiError(error, "Failed to confirm payment");
  }
}
