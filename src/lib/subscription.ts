import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdminUser, requireUser } from "@/lib/server-auth";

export type FeatureName =
  | "trades"
  | "screenshots"
  | "playbooks"
  | "checklists"
  | "aiAnalysis"
  | "advancedAnalytics"
  | "export";

export class SubscriptionAccessError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "SubscriptionAccessError";
    this.status = status;
  }
}

function getSubscriptionAccessMessageFa(message: string) {
  if (message === "Upgrade required to use this feature") {
    return "برای استفاده از این قابلیت باید پلن خود را ارتقا دهید.";
  }

  if (message === "AI analysis is not available on your current plan. Upgrade to Pro.") {
    return "تحلیل AI در پلن فعلی شما فعال نیست. برای دسترسی، به پرو ارتقا دهید.";
  }

  if (message === "Advanced analytics is not available on your current plan. Upgrade to Pro.") {
    return "تحلیل پیشرفته در پلن فعلی شما فعال نیست. برای دسترسی، به پرو ارتقا دهید.";
  }

  if (message === "Export is not available on your current plan. Upgrade to Pro.") {
    return "خروجی گرفتن در پلن فعلی شما فعال نیست. برای دسترسی، به پرو ارتقا دهید.";
  }

  const limitedFeatureMatch = message.match(
    /^You have reached your (.+) limit for the current plan\. Upgrade to Pro for unlimited access\.$/
  );

  if (limitedFeatureMatch) {
    const featureLabels: Record<string, string> = {
      trade: "معامله",
      screenshot: "اسکرین‌شات",
      playbook: "پلی‌بوک",
      checklist: "چک‌لیست",
    };
    const featureLabel = featureLabels[limitedFeatureMatch[1]] || limitedFeatureMatch[1];

    return `به سقف تعداد ${featureLabel} در پلن فعلی رسیده‌اید. برای دسترسی نامحدود، به پرو ارتقا دهید.`;
  }

  return message;
}

const ACTIVE_STATUSES = ["ACTIVE", "TRIAL", "MANUAL"];
const PAID_STATUSES = ["ACTIVE", "MANUAL"];
const FAR_FUTURE_DAYS = 365 * 100;
const DEFAULT_TRIAL_DAYS = 10;

export type SubscriptionDashboardState = {
  planName: string;
  planSlug: string;
  status: string;
  daysRemaining: number;
  totalDays: number;
  percentRemaining: number;
  startedAt: string;
  expiresAt: string;
  isTrial: boolean;
  isPaid: boolean;
  isFree: boolean;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysRemaining(expiresAt: Date, now = new Date()) {
  return Math.max(calendarDayNumber(expiresAt) - calendarDayNumber(now), 0);
}

function positiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function calendarDayNumber(date: Date) {
  return Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000
  );
}

function calendarDaysElapsedSince(startedAt: Date, now = new Date()) {
  return Math.max(calendarDayNumber(now) - calendarDayNumber(startedAt), 0);
}

function calendarDaysBetween(startedAt: Date, expiresAt: Date) {
  return Math.max(calendarDayNumber(expiresAt) - calendarDayNumber(startedAt), 1);
}

function trialDurationDays(subscription: { plan?: { durationDays?: number | null } | null }) {
  return positiveInteger(subscription.plan?.durationDays, DEFAULT_TRIAL_DAYS);
}

function trialDaysRemaining(subscription: {
  startedAt: Date;
  expiresAt: Date;
  plan?: { durationDays?: number | null } | null;
}) {
  const duration = trialDurationDays(subscription);
  const calendarRemaining = duration - calendarDaysElapsedSince(subscription.startedAt);

  return Math.max(Math.min(calendarRemaining, daysRemaining(subscription.expiresAt)), 0);
}

function isActiveTrialSubscription(subscription: {
  status?: string | null;
  expiresAt?: Date | null;
  plan?: { isTrial?: boolean | null } | null;
}) {
  return Boolean(
    subscription.status === "TRIAL" &&
      subscription.plan?.isTrial &&
      subscription.expiresAt &&
      subscription.expiresAt > new Date()
  );
}

