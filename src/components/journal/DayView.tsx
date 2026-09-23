"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  NotebookPen,
  Plus,
  Rocket,
  Settings2,
  SlidersHorizontal,
  WalletCards,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type DayViewDay = {
  date: string;
  totalTrades: number;
  winners: number;
  losers: number;
  netPnl: number | null;
  grossPnl: number | null;
  commissions: number | null;
  volume: number;
  winRate: number | null;
  profitFactor: number | null;
  chartPoints: number[];
  firstTradeId: string | null;
  trades: Array<{
    id: string;
    symbol: string;
    direction: "BUY" | "SELL";
    status: string;
    openedAt: string;
    profitLoss: number | null;
    lotSize: number;
    accountName: string;
    currency: string;
  }>;
};

type DayViewProps = {
  month: number;
  year: number;
  selectedDate: string;
  weekStart: string;
  weekEnd: string;
  currency: string;
  accountId: string;
  accounts: Array<{
    id: string;
    name: string;
    currency: string;
    broker: string | null;
    platform: string | null;
  }>;
  days: DayViewDay[];
};

const copy = {
  en: {
    eyebrow: "Tracking", title: "Day View", day: "Day", week: "Week",
    filters: "Filters", startDay: "Start my day", netPnl: "Net P&L",
    totalTrades: "Total Trades", grossPnl: "Gross P&L",
    winnersLosers: "Winners / Losers", commissions: "Commissions",
    winRate: "Win Rate", volume: "Volume", profitFactor: "Profit Factor",
    aiReview: "Review with Ingyardy AI", review: "Review", viewTrades: "View trades", tradesTitle: "Trades for this day", addNote: "Add note",
    pnlUnavailable: "P&L data unavailable",
    emptyTitle: "No trades in this week",
    emptyBody: "Choose another week from the calendar or change the account filter.",
    allAccounts: "All accounts", apply: "Apply", account: "Trading account",
    accountsTitle: "Trading accounts", accountsHint: "Choose an account to view its trades",
    prevMonth: "Previous month", nextMonth: "Next month",
    profit: "Profit", loss: "Loss",
    weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  },
  fa: {
    eyebrow: "رهگیری", title: "نمای روزانه", day: "روز", week: "هفته",
    filters: "فیلترها", startDay: "شروع روز من", netPnl: "سود و زیان خالص",
    totalTrades: "تعداد معاملات", grossPnl: "سود و زیان ناخالص",
    winnersLosers: "برد / باخت", commissions: "کمیسیون",
    winRate: "نرخ برد", volume: "حجم", profitFactor: "ضریب سود",
    aiReview: "بررسی با هوش مصنوعی Ingyardy", review: "بررسی", viewTrades: "مشاهده معاملات", tradesTitle: "معاملات این روز", addNote: "افزودن یادداشت",
    pnlUnavailable: "اطلاعات سود و زیان موجود نیست",
    emptyTitle: "در این هفته معامله‌ای ثبت نشده",
    emptyBody: "از تقویم هفته‌ی دیگری را انتخاب کنید یا فیلتر حساب را تغییر دهید.",
    allAccounts: "همه حساب‌ها", apply: "اعمال", account: "حساب معاملاتی",
    accountsTitle: "حساب‌های معاملاتی", accountsHint: "برای مشاهده معاملات، حساب موردنظر را انتخاب کنید",
    prevMonth: "ماه قبل", nextMonth: "ماه بعد", profit: "سود", loss: "زیان",
    weekdays: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
  },
};

