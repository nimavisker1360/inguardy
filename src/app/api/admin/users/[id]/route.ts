import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import {
  apiError,
  apiJson,
  handleApiError,
  isValidRole,
  serializePayment,
  serializeSubscription,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const db = prisma as any;
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        sessions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true, ipAddress: true, userAgent: true },
        },
        accounts: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { providerId: true },
        },
        subscriptions: {
          include: { plan: true, payment: true },
          orderBy: { createdAt: "desc" },
        },
        payments: {
          include: {
            plan: true,
            subscription: {
              include: { plan: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        adminNotes: {
          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    const [
      trades,
      tradesThisMonth,
      winningTrades,
      profitLoss,
      lastTrade,
      screenshots,
      legacyPlaybooks,
      strategyPlaybooks,
      checklists,
    ] = await prisma.$transaction([
      db.trade.count({ where: { userId: id } }),
      db.trade.count({
        where: {
          userId: id,
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      db.trade.count({ where: { userId: id, profitLoss: { gt: 0 } } }),
      db.trade.aggregate({
        where: { userId: id },
        _sum: { profitLoss: true },
      }),
      db.trade.findFirst({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, closedAt: true, openedAt: true },
      }),
      db.tradeScreenshot.count({ where: { userId: id } }),
      db.playbook.count({ where: { userId: id } }),
      db.playbookStrategy.count({ where: { userId: id } }),
      db.tradeChecklist.count({ where: { trade: { userId: id } } }),
    ]);

    return apiJson({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.sessions[0]?.createdAt ?? null,
        authProvider: user.accounts[0]?.providerId ?? null,
      },
      subscriptions: user.subscriptions.map(serializeSubscription),
      payments: user.payments.map(serializePayment),
      usage: {
        trades,
        screenshots,
        playbooks: legacyPlaybooks + strategyPlaybooks,
        checklists,
      },
      tradingActivity: {
        totalTrades: trades,
        tradesThisMonth,
        totalProfitLoss: profitLoss._sum.profitLoss?.toString() ?? null,
        winRate: trades > 0 ? Math.round((winningTrades / trades) * 1000) / 10 : null,
        lastTradeDate: lastTrade?.closedAt ?? lastTrade?.openedAt ?? lastTrade?.createdAt ?? null,
        totalScreenshots: screenshots,
        totalPlaybooks: legacyPlaybooks + strategyPlaybooks,
        totalChecklists: checklists,
      },
      adminNotes: user.adminNotes,
    });
  } catch (error) {
    return handleApiError(error, "Failed to load admin user");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const role = typeof body.role === "string" ? body.role.toUpperCase() : null;

    if (!isValidRole(role)) {
      return apiError("Invalid role", 400);
    }

    const db = prisma as any;
    const user = await db.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return apiJson({ success: true, user });
  } catch (error) {
    return handleApiError(error, "Failed to update user");
  }
}
