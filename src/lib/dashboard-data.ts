import { TradeStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateChecklistCollectionProgress } from "@/lib/checklists/calculateChecklistProgress";
import { decryptJournalSecret } from "@/server/mt5/journal-secret-vault";
import {
  closeTriggeredPropFirmChallenges,
  getPropFirmTradeWindow,
  propFirmStatusToComputed,
} from "@/lib/prop-firms";
import {
  calculatePropFirmRuleMetrics,
  getPropFirmDayStart,
  netTradePnl,
} from "@/lib/prop-firm-rule-sync";
import { countConsecutiveLosses, evaluateOvertradeGuard } from "@/lib/overtrade-guard";
import type {
  DashboardOverviewData,
  PropFirmChallengeDto,
  TagDto,
  TradeDto,
  TradingAccountDto,
} from "@/components/dashboard/types";

export const accountSelect = {
  id: true,
  userId: true,
  name: true,
  broker: true,
  platform: true,
  currency: true,
  balance: true,
  journalEnabled: true,
  journalSecretHash: true,
  journalSecretEncrypted: true,
  mt5AccountNumber: true,
  ctraderAccountId: true,
  tradeLockerAccountId: true,
  lastConnectedAt: true,
  lastSyncAt: true,
  ingestionMode: true,
  directConnection: {
    select: {
      id: true,
      server: true,
      login: true,
      status: true,
      enabled: true,
      lastAttemptAt: true,
      lastConnectedAt: true,
      lastSyncAt: true,
      lastError: true,
      importedDealCount: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  ctraderConnection: {
    select: {
      id: true,
      ctidTraderAccountId: true,
      traderLogin: true,
      environment: true,
      brokerName: true,
      status: true,
      enabled: true,
      lastAttemptAt: true,
      lastConnectedAt: true,
      lastSyncAt: true,
      lastError: true,
      importedDealCount: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  tradeLockerConnection: {
    select: {
      id: true,
      tradeLockerAccountId: true,
      accNum: true,
      accountName: true,
      accountStatus: true,
      environment: true,
      server: true,
      status: true,
      enabled: true,
      lastAttemptAt: true,
      lastConnectedAt: true,
      lastSyncAt: true,
      lastError: true,
      importedOrderCount: true,
      importedExecutionCount: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TradingAccountSelect;

const tagSelect = {
  id: true,
  userId: true,
  name: true,
  color: true,
  createdAt: true,
} satisfies Prisma.TagSelect;

export const propFirmChallengeSelect = {
  id: true,
  userId: true,
  accountId: true,
  name: true,
  ruleProfile: true,
  dailyResetTimeZone: true,
  warningThreshold: true,
  guardEnabled: true,
  maxDailyEntries: true,
  maxConsecutiveLosses: true,
  lossCooldownMinutes: true,
  manualPauseUntil: true,
  startingBalance: true,
  profitTarget: true,
  maxDailyLoss: true,
  maxTotalLoss: true,
  status: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.PropFirmChallengeSelect;

const DASHBOARD_RECENT_TRADES_LIMIT = 5;

export const tradeListInclude = {
  account: {
    select: accountSelect,
  },
  tags: {
    include: {
      tag: {
        select: tagSelect,
      },
    },
  },
  strategyReview: {
    select: {
      id: true,
      strategyId: true,
      strategyNameSnapshot: true,
      followedPlan: true,
      totalRules: true,
      followedRules: true,
      violatedRules: true,
      compliancePercent: true,
      requiredCompliancePercent: true,
    },
  },
  checklists: {
    select: {
      completedCount: true,
      totalCount: true,
      answers: {
        select: {
          checked: true,
        },
      },
    },
  },
  aiReviews: {
    select: {
      id: true,
      score: true,
      summary: true,
      strengths: true,
      weaknesses: true,
      mistakes: true,
      riskReview: true,
      psychologyReview: true,
      playbookReview: true,
      improvementPlan: true,
      tags: true,
      confidence: true,
      createdAt: true,
      updatedAt: true,
    },
    take: 1,
    orderBy: { updatedAt: "desc" },
  },
} satisfies Prisma.TradeInclude;

type AccountRecord = Prisma.TradingAccountGetPayload<{ select: typeof accountSelect }>;
type TagRecord = Prisma.TagGetPayload<{ select: typeof tagSelect }>;
type PropFirmChallengeRecord = Prisma.PropFirmChallengeGetPayload<{
  select: typeof propFirmChallengeSelect;
}>;
type TradeListRecord = Prisma.TradeGetPayload<{ include: typeof tradeListInclude }>;

function serializeDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : value;
}

function serializeDecimal(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

export function serializeAccount(
  account: AccountRecord,
  options: { includeJournalSecret?: boolean } = {}
): TradingAccountDto {
  return {
    id: account.id,
    userId: account.userId,
    name: account.name,
    broker: account.broker,
    platform: account.platform,
    currency: account.currency,
    balance: serializeDecimal(account.balance),
    journalEnabled: account.journalEnabled,
    mt5AccountNumber: account.mt5AccountNumber,
    ctraderAccountId: account.ctraderAccountId,
    tradeLockerAccountId: account.tradeLockerAccountId,
    lastConnectedAt: account.lastConnectedAt
      ? serializeDate(account.lastConnectedAt)
      : null,
    lastSyncAt: account.lastSyncAt ? serializeDate(account.lastSyncAt) : null,
    ingestionMode: account.ingestionMode,
    directConnection: account.directConnection
      ? {
          ...account.directConnection,
          lastAttemptAt: account.directConnection.lastAttemptAt
            ? serializeDate(account.directConnection.lastAttemptAt)
            : null,
          lastConnectedAt: account.directConnection.lastConnectedAt
            ? serializeDate(account.directConnection.lastConnectedAt)
            : null,
          lastSyncAt: account.directConnection.lastSyncAt
            ? serializeDate(account.directConnection.lastSyncAt)
            : null,
          createdAt: serializeDate(account.directConnection.createdAt),
          updatedAt: serializeDate(account.directConnection.updatedAt),
        }
      : null,
    ctraderConnection: account.ctraderConnection
      ? {
          ...account.ctraderConnection,
          lastAttemptAt: account.ctraderConnection.lastAttemptAt
            ? serializeDate(account.ctraderConnection.lastAttemptAt)
            : null,
          lastConnectedAt: account.ctraderConnection.lastConnectedAt
            ? serializeDate(account.ctraderConnection.lastConnectedAt)
            : null,
          lastSyncAt: account.ctraderConnection.lastSyncAt
            ? serializeDate(account.ctraderConnection.lastSyncAt)
            : null,
          createdAt: serializeDate(account.ctraderConnection.createdAt),
          updatedAt: serializeDate(account.ctraderConnection.updatedAt),
        }
      : null,
    tradeLockerConnection: account.tradeLockerConnection
      ? {
          ...account.tradeLockerConnection,
          lastAttemptAt: account.tradeLockerConnection.lastAttemptAt
            ? serializeDate(account.tradeLockerConnection.lastAttemptAt)
            : null,
          lastConnectedAt: account.tradeLockerConnection.lastConnectedAt
            ? serializeDate(account.tradeLockerConnection.lastConnectedAt)
            : null,
          lastSyncAt: account.tradeLockerConnection.lastSyncAt
            ? serializeDate(account.tradeLockerConnection.lastSyncAt)
            : null,
          createdAt: serializeDate(account.tradeLockerConnection.createdAt),
          updatedAt: serializeDate(account.tradeLockerConnection.updatedAt),
        }
      : null,
    hasJournalSecret: Boolean(account.journalSecretHash),
    journalUploadSecret: options.includeJournalSecret
      ? decryptJournalSecret(account.journalSecretEncrypted)
      : undefined,
    createdAt: serializeDate(account.createdAt),
    updatedAt: serializeDate(account.updatedAt),
  };
}

export async function getPropFirmChallengesForUser(userId: string) {
  await closeTriggeredPropFirmChallenges(userId);

  const [accounts, challenges] = await prisma.$transaction([
    prisma.tradingAccount.findMany({
      where: { userId },
      select: accountSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.propFirmChallenge.findMany({
      where: { userId },
      select: propFirmChallengeSelect,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const now = new Date();

  const hydratedChallenges = await Promise.all(
    challenges.map(async (challenge) => {
      const startingBalance = Number(challenge.startingBalance);
      const profitTarget = challenge.profitTarget === null ? null : Number(challenge.profitTarget);
      const maxDailyLoss = challenge.maxDailyLoss === null ? null : Number(challenge.maxDailyLoss);
      const maxTotalLoss = challenge.maxTotalLoss === null ? null : Number(challenge.maxTotalLoss);
      const accountId = challenge.accountId;
      const account = accountId ? accountMap.get(accountId) ?? null : null;
      const window = getPropFirmTradeWindow(challenge, now);
      const dayStartedAt = getPropFirmDayStart(now, challenge.dailyResetTimeZone);
      const todayRangeStart = dayStartedAt > window.start ? dayStartedAt : window.start;
      const baselineFloor = new Date(dayStartedAt.getTime() - 36 * 60 * 60 * 1000);

      const [closedTrades, openTrades, latestSnapshot, baselineSnapshot, dailyEntries] = accountId
        ? await prisma.$transaction([
            prisma.trade.findMany({
              where: {
                userId,
                accountId,
                status: TradeStatus.CLOSED,
                closedAt: {
                  gte: window.start,
                  lte: window.end,
                },
              },
              select: { profitLoss: true, commission: true, swap: true, closedAt: true },
            }),
            prisma.trade.findMany({
              where: {
                userId,
                accountId,
                status: TradeStatus.OPEN,
                openedAt: { gte: window.start, lte: window.end },
              },
              select: { profitLoss: true, commission: true, swap: true },
            }),
            prisma.accountEquitySnapshot.findFirst({
              where: {
                accountId,
                timestamp: { gte: window.start, lte: window.end },
              },
              orderBy: { timestamp: "desc" },
            }),
            prisma.accountEquitySnapshot.findFirst({
              where: {
                accountId,
                timestamp: {
                  gte: baselineFloor > window.start ? baselineFloor : window.start,
                  lte: dayStartedAt,
                },
              },
              orderBy: { timestamp: "desc" },
            }),
            prisma.trade.count({
              where: {
                userId,
                accountId,
                status: { not: TradeStatus.CANCELLED },
                openedAt: { gte: todayRangeStart, lte: window.end },
              },
            }),
          ])
        : [[], [], null, null, 0];

      const challengeClosedPnl = closedTrades.reduce(
        (total, trade) => total + netTradePnl(trade),
        0
      );
      const todayClosedPnl = closedTrades.reduce(
        (total, trade) =>
          trade.closedAt && trade.closedAt >= todayRangeStart
            ? total + netTradePnl(trade)
            : total,
        0
      );
      const fallbackFloatingPnl = openTrades.reduce(
        (total, trade) => total + netTradePnl(trade),
        0
      );
      const currentBalance = latestSnapshot
        ? Number(latestSnapshot.balance)
        : account?.balance !== null && account?.balance !== undefined
          ? Number(account.balance)
          : startingBalance + challengeClosedPnl;
      const floatingPnl = latestSnapshot
        ? Number(latestSnapshot.floatingPnl)
        : fallbackFloatingPnl;
      const currentEquity = latestSnapshot
        ? Number(latestSnapshot.equity)
        : currentBalance + floatingPnl;
      const dayStartBalance = baselineSnapshot
        ? Number(baselineSnapshot.balance)
        : window.start >= dayStartedAt
          ? startingBalance
          : null;
      const calculatedMetrics = calculatePropFirmRuleMetrics({
        startingBalance,
        currentBalance,
        currentEquity,
        floatingPnl,
        challengeClosedPnl,
        todayClosedPnl,
        dayStartBalance,
        profitTarget,
        maxDailyLoss,
        maxTotalLoss,
        warningThreshold: challenge.warningThreshold,
      });
      const computedStatus =
        propFirmStatusToComputed(challenge.status) ??
        calculatedMetrics.computedStatus;
      const dataAsOf = latestSnapshot?.timestamp ?? account?.lastSyncAt ?? null;
      const snapshotAge = dataAsOf ? now.getTime() - dataAsOf.getTime() : null;
      const syncStatus: PropFirmChallengeDto["syncStatus"] = latestSnapshot
        ? snapshotAge !== null && snapshotAge <= 15 * 60 * 1000
          ? "LIVE"
          : "STALE"
        : account?.ingestionMode === "MANUAL"
          ? "MANUAL"
          : "NO_TELEMETRY";
      const todayClosedTrades = closedTrades
        .filter((trade) => trade.closedAt && trade.closedAt >= todayRangeStart)
        .sort((left, right) =>
          (right.closedAt?.getTime() ?? 0) - (left.closedAt?.getTime() ?? 0)
        );
      const consecutiveLosses = countConsecutiveLosses(todayClosedTrades, netTradePnl);
      const lastClosedTrade = todayClosedTrades[0] ?? null;
      const lastLossAt = lastClosedTrade && netTradePnl(lastClosedTrade) < 0
        ? lastClosedTrade.closedAt
        : null;
      const guard = evaluateOvertradeGuard({
        now,
        enabled: challenge.guardEnabled,
        challengeStatus: computedStatus,
        propRiskLevel: calculatedMetrics.riskLevel,
        syncStatus,
        maxDailyEntries: challenge.maxDailyEntries,
        maxConsecutiveLosses: challenge.maxConsecutiveLosses,
        lossCooldownMinutes: challenge.lossCooldownMinutes,
        manualPauseUntil: challenge.manualPauseUntil,
        dailyEntries,
        consecutiveLosses,
        lastLossAt,
      });

      return serializePropFirmChallenge(
        challenge,
        account,
        {
          ...calculatedMetrics,
          computedStatus,
          syncStatus,
          dataAsOf,
          dayStartedAt,
          guard,
        }
      );
    })
  );

  return {
    accounts: accounts.map((account) => serializeAccount(account)),
    challenges: hydratedChallenges,
  };
}

function serializePropFirmChallenge(
  challenge: PropFirmChallengeRecord,
  account: AccountRecord | null,
  metrics: {
    currentBalance: number;
    currentEquity: number;
    floatingPnl: number;
    progress: number;
    todayPnl: number;
    dailyLossUsed: number;
    dailyLossUsedPercent: number;
    dailyLossRemaining: number | null;
    totalLossUsed: number;
    totalLossUsedPercent: number;
    totalLossRemaining: number | null;
    profitTargetRemaining: number | null;
    riskLevel: PropFirmChallengeDto["riskLevel"];
    syncStatus: PropFirmChallengeDto["syncStatus"];
    dataAsOf: Date | null;
    dayStartedAt: Date;
    guard: PropFirmChallengeDto["guard"];
    computedStatus: PropFirmChallengeDto["computedStatus"];
  }
): PropFirmChallengeDto {
  return {
    id: challenge.id,
    userId: challenge.userId,
    accountId: challenge.accountId,
    name: challenge.name,
    ruleProfile: challenge.ruleProfile,
    dailyResetTimeZone: challenge.dailyResetTimeZone,
    warningThreshold: challenge.warningThreshold,
    guardEnabled: challenge.guardEnabled,
    maxDailyEntries: challenge.maxDailyEntries,
    maxConsecutiveLosses: challenge.maxConsecutiveLosses,
    lossCooldownMinutes: challenge.lossCooldownMinutes,
    manualPauseUntil: challenge.manualPauseUntil ? serializeDate(challenge.manualPauseUntil) : null,
    guard: metrics.guard,
    startingBalance: serializeDecimal(challenge.startingBalance) ?? "0",
    currentBalance: metrics.currentBalance,
    currentEquity: metrics.currentEquity,
    floatingPnl: metrics.floatingPnl,
    profitTarget: serializeDecimal(challenge.profitTarget),
    maxDailyLoss: serializeDecimal(challenge.maxDailyLoss),
    maxTotalLoss: serializeDecimal(challenge.maxTotalLoss),
    progress: metrics.progress,
    todayPnl: metrics.todayPnl,
    dailyLossUsed: metrics.dailyLossUsed,
    dailyLossUsedPercent: metrics.dailyLossUsedPercent,
    dailyLossRemaining: metrics.dailyLossRemaining,
    totalLossUsed: metrics.totalLossUsed,
    totalLossUsedPercent: metrics.totalLossUsedPercent,
    totalLossRemaining: metrics.totalLossRemaining,
    profitTargetRemaining: metrics.profitTargetRemaining,
    riskLevel: metrics.riskLevel,
    syncStatus: metrics.syncStatus,
    dataAsOf: metrics.dataAsOf ? serializeDate(metrics.dataAsOf) : null,
    dayStartedAt: serializeDate(metrics.dayStartedAt),
    computedStatus: metrics.computedStatus,
    status: challenge.status,
    startedAt: challenge.startedAt ? serializeDate(challenge.startedAt) : null,
    endedAt: challenge.endedAt ? serializeDate(challenge.endedAt) : null,
    createdAt: serializeDate(challenge.createdAt),
    updatedAt: serializeDate(challenge.updatedAt),
    account: account ? serializeAccount(account) : null,
  };
}

export function serializeTag(tag: TagRecord): TagDto {
  return {
    ...tag,
    createdAt: serializeDate(tag.createdAt),
  };
}

export function serializeTrade(trade: TradeListRecord): TradeDto {
  const checklistProgress = calculateChecklistCollectionProgress(trade.checklists);

  return {
    id: trade.id,
    userId: trade.userId,
    accountId: trade.accountId,
    symbol: trade.symbol,
    direction: trade.direction,
    status: trade.status,
    entryPrice: serializeDecimal(trade.entryPrice),
    exitPrice: serializeDecimal(trade.exitPrice),
    stopLoss: serializeDecimal(trade.stopLoss),
    takeProfit: serializeDecimal(trade.takeProfit),
    initialStopLoss: serializeDecimal(trade.initialStopLoss ?? trade.stopLoss),
    initialTakeProfit: serializeDecimal(trade.initialTakeProfit ?? trade.takeProfit),
    currentStopLoss: serializeDecimal(trade.currentStopLoss ?? trade.stopLoss),
    currentTakeProfit: serializeDecimal(trade.currentTakeProfit ?? trade.takeProfit),
    lotSize: serializeDecimal(trade.lotSize),
    riskAmount: serializeDecimal(trade.riskAmount),
    profitLoss: serializeDecimal(trade.profitLoss),
    commission: serializeDecimal(trade.commission),
    swap: serializeDecimal(trade.swap),
    rr: serializeDecimal(trade.rr),
    source: trade.source,
    mt5Ticket: trade.mt5Ticket,
    tradeLockerPositionId: trade.tradeLockerPositionId,
    aiReviewStatus: trade.aiReviewStatus,
    aiReviewScore: trade.aiReviewScore,
    reviewStatus: trade.reviewStatus,
    reviewedAt: trade.reviewedAt ? serializeDate(trade.reviewedAt) : null,
    setup: trade.setup,
    session: trade.session,
    emotion: trade.emotion,
    mistake: trade.mistake,
    notes: trade.notes,
    openedAt: trade.openedAt ? serializeDate(trade.openedAt) : null,
    closedAt: trade.closedAt ? serializeDate(trade.closedAt) : null,
    createdAt: serializeDate(trade.createdAt),
    updatedAt: serializeDate(trade.updatedAt),
    account: trade.account ? serializeAccount(trade.account) : null,
    checklistCompletionPercent: checklistProgress.completionPercent,
    checklistCompletedCount: checklistProgress.completedCount,
    checklistTotalCount: checklistProgress.totalCount,
    tags: trade.tags.map((item) => ({
      tradeId: item.tradeId,
      tagId: item.tagId,
      tag: serializeTag(item.tag),
    })),
    aiReview: trade.aiReviews[0]
      ? {
          id: trade.aiReviews[0].id,
          score: trade.aiReviews[0].score,
          summary: trade.aiReviews[0].summary,
          strengths: trade.aiReviews[0].strengths,
          weaknesses: trade.aiReviews[0].weaknesses,
          mistakes: trade.aiReviews[0].mistakes,
          riskReview: trade.aiReviews[0].riskReview,
          psychologyReview: trade.aiReviews[0].psychologyReview,
          playbookReview: trade.aiReviews[0].playbookReview,
          improvementPlan: trade.aiReviews[0].improvementPlan,
          tags: trade.aiReviews[0].tags,
          confidence: trade.aiReviews[0].confidence,
          createdAt: serializeDate(trade.aiReviews[0].createdAt),
          updatedAt: serializeDate(trade.aiReviews[0].updatedAt),
        }
      : null,
    strategyReview: trade.strategyReview
      ? {
          id: trade.strategyReview.id,
          strategyId: trade.strategyReview.strategyId,
          strategyNameSnapshot: trade.strategyReview.strategyNameSnapshot,
          followedPlan: trade.strategyReview.followedPlan as "YES" | "PARTIAL" | "NO" | "NOT_REVIEWED",
          totalRules: trade.strategyReview.totalRules,
          followedRules: trade.strategyReview.followedRules,
          violatedRules: trade.strategyReview.violatedRules,
          compliancePercent: trade.strategyReview.compliancePercent,
          requiredCompliancePercent: trade.strategyReview.requiredCompliancePercent,
        }
      : null,
  };
}

function calculateWinRate(closedTrades: number, winningTrades: number) {
  return closedTrades > 0 ? Math.round((winningTrades / closedTrades) * 100) : 0;
}

export async function getDashboardOverviewData(
  userId: string,
  options: { accountId?: string | null } = {}
): Promise<DashboardOverviewData> {
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    select: accountSelect,
    orderBy: { createdAt: "desc" },
  });
  const requestedAccountId = options.accountId?.trim() || "";
  const activeAccountId =
    accounts.find((account) => account.id === requestedAccountId)?.id ??
    accounts[0]?.id ??
    null;
  const tradeWhere: Prisma.TradeWhereInput = {
    userId,
    ...(activeAccountId ? { accountId: activeAccountId } : {}),
  };
  const accountScopedHref = (href: string) => {
    if (!activeAccountId) {
      return href;
    }

    const separator = href.includes("?") ? "&" : "?";
    return `${href}${separator}accountId=${encodeURIComponent(activeAccountId)}`;
  };

  const [
    totalTrades,
    totalPnl,
    openTrades,
    notReviewedTrades,
    closedTrades,
    winningTrades,
    reviewedTrades,
    dailyJournalEntries,
    preTradeCheckEntries,
    playbookStrategies,
    checklistTemplates,
    propFirmChallenges,
    trades,
    performanceTrades,
  ] = await prisma.$transaction([
    prisma.trade.count({
      where: tradeWhere,
    }),
    prisma.trade.aggregate({
      where: tradeWhere,
      _sum: { profitLoss: true },
    }),
    prisma.trade.count({
      where: { ...tradeWhere, status: "OPEN" },
    }),
    prisma.trade.count({
      where: {
        ...tradeWhere,
        OR: [
          { strategyReview: null },
          { strategyReview: { followedPlan: "NOT_REVIEWED" } },
        ],
      },
    }),
    prisma.trade.count({
      where: { ...tradeWhere, status: "CLOSED" },
    }),
    prisma.trade.count({
      where: {
        ...tradeWhere,
        status: "CLOSED",
        profitLoss: { gt: 0 },
      },
    }),
    prisma.trade.count({
      where: {
        ...tradeWhere,
        strategyReview: {
          is: {
            followedPlan: {
              not: "NOT_REVIEWED",
            },
          },
        },
      },
    }),
    prisma.dailyJournal.count({
      where: { userId },
    }),
    prisma.preTradeCheck.count({
      where: { userId },
    }),
    prisma.playbookStrategy.count({
      where: { userId },
    }),
    prisma.checklistTemplate.count({
      where: { isActive: true },
    }),
    prisma.propFirmChallenge.count({
      where: {
        userId,
        ...(activeAccountId ? { accountId: activeAccountId } : {}),
      },
    }),
    prisma.trade.findMany({
      where: tradeWhere,
      include: tradeListInclude,
      orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      take: DASHBOARD_RECENT_TRADES_LIMIT,
    }),
    prisma.trade.findMany({
      where: tradeWhere,
      select: {
        id: true,
        symbol: true,
        direction: true,
        status: true,
        profitLoss: true,
        openedAt: true,
        closedAt: true,
      },
      orderBy: [{ closedAt: "asc" }, { openedAt: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return {
    activeAccountId,
    accounts: accounts.map((account) => serializeAccount(account)),
    trades: trades.map(serializeTrade),
    stats: {
      totalTrades,
      closedTrades,
      totalPnl: Number(totalPnl._sum.profitLoss ?? 0),
      winRate: calculateWinRate(closedTrades, winningTrades),
      openTrades,
      notReviewedTrades,
    },
    pageStats: [
      { key: "accounts", value: accounts.length, href: "/dashboard/accounts" },
      { key: "trades", value: totalTrades, href: accountScopedHref("/journal") },
      { key: "reviews", value: reviewedTrades, href: accountScopedHref("/dashboard/reports") },
      { key: "dailyJournal", value: dailyJournalEntries, href: "/dashboard/daily-journal" },
      { key: "readiness", value: preTradeCheckEntries, href: "/dashboard/daily-journal" },
      { key: "playbooks", value: playbookStrategies, href: "/journal/playbooks" },
      { key: "checklists", value: checklistTemplates, href: "/journal/checklists" },
      { key: "propFirms", value: propFirmChallenges, href: accountScopedHref("/dashboard/prop-firms") },
    ],
    performanceTrades: performanceTrades.map((trade) => ({
      id: trade.id,
      symbol: trade.symbol,
      direction: trade.direction,
      status: trade.status,
      profitLoss: Number(trade.profitLoss ?? 0),
      openedAt: trade.openedAt ? serializeDate(trade.openedAt) : null,
      closedAt: trade.closedAt ? serializeDate(trade.closedAt) : null,
    })),
  };
}

export async function getAccountsPageData(userId: string) {
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    select: accountSelect,
    orderBy: { createdAt: "desc" },
  });

  return accounts.map((account) =>
    serializeAccount(account, { includeJournalSecret: true })
  );
}

export async function getTradesPageData(userId: string) {
  const [accounts, tags, trades] = await prisma.$transaction([
    prisma.tradingAccount.findMany({
      where: { userId },
      select: accountSelect,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({
      where: { userId },
      select: tagSelect,
      orderBy: { name: "asc" },
    }),
    prisma.trade.findMany({
      where: { userId },
      include: tradeListInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    accounts: accounts.map((account) => serializeAccount(account)),
    tags: tags.map(serializeTag),
    trades: trades.map(serializeTrade),
  };
}
