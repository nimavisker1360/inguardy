import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EA_IMPORT_TRADE_SOURCE, MT5_TRADE_SOURCE } from "@/lib/journal/trade-source";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const [
      connectedAccountCount,
      mt5SyncedTradeCount,
      playbookCount,
      tradeCount,
      completedTradeChecklistCount,
      reviewedTradeCount,
      completedDailyJournalCount,
      closedTradeCount,
      firstTrade,
    ] = await prisma.$transaction([
      prisma.tradingAccount.count({
        where: {
          userId,
          journalEnabled: true,
          OR: [
            { mt5AccountNumber: { not: null } },
            { lastConnectedAt: { not: null } },
            { lastSyncAt: { not: null } },
          ],
        },
      }),
      prisma.trade.count({
        where: {
          userId,
          mt5Ticket: { not: null },
          source: { in: [MT5_TRADE_SOURCE, EA_IMPORT_TRADE_SOURCE, "MT5_EA"] },
          account: {
            journalEnabled: true,
            OR: [
              { mt5AccountNumber: { not: null } },
              { lastConnectedAt: { not: null } },
              { lastSyncAt: { not: null } },
              { journalSecretHash: { not: null } },
            ],
          },
        },
      }),
      prisma.playbookStrategy.count({
        where: { userId },
      }),
      prisma.trade.count({
        where: { userId },
      }),
      prisma.trade.count({
        where: {
          userId,
          OR: [
            { checklistCompletedAt: { not: null } },
            { checklists: { some: { completionPercent: { gte: 100 } } } },
          ],
        },
      }),
      prisma.trade.count({
        where: {
          userId,
          OR: [
            { reviewedAt: { not: null } },
            { strategyReviewCompletedAt: { not: null } },
            {
              strategyReview: {
                is: {
                  followedPlan: {
                    not: "NOT_REVIEWED",
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.dailyJournal.count({
        where: {
          userId,
          OR: [{ completedAt: { not: null } }, { status: "COMPLETED" }],
        },
      }),
      prisma.trade.count({
        where: {
          userId,
          OR: [{ status: "CLOSED" }, { closedAt: { not: null } }, { exitPrice: { not: null } }],
        },
      }),
      prisma.trade.findFirst({
        where: { userId },
        select: { id: true },
        orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        dashboardVisited: true,
        accountConnected: connectedAccountCount > 0 && mt5SyncedTradeCount > 0,
        playbookCreated: playbookCount > 0,
        tradeCreated: tradeCount > 0,
        tradeChecklistCompleted: completedTradeChecklistCount > 0,
        tradeReviewed: reviewedTradeCount > 0,
        dailyJournalCompleted: completedDailyJournalCount > 0,
        analyticsReady: closedTradeCount > 0,
        reportReady: false,
        counts: {
          connectedAccounts: connectedAccountCount,
          mt5SyncedTrades: mt5SyncedTradeCount,
          playbooks: playbookCount,
          trades: tradeCount,
          completedTradeChecklists: completedTradeChecklistCount,
          reviewedTrades: reviewedTradeCount,
          completedDailyJournals: completedDailyJournalCount,
          closedTrades: closedTradeCount,
        },
        hrefs: {
          firstTrade: firstTrade ? `/journal/${firstTrade.id}` : "/journal",
          tradeChecklist: firstTrade ? `/journal/${firstTrade.id}` : "/journal",
        },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to load training progress" },
      { status: 500 }
    );
  }
}
