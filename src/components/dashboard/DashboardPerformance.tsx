"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Info,
  Rocket,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/lib/language-context";
import { RiskGuardianWidget } from "@/components/dashboard/RiskGuardianWidget";
import { cn } from "@/lib/utils";
import {
  formatMoney,
  toNumber,
  type ApiResult,
  type DashboardOverviewData,
  type DashboardOverviewStats,
  type DashboardPerformanceTrade,
  type TradingAccountDto,
} from "@/components/dashboard/types";

type RangeKey = "all" | "month" | "90days" | "year";

type DailyPerformancePoint = {
  date: string;
  label: string;
  pnl: number;
  cumulative: number;
  drawdown: number;
  count: number;
};

type PerformanceTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: Array<{
    value?: number | string;
    dataKey?: string;
    payload?: DailyPerformancePoint;
  }>;
  currency: string;
  language: "fa" | "en";
  valueLabel: string;
};

type DashboardPerformanceProps = {
  userId?: string;
  initialAccounts: TradingAccountDto[];
  initialActiveAccountId?: string | null;
  initialStats: DashboardOverviewStats;
  initialPerformanceTrades: DashboardPerformanceTrade[];
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTHS_FA = [
  "ژانویه", "فوریه", "مارس", "آوریل", "مه", "ژوئن",
  "ژوئیه", "اوت", "سپتامبر", "اکتبر", "نوامبر", "دسامبر",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_FA = ["یک", "دو", "سه", "چهار", "پنج", "جمعه", "شنبه"];

function tradeDate(trade: DashboardPerformanceTrade) {
  const value = trade.closedAt || trade.openedAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function compactMoney(value: number, currency: string) {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const symbol = currency === "USD" ? "$" : `${currency} `;
  if (absolute >= 1_000_000) return `${sign}${symbol}${(absolute / 1_000_000).toFixed(2)}M`;
  if (absolute >= 1_000) return `${sign}${symbol}${(absolute / 1_000).toFixed(2)}K`;
  return `${sign}${symbol}${absolute.toFixed(0)}`;
}

function accountName(account: TradingAccountDto) {
  return account.mt5AccountNumber ? `${account.name} · ${account.mt5AccountNumber}` : account.name;
}

function ProfitRing({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <svg viewBox="0 0 52 52" className="h-[58px] w-[58px] -rotate-90" aria-hidden="true">
      <circle cx="26" cy="26" r="20" fill="none" stroke="#f06464" strokeWidth="6" />
      <circle cx="26" cy="26" r="20" fill="none" stroke="#45bd91" strokeWidth="6" strokeDasharray={`${safe * 1.257} 125.7`} />
    </svg>
  );
}

function SemiGauge({
  value,
  good,
  neutral,
  bad,
}: {
  value: number;
  good: number;
  neutral: number;
  bad: number;
}) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div className="w-[112px] shrink-0">
      <svg viewBox="0 0 112 62" className="h-[62px] w-full" aria-hidden="true">
        <path d="M 14 54 A 42 42 0 0 1 98 54" pathLength="100" fill="none" stroke="#f06464" strokeWidth="8" strokeLinecap="butt" />
        <path d="M 14 54 A 42 42 0 0 1 98 54" pathLength="100" fill="none" stroke="#45bd91" strokeWidth="8" strokeLinecap="butt" strokeDasharray={`${safe} ${100 - safe}`} />
      </svg>
      <div className="-mt-2 flex items-center justify-between gap-1 text-[9px] font-semibold">
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[#45bd91] dark:bg-emerald-500/10">{good}</span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[#6f80e8] dark:bg-indigo-500/10">{neutral}</span>
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[#f06464] dark:bg-rose-500/10">{bad}</span>
      </div>
    </div>
  );
}

function MetricLabel({ children, badge }: { children: React.ReactNode; badge?: string | null }) {
  return (
    <div className="flex items-center gap-1.5 text-[13px] font-normal text-slate-600 dark:text-slate-300">
      <span>{children}</span>
      <Info className="h-3.5 w-3.5 text-slate-500" />
      {badge ? <span className="ms-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">{badge}</span> : null}
    </div>
  );
}

function Panel({ title, action, className, children }: { title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.035)] dark:border-slate-800 dark:bg-[#111827]", className)}>
      {title || action ? <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
        <h2 className="text-sm font-bold text-slate-950 dark:text-white sm:text-base">{title}</h2>{action}
      </header> : null}
      {children}
    </section>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="grid h-full min-h-52 place-items-center text-center text-sm text-slate-400">{text}</div>;
}

function formatChartDate(value: string, language: "fa" | "en", long = false) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", long
    ? { year: "numeric", month: "short", day: "numeric" }
    : { year: "2-digit", month: "2-digit", day: "2-digit" });
}

function PerformanceTooltip({ active, label, payload, currency, language, valueLabel }: PerformanceTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  const numericValue = Number(payload[0]?.value ?? 0);

  return (
    <div className="min-w-44 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-3 shadow-[0_14px_35px_rgba(15,23,42,.14)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{formatChartDate(label || point?.date || "", language, true)}</p>
      <div className="mt-2 flex items-center justify-between gap-5">
        <span className="text-xs text-slate-500 dark:text-slate-400">{valueLabel}</span>
        <strong className={cn("text-sm", numericValue >= 0 ? "text-emerald-500" : "text-rose-500")}>{formatMoney(numericValue, currency)}</strong>
      </div>
      {point ? <div className="mt-1.5 flex items-center justify-between gap-5 text-[11px] text-slate-400"><span>{language === "fa" ? "معامله" : "Trades"}</span><span>{point.count}</span></div> : null}
    </div>
  );
}

export function DashboardPerformance({
  userId,
  initialAccounts,
  initialActiveAccountId,
  initialStats,
  initialPerformanceTrades,
}: DashboardPerformanceProps) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const [accounts, setAccounts] = useState(initialAccounts);
  const [activeAccountId, setActiveAccountId] = useState(initialActiveAccountId || initialAccounts[0]?.id || "");
  const [stats, setStats] = useState(initialStats);
  const [performanceTrades, setPerformanceTrades] = useState(initialPerformanceTrades);
  const [range, setRange] = useState<RangeKey>("all");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [loading, setLoading] = useState(false);
  const [tradeTab, setTradeTab] = useState<"recent" | "open">("recent");

  const copy = isFa ? {
    tracking: "پیگیری عملکرد",
    dashboard: "داشبورد",
    allTime: "همه زمان‌ها",
    thisMonth: "این ماه",
    last90: "۹۰ روز اخیر",
    thisYear: "امسال",
    filters: "فیلترها",
    startDay: "شروع روز من",
    tradeWin: "درصد برد معاملات",
    dayWin: "درصد روزهای مثبت",
    profitFactor: "ضریب سود",
    balance: "موجودی حساب و سود",
    netPnl: "سود و زیان خالص",
    monthlyStats: "آمار ماهانه",
    days: "روز",
    recent: "معاملات اخیر",
    open: "پوزیشن‌های باز",
    viewMore: "مشاهده همه",
    equity: "روند موجودی حساب",
    drawdown: "افت سرمایه",
    cumulative: "سود و زیان تجمعی روزانه",
    daily: "سود و زیان خالص روزانه",
    score: "امتیاز عملکرد شما",
    time: "عملکرد بر اساس ساعت",
    duration: "عملکرد بر اساس مدت معامله",
    progress: "تداوم ثبت معاملات",
    noData: "پس از ثبت معاملات، داده‌های این بخش نمایش داده می‌شود.",
    trades: "معامله",
    week: "هفته",
  } : {
    tracking: "Performance tracking",
    dashboard: "Dashboard",
    allTime: "All time",
    thisMonth: "This month",
    last90: "Last 90 days",
    thisYear: "This year",
    filters: "Filters",
    startDay: "Start my day",
    tradeWin: "Trade win %",
    dayWin: "Day win %",
    profitFactor: "Profit factor",
    balance: "Account balance & P&L",
    netPnl: "Net P&L",
    monthlyStats: "Monthly stats",
    days: "days",
    recent: "Recent trades",
    open: "Open positions",
    viewMore: "View more",
    equity: "Account balance",
    drawdown: "Drawdown",
    cumulative: "Daily net cumulative P&L",
    daily: "Net daily P&L",
    score: "Your performance score",
    time: "Time of day performance",
    duration: "Trade duration performance",
    progress: "Progress tracker",
    noData: "Your data will appear here as soon as trades are recorded.",
    trades: "trades",
    week: "Week",
  };

  const activeAccount = accounts.find((account) => account.id === activeAccountId) || accounts[0] || null;
  const currency = activeAccount?.currency || "USD";

  const changeAccount = useCallback(async (accountId: string) => {
    setActiveAccountId(accountId);
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/overview?accountId=${encodeURIComponent(accountId)}`, { cache: "no-store" });
      const payload = (await response.json()) as ApiResult<DashboardOverviewData>;
      if (payload.success && payload.data) {
        setAccounts(payload.data.accounts);
        setStats(payload.data.stats);
        setPerformanceTrades(payload.data.performanceTrades);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const filtered = useMemo(() => {
    const now = new Date();
    const from = range === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : range === "90days"
        ? new Date(now.getTime() - 90 * 86400000)
        : range === "year"
          ? new Date(now.getFullYear(), 0, 1)
          : null;
    return performanceTrades
      .filter((trade) => {
        const date = tradeDate(trade);
        return trade.status === "CLOSED" && date && (!from || date >= from);
      })
      .sort((a, b) => (tradeDate(a)?.getTime() || 0) - (tradeDate(b)?.getTime() || 0));
  }, [performanceTrades, range]);

  const dashboard = useMemo(() => {
    const wins = filtered.filter((trade) => trade.profitLoss > 0);
    const losses = filtered.filter((trade) => trade.profitLoss < 0);
    const net = filtered.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const grossProfit = wins.reduce((sum, trade) => sum + trade.profitLoss, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profitLoss, 0));
    const winRate = filtered.length ? wins.length / filtered.length * 100 : 0;
    const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit > 0 ? grossProfit : 0;
    const days = new Map<string, { pnl: number; trades: DashboardPerformanceTrade[] }>();

    filtered.forEach((trade) => {
      const date = tradeDate(trade);
      if (!date) return;
      const key = dayKey(date);
      const current = days.get(key) || { pnl: 0, trades: [] };
      current.pnl += trade.profitLoss;
      current.trades.push(trade);
      days.set(key, current);
    });

    const positiveDays = [...days.values()].filter((day) => day.pnl > 0).length;
    const dayWinRate = days.size ? positiveDays / days.size * 100 : 0;
    const accountBalance = toNumber(activeAccount?.balance) ?? net;
    const startingBalance = accountBalance - net;
    let running = startingBalance;
    const equity = filtered.map((trade, index) => {
      running += trade.profitLoss;
      const date = tradeDate(trade)!;
      return {
        index,
        label: date.toLocaleDateString(isFa ? "fa-IR" : "en-US", { month: "short", day: "numeric" }),
        balance: running,
        pnl: trade.profitLoss,
      };
    });

    let dailyRunning = 0;
    let dailyPeak = 0;
    let maxDrawdown = 0;
    const daily: DailyPerformancePoint[] = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => {
      dailyRunning += value.pnl;
      dailyPeak = Math.max(dailyPeak, dailyRunning);
      const drawdown = Math.min(0, dailyRunning - dailyPeak);
      maxDrawdown = Math.min(maxDrawdown, drawdown);
      return {
        date,
        label: new Date(`${date}T12:00:00`).toLocaleDateString(isFa ? "fa-IR" : "en-US", { month: "short", day: "numeric" }),
        pnl: value.pnl,
        cumulative: dailyRunning,
        drawdown,
        count: value.trades.length,
      };
    });

    const averageWin = wins.length ? grossProfit / wins.length : 0;
    const averageLoss = losses.length ? grossLoss / losses.length : 0;
    const consistency = daily.length ? Math.max(0, 100 - (Math.max(...daily.map((item) => Math.abs(item.pnl)), 0) / Math.max(Math.abs(net), grossProfit, 1) * 100)) : 0;
    const recovery = maxDrawdown ? Math.min(100, Math.abs(net / maxDrawdown) * 35) : net > 0 ? 100 : 0;
    const scoreParts = [winRate, Math.min(100, profitFactor * 35), averageLoss ? Math.min(100, averageWin / averageLoss * 50) : averageWin > 0 ? 100 : 0, recovery, consistency];
    const score = Math.round(scoreParts.reduce((sum, value) => sum + value, 0) / scoreParts.length);

    return { wins, losses, net, grossProfit, grossLoss, winRate, profitFactor, days, dayWinRate, accountBalance, equity, daily, maxDrawdown, averageWin, averageLoss, consistency, recovery, score };
  }, [activeAccount?.balance, filtered, isFa]);

  const calendar = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    const cells = Array.from({ length: 42 }, (_, index) => {
      const number = index - firstDay + 1;
      if (number < 1 || number > totalDays) return null;
      const date = new Date(year, monthIndex, number);
      const value = dashboard.days.get(dayKey(date));
      return { number, date, pnl: value?.pnl || 0, trades: value?.trades || [] };
    });
    const weeks = Array.from({ length: 6 }, (_, row) => {
      const active = cells.slice(row * 7, row * 7 + 7).filter(Boolean) as NonNullable<(typeof cells)[number]>[];
      return { pnl: active.reduce((sum, day) => sum + day.pnl, 0), days: active.filter((day) => day.trades.length).length };
    });
    const monthTrades = cells.flatMap((cell) => cell?.trades || []);
    return { cells, weeks, pnl: monthTrades.reduce((sum, trade) => sum + trade.profitLoss, 0), activeDays: new Set(monthTrades.map((trade) => dayKey(tradeDate(trade)!))).size };
  }, [dashboard.days, month]);

  const timeData = useMemo(() => filtered.map((trade) => {
    const date = tradeDate(trade)!;
    return { hour: date.getHours() + date.getMinutes() / 60, pnl: trade.profitLoss, fill: trade.profitLoss >= 0 ? "#41b88a" : "#ef6464" };
  }), [filtered]);

  const durationData = useMemo(() => filtered.map((trade) => {
    const opened = trade.openedAt ? new Date(trade.openedAt).getTime() : 0;
    const closed = trade.closedAt ? new Date(trade.closedAt).getTime() : opened;
    return { minutes: Math.max(0, (closed - opened) / 60000), pnl: trade.profitLoss, fill: trade.profitLoss >= 0 ? "#41b88a" : "#ef6464" };
  }), [filtered]);

  const radarData = [
    { metric: isFa ? "برد" : "Win %", value: dashboard.winRate },
    { metric: isFa ? "ضریب سود" : "Profit factor", value: Math.min(100, dashboard.profitFactor * 35) },
    { metric: isFa ? "میانگین" : "Avg W/L", value: dashboard.averageLoss ? Math.min(100, dashboard.averageWin / dashboard.averageLoss * 50) : dashboard.averageWin > 0 ? 100 : 0 },
    { metric: isFa ? "بازیابی" : "Recovery", value: dashboard.recovery },
    { metric: isFa ? "ثبات" : "Consistency", value: dashboard.consistency },
  ];

  const visibleTrades = tradeTab === "open"
    ? performanceTrades.filter((trade) => trade.status === "OPEN").slice().reverse().slice(0, 8)
    : performanceTrades.filter((trade) => trade.status === "CLOSED").slice().reverse().slice(0, 8);

  const heatmap = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 16 * 7 + 1);
    return Array.from({ length: 112 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const item = dashboard.days.get(dayKey(date));
      return { date, count: item?.trades.length || 0 };
    });
  }, [dashboard.days]);

  const chartTooltipStyle = { borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 10px 25px rgba(15,23,42,.08)", fontSize: 12 };

  return (
    <div className="w-full" data-dashboard-tour="workspace">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-400">{copy.tracking}</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{copy.dashboard}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {accounts.length ? (
            <label className="relative">
              <select value={activeAccountId} onChange={(event) => void changeAccount(event.target.value)} className="h-10 max-w-[220px] appearance-none rounded-xl border border-slate-200 bg-white pe-9 ps-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                {accounts.map((account) => <option key={account.id} value={account.id}>{accountName(account)}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </label>
          ) : (
            <Link href="/dashboard/accounts" className="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">{isFa ? "افزودن حساب" : "Add account"}</Link>
          )}
          <label className="relative">
            <SlidersHorizontal className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select value={range} onChange={(event) => setRange(event.target.value as RangeKey)} className="h-10 appearance-none rounded-xl border border-slate-200 bg-white pe-9 ps-9 text-sm font-semibold text-slate-800 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white">
              <option value="all">{copy.allTime}</option>
              <option value="month">{copy.thisMonth}</option>
              <option value="90days">{copy.last90}</option>
              <option value="year">{copy.thisYear}</option>
            </select>
            <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>
          <Link href="/dashboard/daily-journal" className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_8px_22px_rgba(109,91,208,.25)] transition hover:bg-violet-500">
            <Rocket className="h-4 w-4" /> {copy.startDay}
          </Link>
          <Link href="/dashboard/settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-violet-300"><Settings className="h-4 w-4" /></Link>
        </div>
      </div>

      <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-5", loading && "opacity-60")}>
        <div className="flex min-h-[120px] items-center justify-between rounded-xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,.025)] dark:bg-[#111827]">
          <div className="self-stretch py-1">
            <MetricLabel>{copy.tradeWin}</MetricLabel>
            <strong className="mt-2 block text-[27px] font-black leading-none text-slate-950 dark:text-white">{dashboard.winRate.toFixed(2)}%</strong>
          </div>
          <SemiGauge
            value={dashboard.winRate}
            good={dashboard.wins.length}
            neutral={filtered.length - dashboard.wins.length - dashboard.losses.length}
            bad={dashboard.losses.length}
          />
        </div>

        <div className="flex min-h-[120px] items-center justify-between rounded-xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,.025)] dark:bg-[#111827]">
          <div className="self-stretch py-1">
            <MetricLabel>{copy.dayWin}</MetricLabel>
            <strong className="mt-2 block text-[27px] font-black leading-none text-slate-950 dark:text-white">{dashboard.dayWinRate.toFixed(2)}%</strong>
          </div>
          <SemiGauge
            value={dashboard.dayWinRate}
            good={[...dashboard.days.values()].filter((day) => day.pnl > 0).length}
            neutral={[...dashboard.days.values()].filter((day) => day.pnl === 0).length}
            bad={[...dashboard.days.values()].filter((day) => day.pnl < 0).length}
          />
        </div>

        <div className="flex min-h-[120px] items-center justify-between rounded-xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,.025)] dark:bg-[#111827]">
          <div className="self-stretch py-1">
            <MetricLabel>{copy.profitFactor}</MetricLabel>
            <strong className="mt-2 block text-[27px] font-black leading-none text-slate-950 dark:text-white">{dashboard.profitFactor.toFixed(2)}</strong>
          </div>
          <ProfitRing value={Math.min(100, dashboard.profitFactor * 25)} />
        </div>

        <div className="min-h-[120px] rounded-xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,.025)] dark:bg-[#111827]">
          <MetricLabel badge={activeAccount?.mt5AccountNumber?.slice(-4)}>{copy.balance}</MetricLabel>
          <strong className="mt-2 block text-[26px] font-bold leading-none text-[#45bd91]">{formatMoney(dashboard.accountBalance, currency)}</strong>
          <span className={cn("mt-2 block text-sm", dashboard.net >= 0 ? "text-[#45bd91]" : "text-[#f06464]")}>P&amp;L:&nbsp; <b>{formatMoney(dashboard.net, currency)}</b></span>
        </div>

        <div className="min-h-[120px] rounded-xl bg-white px-5 py-4 shadow-[0_2px_12px_rgba(15,23,42,.025)] dark:bg-[#111827]">
          <MetricLabel badge={activeAccount?.mt5AccountNumber?.slice(-4)}>{copy.netPnl}</MetricLabel>
          <strong className={cn("mt-5 block text-[27px] font-bold leading-none", dashboard.net >= 0 ? "text-[#45bd91]" : "text-[#f06464]")}>{formatMoney(dashboard.net, currency)}</strong>
        </div>
      </div>

      <RiskGuardianWidget accountId={activeAccount?.id} />
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_minmax(330px,.85fr)]">
        <Panel
          title={`${(isFa ? MONTHS_FA : MONTHS)[month.getMonth()]} ${month.getFullYear()}`}
          action={<div className="flex items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", calendar.pnl >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10")}>{copy.monthlyStats}: {compactMoney(calendar.pnl, currency)}</span><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">{calendar.activeDays} {copy.days}</span><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /></button><button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><ArrowRight className="h-4 w-4" /></button></div>}
        >
          <div className="overflow-x-auto p-3 sm:p-4">
            <div className="min-w-[680px]">
              <div className="grid grid-cols-[repeat(7,minmax(70px,1fr))_112px] gap-1.5">
                {(isFa ? WEEKDAYS_FA : WEEKDAYS).map((day) => <div key={day} className="py-2 text-center text-xs font-bold text-slate-500">{day}</div>)}<div />
                {Array.from({ length: 6 }, (_, row) => (
                  <div key={row} className="contents">
                    {calendar.cells.slice(row * 7, row * 7 + 7).map((cell, index) => cell ? (
                      <div key={cell.number} className={cn("relative min-h-[96px] rounded-xl border p-2 text-end", cell.pnl > 0 ? "border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-500/10" : cell.pnl < 0 ? "border-rose-300 bg-rose-50/90 dark:border-rose-700 dark:bg-rose-500/10" : "border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/70")}>
                        <span className="block text-[11px] text-slate-500">{cell.number}</span>
                        {cell.trades.length ? <><strong className={cn("mt-2 block text-base", cell.pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>{compactMoney(cell.pnl, currency)}</strong><span className="block text-[10px] text-slate-500">{cell.trades.length} {copy.trades}</span><span className="block text-[10px] text-slate-500">{(cell.trades.filter((trade) => trade.profitLoss > 0).length / cell.trades.length * 100).toFixed(0)}%</span></> : null}
                      </div>
                    ) : <div key={`empty-${row}-${index}`} className="min-h-[96px] rounded-xl border border-slate-100 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40" />)}
                    <div className="flex min-h-[96px] flex-col justify-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
                      <span className="text-xs text-slate-500">{copy.week} {row + 1}</span><strong className={cn("mt-1 text-base", calendar.weeks[row].pnl >= 0 ? "text-emerald-600" : "text-rose-600")}>{compactMoney(calendar.weeks[row].pnl, currency)}</strong><span className="mt-1 text-[10px] text-slate-400">{calendar.weeks[row].days} {copy.days}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel title="" className="min-h-[338px]" action={null}>
            <div className="flex border-b border-slate-100 px-4 dark:border-slate-800">
              {(["recent", "open"] as const).map((tab) => <button key={tab} onClick={() => setTradeTab(tab)} className={cn("border-b-2 px-3 py-3 text-sm font-bold", tradeTab === tab ? "border-violet-600 text-violet-600" : "border-transparent text-slate-500")}>{tab === "recent" ? copy.recent : copy.open}</button>)}
            </div>
            <div className="max-h-[325px] overflow-y-auto px-4">
              {visibleTrades.length ? visibleTrades.map((trade) => {
                const date = tradeDate(trade);
                return <Link href={`/journal/${trade.id}`} key={trade.id} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3 border-b border-slate-100 py-3 text-xs transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"><span className="text-slate-500">{date?.toLocaleDateString(isFa ? "fa-IR" : "en-US") || "—"}</span><span className="font-bold text-slate-900 dark:text-white">{trade.symbol}</span><strong className={trade.profitLoss >= 0 ? "text-emerald-500" : "text-rose-500"}>{formatMoney(trade.profitLoss, currency)}</strong></Link>;
              }) : <EmptyChart text={copy.noData} />}
            </div>
            <Link href="/journal" className="block py-3 text-center text-xs font-bold text-violet-600">{copy.viewMore}</Link>
          </Panel>
          <Panel title={copy.equity}>
            <div className="h-[230px] p-4">{dashboard.equity.length ? <ResponsiveContainer width="100%" height="100%"><LineChart data={dashboard.equity}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={40} /><YAxis tick={{ fontSize: 10 }} width={62} tickFormatter={(value) => compactMoney(value, currency)} /><Tooltip contentStyle={chartTooltipStyle} formatter={(value) => formatMoney(Number(value), currency)} /><Line type="monotone" dataKey="balance" stroke="#6d5bd0" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer> : <EmptyChart text={copy.noData} />}</div>
          </Panel>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel
          title={copy.drawdown}
          action={<span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-500 dark:bg-rose-500/10">{isFa ? "بیشترین افت" : "Max DD"}: {formatMoney(dashboard.maxDrawdown, currency)}</span>}
        >
          <div className="h-[320px] px-3 pb-4 pt-5 sm:px-5">
            {dashboard.daily.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.daily} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="professionalDrawdownFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.1} />
                      <stop offset="100%" stopColor="#fb7185" stopOpacity={0.46} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#dbe3ed" strokeOpacity={0.85} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={56} tickMargin={14} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => formatChartDate(String(value), language)} />
                  <YAxis axisLine={false} tickLine={false} tickCount={6} width={72} tickMargin={8} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => compactMoney(Number(value), currency)} />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                  <Tooltip cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} content={<PerformanceTooltip currency={currency} language={language} valueLabel={copy.drawdown} />} />
                  <Area type="monotoneX" dataKey="drawdown" baseValue={0} stroke="#6555c8" fill="url(#professionalDrawdownFill)" strokeWidth={2.2} dot={false} activeDot={{ r: 4, fill: "#6555c8", stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart text={copy.noData} />}
          </div>
        </Panel>

        <Panel
          title={copy.cumulative}
          action={<span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", dashboard.net >= 0 ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-500 dark:bg-rose-500/10")}>{formatMoney(dashboard.net, currency)}</span>}
        >
          <div className="h-[320px] px-3 pb-4 pt-5 sm:px-5">
            {dashboard.daily.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard.daily} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <defs>
                    <linearGradient id="professionalCumulativeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.05} />
                      <stop offset="100%" stopColor={dashboard.net >= 0 ? "#6ee7b7" : "#fb7185"} stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#dbe3ed" strokeOpacity={0.85} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={56} tickMargin={14} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => formatChartDate(String(value), language)} />
                  <YAxis axisLine={false} tickLine={false} tickCount={6} width={72} tickMargin={8} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => compactMoney(Number(value), currency)} />
                  <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />
                  <Tooltip cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }} content={<PerformanceTooltip currency={currency} language={language} valueLabel={copy.cumulative} />} />
                  <Area type="monotoneX" dataKey="cumulative" baseValue={0} stroke="#8b7ce8" fill="url(#professionalCumulativeFill)" strokeWidth={2.15} dot={false} activeDot={{ r: 4, fill: "#6555c8", stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyChart text={copy.noData} />}
          </div>
        </Panel>

        <Panel
          title={copy.daily}
          action={dashboard.daily.length ? <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-400"><i className="h-2 w-2 rounded-full bg-[#45bd91]" />{isFa ? "سود" : "Profit"}<i className="ms-1 h-2 w-2 rounded-full bg-[#f06464]" />{isFa ? "زیان" : "Loss"}</span> : null}
        >
          <div className="h-[320px] px-3 pb-4 pt-5 sm:px-5">
            {dashboard.daily.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.daily} margin={{ top: 4, right: 8, bottom: 4, left: 0 }} barCategoryGap="18%">
                  <CartesianGrid strokeDasharray="2 3" vertical={false} stroke="#dbe3ed" strokeOpacity={0.85} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} minTickGap={56} tickMargin={14} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => formatChartDate(String(value), language)} />
                  <YAxis axisLine={false} tickLine={false} tickCount={6} width={72} tickMargin={8} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(value) => compactMoney(Number(value), currency)} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.2} />
                  <Tooltip cursor={{ fill: "#f1f5f9", opacity: 0.65 }} content={<PerformanceTooltip currency={currency} language={language} valueLabel={copy.daily} />} />
                  <Bar dataKey="pnl" maxBarSize={13} minPointSize={2} radius={[2, 2, 2, 2]} isAnimationActive={false}>
                    {dashboard.daily.map((item) => <Cell key={item.date} fill={item.pnl >= 0 ? "#45bd91" : "#f06464"} fillOpacity={0.86} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyChart text={copy.noData} />}
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title={copy.time}><div className="h-[285px] p-4">{timeData.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" dataKey="hour" domain={[0, 24]} ticks={[0, 4, 8, 12, 16, 20, 24]} tickFormatter={(value) => `${value}:00`} tick={{ fontSize: 10 }} /><YAxis type="number" dataKey="pnl" tick={{ fontSize: 10 }} width={62} tickFormatter={(value) => compactMoney(value, currency)} /><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={chartTooltipStyle} formatter={(value, name) => name === "pnl" ? formatMoney(Number(value), currency) : value} /><Scatter data={timeData}>{timeData.map((item, index) => <Cell key={index} fill={item.fill} />)}</Scatter></ScatterChart></ResponsiveContainer> : <EmptyChart text={copy.noData} />}</div></Panel>
        <Panel title={copy.score}>
          <div className="grid h-[285px] grid-cols-[1fr_96px] items-center gap-2 p-4">
            {filtered.length ? <ResponsiveContainer width="100%" height="100%"><RadarChart data={radarData}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "#64748b" }} /><Radar dataKey="value" stroke="#6d5bd0" fill="#8b5cf6" fillOpacity={0.25} /></RadarChart></ResponsiveContainer> : <EmptyChart text={copy.noData} />}
            <div className="text-center"><span className="text-xs text-slate-400">Score</span><strong className="block text-4xl font-black text-slate-950 dark:text-white">{dashboard.score}</strong><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-400" style={{ width: `${dashboard.score}%` }} /></div><span className="mt-1 block text-[10px] text-slate-400">/ 100</span></div>
          </div>
        </Panel>
        <Panel title={copy.duration}><div className="h-[285px] p-4">{durationData.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis type="number" dataKey="minutes" tick={{ fontSize: 10 }} tickFormatter={(value) => value >= 60 ? `${Math.round(value / 60)}h` : `${Math.round(value)}m`} /><YAxis type="number" dataKey="pnl" tick={{ fontSize: 10 }} width={62} tickFormatter={(value) => compactMoney(value, currency)} /><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={chartTooltipStyle} formatter={(value, name) => name === "pnl" ? formatMoney(Number(value), currency) : `${Math.round(Number(value))} min`} /><Scatter data={durationData}>{durationData.map((item, index) => <Cell key={index} fill={item.fill} />)}</Scatter></ScatterChart></ResponsiveContainer> : <EmptyChart text={copy.noData} />}</div></Panel>
      </div>

      <Panel title={copy.progress} className="mt-4">
        <div className="p-5">
          <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2">
            {heatmap.map((item, index) => <div key={index} title={`${item.date.toLocaleDateString()}: ${item.count} ${copy.trades}`} className={cn("h-4 w-4 rounded-[4px] border", item.count === 0 ? "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" : item.count < 3 ? "border-indigo-200 bg-indigo-200 dark:border-indigo-800 dark:bg-indigo-900" : item.count < 7 ? "border-indigo-400 bg-indigo-400" : "border-indigo-600 bg-indigo-600")} />)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10"><Target className="h-5 w-5" /></div><div><span className="text-xs text-slate-400">{isFa ? "معاملات ثبت‌شده" : "Logged trades"}</span><strong className="block text-xl text-slate-950 dark:text-white">{stats.totalTrades}</strong></div></div>
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10">{dashboard.net >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}</div><div><span className="text-xs text-slate-400">{copy.netPnl}</span><strong className={dashboard.net >= 0 ? "text-emerald-600" : "text-rose-600"}>{formatMoney(dashboard.net, currency)}</strong></div></div>
            <Link href="/journal/analytics" className="inline-flex h-10 items-center gap-2 rounded-xl border border-violet-200 px-4 text-sm font-bold text-violet-600 transition hover:bg-violet-50 dark:border-violet-800 dark:hover:bg-violet-500/10"><Sparkles className="h-4 w-4" />{isFa ? "تحلیل پیشرفته" : "Advanced analytics"}</Link>
          </div>
        </div>
      </Panel>
    </div>
  );
}
