"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  BarChart3,
  ListChecks,
  Percent,
  Plus,
  PlugZap,
  X,
  type LucideIcon,
} from "lucide-react";
import { PnlText } from "@/components/dashboard/PnlText";
import { StatCard } from "@/components/dashboard/StatCard";
import { TradeDirectionBadge } from "@/components/dashboard/TradeDirectionBadge";
import {
  TradeReadinessGuide,
  type ReadinessSummary,
  useTradeReadinessGuideState,
} from "@/components/dashboard/TradeReadinessGuide";
import { AccountConnectionWizard } from "@/components/dashboard/AccountConnectionWizard";
import { useLanguage } from "@/lib/language-context";
import {
  type ApiResult,
  type DashboardOverviewData,
  type DashboardPageStatDto,
  type DashboardOverviewStats,
  formatMoney,
  type TradeDto,
  type TradingAccountDto,
} from "@/components/dashboard/types";
import { cn } from "@/lib/utils";

const DASHBOARD_REFRESH_INTERVAL_MS = 15000;
const DASHBOARD_DATE_TIME_ZONE = "UTC";

type EconomicEventDto = {
  id: string;
  name: string;
  currency: string;
  impact: string;
  eventTime: string;
};

type DailyJournalPayload = {
  success?: boolean;
  journal?: Record<string, unknown> | null;
};

type DashboardAction = {
  key: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  href: string;
  cta: string;
  tone?: "default" | "danger";
};

const enText = {
  simple: "Simple",
  pro: "Pro",
  tradingStatusTitle: "Today's Readiness",
  tradingStatusSubtitle: "Use this as the daily decision point before managing trades.",
  finalDecision: "Final decision",
  readiness: "Readiness",
  mainReason: "Main reason",
  startCheck: "Set Today's Readiness",
  openJournal: "Open Daily Journal",
  summaryTitle: "Today's readiness summary",
  mindset: "Daily mindset",
  playbook: "Playbook",
  checklist: "Entry check",
  actionCenter: "Action Center",
  noPendingActions: "No urgent actions right now.",
  reviewNeeded: "Review Needed",
  tradesWaiting: "Trades waiting for review",
  dailyJournalPending: "Daily journal not completed",
  openTrades: "Open Trades",
  highImpactNews: "High-impact news warning",
  reviewTrades: "Review trades",
  completeJournal: "Open journal",
  manageTrades: "Manage trades",
  viewCalendar: "View calendar",
  performanceSnapshot: "Performance Snapshot",
  pageStatsTitle: "Workspace Overview",
  pageStatsSubtitle: "Activity across the main journal pages.",
  activePages: "Active pages",
  reviewedTrades: "Reviewed trades",
  reviewCoverage: "Review coverage",
  recentSummary: "Recent Trades",
  noTrades: "No recent trades yet.",
  review: "Review",
  reviewed: "Reviewed",
  notReviewed: "Needs review",
  marketRisk: "Market Risk",
  marketRiskSubtitle: "High-impact calendar risk in the next 24 hours.",
  noHighImpactEvents: "No high-impact events in the next 24h",
  loadingEvents: "Checking market risk...",
  nextHighImpact: "Next high-impact event",
  economicDetails: "Economic Events Details",
  accountRisk: "Account Risk Breakdown",
  analyticsPreview: "Analytics Preview",
  analyticsHint: "Open analytics for deeper playbook, psychology, and account trends.",
  openAnalytics: "Open analytics",
  balance: "Balance",
  openInFeed: "open in recent feed",
  totalTrades: "Total Trades",
  activeAccount: "Active account",
  chooseAccount: "Choose account",
  noAccounts: "No account",
};

const faText = {
  simple: "ساده",
  pro: "حرفه‌ای",
  modeHint: "حالت ساده داشبورد را روی تصمیم امروز و اقدام بعدی متمرکز نگه می‌دارد.",
  tradingStatusTitle: "آمادگی امروز",
  tradingStatusSubtitle: "قبل از مدیریت معاملات، تصمیم روزانه را از این بخش شروع کنید.",
  finalDecision: "تصمیم نهایی",
  readiness: "آمادگی",
  mainReason: "دلیل اصلی",
  startCheck: "ثبت آمادگی امروز",
  openJournal: "باز کردن ژورنال روزانه",
  summaryTitle: "خلاصه آمادگی امروز",
  mindset: "وضعیت ذهنی",
  playbook: "پلی‌بوک",
  checklist: "چک ورود",
  actionCenter: "مرکز اقدام",
  noPendingActions: "الان اقدام فوری مهمی وجود ندارد.",
  reviewNeeded: "نیازمند بررسی",
  tradesWaiting: "معاملات در انتظار بررسی",
  dailyJournalPending: "ژورنال روزانه تکمیل نشده",
  openTrades: "معاملات باز",
  highImpactNews: "هشدار خبر پراثر",
  reviewTrades: "بررسی معاملات",
  completeJournal: "باز کردن ژورنال",
  manageTrades: "مدیریت معاملات",
  viewCalendar: "مشاهده تقویم",
  performanceSnapshot: "خلاصه عملکرد",
  pageStatsTitle: "آمار کلی صفحات",
  pageStatsSubtitle: "نمای سریع فعالیت کاربر در بخش‌های اصلی ژورنال.",
  activePages: "صفحات فعال",
  reviewedTrades: "معاملات بررسی‌شده",
  reviewCoverage: "پوشش بررسی",
  recentSummary: "معاملات اخیر",
  noTrades: "هنوز معامله اخیری وجود ندارد.",
  review: "بررسی",
  reviewed: "بررسی شده",
  notReviewed: "نیازمند بررسی",
  marketRisk: "ریسک بازار",
  marketRiskSubtitle: "ریسک رویدادهای پراثر اقتصادی در ۲۴ ساعت آینده.",
  noHighImpactEvents: "در ۲۴ ساعت آینده رویداد پراثر وجود ندارد",
  loadingEvents: "در حال بررسی ریسک بازار...",
  nextHighImpact: "رویداد پراثر بعدی",
  economicDetails: "جزئیات رویدادهای اقتصادی",
  accountRisk: "تفکیک ریسک حساب‌ها",
  analyticsPreview: "پیش‌نمایش تحلیل‌ها",
  analyticsHint: "برای بررسی عمیق‌تر پلی‌بوک، روان‌شناسی و روند حساب‌ها وارد تحلیل‌ها شوید.",
  openAnalytics: "باز کردن تحلیل‌ها",
  balance: "موجودی",
  openInFeed: "معامله باز در فهرست اخیر",
  totalTrades: "کل معاملات",
  activeAccount: "حساب فعال",
  chooseAccount: "انتخاب حساب",
  noAccounts: "بدون حساب",
};

