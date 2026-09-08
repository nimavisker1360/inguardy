import { prisma } from "@/lib/prisma";
import { apiJson, handleApiError, serializePlan } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = prisma as any;
    const plans = await db.plan.findMany({
      where: {
        isActive: true,
        isTrial: false,
      },
      orderBy: [{ priceUSDT: "asc" }, { durationDays: "asc" }],
    });

    return apiJson({
      success: true,
      plans: plans.map(serializePlan),
    });
  } catch (error) {
    return handleApiError(error, "Failed to load plans");
  }
}
