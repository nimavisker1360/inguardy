import { TradeStatus, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { PropFirmChallengeDto } from "@/components/dashboard/types";

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
  if (input.profitTarget !== null && input.profitTarget > 0 && input.profit >= input.profitTarget) {
    return "Passed";
  }

  if (input.maxDailyLoss !== null && input.maxDailyLoss > 0 && input.todayPnl < -input.maxDailyLoss) {
    return "Failed - Daily Loss";
  }

  if (
    input.maxTotalLoss !== null &&
    input.maxTotalLoss > 0 &&
    input.currentBalance <= input.startingBalance - input.maxTotalLoss
  ) {
    return "Failed - Max Loss";
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

function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
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

    const pnl = Number(trade.profitLoss ?? 0);
    const day = localDayKey(trade.closedAt);
    const todayPnl = (dailyPnl.get(day) ?? 0) + pnl;
    dailyPnl.set(day, todayPnl);
    closedPnl += pnl;

    const currentBalance = startingBalance + closedPnl;
    const computedStatus = getPropFirmComputedStatus({
      profit: closedPnl,
      profitTarget,
      todayPnl,
      maxDailyLoss,
      currentBalance,
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
    const trigger = findChallengeTrigger(challenge, trades);

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