const textByLanguage = {
  en: enText,
  fa: faText,
} as const;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatEventDistance(eventTime: string, language: "en" | "fa") {
  const minutes = Math.max(0, Math.round((new Date(eventTime).getTime() - Date.now()) / 60000));

  if (language === "fa") {
    if (minutes < 60) {
      return `${minutes} دقیقه دیگر`;
    }

    const hours = Math.round(minutes / 60);
    return `${hours} ساعت دیگر`;
  }

  if (minutes < 60) {
    return `in ${minutes} minutes`;
  }

  const hours = Math.round(minutes / 60);
  return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function formatActionTradeCount(count: number, language: "en" | "fa") {
  if (language === "fa") {
    return `${count} معامله`;
  }

  return `${count} ${count === 1 ? "trade" : "trades"}`;
}

function formatOpenTradesDetail(count: number, language: "en" | "fa") {
  if (language === "fa") {
    return `${count} معامله باز`;
  }

  return `${count} open`;
}

function formatEventTime(eventTime: string, language: "en" | "fa") {
  const date = new Date(eventTime);

  if (Number.isNaN(date.getTime())) {
    return eventTime;
  }

  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DASHBOARD_DATE_TIME_ZONE,
  }).format(date);
}

function formatTradeDateTime(trade: TradeDto, language: "en" | "fa") {
  const value = trade.openedAt || trade.closedAt || trade.createdAt;

  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DASHBOARD_DATE_TIME_ZONE,
  }).format(date);
}

function isTradeReviewed(trade: TradeDto) {
  return Boolean(trade.strategyReview && trade.strategyReview.followedPlan !== "NOT_REVIEWED");
}

function hasConnectedTradingAccount(accounts: TradingAccountDto[]) {
  return accounts.some(
    (account) =>
      account.journalEnabled &&
      (account.mt5AccountNumber || account.lastConnectedAt || account.lastSyncAt || account.hasJournalSecret)
  );
}

function accountDisplayName(account: TradingAccountDto) {
  return account.mt5AccountNumber || account.name;
}

function scopedHref(path: string, accountId: string | null | undefined) {
  if (!accountId) {
    return path;
  }

  const [pathname, rawQuery = ""] = path.split("?");
  const params = new URLSearchParams(rawQuery);
  params.set("accountId", accountId);
  return `${pathname}?${params.toString()}`;
}

function firstUnreviewedTradeHref(trades: TradeDto[]) {
  const trade = trades.find((item) => !isTradeReviewed(item));

  return trade ? `/journal/${trade.id}` : "/journal?reviewStatus=not-reviewed";
}

function buildDashboardActions({
  labels,
  accounts,
  stats,
  trades,
  journalCompleted,
  journalLoaded,
  highImpactEvents,
  eventsLoaded,
  language,
  activeAccountId,
}: {
  labels: typeof enText;
  accounts: TradingAccountDto[];
  stats: DashboardOverviewStats;
  trades: TradeDto[];
  journalCompleted: boolean;
  journalLoaded: boolean;
  highImpactEvents: EconomicEventDto[];
  eventsLoaded: boolean;
  language: "en" | "fa";
  activeAccountId?: string | null;
}) {
  const hasConnectedAccount = hasConnectedTradingAccount(accounts);

  return [
    stats.notReviewedTrades > 0
      ? {
          key: "reviews",
          icon: ClipboardCheck,
          title: labels.tradesWaiting,
          detail: formatActionTradeCount(stats.notReviewedTrades, language),
          href: scopedHref("/journal?reviewStatus=not-reviewed", activeAccountId),
          cta: labels.reviewTrades,
        }
      : null,
    journalLoaded && !journalCompleted
      ? {
          key: "journal",
          icon: BookOpenCheck,
          title: labels.dailyJournalPending,
          detail: todayKey(),
          href: scopedHref("/dashboard/daily-journal", activeAccountId),
          cta: labels.completeJournal,
        }
      : null,
    stats.openTrades > 0
      ? {
          key: "open",
          icon: Activity,
          title: labels.openTrades,
          detail: formatOpenTradesDetail(stats.openTrades, language),
          href: scopedHref("/journal?status=OPEN", activeAccountId),
          cta: labels.manageTrades,
        }
      : null,
    !hasConnectedAccount
      ? {
          key: "account",
          icon: PlugZap,
          title: language === "fa" ? "حساب MT5/حساب معاملاتی متصل نیست" : "MT5/account not connected",
          detail: language === "fa" ? "MT5 را متصل کنید یا یک حساب معاملاتی بسازید" : "Connect MT5 or create a trading account",
          href: "/dashboard/accounts",
          cta: language === "fa" ? "اتصال MT5" : "Connect MT5",
        }
      : null,
    eventsLoaded && highImpactEvents.length > 0
      ? {
          key: "news",
          icon: AlertTriangle,
          title: labels.highImpactNews,
          detail: `${highImpactEvents[0].currency} ${formatEventDistance(highImpactEvents[0].eventTime, language)}`,
          href: "/economic-calendar",
          cta: labels.viewCalendar,
          tone: "danger" as const,
        }
      : null,
  ].filter(Boolean) as DashboardAction[];
}

