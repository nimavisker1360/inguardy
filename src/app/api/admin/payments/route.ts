import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import {
  PAYMENT_NETWORKS,
  apiError,
  apiJson,
  handleApiError,
  parsePageLimit,
  serializePayment,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

const PAYMENT_STATUSES = [
  "PENDING",
  "WAITING_TXID",
  "UNDER_REVIEW",
  "CONFIRMED",
  "REJECTED",
  "EXPIRED",
];

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim().toUpperCase();
    const network = searchParams.get("network")?.trim().toUpperCase();
    const plan = searchParams.get("plan")?.trim();
    const sortBy = searchParams.get("sortBy")?.trim() || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const search = searchParams.get("search")?.trim();
    const { page, limit, skip } = parsePageLimit(searchParams);

    if (status && !PAYMENT_STATUSES.includes(status)) {
      return apiError("Invalid payment status filter", 400);
    }

    if (network && !PAYMENT_NETWORKS.includes(network as any)) {
      return apiError("Invalid payment network filter", 400);
    }

    const where: Record<string, unknown> = {
      ...(status ? { status } : {}),
      ...(network ? { network } : {}),
      ...(plan ? { plan: { slug: plan } } : {}),
      ...(search
        ? {
            OR: [
              { txid: { contains: search, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { email: { contains: search, mode: "insensitive" } },
                    { name: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    };
    const orderBy =
      sortBy === "submittedAt"
        ? { submittedAt: sortOrder as "asc" | "desc" }
        : sortBy === "confirmedAt"
          ? { confirmedAt: sortOrder as "asc" | "desc" }
          : { createdAt: sortOrder as "asc" | "desc" };

    const db = prisma as any;
    const [total, payments] = await prisma.$transaction([
      db.payment.count({ where }),
      db.payment.findMany({
        where,
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
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return apiJson({
      success: true,
      payments: payments.map(serializePayment),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to load admin payments");
  }
}