export function subscriptionAccessResponse(error: unknown) {
  if (error instanceof SubscriptionAccessError) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
        messageFa: getSubscriptionAccessMessageFa(error.message),
        upgradeRequired: true,
      },
      { status: error.status }
    );
  }

  return null;
}

export async function expireOldSubscriptions(userId?: string) {
  const now = new Date();
  const db = prisma as any;

  await db.subscription.updateMany({
    where: {
      ...(userId ? { userId } : {}),
      status: { in: ACTIVE_STATUSES },
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
    },
  });
}

async function getActivePaidSubscription(userId: string) {
  const db = prisma as any;

  return db.subscription.findFirst({
    where: {
      userId,
      status: { in: PAID_STATUSES },
      expiresAt: { gt: new Date() },
      plan: {
        isFree: false,
        isTrial: false,
      },
    },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });
}

export async function ensureUserTrial(userId: string) {
  const db = prisma as any;
  const existingTrial = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ["TRIAL", "EXPIRED", "CANCELED"] },
      plan: { slug: "trial" },
    },
    select: { id: true },
  });

  if (existingTrial) {
    return null;
  }

  const trialPlan = await db.plan.findUnique({
    where: { slug: "trial" },
  });

  if (!trialPlan) {
    return null;
  }

  const now = new Date();
  const startedAt = now;
  const durationDays = positiveInteger(trialPlan.durationDays, DEFAULT_TRIAL_DAYS);

  return db.subscription.create({
    data: {
      userId,
      planId: trialPlan.id,
      status: "TRIAL",
      startedAt,
      expiresAt: addDays(startedAt, durationDays),
    },
    include: { plan: true },
  });
}

export async function getOrCreateFreeSubscription(userId: string) {
  await expireOldSubscriptions(userId);

  const db = prisma as any;
  const paid = await getActivePaidSubscription(userId);

  if (paid) {
    return paid;
  }

  const activeTrial = await db.subscription.findFirst({
    where: {
      userId,
      status: "TRIAL",
      expiresAt: { gt: new Date() },
      plan: { isTrial: true },
    },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });

  if (activeTrial) {
    return activeTrial;
  }

  const activeFree = await db.subscription.findFirst({
    where: {
      userId,
      status: "FREE",
      expiresAt: { gt: new Date() },
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (activeFree) {
    return activeFree;
  }

  const freePlan = await db.plan.findUnique({
    where: { slug: "free" },
  });

  if (!freePlan) {
    return null;
  }

  const now = new Date();

  return db.subscription.create({
    data: {
      userId,
      planId: freePlan.id,
      status: "FREE",
      startedAt: now,
      expiresAt: addDays(now, FAR_FUTURE_DAYS),
    },
    include: { plan: true },
  });
}

export async function getActiveSubscription(userId: string) {
  await expireOldSubscriptions(userId);

  const db = prisma as any;
  const paid = await getActivePaidSubscription(userId);

  if (paid) {
    return paid;
  }

  const active = await db.subscription.findFirst({
    where: {
      userId,
      expiresAt: { gt: new Date() },
      OR: [
        {
          status: "TRIAL",
          plan: { isTrial: true },
        },
        {
          status: { in: PAID_STATUSES },
          plan: {
            isFree: false,
            isTrial: false,
          },
        },
      ],
    },
    include: { plan: true },
    orderBy: [
      { status: "asc" },
      { expiresAt: "desc" },
    ],
  });

  return active;
}

export async function ensureSubscriptionForUser(userId: string) {
  await expireOldSubscriptions(userId);

  const db = prisma as any;
  const paid = await getActivePaidSubscription(userId);

  if (paid) {
    return paid;
  }

  const activeTrial = await db.subscription.findFirst({
    where: {
      userId,
      status: "TRIAL",
      expiresAt: { gt: new Date() },
      plan: { isTrial: true },
    },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });

  if (activeTrial) {
    return activeTrial;
  }

  const trial = await ensureUserTrial(userId);

  if (trial) {
    return trial;
  }

  return getOrCreateFreeSubscription(userId);
}

type ActiveSubscriptionRecord = NonNullable<Awaited<ReturnType<typeof ensureSubscriptionForUser>>>;

export async function requireActiveSubscription() {
  const user = await requireUser();

  if (isAdminUser(user)) {
    return null;
  }

  const subscription = await ensureSubscriptionForUser(user.id);

  if (!subscription) {
    throw new SubscriptionAccessError(
      "Your subscription is not active. Renew your plan to continue using the dashboard.",
      403
    );
  }

  return subscription;
}

export async function getUserPlanLimits(userId: string) {
  const db = prisma as any;
  const subscription = await ensureSubscriptionForUser(userId);
  const plan = subscription?.plan || null;
  const [user, tradesCount, screenshotsCount, legacyPlaybooksCount, strategiesCount, checklistsCount] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true },
      }),
      db.trade.count({ where: { userId } }),
      db.tradeScreenshot.count({ where: { userId } }),
      db.playbook.count({ where: { userId } }),
      db.playbookStrategy.count({ where: { userId } }),
      db.tradeChecklist.count({ where: { trade: { userId } } }),
    ]);

  if (user && isAdminUser(user)) {
    return {
      subscription,
      plan,
      limits: {
        maxTrades: null,
        maxScreenshots: null,
        maxPlaybooks: null,
        maxChecklists: null,
        aiAnalysis: true,
        advancedAnalytics: true,
        exportEnabled: true,
      },
      usage: {
        tradesCount,
        screenshotsCount,
        playbooksCount: legacyPlaybooksCount + strategiesCount,
        checklistsCount,
      },
    };
  }

  return {
    subscription,
    plan,
    limits: {
      maxTrades: isActiveTrialSubscription(subscription) ? null : plan?.maxTrades ?? null,
      maxScreenshots: isActiveTrialSubscription(subscription) ? null : plan?.maxScreenshots ?? null,
      maxPlaybooks: isActiveTrialSubscription(subscription) ? null : plan?.maxPlaybooks ?? null,
      maxChecklists: isActiveTrialSubscription(subscription) ? null : plan?.maxChecklists ?? null,
      aiAnalysis: Boolean(plan?.aiAnalysis),
      advancedAnalytics: Boolean(plan?.advancedAnalytics),
      exportEnabled: Boolean(plan?.exportEnabled),
    },
    usage: {
      tradesCount,
      screenshotsCount,
      playbooksCount: legacyPlaybooksCount + strategiesCount,
      checklistsCount,
    },
  };
}