function SectionCard({
  title,
  children,
  action,
  className,
  tourId,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  tourId?: string;
}) {
  return (
    <section
      data-dashboard-tour={tourId}
      className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]", className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function TodayTradingStatus({
  summary,
  onStartCheck,
  labels,
  isRtl,
}: {
  summary: ReadinessSummary;
  onStartCheck: () => void;
  labels: typeof enText;
  isRtl: boolean;
}) {
  return (
    <section
      data-dashboard-tour="readiness"
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]",
        isRtl && "text-right"
      )}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
            <Gauge className="h-4 w-4" />
            {labels.tradingStatusTitle}
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_120px_1.4fr]">
            <div className={cn("rounded-lg border p-3", summary.decisionToneClass)}>
              <div className="text-xs font-semibold uppercase">{labels.finalDecision}</div>
              <div className="mt-1 text-lg font-bold">{summary.decisionLabel}</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#111827]">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {labels.readiness}
              </div>
              <div className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{summary.readinessScore}%</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#111827]">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                {labels.mainReason}
              </div>
              <div className="mt-1 text-sm font-semibold leading-5 text-slate-950 dark:text-white">
                {summary.mainReason}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#111827]">
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{labels.summaryTitle}</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0F172A]">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Brain className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                {labels.mindset}
              </span>
              <strong className="text-slate-950 dark:text-white">{summary.mindsetCompleted}/{summary.mindsetTotal}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0F172A]">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <BookOpenCheck className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                {labels.playbook}
              </span>
              <strong className="min-w-0 truncate text-right text-slate-950 dark:text-white">{summary.selectedPlaybook}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#0F172A]">
              <span className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <ListChecks className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                {labels.checklist}
              </span>
              <strong className="text-slate-950 dark:text-white">{summary.checklistCompleted}/{summary.checklistTotal}</strong>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="button"
              onClick={onStartCheck}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <ClipboardCheck className="h-4 w-4" />
              {labels.startCheck}
            </button>
            <Link
              href="/dashboard/daily-journal"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-800 dark:text-slate-200 dark:hover:bg-[#0F172A]"
            >
              <BookOpenCheck className="h-4 w-4" />
              {labels.openJournal}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Kept temporarily for compatibility with the prior dashboard layout while Phase 2 uses SecondaryActionCenter.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ActionCenter({
  labels,
  accounts,
  stats,
  journalCompleted,
  journalLoaded,
  highImpactEvents,
  eventsLoaded,
  language,
}: {
  labels: typeof enText;
  accounts: TradingAccountDto[];
  stats: DashboardOverviewStats;
  journalCompleted: boolean;
  journalLoaded: boolean;
  highImpactEvents: EconomicEventDto[];
  eventsLoaded: boolean;
  language: "en" | "fa";
}) {
  const hasConnectedAccount = accounts.some(
    (account) =>
      account.journalEnabled &&
      (account.mt5AccountNumber || account.lastConnectedAt || account.lastSyncAt || account.hasJournalSecret)
  );
  const actions = [
    stats.notReviewedTrades > 0
      ? {
          key: "reviews",
          icon: ClipboardCheck,
          title: labels.tradesWaiting,
          detail: formatActionTradeCount(stats.notReviewedTrades, language),
          href: "/journal?reviewStatus=not-reviewed",
          cta: labels.reviewTrades,
        }
      : null,
    journalLoaded && !journalCompleted
      ? {
          key: "journal",
          icon: BookOpenCheck,
          title: labels.dailyJournalPending,
          detail: todayKey(),
          href: "/dashboard/daily-journal",
          cta: labels.completeJournal,
        }
      : null,
    stats.openTrades > 0
      ? {
          key: "open",
          icon: Activity,
          title: labels.openTrades,
          detail: formatOpenTradesDetail(stats.openTrades, language),
          href: "/journal?status=OPEN",
          cta: labels.manageTrades,
        }
      : null,
    !hasConnectedAccount
      ? {
          key: "account",
          icon: PlugZap,
          title: language === "fa" ? "حساب MT5/حساب معاملاتی متصل نیست" : "MT5/account not connected",
          detail: language === "fa" ? "MT5 را متصل کنید یا یک حساب معاملاتی بسازید" : "Connect MT5 or create a trading account",
          href: "/dashboard/accounts",
          cta: language === "fa" ? "اتصال MT5" : "Connect MT5",
        }
      : null,
    eventsLoaded && highImpactEvents.length > 0
      ? {
          key: "news",
          icon: AlertTriangle,
          title: labels.highImpactNews,
          detail: `${highImpactEvents[0].currency} ${formatEventDistance(highImpactEvents[0].eventTime, language)}`,
          href: "/economic-calendar",
          cta: labels.viewCalendar,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    icon: LucideIcon;
    title: string;
    detail: string;
    href: string;
    cta: string;
  }>;

  return (
    <SectionCard title={labels.actionCenter} tourId="actions">
      {actions.length === 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          {labels.noPendingActions}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <div
                key={action.key}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  action.key === "news"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#111827]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white dark:bg-[#0F172A]",
                      action.key === "news"
                        ? "border-red-500/30 text-red-600 dark:text-red-300"
                        : "border-slate-200 text-blue-600 dark:border-slate-800 dark:text-blue-300"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className={cn("text-sm font-semibold", action.key === "news" ? "text-red-700 dark:text-red-100" : "text-slate-950 dark:text-white")}>{action.title}</h3>
                    <p className={cn("mt-1 text-xs", action.key === "news" ? "text-red-600 dark:text-red-200" : "text-slate-500 dark:text-slate-400")}>{action.detail}</p>
                  </div>
                </div>
                <Link
                  href={action.href}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center justify-center rounded-lg px-3 text-sm font-semibold text-white",
                    action.key === "news" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
                  )}
                >
                  {action.cta}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function SecondaryActionCenter({
  labels,
  accounts,
  stats,
  trades,
  journalCompleted,
  journalLoaded,
  highImpactEvents,
  eventsLoaded,
  language,
  excludeActionKey,
  activeAccountId,
}: {
  labels: typeof enText;
  accounts: TradingAccountDto[];
  stats: DashboardOverviewStats;
  trades: TradeDto[];
  journalCompleted: boolean;
  journalLoaded: boolean;
  highImpactEvents: EconomicEventDto[];
  eventsLoaded: boolean;
  language: "en" | "fa";
  excludeActionKey?: string;
  activeAccountId?: string | null;
}) {
  const actions = buildDashboardActions({
    labels,
    accounts,
    stats,
    trades,
    journalCompleted,
    journalLoaded,
    highImpactEvents,
    eventsLoaded,
    language,
    activeAccountId,
  }).filter((action) => action.key !== excludeActionKey);

  return (
    <SectionCard title={labels.actionCenter} tourId="actions">
      {actions.length === 0 ? (
        <div className="mt-3 flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          {labels.noPendingActions}
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <div
                key={action.key}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
                  action.tone === "danger"
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#111827]"
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-white dark:bg-[#0F172A]",
                      action.tone === "danger"
                        ? "border-red-500/30 text-red-600 dark:text-red-300"
                        : "border-slate-200 text-blue-600 dark:border-slate-800 dark:text-blue-300"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h3
                      className={cn(
                        "text-sm font-semibold",
                        action.tone === "danger" ? "text-red-700 dark:text-red-100" : "text-slate-950 dark:text-white"
                      )}
                    >
                      {action.title}
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-xs",
                        action.tone === "danger" ? "text-red-600 dark:text-red-200" : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {action.detail}
                    </p>
                  </div>
                </div>
                <Link
                  href={action.href}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-semibold",
                    action.tone === "danger"
                      ? "border-red-500/30 text-red-700 hover:bg-red-500/10 dark:text-red-200"
                      : "border-slate-200 text-slate-700 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-[#0F172A]"
                  )}
                >
                  {action.cta}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function OnboardingChecklist({ language }: { language: "en" | "fa" }) {
  const items = [
    {
      label: language === "fa" ? "اتصال حساب MT5" : "Connect MT5 account",
      href: "/dashboard/accounts",
      icon: PlugZap,
    },
    {
      label: language === "fa" ? "ساخت اولین پلی‌بوک" : "Create first playbook",
      href: "/journal/playbooks/new",
      icon: ListChecks,
    },
    {
      label: language === "fa" ? "تکمیل ژورنال روزانه" : "Complete daily journal",
      href: "/dashboard/daily-journal",
      icon: BookOpenCheck,
    },
    {
      label: language === "fa" ? "افزودن یا وارد کردن اولین معامله" : "Add or import first trade",
      href: "/journal",
      icon: Plus,
    },
  ];

  return (
    <SectionCard title={language === "fa" ? "شروع کار" : "Getting started"}>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-[#0F172A]"
            >
              <Icon className="h-4 w-4 text-blue-500" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function PrimaryWorkflowAction({ action }: { action: DashboardAction }) {
  const Icon = action.icon;

  return (
    <section
      data-dashboard-tour="primary-action"
      className={cn(
        "rounded-xl border p-4 shadow-sm",
        action.tone === "danger"
          ? "border-red-500/30 bg-red-500/10"
          : "border-blue-500/30 bg-blue-600/10 dark:bg-blue-600/15"
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white dark:bg-[#0F172A]",
              action.tone === "danger"
                ? "border-red-500/30 text-red-600 dark:text-red-300"
                : "border-blue-500/30 text-blue-600 dark:text-blue-300"
            )}
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">{action.title}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{action.detail}</p>
          </div>
        </div>
        <Link
          href={action.href}
          className={cn(
            "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white",
            action.tone === "danger" ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
          )}
        >
          {action.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function SetupGuidanceCard({
  language,
  accounts,
  trades,
  stats,
  journalCompleted,
  journalLoaded,
  dismissed,
  onDismiss,
}: {
  language: "en" | "fa";
  accounts: TradingAccountDto[];
  trades: TradeDto[];
  stats: DashboardOverviewStats;
  journalCompleted: boolean;
  journalLoaded: boolean;
  dismissed: boolean;
  onDismiss: () => void;
}) {
  const hasAccount = accounts.length > 0;
  const hasConnectedAccount = hasConnectedTradingAccount(accounts);
  const hasManualTrade = trades.some((trade) => trade.source?.toUpperCase() === "MANUAL");
  const hasMethod = hasConnectedAccount || hasManualTrade || stats.totalTrades > 0;
  const hasTrade = stats.totalTrades > 0;
  const hasTradeReview = stats.totalTrades > 0 && stats.notReviewedTrades < stats.totalTrades;
  const hasDailyJournal = journalLoaded && journalCompleted;
  const steps = [
    { key: "account", label: language === "fa" ? "حساب معاملاتی ساخته شده" : "Trading account created", done: hasAccount },
    { key: "method", label: language === "fa" ? "MT5 متصل یا روش دستی شروع شده" : "MT5 connected or manual method selected", done: hasMethod },
    { key: "trade", label: language === "fa" ? "اولین معامله ثبت شده" : "First trade added or imported", done: hasTrade },
    { key: "review", label: language === "fa" ? "اولین بررسی معامله کامل شده" : "First trade review completed", done: hasTradeReview },
    { key: "journal", label: language === "fa" ? "ژورنال روزانه کامل شده" : "Daily journal completed", done: hasDailyJournal },
  ];
  const completedCount = steps.filter((step) => step.done).length;
  const progress = Math.round((completedCount / steps.length) * 100);
  const nextAction =
    !hasAccount
      ? {
          icon: BriefcaseBusiness,
          title: language === "fa" ? "ساخت حساب معاملاتی" : "Create trading account",
          detail:
            language === "fa"
              ? "حساب، پایه اتصال MT5، ورود دستی و محاسبه عملکرد است."
              : "An account gives every trade a home for balances, imports, and performance.",
          href: "/dashboard/accounts",
          cta: language === "fa" ? "ساخت حساب" : "Create trading account",
        }
      : !hasMethod
        ? {
            icon: PlugZap,
            title: language === "fa" ? "اتصال MT5" : "Connect MT5",
            detail:
              language === "fa"
                ? "اتصال MT5 ورود معاملات و اسکرین شات ها را منظم و کم خطا می کند."
                : "MT5 keeps imports and screenshots consistent without manual cleanup.",
            href: "/dashboard/accounts",
            cta: language === "fa" ? "اتصال MT5" : "Connect MT5",
          }
        : !hasTrade
          ? {
              icon: Plus,
              title: language === "fa" ? "ثبت اولین معامله دستی" : "Add first trade manually",
              detail:
                language === "fa"
                  ? "اولین معامله، ژورنال و آمار عملکرد را از حالت خالی خارج می کند."
                  : "One trade unlocks the journal, review flow, and real performance stats.",
              href: "/journal",
              cta: language === "fa" ? "ثبت معامله" : "Add first trade manually",
            }
          : !hasTradeReview
            ? {
                icon: ClipboardCheck,
                title: language === "fa" ? "بررسی اولین معامله" : "Review first trade",
                detail:
                  language === "fa"
                    ? "بررسی معامله مشخص می کند اجرا با برنامه و چک لیست هماهنگ بوده یا نه."
                    : "A review turns the trade into feedback against your playbook and checklist.",
                href: firstUnreviewedTradeHref(trades),
                cta: language === "fa" ? "بررسی معامله" : "Review first trade",
              }
            : !hasDailyJournal
              ? {
                  icon: BookOpenCheck,
                  title: language === "fa" ? "تکمیل ژورنال امروز" : "Complete today's journal",
                  detail:
                    language === "fa"
                      ? "ژورنال روزانه تصمیم ها، ذهنیت و برنامه فردا را قابل مرور می کند."
                      : "The daily journal captures mindset, discipline, and tomorrow's plan.",
                  href: "/dashboard/daily-journal",
                  cta: language === "fa" ? "تکمیل ژورنال" : "Complete today's journal",
                }
              : null;

  if (dismissed || !nextAction) {
    return null;
  }

  const Icon = nextAction.icon;

  return (
    <section className="hidden rounded-xl border border-blue-500/30 bg-blue-600/10 p-5 shadow-sm dark:bg-blue-600/15 lg:block">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-200">
            {language === "fa" ? "راه اندازی دسکتاپ" : "Desktop setup"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">
            {language === "fa" ? "ژورنال خود را آماده کنید" : "Get your trading workflow ready"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/30 text-blue-700 hover:bg-blue-500/10 dark:text-blue-200"
          aria-label={language === "fa" ? "بستن راهنما" : "Dismiss setup guide"}
          title={language === "fa" ? "بستن راهنما" : "Dismiss setup guide"}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">
              {language === "fa" ? "پیشرفت راه اندازی" : "Setup progress"}
            </span>
            <strong className="text-slate-950 dark:text-white">{completedCount}/{steps.length}</strong>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {steps.map((step) => (
              <div key={step.key} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CheckCircle2 className={cn("h-4 w-4", step.done ? "text-emerald-500" : "text-slate-400")} />
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-blue-500/25 bg-white p-4 dark:bg-[#0F172A]">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 text-blue-600 dark:text-blue-300">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{nextAction.title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{nextAction.detail}</p>
            </div>
          </div>
          <Link
            href={nextAction.href}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {nextAction.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function formatCompactNumber(value: number, language: "en" | "fa") {
  return new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function fallbackPageStats(stats: DashboardOverviewStats): DashboardPageStatDto[] {
  const reviewedTrades = Math.max(0, stats.totalTrades - stats.notReviewedTrades);

  return [
    { key: "accounts", value: 0, href: "/dashboard/accounts" },
    { key: "trades", value: stats.totalTrades, href: "/journal" },
    { key: "reviews", value: reviewedTrades, href: "/dashboard/reports" },
    { key: "dailyJournal", value: 0, href: "/dashboard/daily-journal" },
    { key: "readiness", value: 0, href: "/dashboard/daily-journal" },
    { key: "playbooks", value: 0, href: "/journal/playbooks" },
    { key: "checklists", value: 0, href: "/journal/checklists" },
    { key: "propFirms", value: 0, href: "/dashboard/prop-firms" },
  ];
}

function pageStatMeta(key: DashboardPageStatDto["key"], language: "en" | "fa") {
  const meta = {
    accounts: {
      label: language === "fa" ? "حساب‌ها" : "Accounts",
      detail: language === "fa" ? "حساب‌های معاملاتی" : "Trading accounts",
      color: "#38BDF8",
    },
    trades: {
      label: language === "fa" ? "ژورنال معاملات" : "Trade journal",
      detail: language === "fa" ? "کل معاملات ثبت‌شده" : "Total logged trades",
      color: "#2563EB",
    },
    reviews: {
      label: language === "fa" ? "گزارش‌ها" : "Reports",
      detail: language === "fa" ? "معاملات دارای بررسی" : "Reviewed trades",
      color: "#10B981",
    },
    dailyJournal: {
      label: language === "fa" ? "ژورنال روزانه" : "Daily journal",
      detail: language === "fa" ? "روزهای ثبت‌شده" : "Completed journal days",
      color: "#F59E0B",
    },
    readiness: {
      label: language === "fa" ? "آمادگی معامله" : "Readiness",
      detail: language === "fa" ? "چک‌های قبل از معامله" : "Pre-trade checks",
      color: "#06B6D4",
    },
    playbooks: {
      label: language === "fa" ? "پلی‌بوک‌ها" : "Playbooks",
      detail: language === "fa" ? "استراتژی‌های فعال" : "Active strategies",
      color: "#8B5CF6",
    },
    checklists: {
      label: language === "fa" ? "چک‌لیست‌ها" : "Checklists",
      detail: language === "fa" ? "قالب‌های قابل استفاده" : "Available templates",
      color: "#EC4899",
    },
    propFirms: {
      label: language === "fa" ? "پراپ فرم‌ها" : "Prop firms",
      detail: language === "fa" ? "چالش‌های ثبت‌شده" : "Tracked challenges",
      color: "#F97316",
    },
  } satisfies Record<DashboardPageStatDto["key"], { label: string; detail: string; color: string }>;

  return meta[key];
}

function buildDonutGradient(
  rows: Array<{ value: number; meta: { color: string } }>
) {
  const activeRows = rows.filter((item) => item.value > 0);
  const total = activeRows.reduce((sum, item) => sum + item.value, 0);

  if (total <= 0) {
    return "conic-gradient(#334155 0% 100%)";
  }

  let cursor = 0;
  const segments = activeRows.map((item) => {
    const start = cursor;
    const end = cursor + (item.value / total) * 100;
    cursor = end;

    return `${item.meta.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });

  return `conic-gradient(${segments.join(", ")})`;
}

function DashboardPageStatsChart({
  pageStats,
  stats,
  labels,
  isRtl,
  language,
}: {
  pageStats: DashboardPageStatDto[];
  stats: DashboardOverviewStats;
  labels: typeof enText;
  isRtl: boolean;
  language: "en" | "fa";
}) {
  const rows = pageStats.length > 0 ? pageStats : fallbackPageStats(stats);
  const activePages = rows.filter((item) => item.value > 0).length;
  const reviewedTrades = rows.find((item) => item.key === "reviews")?.value ?? Math.max(0, stats.totalTrades - stats.notReviewedTrades);
  const reviewCoverage = stats.totalTrades > 0 ? Math.round((reviewedTrades / stats.totalTrades) * 100) : 0;
  const topValue = rows.reduce((largest, item) => (item.value > largest.value ? item : largest), rows[0]);
  const topMeta = pageStatMeta(topValue.key, language);
  const chartRows = rows.map((item) => ({
    ...item,
    meta: pageStatMeta(item.key, language),
  }));
  const totalActivity = chartRows.reduce((sum, item) => sum + item.value, 0);
  const donutGradient = buildDonutGradient(chartRows);

  return (
    <SectionCard
      title={labels.pageStatsTitle}
      className={isRtl ? "text-right" : undefined}
      action={
        <Link
          href="/journal/analytics"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <BarChart3 className="h-4 w-4" />
          {labels.openAnalytics}
        </Link>
      }
    >
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{labels.pageStatsSubtitle}</p>

      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111827]">
          <div className="relative mx-auto aspect-square w-full max-w-[280px]">
            <div
              className="absolute inset-0 rounded-full shadow-[0_0_45px_rgba(37,99,235,0.2)]"
              style={{
                background: donutGradient,
              }}
            />
            <div className="absolute inset-[11%] rounded-full bg-white/70 shadow-inner dark:bg-[#0F172A]/85" />
            <div className="absolute inset-[22%] rounded-full border border-slate-200 bg-white text-center shadow-sm dark:border-slate-800 dark:bg-[#111827]">
              <div className="flex h-full flex-col items-center justify-center px-5">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{language === "fa" ? "کل فعالیت" : "Total activity"}</div>
                <div className="mt-2 text-4xl font-bold text-slate-950 dark:text-white">
                  {formatCompactNumber(totalActivity, language)}
                </div>
                <div className="mt-1 max-w-full truncate text-xs font-semibold text-blue-600 dark:text-blue-300">
                  {topMeta.label}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0F172A]">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.activePages}</div>
              <div className="mt-2 text-xl font-bold text-slate-950 dark:text-white">
                {formatCompactNumber(activePages, language)}/{formatCompactNumber(rows.length, language)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0F172A]">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.reviewedTrades}</div>
              <div className="mt-2 text-xl font-bold text-emerald-600 dark:text-emerald-300">
                {formatCompactNumber(reviewedTrades, language)}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-[#0F172A]">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.reviewCoverage}</div>
              <div className="mt-2 text-xl font-bold text-blue-600 dark:text-blue-300">
                {formatCompactNumber(reviewCoverage, language)}%
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {chartRows.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="flex min-h-[88px] items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:bg-white dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-[#0F172A]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-11 w-11 shrink-0 rounded-full border border-white/60 shadow-sm dark:border-slate-900/40"
                  style={{ backgroundColor: item.meta.color }}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{item.meta.label}</div>
                  <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{item.meta.detail}</div>
                </div>
              </div>
              <strong className="shrink-0 text-lg text-slate-950 dark:text-white">
                {formatCompactNumber(item.value, language)}
              </strong>
            </Link>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function RecentTradeSummary({
  trades,
  labels,
  isRtl,
  language,
}: {
  trades: TradeDto[];
  labels: typeof enText;
  isRtl: boolean;
  language: "en" | "fa";
}) {
  return (
    <SectionCard title={labels.recentSummary} className={isRtl ? "text-right" : undefined}>
      {trades.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm dark:border-slate-800 dark:bg-[#111827]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">
                {language === "fa" ? "هنوز معامله‌ای ثبت نشده" : "No trades yet"}
              </h3>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                {language === "fa"
                  ? "MT5 را متصل کنید یا اولین معامله دستی خود را اضافه کنید تا ژورنال‌نویسی را شروع کنید."
                  : "Connect MT5 or add your first manual trade to start journaling."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/dashboard/accounts"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <PlugZap className="h-4 w-4" />
                {language === "fa" ? "اتصال MT5" : "Connect MT5"}
              </Link>
              <Link
                href="/journal"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-white dark:border-slate-800 dark:text-slate-200 dark:hover:bg-[#0F172A]"
              >
                <Plus className="h-4 w-4" />
                {language === "fa" ? "افزودن معامله دستی" : "Add Manual Trade"}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {trades.slice(0, 3).map((trade) => {
            const reviewed = isTradeReviewed(trade);

            return (
              <div
                key={trade.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111827]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-slate-950 dark:text-white">
                      {trade.symbol}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatTradeDateTime(trade, language)}
                    </div>
                  </div>
                  <TradeDirectionBadge direction={trade.direction} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">PnL</div>
                    <PnlText value={trade.profitLoss} currency={trade.account?.currency || "USD"} />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{labels.reviewNeeded}</div>
                    <div
                      className={cn(
                        "mt-1 inline-flex rounded-lg border px-2 py-1 text-xs font-semibold",
                        reviewed
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
                      )}
                    >
                      {reviewed ? labels.reviewed : labels.notReviewed}
                    </div>
                  </div>
                </div>
                <Link
                  href={`/journal/${trade.id}`}
                  className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  {labels.review}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function MarketRiskCard({
  events,
  loaded,
  labels,
  language,
}: {
  events: EconomicEventDto[];
  loaded: boolean;
  labels: typeof enText;
  language: "en" | "fa";
}) {
  const nextEvent = events[0];

  return (
    <SectionCard
      title={labels.marketRisk}
      action={
        <Link
          href="/economic-calendar"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {labels.viewCalendar}
        </Link>
      }
    >
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{labels.marketRiskSubtitle}</p>
      <div
        className={cn(
          "mt-4 rounded-lg border p-3 text-sm",
          !loaded
            ? "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400"
            : nextEvent
              ? "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
        )}
      >
        {!loaded ? (
          labels.loadingEvents
        ) : nextEvent ? (
          <div className="flex flex-col gap-1">
            <strong>{labels.nextHighImpact}</strong>
            <span>
              {formatEventTime(nextEvent.eventTime, language)} - {nextEvent.currency} - {nextEvent.name}
            </span>
          </div>
        ) : (
          labels.noHighImpactEvents
        )}
      </div>
    </SectionCard>
  );
}

function ActiveAccountSelector({
  accounts,
  activeAccountId,
  onChange,
  labels,
  isRtl,
}: {
  accounts: TradingAccountDto[];
  activeAccountId: string;
  onChange: (accountId: string) => void;
  labels: typeof enText;
  isRtl: boolean;
}) {
  return (
    <label className={cn("flex min-w-[220px] flex-col gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400", isRtl && "text-right")}>
      {labels.activeAccount}
      <select
        value={activeAccountId}
        onChange={(event) => onChange(event.target.value)}
        disabled={accounts.length === 0}
        aria-label={labels.chooseAccount}
        className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold normal-case text-slate-900 outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-[#111827] dark:text-white"
      >
        {accounts.length === 0 ? (
          <option value="">{labels.noAccounts}</option>
        ) : (
          accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {accountDisplayName(account)}
            </option>
          ))
        )}
      </select>
    </label>
  );
}

export function DashboardOverview({
  userId,
  initialAccounts,
  initialActiveAccountId,
  initialTrades,
  initialStats,
  initialPageStats,
  canUseAutoSync = false,
  showAccountConnectionWizardInitially = false,
}: {
  userId?: string;
  initialAccounts: TradingAccountDto[];
  initialActiveAccountId?: string | null;
  initialTrades: TradeDto[];
  initialStats: DashboardOverviewStats;
  initialPageStats: DashboardPageStatDto[];
  canUseAutoSync?: boolean;
  showAccountConnectionWizardInitially?: boolean;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [activeAccountId, setActiveAccountId] = useState(
    initialActiveAccountId || initialAccounts[0]?.id || ""
  );
  const [trades, setTrades] = useState(initialTrades);
  const [stats, setStats] = useState(initialStats);
  const [pageStats, setPageStats] = useState(initialPageStats);
  const [highImpactEvents, setHighImpactEvents] = useState<EconomicEventDto[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [journalCompleted, setJournalCompleted] = useState(false);
  const [journalLoaded, setJournalLoaded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [accountConnectionWizardOpen, setAccountConnectionWizardOpen] = useState(
    showAccountConnectionWizardInitially
  );
  const [accountConnectionError, setAccountConnectionError] = useState("");
  const [setupDismissed, setSetupDismissed] = useState(false);
  const isRefreshingRef = useRef(false);
  const activeAccountRef = useRef(activeAccountId);
  const { language, t } = useLanguage();
  const labels = textByLanguage[language];
  const isRtl = language === "fa";
  const guide = useTradeReadinessGuideState({
    highImpactEventCount: highImpactEvents.length,
    enabled: Boolean(userId),
  });
  const setupDismissKey = `tradivix.dashboard.setup-card.v1:${userId || "anonymous"}`;
  const activeAccountKey = `tradivix.dashboard.active-account.v1:${userId || "anonymous"}`;
  const activeAccount =
    accounts.find((account) => account.id === activeAccountId) || accounts[0] || null;

  useEffect(() => {
    setAccounts(initialAccounts);
    setActiveAccountId((current) => {
      const nextInitial = initialActiveAccountId || initialAccounts[0]?.id || "";
      return current && initialAccounts.some((account) => account.id === current)
        ? current
        : nextInitial;
    });
    setTrades(initialTrades);
    setStats(initialStats);
    setPageStats(initialPageStats);
  }, [initialAccounts, initialActiveAccountId, initialPageStats, initialStats, initialTrades]);

  useEffect(() => {
    setSetupDismissed(window.localStorage.getItem(setupDismissKey) === "1");
  }, [setupDismissKey]);

  useEffect(() => {
    if (!showAccountConnectionWizardInitially) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("addAccount");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [showAccountConnectionWizardInitially]);

  useEffect(() => {
    activeAccountRef.current = activeAccountId;
  }, [activeAccountId]);

  useEffect(() => {
    const savedAccountId = window.localStorage.getItem(activeAccountKey);

    if (savedAccountId && accounts.some((account) => account.id === savedAccountId)) {
      setActiveAccountId(savedAccountId);
    }
  }, [accounts, activeAccountKey]);

  const dismissSetupCard = useCallback(() => {
    window.localStorage.setItem(setupDismissKey, "1");
    setSetupDismissed(true);
  }, [setupDismissKey]);

  const changeActiveAccount = useCallback(
    (accountId: string) => {
      setActiveAccountId(accountId);

      if (accountId) {
        window.localStorage.setItem(activeAccountKey, accountId);
      } else {
        window.localStorage.removeItem(activeAccountKey);
      }
    },
    [activeAccountKey]
  );

  const refreshTrades = useCallback(async (signal?: AbortSignal) => {
    if (!userId || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      const params = new URLSearchParams();

      if (activeAccountId) {
        params.set("accountId", activeAccountId);
      }

      const response = await fetch(`/api/dashboard/overview?${params.toString()}`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as ApiResult<DashboardOverviewData>;

      if (payload.success && payload.data) {
        if (activeAccountRef.current !== activeAccountId) {
          return;
        }

        setAccounts(payload.data.accounts);
        if (
          !activeAccountId ||
          !payload.data.accounts.some((account) => account.id === activeAccountId)
        ) {
          setActiveAccountId(payload.data.activeAccountId || "");
        }
        setTrades(payload.data.trades);
        setStats(payload.data.stats);
        setPageStats(payload.data.pageStats);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, [activeAccountId, userId]);

  const saveManualAccount = useCallback(async (payload: Record<string, string | undefined>) => {
    const response = await fetch("/api/trading-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = (await response.json()) as ApiResult<TradingAccountDto>;

    if (!result.success) {
      setAccountConnectionError(result.message || t("dashboard.accounts.saveFailed"));
      return;
    }

    setAccountConnectionError("");
    setAccountConnectionWizardOpen(false);
    await refreshTrades();
  }, [refreshTrades, t]);

  useEffect(() => {
    if (!userId || !activeAccountId) {
      return;
    }

    void refreshTrades();
  }, [activeAccountId, refreshTrades, userId]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const controller = new AbortController();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshTrades();
      }
    }, DASHBOARD_REFRESH_INTERVAL_MS);
    const handleFocus = () => {
      void refreshTrades();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshTrades, userId]);

  useEffect(() => {
    if (!userId) {
      setEventsLoaded(true);
      return;
    }

    const controller = new AbortController();
    const from = new Date();
    const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      impact: "High",
      from: from.toISOString(),
      to: to.toISOString(),
    });

    fetch(`/api/economic-calendar?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { success?: boolean; data?: EconomicEventDto[] } | null) => {
        if (payload?.success) {
          setHighImpactEvents((payload.data || []).slice(0, 3));
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
        }
      })
      .finally(() => {
        setEventsLoaded(true);
      });

    return () => controller.abort();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setJournalLoaded(true);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ date: todayKey() });

    fetch(`/api/daily-journal?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: DailyJournalPayload | null) => {
        const journal = payload?.success ? payload.journal : null;
        const hasUsefulEntry = Boolean(
          journal &&
            (journal.marketBias ||
              journal.todayFocus ||
              journal.preMarketNotes ||
              journal.whatWentWell ||
              journal.mistakesSummary ||
              journal.tomorrowPlan)
        );

        setJournalCompleted(hasUsefulEntry);
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
        }
      })
      .finally(() => {
        setJournalLoaded(true);
      });

    return () => controller.abort();
  }, [userId]);

  const primaryActions = buildDashboardActions({
    labels,
    accounts,
    stats,
    trades,
    journalCompleted,
    journalLoaded,
    highImpactEvents,
    eventsLoaded,
    language,
    activeAccountId,
  });
  const setupComplete =
    accounts.length > 0 &&
    (hasConnectedTradingAccount(accounts) ||
      trades.some((trade) => trade.source?.toUpperCase() === "MANUAL") ||
      stats.totalTrades > 0) &&
    stats.totalTrades > 0 &&
    stats.notReviewedTrades < stats.totalTrades &&
    journalLoaded &&
    journalCompleted;
  const showSetupCard = stats.totalTrades === 0 && !setupDismissed && !setupComplete;
  const primaryAction = stats.totalTrades > 0 ? primaryActions[0] : null;
  const activeCurrency = activeAccount?.currency || "USD";

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">
            {t("dashboard.overview.title")}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("dashboard.overview.subtitle")}
          </p>
        </div>
      </div>

      <SetupGuidanceCard
        language={language}
        accounts={accounts}
        trades={trades}
        stats={stats}
        journalCompleted={journalCompleted}
        journalLoaded={journalLoaded}
        dismissed={!showSetupCard}
        onDismiss={dismissSetupCard}
      />

      {!showSetupCard && primaryAction ? <PrimaryWorkflowAction action={primaryAction} /> : null}

      <TodayTradingStatus
        summary={guide.summary}
        onStartCheck={() => setGuideOpen(true)}
        labels={labels}
        isRtl={isRtl}
      />

      <SectionCard
        title={labels.performanceSnapshot}
        tourId="performance"
        action={
          <ActiveAccountSelector
            accounts={accounts}
            activeAccountId={activeAccountId}
            onChange={changeActiveAccount}
            labels={labels}
            isRtl={isRtl}
          />
        }
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("dashboard.overview.totalPnl")}
            value={formatMoney(stats.totalPnl, activeCurrency)}
            icon={<CircleDollarSign className="h-4 w-4" />}
            tone={stats.totalPnl >= 0 ? "green" : "red"}
          />
          <StatCard
            label={t("dashboard.overview.winRate")}
            value={`${stats.winRate}%`}
            icon={<Percent className="h-4 w-4" />}
            tone="green"
          />
          <StatCard
            label={labels.openTrades}
            value={String(stats.openTrades)}
            icon={<Activity className="h-4 w-4" />}
            tone="blue"
          />
          <StatCard
            label={labels.reviewNeeded}
            value={String(stats.notReviewedTrades)}
            icon={<ClipboardCheck className="h-4 w-4" />}
            tone={stats.notReviewedTrades > 0 ? "red" : "green"}
          />
        </div>
      </SectionCard>

      <SecondaryActionCenter
        labels={labels}
        accounts={accounts}
        stats={stats}
        trades={trades}
        journalCompleted={journalCompleted}
        journalLoaded={journalLoaded}
        highImpactEvents={highImpactEvents}
        eventsLoaded={eventsLoaded}
        language={language}
        excludeActionKey={primaryAction?.key}
        activeAccountId={activeAccountId}
      />

      <DashboardPageStatsChart
        pageStats={pageStats}
        stats={stats}
        labels={labels}
        isRtl={isRtl}
        language={language}
      />

      <MarketRiskCard events={highImpactEvents} loaded={eventsLoaded} labels={labels} language={language} />

      <TradeReadinessGuide open={guideOpen} onClose={() => setGuideOpen(false)} guide={guide} />

      <AccountConnectionWizard
        open={accountConnectionWizardOpen}
        canUseAutoSync={canUseAutoSync}
        errorMessage={accountConnectionError}
        onClose={() => {
          setAccountConnectionWizardOpen(false);
          setAccountConnectionError("");
        }}
        onSaveManual={saveManualAccount}
        onAccountsChanged={() => refreshTrades()}
      />
    </div>
  );
}