function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function money(value: number, currency: string, language: "en" | "fa") {
  try {
    return new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString()} ${currency}`;
  }
}

function formatNumber(value: number, digits: number, language: "en" | "fa") {
  return value.toLocaleString(language === "fa" ? "fa-IR" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function hrefFor(input: { month: number; year: number; selectedDate: string; accountId?: string }) {
  const params = new URLSearchParams({
    month: String(input.month), year: String(input.year), selectedDate: input.selectedDate,
  });
  if (input.accountId) params.set("accountId", input.accountId);
  return `/journal/calendar?${params.toString()}`;
}

function adjacentMonth(month: number, year: number, direction: -1 | 1) {
  const result = new Date(Date.UTC(year, month - 1 + direction, 1));
  return { month: result.getUTCMonth() + 1, year: result.getUTCFullYear() };
}

function PnlChart({ points, positive, currency, language, available, unavailableLabel }: {
  points: number[];
  positive: boolean;
  currency: string;
  language: "en" | "fa";
  available: boolean;
  unavailableLabel: string;
}) {
  const width = 430;
  const height = 150;
  const padX = 8;
  const padY = 15;
  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const isFlat = max === min;
  const span = Math.max(max - min, 1);
  const x = (index: number) => padX + (index / Math.max(points.length - 1, 1)) * (width - padX * 2);
  const y = (value: number) => padY + ((max - value) / span) * (height - padY * 2);
  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point)}`).join(" ");
  const baseY = y(0);
  const areaPath = `${linePath} L${x(points.length - 1)},${baseY} L${x(0)},${baseY} Z`;
  const gradientId = `pnl-${positive ? "up" : "down"}-${Math.abs(Math.round(points.at(-1) || 0))}-${points.length}`;
  const ticks = isFlat ? [0, 0, 0] : [max, max - span / 2, min];

  return (
    <div className="relative h-[170px] w-full overflow-hidden" dir="ltr">
      <div className="absolute inset-y-2 left-0 flex w-16 flex-col justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
        {ticks.map((tick, index) => <span key={index}>{index === 1 && isFlat ? "" : money(tick, currency, language)}</span>)}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-y-2 left-[66px] h-[150px] w-[calc(100%-66px)]" aria-label="Cumulative daily P&L chart">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.55" />
            <stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => (
          <line key={ratio} x1="0" x2={width} y1={padY + ratio * (height - padY * 2)} y2={padY + ratio * (height - padY * 2)} stroke="currentColor" className="text-slate-200 dark:text-slate-700" strokeDasharray="3 4" />
        ))}
        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={linePath} fill="none" stroke="#6d5bd0" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      </svg>
      {!available ? (
        <div className="absolute inset-y-2 left-[66px] grid w-[calc(100%-66px)] place-items-center bg-white/55 text-xs font-semibold text-slate-500 backdrop-blur-[1px] dark:bg-[#111827]/55 dark:text-slate-400">
          {unavailableLabel}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums text-slate-950 dark:text-white">{children}</dd>
    </div>
  );
}

