import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { apiJson, handleApiError, serializePayment } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    const db = prisma as any;
    const payments = await db.payment.findMany({
      where: { userId: user.id },
      include: {
        plan: true,
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return apiJson({
      success: true,
      payments: payments.map(serializePayment),
    });
  } catch (error) {
    return handleApiError(error, "Failed to load payments");
  }
}
