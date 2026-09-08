import { SubscriptionStatus } from "@prisma/client";
import prisma from "@/lib/prisma";
import { expireOldSubscriptions } from "@/lib/subscription";
import { isAdminUser } from "@/lib/server-auth";

export class JournalSubscriptionError extends Error {
  status = 403;

  constructor(message = "Subscription expired") {
    super(message);
    this.name = "JournalSubscriptionError";
  }
}

export async function assertUserCanUseJournal(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    throw new JournalSubscriptionError();
  }

  if (isAdminUser(user)) {
    return;
  }

  await expireOldSubscriptions(userId);

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      OR: [
        {
          status: SubscriptionStatus.TRIAL,
          plan: { isTrial: true },
        },
        {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.MANUAL],
          },
          plan: {
            isFree: false,
            isTrial: false,
          },
        },
      ],
    },
    select: { id: true },
    orderBy: { expiresAt: "desc" },
  });

  if (!activeSubscription) {
    throw new JournalSubscriptionError();
  }
}

export async function getJournalAccessState(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (!user) {
    return {
      canUseJournal: false,
      status: "Subscription Required",
      message: "Journal sync disabled. Upgrade to continue receiving MT5 trades.",
    };
  }

  if (isAdminUser(user)) {
    return {
      canUseJournal: true,
      status: "Connected",
      message: null,
    };
  }

  await expireOldSubscriptions(userId);

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      OR: [
        {
          status: SubscriptionStatus.TRIAL,
          plan: { isTrial: true },
        },
        {
          status: {
            in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.MANUAL],
          },
          plan: {
            isFree: false,
            isTrial: false,
          },
        },
      ],
    },
    select: { id: true, status: true },
    orderBy: { expiresAt: "desc" },
  });

  if (!activeSubscription) {
    return {
      canUseJournal: false,
      status: "Subscription Required",
      message: "Journal sync disabled. Upgrade to continue receiving MT5 trades.",
    };
  }

  return {
    canUseJournal: true,
    status: activeSubscription.status,
    message: null,
  };
}
