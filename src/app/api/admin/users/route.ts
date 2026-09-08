import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import {
  apiError,
  apiJson,
  handleApiError,
  isValidRole,
  parsePageLimit,
  serializeSubscription,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

const SUBSCRIPTION_STATUSES = ["ACTIVE", "EXPIRED", "CANCELED", "TRIAL", "FREE", "MANUAL"];
const USER_FILTERS = [
  "admins",
  "trial",
  "free",
  "active-paid",
  "expired",
  "payment-under-review",
  "created-this-month",
];

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const subscriptionStatus = searchParams.get("subscriptionStatus")?.trim().toUpperCase();
    const plan = searchParams.get("plan")?.trim();
    const role = searchParams.get("role")?.trim().toUpperCase() || null;
    const filter = searchParams.get("filter")?.trim();
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const { page, limit, skip } = parsePageLimit(searchParams);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (role && !isValidRole(role)) {
      return apiError("Invalid role filter", 400);
    }

    if (
      subscriptionStatus &&
      !SUBSCRIPTION_STATUSES.includes(subscriptionStatus)
    ) {
      return apiError("Invalid subscriptionStatus filter", 400);
    }

    if (filter && !USER_FILTERS.includes(filter)) {
      return apiError("Invalid filter", 400);
    }

    const where: Record<string, unknown> = {
      ...(role ? { role } : filter === "admins" ? { role: "ADMIN" } : {}),
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(filter === "created-this-month" ? { createdAt: { gte: monthStart } } : {}),
      ...(subscriptionStatus
        ? {
            subscriptions: {
              some: { status: subscriptionStatus },
            },
          }
        : {}),
      ...(plan
        ? {
            subscriptions: {
              some: { plan: { slug: plan } },
            },
          }
        : {}),
      ...(filter === "trial"
        ? { subscriptions: { some: { status: "TRIAL", expiresAt: { gt: now } } } }
        : {}),
      ...(filter === "free"
        ? { subscriptions: { some: { status: "FREE", expiresAt: { gt: now } } } }
        : {}),
      ...(filter === "active-paid"
        ? { subscriptions: { some: { status: { in: ["ACTIVE", "MANUAL"] }, expiresAt: { gt: now } } } }
        : {}),
      ...(filter === "expired"
        ? { subscriptions: { some: { OR: [{ status: "EXPIRED" }, { expiresAt: { lt: now } }] } } }
        : {}),
      ...(filter === "payment-under-review"
        ? { payments: { some: { status: "UNDER_REVIEW" } } }
        : {}),
    };
    const orderBy =
      sortBy === "oldest"
        ? { createdAt: "asc" as const }
        : sortBy === "expiresSoon"
          ? { subscriptions: { _count: "desc" as const } }
          : sortBy === "mostTrades"
            ? { trades: { _count: "desc" as const } }
            : sortBy === "mostPayments"
              ? { payments: { _count: "desc" as const } }
              : { createdAt: sortOrder as "asc" | "desc" };

    const db = prisma as any;
    const [total, users] = await prisma.$transaction([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          sessions: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
          accounts: {
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { providerId: true },
          },
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: {
            select: {
              payments: true,
              trades: true,
              tradeScreenshots: true,
            },
          },
        },
      }),
    ]);

    return apiJson({
      success: true,
      users: users.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.sessions[0]?.createdAt ?? null,
        authProvider: user.accounts[0]?.providerId ?? null,
        latestSubscription: serializeSubscription(user.subscriptions[0]),
        paymentCount: user._count.payments,
        tradeCount: user._count.trades,
        screenshotsCount: user._count.tradeScreenshots,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to load admin users");
  }
}
