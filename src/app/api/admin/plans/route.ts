import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { parsePlanPayload } from "@/lib/admin-plan-payload";
import { apiError, apiJson, handleApiError, serializePlan } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const db = prisma as any;
    const plans = await db.plan.findMany({
      orderBy: [{ isTrial: "desc" }, { isFree: "desc" }, { priceUSDT: "asc" }],
    });

    return apiJson({ success: true, plans: plans.map(serializePlan) });
  } catch (error) {
    return handleApiError(error, "Failed to load admin plans");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parsePlanPayload(body, true);

    if ("error" in parsed) {
      return apiError(parsed.error || "Invalid plan payload", 400);
    }

    const db = prisma as any;
    const plan = await db.plan.create({
      data: parsed.data,
    });

    return apiJson({ success: true, plan: serializePlan(plan) }, 201);
  } catch (error) {
    return handleApiError(error, "Failed to create plan");
  }
}
