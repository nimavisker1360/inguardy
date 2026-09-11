"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Eye,
  Filter,
  Loader2,
  RefreshCcw,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type Summary = {
  sessions?: number;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfitLoss: number;
  netR: number;
  profitFactor?: number | null;
  expectancyR?: number;
  maxDrawdown?: number;
};

type BacktestTrade = {
  id: string;
  clientPositionId: string;
  direction: string;
  status: string;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exitPrice: number | null;
  volume: number | null;
  riskAmount: number;
  riskReward: number;
  resultR: number | null;
  profitLoss: number | null;
  openedAt: string | null;
  closedAt: string | null;
  closeReason: string | null;
};

type BacktestSession = {
  id: string;
  accountId: string | null;
  playbookId: string | null;
  symbol: string;
  timeframe: string;
  endDate: string;
  historySize: number;
  speed: number;
  status: string;
  currentCandleTime: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  summary: Summary;
  trades: BacktestTrade[];
  account: { id: string; name: string; currency: string } | null;
  playbook: { id: string; name: string } | null;
};

type PerformancePoint = {
  trade: number;
  time: string;
  equity: number;
  totalR: number;
  drawdown: number;
};

type Breakdown = Summary & { type: string; id: string; label: string };

type HistoryResponse = {
  ok?: boolean;
  message?: string;
  history?: {
    sessions: BacktestSession[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    summary: Summary;
    series: PerformancePoint[];
    breakdown: Breakdown[];
    filterOptions: {
      accounts: Array<{ id: string; name: string; currency: string }>;
      playbooks: Array<{ id: string; name: string }>;
      symbols: string[];
    };
  };
};

type DetailResponse = { ok?: boolean; message?: string; session?: BacktestSession };

const emptyFilters = { accountId: "", playbookId: "", symbol: "", timeframe: "", status: "" };

const copy = {
  en: {
    eyebrow: "Backtest analytics",
    title: "Backtest History & Reports",
    description: "Review saved replay sessions, compare setups, and inspect every simulated trade.",
    openReplay: "Open Market Replay",
    filters: "Filters",
    allAccounts: "All accounts",
    allPlaybooks: "All playbooks",
    allSymbols: "All symbols",
    allTimeframes: "All timeframes",
    allStatuses: "All statuses",
    active: "Active",
    completed: "Completed",
    apply: "Apply filters",
    clear: "Clear",
    sessions: "Sessions",
    trades: "Closed trades",
    winRate: "Win rate",
    netPnl: "Net P/L",
    totalR: "Total R",
    profitFactor: "Profit factor",
    expectancy: "Expectancy",
    maxDrawdown: "Max drawdown",
    equityCurve: "Equity curve",
    drawdown: "Drawdown",
    noChart: "Complete a simulated trade to build this chart.",
    performance: "Performance comparison",
    group: "Group",
    timeframe: "Timeframe",
    playbook: "Playbook",
    history: "Saved sessions",
    account: "Account",
    symbol: "Symbol",
    endDate: "Replay end",
    updated: "Last saved",
    result: "Result",
    actions: "Actions",
    view: "View",
    delete: "Delete",
    empty: "No saved backtest session matches these filters.",
    loading: "Loading backtest reports...",
    loadError: "Backtest reports could not be loaded.",
    details: "Session details",
    close: "Close",
    direction: "Direction",
    entry: "Entry",
    stopLoss: "Stop loss",
    takeProfit: "Take profit",
    exit: "Exit",
    risk: "Risk",
    volume: "Volume",
    reason: "Close reason",
    time: "Closed at",
    noTrades: "This session has no completed trade yet.",
    confirmDelete: "Delete this backtest session and all of its simulated trades?",
    previous: "Previous",
    next: "Next",
    page: "Page",
    of: "of",
  },
  fa: {
    eyebrow: "تحلیل بک‌تست",
    title: "تاریخچه و گزارش بک‌تست",
    description: "جلسات ذخیره‌شده، عملکرد استراتژی‌ها و جزئیات معاملات شبیه‌سازی‌شده را بررسی کنید.",
    openReplay: "باز کردن Market Replay",
    filters: "فیلترها",
    allAccounts: "همه حساب‌ها",
    allPlaybooks: "همه پلی‌بوک‌ها",
    allSymbols: "همه نمادها",
    allTimeframes: "همه تایم‌فریم‌ها",
    allStatuses: "همه وضعیت‌ها",
    active: "فعال",
    completed: "تکمیل‌شده",
    apply: "اعمال فیلتر",
    clear: "پاک کردن",
    sessions: "جلسه‌ها",
    trades: "معاملات بسته",
    winRate: "نرخ برد",
    netPnl: "سود/زیان خالص",
    totalR: "مجموع R",
    profitFactor: "پرافیت فاکتور",
    expectancy: "امید ریاضی",
    maxDrawdown: "بیشترین افت",
    equityCurve: "منحنی سود",
    drawdown: "افت سرمایه",
    noChart: "برای ساخت نمودار حداقل یک معامله شبیه‌سازی‌شده را ببندید.",
    performance: "مقایسه عملکرد",
    group: "گروه",
    timeframe: "تایم‌فریم",
    playbook: "پلی‌بوک",
    history: "جلسات ذخیره‌شده",
    account: "حساب",
    symbol: "نماد",
    endDate: "پایان Replay",
    updated: "آخرین ذخیره",
    result: "نتیجه",
    actions: "عملیات",
    view: "مشاهده",
    delete: "حذف",
    empty: "هیچ جلسه بک‌تستی با این فیلترها پیدا نشد.",
    loading: "در حال بارگذاری گزارش‌های بک‌تست...",
    loadError: "گزارش‌های بک‌تست دریافت نشد.",
    details: "جزئیات جلسه",
    close: "بستن",
    direction: "جهت",
    entry: "ورود",
    stopLoss: "حد ضرر",
    takeProfit: "حد سود",
    exit: "خروج",
    risk: "ریسک",
    volume: "حجم",
    reason: "دلیل بسته‌شدن",
    time: "زمان بسته‌شدن",
    noTrades: "این جلسه هنوز معامله بسته‌شده‌ای ندارد.",
    confirmDelete: "این جلسه بک‌تست و تمام معاملات شبیه‌سازی‌شده آن حذف شود؟",
    previous: "قبلی",
    next: "بعدی",
    page: "صفحه",
    of: "از",
  },
} as const;

const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

function signed(value: number, digits = 2) {
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function BacktestReportsWorkspace() {
  const { language } = useLanguage();
  const t = copy[language];
  const [filters, setFilters] = useState(emptyFilters);
  const [history, setHistory] = useState<NonNullable<HistoryResponse["history"]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<BacktestSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadHistory = useCallback(async (page = 1, nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ view: "history", page: String(page), limit: "12" });
      Object.entries(nextFilters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const response = await fetch(`/api/backtest/sessions?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as HistoryResponse | null;
      if (!response.ok || !data?.ok || !data.history) throw new Error(data?.message || t.loadError);
      setHistory(data.history);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t.loadError);
    } finally {
      setLoading(false);
    }
  }, [filters, t.loadError]);

  useEffect(() => {
    void loadHistory(1, emptyFilters);
  }, []);

  async function openDetails(id: string) {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/backtest/sessions/${id}`, { credentials: "include", cache: "no-store" });
      const data = (await response.json().catch(() => null)) as DetailResponse | null;
      if (!response.ok || !data?.ok || !data.session) throw new Error(data?.message || t.loadError);
      setSelected(data.session);
    } catch (detailError) {
      setError(detailError instanceof Error ? detailError.message : t.loadError);
    } finally {
      setDetailLoading(false);
    }
  }

  async function deleteSession(session: BacktestSession) {
    if (!window.confirm(t.confirmDelete)) return;
    setDeletingId(session.id);
    try {
      const response = await fetch(`/api/backtest/sessions/${session.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.message || t.loadError);
      setSelected((current) => current?.id === session.id ? null : current);
      await loadHistory(history?.pagination.page ?? 1);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t.loadError);
    } finally {
      setDeletingId(null);
    }
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadHistory(1);
  }

  const summary = history?.summary;
  const timeframeBreakdown = history?.breakdown.filter((item) => item.type === "timeframe") ?? [];
  const playbookBreakdown = history?.breakdown.filter((item) => item.type === "playbook") ?? [];
  const locale = language === "fa" ? "fa-IR" : "en-US";
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "—";
  const metricCards: Array<{ label: string; value: string | number; icon: LucideIcon; color: string }> = [
    { label: t.sessions, value: summary?.sessions ?? 0, icon: BarChart3, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10" },
    { label: t.trades, value: summary?.totalTrades ?? 0, icon: Target, color: "text-violet-600 bg-violet-50 dark:bg-violet-500/10" },
    { label: t.winRate, value: `${(summary?.winRate ?? 0).toFixed(0)}%`, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
    { label: t.netPnl, value: `${signed(summary?.netProfitLoss ?? 0)} USD`, icon: Activity, color: (summary?.netProfitLoss ?? 0) < 0 ? "text-rose-600 bg-rose-50 dark:bg-rose-500/10" : "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
    { label: t.totalR, value: `${signed(summary?.netR ?? 0)}R`, icon: TrendingUp, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10" },
    { label: t.profitFactor, value: summary?.profitFactor == null ? "—" : summary.profitFactor.toFixed(2), icon: BarChart3, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
    { label: t.expectancy, value: `${signed(summary?.expectancyR ?? 0)}R`, icon: Target, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10" },
    { label: t.maxDrawdown, value: `${(summary?.maxDrawdown ?? 0).toFixed(2)} USD`, icon: TrendingDown, color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10" },
  ];

  return (
    <div className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-blue-50/70 to-cyan-50 p-5 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-300">{t.eyebrow}</div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t.title}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.description}</p>
          </div>
          <Link href="/dashboard/backtest" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500">
            <ArrowLeft className="h-4 w-4" />
            {t.openReplay}
          </Link>
        </div>
      </header>

      <form onSubmit={submitFilters} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 flex items-center gap-2 font-bold text-slate-900 dark:text-white"><Filter className="h-4 w-4 text-blue-500" />{t.filters}</div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <select value={filters.accountId} onChange={(event) => setFilters((current) => ({ ...current, accountId: event.target.value }))} className={inputClass}>
            <option value="">{t.allAccounts}</option>
            {history?.filterOptions.accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={filters.playbookId} onChange={(event) => setFilters((current) => ({ ...current, playbookId: event.target.value }))} className={inputClass}>
            <option value="">{t.allPlaybooks}</option>
            {history?.filterOptions.playbooks.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={filters.symbol} onChange={(event) => setFilters((current) => ({ ...current, symbol: event.target.value }))} className={inputClass} dir="ltr">
            <option value="">{t.allSymbols}</option>
            {history?.filterOptions.symbols.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={filters.timeframe} onChange={(event) => setFilters((current) => ({ ...current, timeframe: event.target.value }))} className={inputClass} dir="ltr">
            <option value="">{t.allTimeframes}</option>
            {["M5", "M15", "H1", "H4", "D1"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className={inputClass}>
            <option value="">{t.allStatuses}</option>
            <option value="ACTIVE">{t.active}</option>
            <option value="COMPLETED">{t.completed}</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="submit" disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}{t.apply}
          </button>
          <button type="button" onClick={() => { setFilters(emptyFilters); void loadHistory(1, emptyFilters); }} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-900">
            <RefreshCcw className="h-4 w-4" />{t.clear}
          </button>
        </div>
      </form>

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {metricCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className={cn("inline-flex rounded-xl p-2", color)}><Icon className="h-4 w-4" /></div>
            <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 truncate text-lg font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {[
          { title: t.equityCurve, key: "equity", color: "#2563eb", gradient: "equityGradient" },
          { title: t.drawdown, key: "drawdown", color: "#f43f5e", gradient: "drawdownGradient" },
        ].map((chart) => (
          <div key={chart.key} className="h-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="font-bold text-slate-900 dark:text-white">{chart.title}</h2>
            {history?.series.length ? (
              <div className="mt-3 h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={history.series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs><linearGradient id={chart.gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={chart.color} stopOpacity={0.35} /><stop offset="95%" stopColor={chart.color} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                    <XAxis dataKey="trade" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={55} />
                    <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(2)} USD`, chart.title]} labelFormatter={(label) => `${t.trades}: ${label}`} />
                    <Area type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2.5} fill={`url(#${chart.gradient})`} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="flex h-56 items-center justify-center text-sm text-slate-400">{t.noChart}</div>}
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {[{ title: t.timeframe, rows: timeframeBreakdown }, { title: t.playbook, rows: playbookBreakdown }].map((group) => (
          <div key={group.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <h2 className="border-b border-slate-100 px-4 py-3 font-bold text-slate-900 dark:border-slate-800 dark:text-white">{t.performance}: {group.title}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr><th className="px-4 py-2 text-start">{t.group}</th><th className="px-3 py-2">{t.trades}</th><th className="px-3 py-2">{t.winRate}</th><th className="px-3 py-2">{t.netPnl}</th><th className="px-3 py-2">{t.totalR}</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.rows.length ? group.rows.map((row) => <tr key={`${row.type}-${row.id}`}><td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{row.label}</td><td className="px-3 py-2.5 text-center tabular-nums">{row.totalTrades}</td><td className="px-3 py-2.5 text-center tabular-nums">{row.winRate.toFixed(0)}%</td><td className={cn("px-3 py-2.5 text-center tabular-nums", row.netProfitLoss > 0 ? "text-emerald-600" : row.netProfitLoss < 0 ? "text-rose-600" : "")}>{signed(row.netProfitLoss)}</td><td className="px-3 py-2.5 text-center tabular-nums">{signed(row.netR)}R</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">{t.noTrades}</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-white">{t.history}</h2>{loading ? <Loader2 className="h-4 w-4 animate-spin text-blue-500" /> : null}</div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400"><tr><th className="px-4 py-3 text-start">{t.symbol}</th><th className="px-3 py-3 text-start">{t.account}</th><th className="px-3 py-3">{t.playbook}</th><th className="px-3 py-3">{t.endDate}</th><th className="px-3 py-3">{t.trades}</th><th className="px-3 py-3">{t.result}</th><th className="px-3 py-3">{t.updated}</th><th className="px-3 py-3">{t.actions}</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history?.sessions.length ? history.sessions.map((session) => (
                <tr key={session.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/60">
                  <td className="px-4 py-3"><div className="font-black text-slate-900 dark:text-white" dir="ltr">{session.symbol}</div><div className="mt-1 text-xs text-slate-400" dir="ltr">{session.timeframe} · {session.historySize}</div></td>
                  <td className="px-3 py-3 text-slate-700 dark:text-slate-300">{session.account?.name || "—"}</td>
                  <td className="px-3 py-3 text-center text-slate-600 dark:text-slate-300">{session.playbook?.name || "—"}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{session.endDate}</td>
                  <td className="px-3 py-3 text-center tabular-nums">{session.summary.totalTrades}</td>
                  <td className={cn("px-3 py-3 text-center font-bold tabular-nums", session.summary.netProfitLoss > 0 ? "text-emerald-600" : session.summary.netProfitLoss < 0 ? "text-rose-600" : "text-slate-500")}>{signed(session.summary.netProfitLoss)} USD</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-500">{formatDate(session.updatedAt)}</td>
                  <td className="px-3 py-3"><div className="flex justify-center gap-2"><button type="button" onClick={() => void openDetails(session.id)} disabled={detailLoading} className="inline-flex h-8 items-center gap-1 rounded-lg bg-blue-50 px-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-300"><Eye className="h-3.5 w-3.5" />{t.view}</button><button type="button" onClick={() => void deleteSession(session)} disabled={deletingId === session.id} className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-50 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/10 dark:text-rose-300">{deletingId === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}{t.delete}</button></div></td>
                </tr>
              )) : <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400">{loading ? t.loading : t.empty}</td></tr>}
            </tbody>
          </table>
        </div>
        {history ? <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm dark:border-slate-800"><span className="text-slate-500">{t.page} {history.pagination.page} {t.of} {history.pagination.totalPages}</span><div className="flex gap-2"><button type="button" disabled={history.pagination.page <= 1 || loading} onClick={() => void loadHistory(history.pagination.page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-slate-700">{t.previous}</button><button type="button" disabled={history.pagination.page >= history.pagination.totalPages || loading} onClick={() => void loadHistory(history.pagination.page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40 dark:border-slate-700">{t.next}</button></div></div> : null}
      </section>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><h2 className="text-lg font-black text-slate-900 dark:text-white">{t.details}: <span dir="ltr">{selected.symbol} · {selected.timeframe}</span></h2><p className="mt-1 text-xs text-slate-500">{selected.account?.name || "—"} · {selected.playbook?.name || t.allPlaybooks}</p></div><button type="button" onClick={() => setSelected(null)} aria-label={t.close} className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900"><X className="h-5 w-5" /></button></div>
            <div className="max-h-[calc(90vh-76px)] overflow-auto p-5">
              <div className="mb-4 grid gap-3 sm:grid-cols-4">{[[t.trades, selected.summary.totalTrades], [t.winRate, `${selected.summary.winRate.toFixed(0)}%`], [t.netPnl, `${signed(selected.summary.netProfitLoss)} USD`], [t.totalR, `${signed(selected.summary.netR)}R`]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-black tabular-nums text-slate-900 dark:text-white" dir="ltr">{value}</div></div>)}</div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900"><tr><th className="px-3 py-2 text-start">{t.direction}</th><th className="px-3 py-2">{t.entry}</th><th className="px-3 py-2">{t.stopLoss}</th><th className="px-3 py-2">{t.takeProfit}</th><th className="px-3 py-2">{t.exit}</th><th className="px-3 py-2">{t.risk}</th><th className="px-3 py-2">{t.volume}</th><th className="px-3 py-2">R</th><th className="px-3 py-2">P/L</th><th className="px-3 py-2">{t.reason}</th><th className="px-3 py-2">{t.time}</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{selected.trades.filter((trade) => trade.status === "WON" || trade.status === "LOST").map((trade) => <tr key={trade.id}><td className={cn("px-3 py-2.5 font-bold", trade.direction === "LONG" ? "text-emerald-600" : "text-rose-600")}>{trade.direction}</td>{[trade.entry, trade.stopLoss, trade.takeProfit, trade.exitPrice].map((value, index) => <td key={index} className="px-3 py-2.5 text-center tabular-nums" dir="ltr">{value == null ? "—" : value}</td>)}<td className="px-3 py-2.5 text-center tabular-nums">{trade.riskAmount.toFixed(2)}</td><td className="px-3 py-2.5 text-center tabular-nums">{trade.volume ?? "—"}</td><td className={cn("px-3 py-2.5 text-center font-bold tabular-nums", (trade.resultR ?? 0) > 0 ? "text-emerald-600" : "text-rose-600")}>{trade.resultR == null ? "—" : `${signed(trade.resultR)}R`}</td><td className={cn("px-3 py-2.5 text-center font-bold tabular-nums", (trade.profitLoss ?? 0) > 0 ? "text-emerald-600" : "text-rose-600")}>{trade.profitLoss == null ? "—" : `${signed(trade.profitLoss)} USD`}</td><td className="px-3 py-2.5 text-center text-xs">{trade.closeReason || "—"}</td><td className="px-3 py-2.5 text-center text-xs text-slate-500">{formatDate(trade.closedAt)}</td></tr>)}{!selected.trades.some((trade) => trade.status === "WON" || trade.status === "LOST") ? <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">{t.noTrades}</td></tr> : null}</tbody></table></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
