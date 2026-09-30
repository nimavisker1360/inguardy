"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CalendarDays,
  ClipboardCheck,
  Crown,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  type LucideIcon,
} from "lucide-react";
import { DashboardAiAssistant } from "@/components/dashboard/DashboardAiAssistant";
import { formatMoney, type DashboardOverviewStats } from "@/components/dashboard/types";
import type { SubscriptionDashboardState } from "@/lib/subscription";
import { cn } from "@/lib/utils";

type DashboardHomeProps = {
  language: "en" | "fa";
  userName?: string | null;
  stats: DashboardOverviewStats;
  activeCurrency: string;
  activeAccountId?: string | null;
  activeAccountName?: string | null;
  journalCompleted: boolean;
  subscription?: SubscriptionDashboardState | null;
  onStartDay?: () => void;
};

type ToolCard = {
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  iconClass: string;
};

export function DashboardHome({
  language,
  userName,
  stats,
  activeCurrency,
  activeAccountId,
  activeAccountName,
  journalCompleted,
  subscription,
}: DashboardHomeProps) {
  const isRtl = language === "fa";
  const displayName = userName?.trim().split(/\s+/)[0] || (isRtl ? "تریدر" : "Trader");
  const hour = new Date().getHours();
  const greeting = isRtl
    ? hour < 12 ? "صبح بخیر" : hour < 18 ? "بعدازظهر بخیر" : "عصر بخیر"
    : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const products: ToolCard[] = [
    {
      title: isRtl ? "ژورنال معاملات" : "Trade Journal",
      detail: isRtl ? "معاملات، الگوها و عملکرد خود را مرور کنید." : "Review trades, patterns, and performance insights.",
      href: "/journal",
      icon: BookOpenCheck,
      iconClass: "bg-blue-600 text-white",
    },
    {
      title: isRtl ? "بازپخش بازار" : "Market Replay",
      detail: isRtl ? "استراتژی‌ها را روی داده‌های تاریخی آزمایش کنید." : "Test strategies with historical market data.",
      href: "/dashboard/backtest",
      icon: RotateCcw,
      iconClass: "bg-amber-500 text-white",
    },
    {
      title: isRtl ? "مدیریت پراپ‌فرم" : "Prop Firm Tracker",
      detail: isRtl ? "چالش‌ها و محدودیت‌های حساب خود را مدیریت کنید." : "Track challenges, limits, and account rules.",
      href: "/dashboard/prop-firms",
      icon: ShieldCheck,
      iconClass: "bg-rose-500 text-white",
    },
    {
      title: isRtl ? "اسکن بازار با هوش مصنوعی" : "AI Market Scanner",
      detail: isRtl ? "فرصت‌ها، نواحی مهم و ریسک بازار را بررسی کنید." : "Find opportunities, key zones, and market risk.",
      href: "/dashboard/market-radar",
      icon: Brain,
      iconClass: "bg-violet-500 text-white",
    },
  ];

  const focusItems = [
    {
      title: isRtl ? "عملکرد هفتگی خود را مرور کنید" : "Review your weekly performance",
      detail: isRtl
        ? `نرخ برد ${stats.winRate}٪ از ${stats.totalTrades} معامله ثبت‌شده.`
        : `${stats.winRate}% win rate across ${stats.totalTrades} logged trades.`,
      href: "/dashboard/reports",
      icon: BarChart3,
    },
    {
      title: isRtl ? "برای روز معاملاتی برنامه‌ریزی کنید" : "Plan your trading day",
      detail: journalCompleted
        ? isRtl ? "ژورنال امروز ثبت شده؛ برنامه را مرور کنید." : "Today's journal is ready—review your plan."
        : isRtl ? "تمرکز، بایاس بازار و برنامه امروز را مشخص کنید." : "Set today's focus, market bias, and plan.",
      href: "/dashboard/daily-journal",
      icon: Target,
    },
    {
      title: isRtl ? "معاملات بررسی‌نشده را تکمیل کنید" : "Complete pending trade reviews",
      detail: isRtl
        ? `${stats.notReviewedTrades} معامله منتظر بررسی شماست.`
        : `${stats.notReviewedTrades} trades are waiting for your review.`,
      href: "/journal?reviewStatus=not-reviewed",
      icon: ClipboardCheck,
    },
    {
      title: isRtl ? "پلن معاملاتی خود را به‌روز کنید" : "Update your trading playbook",
      detail: isRtl ? "قوانین ورود و خروج را با نتایج اخیر هماهنگ کنید." : "Align entry and exit rules with recent results.",
      href: "/journal/playbooks",
      icon: SlidersHorizontal,
    },
  ];

  const resources = [
    {
      title: isRtl ? "حساب‌های معاملاتی و اتصال MT5" : "Trading accounts and MT5",
      detail: isRtl ? "اتصال و همگام‌سازی حساب‌ها را مدیریت کنید." : "Manage account connections and synchronization.",
      href: "/dashboard/accounts",
    },
    {
      title: isRtl ? "تقویم اقتصادی" : "Economic calendar",
      detail: isRtl ? "رویدادهای مهم پیش‌روی بازار را ببینید." : "Stay ahead of high-impact market events.",
      href: "/economic-calendar",
    },
    {
      title: isRtl ? "محاسبه‌گر حجم معامله" : "Position size calculator",
      detail: isRtl ? "حجم مناسب هر معامله را بر اساس ریسک محاسبه کنید." : "Calculate position size from your risk limits.",
      href: "/dashboard/position-sizing",
    },
  ];

  return (
    <div className={cn("mx-auto w-full max-w-[920px]", isRtl && "text-right")}>
      <section className="flex flex-col items-center pt-1 text-center sm:pt-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600 dark:text-sky-400">Ingyardy</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-[28px]">
          {greeting}، {displayName}
        </h1>

        <DashboardAiAssistant
          language={language}
          activeAccountId={activeAccountId}
          activeAccountName={activeAccountName}
        />
      </section>

      {subscription ? (
        <SubscriptionOverviewCard subscription={subscription} language={language} />
      ) : null}

      <section className={cn(subscription ? "mt-8" : "mt-14 sm:mt-16")} data-dashboard-tour="products">
        <h2 className="mb-3 text-base font-bold text-slate-950 dark:text-white">
          {isRtl ? "ابزارهای شما" : "Explore tools"}
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {products.map((product) => {
            const Icon = product.icon;

            return (
              <Link key={product.href} href={product.href} className="dashboard-home-tool group">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl shadow-sm", product.iconClass)}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-sm text-slate-950 dark:text-white">{product.title}</strong>
                  <span className="mt-1 block truncate text-xs text-slate-500 dark:text-slate-400">{product.detail}</span>
                </span>
                <ArrowUpRight className={cn("h-4 w-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100", isRtl && "-rotate-90")} />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="mt-6 grid items-start gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-bold text-slate-950 dark:text-white">
            {isRtl ? "تمرکز پیشنهادی" : "Recommended focus"}
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {focusItems.map((item, index) => {
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} className={cn("dashboard-home-row group", index > 0 && "border-t border-slate-200 dark:border-slate-700")}>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm text-slate-950 dark:text-white">{item.title}</strong>
                    <span className="mt-1 block line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{item.detail}</span>
                  </span>
                  <ArrowRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5", isRtl && "rotate-180")} />
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-base font-bold text-slate-950 dark:text-white">
            {isRtl ? "دسترسی سریع" : "Resources"}
          </h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            {resources.map((resource, index) => (
              <Link key={resource.href} href={resource.href} className={cn("group block min-h-[76px] px-4 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/70", index > 0 && "border-t border-slate-200 dark:border-slate-700")}>
                <span className="flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-300">
                  {resource.title}
                  <ArrowUpRight className={cn("h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100", isRtl && "-rotate-90")} />
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{resource.detail}</span>
              </Link>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Metric label={isRtl ? "معاملات" : "Trades"} value={String(stats.totalTrades)} />
            <Metric label={isRtl ? "نرخ برد" : "Win rate"} value={`${stats.winRate}%`} />
            <Metric
              label="PnL"
              value={formatMoney(stats.totalPnl, activeCurrency)}
              valueClass={stats.totalPnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function SubscriptionOverviewCard({
  subscription,
  language,
}: {
  subscription: SubscriptionDashboardState;
  language: "en" | "fa";
}) {
  const isRtl = language === "fa";
  const formatter = new Intl.NumberFormat(isRtl ? "fa-IR" : "en-US");
  const days = formatter.format(subscription.daysRemaining);
  const endDate = new Intl.DateTimeFormat(isRtl ? "fa-IR-u-ca-gregory" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(subscription.expiresAt));
  const isTrial = subscription.isTrial;
  const isFree = subscription.isFree && !isTrial;
  const heading = isTrial
    ? isRtl ? "دوره آزمایشی شما" : "Your free trial"
    : isFree
      ? isRtl ? "پلن رایگان" : "Free plan"
      : isRtl ? "اشتراک پریمیوم" : "Premium subscription";
  const detail = isFree
    ? isRtl
      ? "با ارتقا به پریمیوم به همه ابزارهای حرفه‌ای دسترسی داشته باشید."
      : "Upgrade to Premium to unlock every professional tool."
    : isTrial
      ? isRtl
        ? `${days} روز از دوره آزمایشی شما باقی مانده است.`
        : `${days} ${subscription.daysRemaining === 1 ? "day" : "days"} left in your trial.`
      : isRtl
        ? `${days} روز تا تمدید اشتراک شما باقی مانده است.`
        : `${days} ${subscription.daysRemaining === 1 ? "day" : "days"} until your subscription renews.`;
  const dateLabel = isTrial
    ? isRtl ? "پایان دوره" : "Trial ends"
    : isRtl ? "تاریخ تمدید" : "Renewal date";
  const buttonLabel = isTrial || isFree
    ? isRtl ? "ارتقا به پریمیوم" : "Upgrade to Premium"
    : isRtl ? "تمدید پریمیوم" : "Renew Premium";

  return (
    <section
      className={cn(
        "relative mt-7 overflow-hidden rounded-2xl border px-4 py-4 shadow-[0_14px_40px_rgba(14,116,144,0.08)] sm:px-5",
        isTrial
          ? "border-sky-200 bg-gradient-to-r from-sky-50 via-white to-cyan-50 dark:border-sky-400/25 dark:from-sky-500/10 dark:via-slate-900 dark:to-cyan-500/10"
          : "border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 dark:border-violet-400/25 dark:from-violet-500/10 dark:via-slate-900 dark:to-indigo-500/10"
      )}
      aria-label={heading}
    >
      <div className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-sky-300/20 blur-2xl dark:bg-sky-400/10" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <span
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-lg",
              isTrial
                ? "bg-gradient-to-br from-sky-500 to-cyan-600 shadow-sky-500/20"
                : "bg-gradient-to-br from-violet-500 to-indigo-600 shadow-violet-500/20"
            )}
          >
            {isTrial ? <CalendarDays className="h-5 w-5" /> : <Crown className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-950 dark:text-white sm:text-base">{heading}</h2>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                isTrial
                  ? "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300"
                  : "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300"
              )}>
                {subscription.planName}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {!isFree ? (
            <div className="rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-start shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
              <span className="block text-[10px] font-medium text-slate-400">{dateLabel}</span>
              <strong className="mt-0.5 block whitespace-nowrap text-xs text-slate-700 dark:text-slate-200">{endDate}</strong>
            </div>
          ) : null}
          <Link
            href="/premium"
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isTrial
                ? "bg-gradient-to-r from-sky-600 to-cyan-600 shadow-sky-500/20 focus-visible:ring-sky-500"
                : "bg-gradient-to-r from-violet-600 to-indigo-600 shadow-violet-500/20 focus-visible:ring-violet-500"
            )}
          >
            <Crown className="h-4 w-4" />
            {buttonLabel}
          </Link>
        </div>
      </div>

      {!isFree ? (
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
          <div
            className={cn(
              "h-full rounded-full",
              isTrial ? "bg-gradient-to-r from-sky-500 to-cyan-500" : "bg-gradient-to-r from-violet-500 to-indigo-500"
            )}
            style={{ width: `${subscription.percentRemaining}%` }}
          />
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <span className="block text-[10px] text-slate-400">{label}</span>
      <strong className={cn("mt-1 block truncate text-sm text-slate-950 dark:text-white", valueClass)}>{value}</strong>
    </div>
  );
}