export async function requireFeatureAccess(userId: string, featureName: FeatureName) {
  const db = prisma as any;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true },
  });

  if (isAdminUser(user)) {
    return getUserPlanLimits(userId);
  }

  const access = await getUserPlanLimits(userId);
  const { limits, usage } = access;

  if (!access.plan) {
    throw new SubscriptionAccessError("Upgrade required to use this feature", 403);
  }

  if (featureName === "aiAnalysis" && !limits.aiAnalysis) {
    throw new SubscriptionAccessError("AI analysis is not available on your current plan. Upgrade to Pro.", 403);
  }

  if (featureName === "advancedAnalytics" && !limits.advancedAnalytics) {
    throw new SubscriptionAccessError("Advanced analytics is not available on your current plan. Upgrade to Pro.", 403);
  }

  if (featureName === "export" && !limits.exportEnabled) {
    throw new SubscriptionAccessError("Export is not available on your current plan. Upgrade to Pro.", 403);
  }

  const checks = {
    trades: {
      limit: limits.maxTrades,
      usage: usage.tradesCount,
      label: "trade",
    },
    screenshots: {
      limit: limits.maxScreenshots,
      usage: usage.screenshotsCount,
      label: "screenshot",
    },
    playbooks: {
      limit: limits.maxPlaybooks,
      usage: usage.playbooksCount,
      label: "playbook",
    },
    checklists: {
      limit: limits.maxChecklists,
      usage: usage.checklistsCount,
      label: "checklist",
    },
  } as const;

  if (featureName in checks) {
    const check = checks[featureName as keyof typeof checks];

    if (check.limit !== null && check.usage >= check.limit) {
      throw new SubscriptionAccessError(
        `You have reached your ${check.label} limit for the current plan. Upgrade to Pro for unlimited access.`,
        403
      );
    }
  }

  return access;
}

