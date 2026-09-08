import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import {
  apiError,
  apiJson,
  handleApiError,
  parsePageLimit,
  serializeSubscription,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

const STATUSES = ["ACTIVE", "EXPIRED", "CANCELED", "TRIAL", "FREE", "MANUAL"];

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim().toUpperCase();
    const search = searchParams.get("search")?.trim();
    const plan = searchParams.get("plan")?.trim();
    const expiringSoon = searchParams.get("expiringSoon") === "true";
    const { page, limit, skip } = parsePageLimit(searchParams);
    const now = new Date();
    const soon = new Date(now);
    soon.setDate(soon.getDate() + 7);

    if (status && !STATUSES.includes(status)) {
      return apiError("Invalid subscription status filter", 400);
    }

    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
      ...(plan ? { plan: { slug: plan } } : {}),
      ...(expiringSoon ? { expiresAt: { gte: now, lte: soon } } : {}),
      ...(search
        ? {
            user: {
              OR: [
                { email: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    };

    const db = prisma as any;
    const [total, subscriptions] = await prisma.$transaction([
      db.subscription.count({ where }),
      db.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: true,
          payment: true,
        },
        orderBy: expiringSoon ? { expiresAt: "asc" } : { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return apiJson({
      success: true,
      subscriptions: subscriptions.map(serializeSubscription),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to load admin subscriptions");
  }
}
