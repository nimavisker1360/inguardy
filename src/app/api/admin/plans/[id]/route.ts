import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { parsePlanPayload } from "@/lib/admin-plan-payload";
import { apiError, apiJson, handleApiError, serializePlan } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const parsed = parsePlanPayload(body, false);

    if ("error" in parsed) {
      return apiError(parsed.error || "Invalid plan payload", 400);
    }

    const db = prisma as any;
    const existing = await db.plan.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return apiError("Plan not found", 404);
    }

    const plan = await db.plan.update({
      where: { id },
      data: parsed.data,
    });

    return apiJson({ success: true, plan: serializePlan(plan) });
  } catch (error) {
    return handleApiError(error, "Failed to update plan");
  }
}
