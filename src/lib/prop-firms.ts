import { TradeStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PropFirmChallengeDto } from "@/components/dashboard/types";
import {
  calculatePropFirmRuleMetrics,
  getPropFirmDayKey,
  getPropFirmDayStart,
  netTradePnl,
} from "@/lib/prop-firm-rule-sync";

export const PROP_FIRM_STATUS_ACTIVE = "ACTIVE";
export const PROP_FIRM_STATUS_PASSED = "PASSED";
export const PROP_FIRM_STATUS_FAILED_DAILY_LOSS = "FAILED_DAILY_LOSS";
export const PROP_FIRM_STATUS_FAILED_MAX_LOSS = "FAILED_MAX_LOSS";

const ACTIVE_STATUS_VALUES = [PROP_FIRM_STATUS_ACTIVE, "Active", "active"];
const CLOSED_STATUS_VALUES = [
  PROP_FIRM_STATUS_PASSED,
  PROP_FIRM_STATUS_FAILED_DAILY_LOSS,
  PROP_FIRM_STATUS_FAILED_MAX_LOSS,
];

const challengeSelect = {
  id: true,
  userId: true,
  accountId: true,
  dailyResetTimeZone: true,
  warningThreshold: true,
  startingBalance: true,
  profitTarget: true,
  maxDailyLoss: true,
  maxTotalLoss: true,
  status: true,
  startedAt: true,
  endedAt: true,
  createdAt: true,
} satisfies Prisma.PropFirmChallengeSelect;

const triggerTradeSelect = {
  id: true,
  profitLoss: true,
  commission: true,
  swap: true,
  balanceAtClose: true,
  equityAtClose: true,
  closedAt: true,
  createdAt: true,
} satisfies Prisma.TradeSelect;

type ChallengeForEvaluation = Prisma.PropFirmChallengeGetPayload<{
  select: typeof challengeSelect;
}>;
type TriggerTrade = Prisma.TradeGetPayload<{ select: typeof triggerTradeSelect }>;

type ComputedStatus = PropFirmChallengeDto["computedStatus"];

export function isClosedPropFirmStatus(status: string | null | undefined) {
  return Boolean(status && CLOSED_STATUS_VALUES.includes(status));
}

export function propFirmStatusToComputed(
  status: string | null | undefined
): ComputedStatus | null {
  if (status === PROP_FIRM_STATUS_PASSED) {
    return "Passed";
  }

  if (status === PROP_FIRM_STATUS_FAILED_DAILY_LOSS) {
    return "Failed - Daily Loss";
  }

  if (status === PROP_FIRM_STATUS_FAILED_MAX_LOSS) {
    return "Failed - Max Loss";
  }

  return null;
}

function computedStatusToStored(status: ComputedStatus) {
  if (status === "Passed") {
    return PROP_FIRM_STATUS_PASSED;
  }

  if (status === "Failed - Daily Loss") {
    return PROP_FIRM_STATUS_FAILED_DAILY_LOSS;
  }

  if (status === "Failed - Max Loss") {
    return PROP_FIRM_STATUS_FAILED_MAX_LOSS;
  }

  return PROP_FIRM_STATUS_ACTIVE;
}

export function getPropFirmComputedStatus(input: {
  profit: number;
  profitTarget: number | null;
  todayPnl: number;
  maxDailyLoss: number | null;
  currentBalance: number;
  startingBalance: number;
  maxTotalLoss: number | null;
}): ComputedStatus {
  if (input.maxDailyLoss !== null && input.maxDailyLoss > 0 && input.todayPnl <= -input.maxDailyLoss) {
    return "Failed - Daily Loss";
  }

  if (
    input.maxTotalLoss !== null &&
    input.maxTotalLoss > 0 &&
    input.currentBalance <= input.startingBalance - input.maxTotalLoss
  ) {
    return "Failed - Max Loss";
  }

  if (input.profitTarget !== null && input.profitTarget > 0 && input.profit >= input.profitTarget) {
    return "Passed";
  }

  return "Active";
}

export function getPropFirmTradeWindow(
  challenge: {
    status: string;
    startedAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
  },
  now = new Date()
) {
  const start = challenge.startedAt ?? challenge.createdAt;
  const shouldFreezeAtEnd = isClosedPropFirmStatus(challenge.status);
  const scheduledOrClosedEnd = challenge.endedAt ?? null;
  const end = shouldFreezeAtEnd
    ? scheduledOrClosedEnd ?? now
    : scheduledOrClosedEnd && scheduledOrClosedEnd < now
      ? scheduledOrClosedEnd
      : now;

  return { start, end };
}