function DayCard({ day, currency, language, labels, open, onToggle }: {
  day: DayViewDay;
  currency: string;
  language: "en" | "fa";
  labels: (typeof copy)["en"];
  open: boolean;
  onToggle: () => void;
}) {
  const positive = day.netPnl !== null && day.netPnl >= 0;
  const journalHref = `/dashboard/daily-journal?date=${day.date}`;
  const [showTrades, setShowTrades] = useState(false);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_3px_18px_rgba(15,23,42,0.045)] dark:border-slate-800 dark:bg-[#111827] dark:shadow-none">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <button type="button" onClick={onToggle} className="group flex min-w-0 items-center gap-3 text-start" aria-expanded={open}>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-900 transition-transform dark:text-white", !open && "-rotate-90")} />
          <span className="truncate text-base font-bold text-slate-950 dark:text-white sm:text-lg">
            {utcDate(day.date).toLocaleDateString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
          </span>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700" />
          <span className={cn(
            "truncate text-sm font-bold text-slate-500 sm:text-base dark:text-slate-400",
            day.netPnl !== null && (positive ? "text-emerald-500 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400")
          )}>
            {labels.netPnl} {day.netPnl === null ? "—" : money(day.netPnl, currency, language)}
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2 ps-8 lg:ps-0">
          {day.firstTradeId ? (
            <Link href={`/journal/${day.firstTradeId}`} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 transition hover:border-violet-300 hover:bg-violet-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-violet-500/10">
              <Bot className="h-4 w-4 text-violet-600 dark:text-violet-300" />
              <span className="hidden sm:inline">{labels.aiReview}</span>
            </Link>
          ) : null}
          {day.trades.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowTrades((current) => !current)}
              aria-expanded={showTrades}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-blue-200 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              {labels.viewTrades} ({formatNumber(day.trades.length, 0, language)})
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showTrades && "rotate-180")} />
            </button>
          ) : null}
          <Link href={journalHref} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800">
            <Plus className="h-4 w-4 text-violet-600 dark:text-violet-300" />{labels.addNote}
          </Link>
        </div>
      </div>

      {showTrades ? (
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/30 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-950 dark:text-white">{labels.tradesTitle}</h3>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
              {formatNumber(day.trades.length, 0, language)} {labels.totalTrades}
            </span>
          </div>
          <div className="space-y-2">
            {day.trades.map((trade) => {
              const tradePositive = trade.profitLoss !== null && trade.profitLoss >= 0;
              return (
                <div key={trade.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-slate-700 dark:bg-[#111827] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn(
                      "grid h-9 min-w-12 shrink-0 place-items-center rounded-lg px-2 text-[10px] font-extrabold",
                      trade.direction === "BUY"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                    )}>
                      {trade.direction}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-950 dark:text-white">{trade.symbol}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{utcDate(day.date).toLocaleDateString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", { month: "short", day: "numeric", timeZone: "UTC" })}</span>
                        <span>•</span>
                        <span>{new Date(trade.openedAt).toLocaleTimeString(language === "fa" ? "fa-IR" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}</span>
                        <span>•</span>
                        <span className="truncate">{trade.accountName}</span>
                        <span>•</span>
                        <span>{formatNumber(trade.lotSize, 2, language)} lot</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                    <span className={cn(
                      "text-sm font-bold tabular-nums text-slate-500 dark:text-slate-400",
                      trade.profitLoss !== null && (tradePositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")
                    )}>
                      {trade.profitLoss === null ? "—" : money(trade.profitLoss, trade.currency, language)}
                    </span>
                    <Link href={`/journal/${trade.id}`} className="inline-flex h-8 items-center rounded-lg border border-blue-200 px-3 text-xs font-bold text-blue-700 transition hover:border-blue-300 hover:bg-blue-50 dark:border-blue-500/30 dark:text-blue-300 dark:hover:bg-blue-500/10">
                      {labels.review}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="grid gap-5 px-4 py-5 sm:px-5 xl:grid-cols-[minmax(320px,1.15fr)_minmax(440px,1.85fr)] xl:items-center">
          <PnlChart
            points={day.chartPoints}
            positive={positive}
            currency={currency}
            language={language}
            available={day.netPnl !== null}
            unavailableLabel={labels.pnlUnavailable}
          />
          <dl className="grid grid-cols-2 gap-x-7 gap-y-6 sm:grid-cols-4">
            <Metric label={labels.totalTrades}>{formatNumber(day.totalTrades, 0, language)}</Metric>
            <Metric label={labels.grossPnl}>{day.grossPnl === null ? "—" : money(day.grossPnl, currency, language)}</Metric>
            <Metric label={labels.winnersLosers}>{formatNumber(day.winners, 0, language)} / {formatNumber(day.losers, 0, language)}</Metric>
            <Metric label={labels.commissions}>{day.commissions === null ? "—" : money(day.commissions, currency, language)}</Metric>
            <Metric label={labels.winRate}>{day.winRate === null ? "—" : `${formatNumber(day.winRate, 2, language)}%`}</Metric>
            <Metric label={labels.volume}>{formatNumber(day.volume, 2, language)}</Metric>
            <Metric label={labels.profitFactor}>{day.profitFactor === null ? "—" : formatNumber(day.profitFactor, 2, language)}</Metric>
          </dl>
        </div>
      ) : null}
    </article>
  );
}

export function DayView({ month, year, selectedDate, weekStart, weekEnd, currency, accountId, accounts, days }: DayViewProps) {
  const { language: dashboardLanguage } = useLanguage();
  const language: "en" | "fa" = dashboardLanguage === "fa" ? "fa" : "en";
  const labels = copy[language];
  const previous = adjacentMonth(month, year, -1);
  const next = adjacentMonth(month, year, 1);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leading = start.getUTCDay();
  const cells = Array.from({ length: Math.ceil((leading + daysInMonth) / 7) * 7 }, (_, index) => {
    const date = addDays(start, index - leading);
    return { date, key: dateKey(date), currentMonth: date.getUTCMonth() === month - 1 };
  });
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const weekDays = days
    .filter((day) => day.date >= weekStart && day.date <= weekEnd)
    .sort((a, b) => b.date.localeCompare(a.date));
  const [openDays, setOpenDays] = useState(() => new Set(weekDays.map((day) => day.date)));
  const locale = language === "fa" ? "fa-IR-u-ca-gregory" : "en-US";
  const monthTitle = start.toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" });
  const rangeLabel = `${utcDate(weekStart).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })} – ${utcDate(weekEnd).toLocaleDateString(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}`;

  return (
    <div className="min-w-0 space-y-5" dir={language === "fa" ? "rtl" : "ltr"}>
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold text-violet-600 dark:text-violet-300">{labels.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{labels.title}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-[#111827] dark:text-white">
            {currency}<ChevronDown className="h-3.5 w-3.5" />
          </button>
          <details className="group relative">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm marker:content-none dark:border-slate-700 dark:bg-[#111827] dark:text-slate-100">
              <Filter className="h-4 w-4" />{labels.filters}<ChevronDown className="h-3.5 w-3.5" />
            </summary>
            <form className="absolute end-0 top-12 z-30 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="year" value={year} />
              <input type="hidden" name="selectedDate" value={selectedDate} />
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">{labels.account}</label>
              <select name="accountId" defaultValue={accountId} className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                <option value="">{labels.allAccounts}</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} — {account.platform || account.broker || labels.account}</option>)}
              </select>
              <button type="submit" className="mt-3 h-10 w-full rounded-lg bg-violet-600 text-sm font-bold text-white transition hover:bg-violet-500">{labels.apply}</button>
            </form>
          </details>
          <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm dark:border-slate-700 dark:bg-[#111827] dark:text-white">
            <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            <span className="hidden sm:inline">{rangeLabel}</span><ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>
      </header>

      <section className="relative z-20">
        <form className="flex w-full max-w-[390px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-[0_3px_18px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-[#111827] dark:shadow-none">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="selectedDate" value={selectedDate} />
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            <WalletCards className="h-[17px] w-[17px]" />
          </span>
          <label className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{labels.account}</span>
            <span className="relative mt-0.5 block">
              <select
                name="accountId"
                value={accountId}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="h-7 w-full cursor-pointer appearance-none bg-transparent pe-7 text-sm font-bold text-slate-950 outline-none dark:text-white"
                aria-label={labels.account}
              >
                <option value="">{labels.allAccounts}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} — {account.platform || account.broker || labels.account}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </span>
          </label>
        </form>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-[#111827]">
          <span className="rounded-lg bg-violet-100 px-5 py-2 text-sm font-bold text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">{labels.day}</span>
          <span className="px-5 py-2 text-sm font-semibold text-slate-500 dark:text-slate-400">{labels.week}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/daily-journal?date=${selectedDate}${accountId ? `&accountId=${encodeURIComponent(accountId)}` : ""}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white shadow-[0_8px_22px_rgba(109,91,208,0.24)] transition hover:bg-violet-500">
            <Rocket className="h-4 w-4" />{labels.startDay}
          </Link>
          <Link href="/dashboard/settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-violet-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-[#111827] dark:text-violet-300 dark:hover:bg-slate-800">
            <Settings2 className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-4">
          {weekDays.map((day) => (
            <DayCard
              key={day.date}
              day={day}
              currency={currency}
              language={language}
              labels={labels}
              open={openDays.has(day.date)}
              onToggle={() => setOpenDays((current) => {
                const nextSet = new Set(current);
                if (nextSet.has(day.date)) nextSet.delete(day.date);
                else nextSet.add(day.date);
                return nextSet;
              })}
            />
          ))}

          {weekDays.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:bg-[#111827]">
              <NotebookPen className="mx-auto h-9 w-9 text-violet-500" />
              <h2 className="mt-4 font-bold text-slate-950 dark:text-white">{labels.emptyTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{labels.emptyBody}</p>
            </div>
          ) : null}
        </section>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_3px_18px_rgba(15,23,42,0.045)] dark:border-slate-800 dark:bg-[#111827] dark:shadow-none xl:sticky xl:top-20">
          <div className="flex items-center justify-between gap-3">
            <Link aria-label={labels.prevMonth} href={hrefFor({ month: previous.month, year: previous.year, selectedDate: `${previous.year}-${String(previous.month).padStart(2, "0")}-01`, accountId })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              {language === "fa" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Link>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">{monthTitle}</h2>
            <Link aria-label={labels.nextMonth} href={hrefFor({ month: next.month, year: next.year, selectedDate: `${next.year}-${String(next.month).padStart(2, "0")}-01`, accountId })} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              {language === "fa" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center">
            {labels.weekdays.map((weekday, index) => <div key={`${weekday}-${index}`} className="pb-1 text-[10px] font-bold uppercase text-slate-400">{weekday}</div>)}
            {cells.map((cell) => {
              const day = dayMap.get(cell.key);
              const inWeek = cell.key >= weekStart && cell.key <= weekEnd;
              const selected = cell.key === selectedDate;
              const dayHref = hrefFor({ month: cell.date.getUTCMonth() + 1, year: cell.date.getUTCFullYear(), selectedDate: cell.key, accountId });
              return (
                <Link
                  key={cell.key}
                  href={dayHref}
                  aria-current={selected ? "date" : undefined}
                  className={cn(
                    "grid h-8 place-items-center rounded-lg border text-xs font-semibold transition",
                    !cell.currentMonth && "border-transparent text-slate-300 dark:text-slate-700",
                    cell.currentMonth && !day && "border-slate-100 bg-slate-50 text-slate-600 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-400",
                    day?.netPnl !== null && day?.netPnl !== undefined && day.netPnl >= 0 && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300",
                    day?.netPnl !== null && day?.netPnl !== undefined && day.netPnl < 0 && "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300",
                    inWeek && "ring-1 ring-inset ring-violet-300 dark:ring-violet-500/50",
                    selected && "border-violet-600 bg-violet-600 text-white ring-0 hover:border-violet-600 dark:border-violet-500 dark:bg-violet-500 dark:text-white"
                  )}
                >
                  {cell.date.getUTCDate()}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald-400" />{labels.profit}</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-rose-400" />{labels.loss}</span>
            <SlidersHorizontal className="h-3.5 w-3.5 text-violet-500" />
          </div>
        </aside>
      </div>
    </div>
  );
}
