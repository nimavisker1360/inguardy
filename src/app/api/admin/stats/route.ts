import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import {
  apiJson,
  handleApiError,
  serializePayment,
  serializeSubscription,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();

    const db = prisma as any;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const expiringSoonEnd = new Date(now);
    expiringSoonEnd.setDate(expiringSoonEnd.getDate() + 7);

    const [
      totalUsers,
      activePaidSubscriptions,
      trialUsers,
      freeUsers,
      expiredSubscriptions,
      paymentsUnderReview,
      confirmedPayments,
      rejectedPayments,
      monthlyRevenue,
      totalRevenue,
      newUsersThisMonth,
      expiringSoonSubscriptions,
      latestPaymentsUnderReview,
      latestUsers,
      expiringSoon,
    ] = await prisma.$transaction([
      db.user.count(),
      db.subscription.count({
        where: {
          status: { in: ["ACTIVE", "MANUAL"] },
          expiresAt: { gt: now },
        },
      }),
      db.subscription.count({
        where: {
          status: "TRIAL",
          expiresAt: { gt: now },
        },
      }),
      db.subscription.count({
        where: {
          status: "FREE",
          expiresAt: { gt: now },
        },
      }),
      db.subscription.count({
        where: {
          OR: [{ status: "EXPIRED" }, { expiresAt: { lt: now } }],
        },
      }),
      db.payment.count({ where: { status: "UNDER_REVIEW" } }),
      db.payment.count({ where: { status: "CONFIRMED" } }),
      db.payment.count({ where: { status: "REJECTED" } }),
      db.payment.aggregate({
        where: {
          status: "CONFIRMED",
          confirmedAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      db.payment.aggregate({
        where: { status: "CONFIRMED" },
        _sum: { amount: true },
      }),
      db.user.count({
        where: {
          createdAt: { gte: monthStart },
        },
      }),
      db.subscription.count({
        where: {
          status: { in: ["ACTIVE", "MANUAL", "TRIAL"] },
          expiresAt: { gte: now, lte: expiringSoonEnd },
        },
      }),
      db.payment.findMany({
        where: { status: "UNDER_REVIEW" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: true,
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      }),
      db.subscription.findMany({
        where: {
          status: { in: ["ACTIVE", "MANUAL", "TRIAL"] },
          expiresAt: { gte: now, lte: expiringSoonEnd },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          plan: true,
          payment: true,
        },
        orderBy: { expiresAt: "asc" },
        take: 5,
      }),
    ]);

    return apiJson({
      success: true,
      stats: {
        totalUsers,
        activePaidSubscriptions,
        trialUsers,
        freeUsers,
        expiredSubscriptions,
        paymentsUnderReview,
        confirmedPayments,
        rejectedPayments,
        monthlyRevenueUSDT: monthlyRevenue._sum.amount?.toString() || "0",
        totalRevenueUSDT: totalRevenue._sum.amount?.toString() || "0",
        newUsersThisMonth,
        expiringSoonSubscriptions,
      },
      latestPaymentsUnderReview: latestPaymentsUnderReview.map(serializePayment),
      latestUsers: latestUsers.map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        latestSubscription: serializeSubscription(user.subscriptions[0]),
      })),
      expiringSoon: expiringSoon.map(serializeSubscription),
    });
  } catch (error) {
    return handleApiError(error, "Failed to load admin stats");
  }
}