async function buildSubscriptionBannerState(
  userId: string,
  subscription: ActiveSubscriptionRecord
) {
  const db = prisma as any;

  const remaining =
    subscription.status === "TRIAL"
      ? trialDaysRemaining(subscription)
      : daysRemaining(subscription.expiresAt);

  if (subscription.status === "TRIAL") {
    return {
      tone: "trial",
      title: `Your trial plan has ${remaining} days remaining.`,
      titleFa: `دوره آزمایشی شما تا ${remaining} روز دیگر تمام می‌شود. برای حفظ دسترسی کامل به Pro ارتقا دهید.`,
      href: "/pricing",
      buttonText: "Upgrade plan",
      buttonTextFa: "ارتقا پلن",
    };
  }

  if (subscription.status === "FREE") {
    const expiredTrial = await db.subscription.findFirst({
      where: {
        userId,
        status: { in: ["EXPIRED", "CANCELED"] },
        plan: { slug: "trial" },
      },
      select: { id: true },
      orderBy: { expiresAt: "desc" },
    });

    if (expiredTrial) {
      return {
        tone: "warning",
        title: "Your trial has expired. Upgrade to Pro to generate MT5 keys and keep journaling.",
        titleFa: "دوره آزمایشی شما تمام شده است. برای ساخت کلید MT5 و ادامه ژورنال‌نویسی به Pro ارتقا دهید.",
        href: "/pricing",
        buttonText: "Upgrade",
        buttonTextFa: "ارتقا",
      };
    }

    return null;
  }

  if (subscription.status === "ACTIVE" || subscription.status === "MANUAL") {
    const planName = subscription.plan.name || "Pro";
    const expiringSoon = remaining <= 7;

    if (!expiringSoon) {
      return null;
    }

    return {
      tone: "warning",
      title: `Your ${planName} plan expires in ${remaining} days. Renew now.`,
      titleFa: `پلن ${planName} شما تا ${remaining} روز دیگر منقضی می‌شود. همین حالا تمدید کنید.`,
      href: "/pricing",
      buttonText: "Renew",
      buttonTextFa: "تمدید",
    };
  }

  return null;
}

function buildSubscriptionDashboardState(
  subscription: ActiveSubscriptionRecord
): SubscriptionDashboardState {
  const isTrial = subscription.status === "TRIAL" || Boolean(subscription.plan.isTrial);
  const remaining = isTrial
    ? trialDaysRemaining(subscription)
    : daysRemaining(subscription.expiresAt);
  const totalDays = isTrial
    ? trialDurationDays(subscription)
    : calendarDaysBetween(subscription.startedAt, subscription.expiresAt);
  const percentRemaining = Math.max(
    Math.min(Math.round((remaining / Math.max(totalDays, 1)) * 100), 100),
    0
  );

  return {
    planName: subscription.plan.name,
    planSlug: subscription.plan.slug,
    status: subscription.status,
    daysRemaining: remaining,
    totalDays,
    percentRemaining,
    startedAt: subscription.startedAt.toISOString(),
    expiresAt: subscription.expiresAt.toISOString(),
    isTrial,
    isPaid:
      (subscription.status === "ACTIVE" || subscription.status === "MANUAL") &&
      !subscription.plan.isFree &&
      !subscription.plan.isTrial,
    isFree: Boolean(subscription.plan.isFree),
  };
}

export async function getSubscriptionBannerState(userId: string) {
  const subscription = await ensureSubscriptionForUser(userId);

  if (!subscription?.plan) {
    return null;
  }

  return buildSubscriptionBannerState(userId, subscription);
}

export async function getSubscriptionDashboardState(
  userId: string
): Promise<SubscriptionDashboardState | null> {
  const subscription = await ensureSubscriptionForUser(userId);

  if (!subscription?.plan) {
    return null;
  }

  return buildSubscriptionDashboardState(subscription);
}

export async function getSubscriptionShellState(
  userId: string,
  existingSubscription?: ActiveSubscriptionRecord | null
) {
  const subscription = existingSubscription ?? await ensureSubscriptionForUser(userId);

  if (!subscription?.plan) {
    return {
      banner: null,
      subscription: null,
    };
  }

  const [banner, dashboardState] = await Promise.all([
    buildSubscriptionBannerState(userId, subscription),
    Promise.resolve(buildSubscriptionDashboardState(subscription)),
  ]);

  return {
    banner,
    subscription: dashboardState,
  };
}
