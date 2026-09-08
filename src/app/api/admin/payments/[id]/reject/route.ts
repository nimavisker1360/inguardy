import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { apiError, apiJson, handleApiError, serializePayment } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const reason =
      typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : null;
    const db = prisma as any;
    const existing = await db.payment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return apiError("Payment not found", 404);
    }

    const payment = await db.payment.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
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

    return apiJson({ success: true, payment: serializePayment(payment) });
  } catch (error) {
    return handleApiError(error, "Failed to reject payment");
  }
}
