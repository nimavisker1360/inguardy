import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import {
  apiError,
  apiJson,
  handleApiError,
  normalizeTxid,
  serializePayment,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SUBMITTABLE_STATUSES = ["WAITING_TXID", "PENDING", "REJECTED"];

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const txid = normalizeTxid(body.txid);

    if (!txid) {
      return apiError("txid is required", 400);
    }

    if (txid.length < 20) {
      return apiError("txid must be at least 20 characters", 400);
    }

    const db = prisma as any;
    const payment = await db.payment.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
      },
    });

    if (!payment) {
      return apiError("Payment not found", 404);
    }

    if (payment.userId !== user.id) {
      return apiError("Forbidden", 403);
    }

    if (!SUBMITTABLE_STATUSES.includes(payment.status)) {
      return apiError("TXID cannot be submitted for this payment status", 400);
    }

    const duplicate = await db.payment.findFirst({
      where: {
        txid,
        id: { not: payment.id },
      },
      select: { id: true },
    });

    if (duplicate) {
      return apiError("This TXID has already been submitted", 409);
    }

    const updatedPayment = await db.payment.update({
      where: { id: payment.id },
      data: {
        txid,
        status: "UNDER_REVIEW",
        submittedAt: new Date(),
        rejectionReason: null,
        rejectedAt: null,
      },
      include: {
        plan: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    return apiJson({ success: true, payment: serializePayment(updatedPayment) });
  } catch (error) {
    return handleApiError(error, "Failed to submit TXID");
  }
}
