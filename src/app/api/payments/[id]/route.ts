import { prisma } from "@/lib/prisma";
import { isAdminUser, requireUser } from "@/lib/server-auth";
import { apiError, apiJson, handleApiError, serializePayment } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const db = prisma as any;
    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!payment) {
      return apiError("Payment not found", 404);
    }

    if (payment.userId !== user.id && !isAdminUser(user)) {
      return apiError("Forbidden", 403);
    }

    return apiJson({ success: true, payment: serializePayment(payment) });
  } catch (error) {
    return handleApiError(error, "Failed to load payment");
  }
}