function findChallengeTrigger(challenge: ChallengeForEvaluation, trades: TriggerTrade[]) {
  const startingBalance = Number(challenge.startingBalance);
  const profitTarget = challenge.profitTarget === null ? null : Number(challenge.profitTarget);
  const maxDailyLoss = challenge.maxDailyLoss === null ? null : Number(challenge.maxDailyLoss);
  const maxTotalLoss = challenge.maxTotalLoss === null ? null : Number(challenge.maxTotalLoss);
  const dailyPnl = new Map<string, number>();
  let closedPnl = 0;

  for (const trade of trades) {
    if (!trade.closedAt) {
      continue;
    }

    const pnl = netTradePnl(trade);
    const day = getPropFirmDayKey(trade.closedAt, challenge.dailyResetTimeZone);
    const todayPnl = (dailyPnl.get(day) ?? 0) + pnl;
    dailyPnl.set(day, todayPnl);
    closedPnl += pnl;

    const currentBalance = Number(trade.balanceAtClose ?? startingBalance + closedPnl);
    const currentEquity = Number(trade.equityAtClose ?? currentBalance);
    const computedStatus = getPropFirmComputedStatus({
      profit: currentBalance - startingBalance,
      profitTarget,
      todayPnl,
      maxDailyLoss,
      currentBalance: currentEquity,
      startingBalance,
      maxTotalLoss,
    });

    if (computedStatus !== "Active") {
      return {
        status: computedStatusToStored(computedStatus),
        endedAt: trade.closedAt,
      };
    }
  }

  return null;
}

export async function closeTriggeredPropFirmChallenges(
  userId: string,
  options: { accountId?: string | null; challengeId?: string | null } = {}
) {
  const challenges = await prisma.propFirmChallenge.findMany({
    where: {
      userId,
      status: { in: ACTIVE_STATUS_VALUES },
      ...(options.accountId ? { accountId: options.accountId } : {}),
      ...(options.challengeId ? { id: options.challengeId } : {}),
    },
    select: challengeSelect,
  });
  const now = new Date();
  let closedCount = 0;

  for (const challenge of challenges) {
    if (!challenge.accountId) {
      continue;
    }

    const { start, end } = getPropFirmTradeWindow(challenge, now);
    const trades = await prisma.trade.findMany({
      where: {
        userId,
        accountId: challenge.accountId,
        status: TradeStatus.CLOSED,
        closedAt: {
          gte: start,
          lte: end,
        },
      },
      select: triggerTradeSelect,
      orderBy: [{ closedAt: "asc" }, { createdAt: "asc" }],
    });
    let trigger = findChallengeTrigger(challenge, trades);

    if (!trigger) {
      const latestSnapshot = await prisma.accountEquitySnapshot.findFirst({
        where: {
          accountId: challenge.accountId,
          timestamp: { gte: start, lte: end },
        },
        orderBy: { timestamp: "desc" },
      });

      if (latestSnapshot) {
        const dayStart = getPropFirmDayStart(
          latestSnapshot.timestamp,
          challenge.dailyResetTimeZone
        );
        const baselineSnapshot = await prisma.accountEquitySnapshot.findFirst({
          where: {
            accountId: challenge.accountId,
            timestamp: {
              gte: new Date(dayStart.getTime() - 36 * 60 * 60 * 1000),
              lte: dayStart,
            },
          },
          orderBy: { timestamp: "desc" },
        });
        const challengeClosedPnl = trades.reduce(
          (total, trade) => total + netTradePnl(trade),
          0
        );
        const snapshotDayKey = getPropFirmDayKey(
          latestSnapshot.timestamp,
          challenge.dailyResetTimeZone
        );
        const todayClosedPnl = trades.reduce(
          (total, trade) =>
            trade.closedAt &&
            getPropFirmDayKey(trade.closedAt, challenge.dailyResetTimeZone) === snapshotDayKey
              ? total + netTradePnl(trade)
              : total,
          0
        );
        const metrics = calculatePropFirmRuleMetrics({
          startingBalance: Number(challenge.startingBalance),
          currentBalance: Number(latestSnapshot.balance),
          currentEquity: Number(latestSnapshot.equity),
          floatingPnl: Number(latestSnapshot.floatingPnl),
          challengeClosedPnl,
          todayClosedPnl,
          dayStartBalance: baselineSnapshot ? Number(baselineSnapshot.balance) : null,
          profitTarget: challenge.profitTarget === null ? null : Number(challenge.profitTarget),
          maxDailyLoss: challenge.maxDailyLoss === null ? null : Number(challenge.maxDailyLoss),
          maxTotalLoss: challenge.maxTotalLoss === null ? null : Number(challenge.maxTotalLoss),
          warningThreshold: challenge.warningThreshold,
        });

        if (metrics.computedStatus !== "Active") {
          trigger = {
            status: computedStatusToStored(metrics.computedStatus),
            endedAt: latestSnapshot.timestamp,
          };
        }
      }
    }

    if (!trigger) {
      continue;
    }

    const result = await prisma.propFirmChallenge.updateMany({
      where: {
        id: challenge.id,
        userId,
        status: { in: ACTIVE_STATUS_VALUES },
      },
      data: {
        status: trigger.status,
        endedAt: trigger.endedAt,
      },
    });

    closedCount += result.count;
  }

  return { closedCount };
}
