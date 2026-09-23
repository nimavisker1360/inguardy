import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronDown, Info, Plus, RotateCcw, Search, Settings2 } from "lucide-react";
import {
  fetchJournalApi,
  type JournalTradeDto,
  type JournalSummaryResponse,
  mapPrismaTradeToJournalTrade,
  type PrismaTradesResponse,
} from "@/app/journal/_lib/journal-api";
import { AccountScopeSelect } from "@/app/journal/account-scope-select";
import { TradeDateSelect } from "@/app/journal/trade-date-select";
import { DeleteTradeButton } from "@/app/journal/delete-trade-button";
import { ManualTradeForm } from "@/app/journal/manual-trade-form";
import { TradeImportPanel } from "@/app/journal/trade-import-panel";
import { TradeCoachActiveReminder } from "@/components/journal/TradeCoachActiveReminder";
import { JournalAutoRefresh } from "@/app/journal/journal-auto-refresh";
import { DashboardText } from "@/components/dashboard/DashboardText";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_KEY, type Language } from "@/lib/language-preferences";
import { getSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type JournalPageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };
type JournalAccountHeader = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
  mt5AccountNumber: string | null;
  accountType: string | null;
  currency: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendParam(params: URLSearchParams, name: string, value: string | undefined) {
  if (value?.trim()) params.set(name, value.trim());
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function formatMoney(value: number | null | undefined, currency = "USD", signed = false) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "–";
  const absolute = Math.abs(value).toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 2 });
  if (!signed || value === 0) return value < 0 ? `-${absolute}` : absolute;
  return `${value > 0 ? "+" : "-"}${absolute}`;
}

function formatTime(value: string | null | undefined, language: Language) {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "–";
  return date.toLocaleTimeString(language === "fa" ? "fa-IR" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(openTime: string | null, closeTime: string | null) {
  if (!openTime || !closeTime) return "–";
  const seconds = Math.max(0, Math.floor((new Date(closeTime).getTime() - new Date(openTime).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return "–";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", `${remainder}s`].filter(Boolean).join(" ");
}

function accountDisplayNumber(account: JournalAccountHeader | null) {
  return account?.mt5AccountNumber || account?.name || null;
}

function reviewStatus(strategyReview: { followedPlan?: string | null } | null | undefined) {
  return !strategyReview || strategyReview.followedPlan === "NOT_REVIEWED" ? "Not reviewed" : "Reviewed";
}

function resultLabel(trade: JournalTradeDto) {
  if (trade.status === "open" || trade.result === "open") return "OPEN";
  if (trade.result === "win") return "WIN";
  if (trade.result === "loss") return "LOSS";
  return "B/E";
}

function resultPillClass(trade: JournalTradeDto) {
  if (trade.status === "open" || trade.result === "open") return "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300";
  if (trade.result === "win") return "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (trade.result === "loss") return "bg-rose-50 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300";
  return "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300";
}

function MetricCard({ children }: { children: ReactNode }) {
  return <div className="min-h-44 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)] dark:border-slate-800 dark:bg-[#111827]">{children}</div>;
}

function MetricLabel({ children }: { children: ReactNode }) {
  return <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{children}</div>;
}

function Ring({ percent, color }: { percent: number; color: string }) {
  const safePercent = Math.min(100, Math.max(0, percent));
  return (
    <svg viewBox="0 0 42 42" className="h-20 w-20 -rotate-90" aria-hidden="true">
      <circle cx="21" cy="21" r="16" fill="none" stroke="currentColor" strokeWidth="4" className="text-rose-400" />
      <circle cx="21" cy="21" r="16" fill="none" stroke={color} strokeWidth="4" pathLength="100" strokeDasharray={`${safePercent} ${100 - safePercent}`} />
    </svg>
  );
}

function PnlChart({ trades }: { trades: JournalTradeDto[] }) {
  const ordered = [...trades].sort((a, b) => new Date(a.openTime || 0).getTime() - new Date(b.openTime || 0).getTime());
  let running = 0;
  const values = ordered.map((trade) => (running += Number(trade.profit || 0)));
  if (values.length === 0) values.push(0, 0);
  if (values.length === 1) values.unshift(0);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(1, maximum - minimum);
  const points = values.map((value, index) => {
    const x = (index / Math.max(1, values.length - 1)) * 180;
    const y = 48 - ((value - minimum) / range) * 36;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const positive = values.at(-1)! >= values[0];
  return (
    <svg viewBox="0 0 180 56" preserveAspectRatio="none" className="mt-3 h-14 w-full" aria-hidden="true">
      <defs><linearGradient id="journalPnlArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.35" /><stop offset="100%" stopColor={positive ? "#34d399" : "#fb7185"} stopOpacity="0.04" /></linearGradient></defs>
      <polygon points={`0,54 ${points} 180,54`} fill="url(#journalPnlArea)" />
      <polyline points={points} fill="none" stroke={positive ? "#10b981" : "#f43f5e"} strokeWidth="1.7" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function TradeCell({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return <td className="p-0"><Link href={href} className={cn("flex min-h-14 items-center whitespace-nowrap px-4 py-3 text-sm", className)}>{children}</Link></td>;
}

function TradeRow({ trade, language, accountId, currency }: { trade: JournalTradeDto; language: Language; accountId?: string; currency: string }) {
  const detailHref = accountId ? `/journal/${trade._id}?accountId=${encodeURIComponent(accountId)}` : `/journal/${trade._id}`;
  const pnl = Number(trade.profit || 0);
  const side = trade.tradeType === "sell" ? "SELL" : "BUY";
  return (
    <tr className="group border-b border-slate-100 bg-white transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:hover:bg-slate-800/70">
      <TradeCell href={detailHref}><span className={cn("inline-flex min-w-20 justify-center rounded-md px-2.5 py-1 text-xs font-bold", resultPillClass(trade))}>{resultLabel(trade)}</span></TradeCell>
      <TradeCell href={detailHref} className={cn("font-bold", pnl > 0 ? "text-emerald-500" : pnl < 0 ? "text-rose-500" : "text-slate-400")}>{trade.status === "open" ? `(open) ${formatMoney(pnl, currency)}` : formatMoney(pnl, currency, true)}</TradeCell>
      <TradeCell href={detailHref} className="font-medium text-slate-900 dark:text-slate-100">{formatNumber(trade.takeProfit, 5)}</TradeCell>
      <TradeCell href={detailHref} className="font-medium text-slate-900 dark:text-slate-100">{trade.riskAmount ? formatMoney(-Math.abs(trade.riskAmount), currency) : "–"}</TradeCell>
      <TradeCell href={detailHref} className="font-medium text-slate-900 dark:text-slate-100">{formatNumber(trade.stopLoss, 5)}</TradeCell>
      <TradeCell href={detailHref} className="font-medium text-slate-900 dark:text-slate-100">{formatTime(trade.openTime, language)}</TradeCell>
      <TradeCell href={detailHref} className="font-bold text-slate-950 dark:text-white">{trade.symbol}</TradeCell>
      <TradeCell href={detailHref}><span className={cn("rounded-full px-2 py-1 text-xs font-bold", side === "BUY" ? "bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-300" : "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300")}>{side}</span></TradeCell>
      <TradeCell href={detailHref} className="font-medium text-slate-900 dark:text-slate-100">{formatDuration(trade.openTime, trade.closeTime)}</TradeCell>
      <TradeCell href={detailHref} className="text-slate-600 dark:text-slate-300">{trade.session || "–"}</TradeCell>
      <TradeCell href={detailHref} className="font-medium text-slate-900 dark:text-slate-100">{formatTime(trade.closeTime, language)}</TradeCell>
      <TradeCell href={detailHref} className="max-w-44 truncate text-slate-600 dark:text-slate-300">{trade.accountNumber || "–"}</TradeCell>
      <TradeCell href={detailHref}><span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", reviewStatus(trade.strategyReview) === "Reviewed" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300")}>{reviewStatus(trade.strategyReview)}</span></TradeCell>
      <td className="px-3 py-2 text-center"><DeleteTradeButton tradeId={trade._id} symbol={trade.symbol} language={language} compact /></td>
    </tr>
  );
}

function buildPageHref(page: number, values: Record<string, string | undefined>) {
  const params = new URLSearchParams({ page: String(page), limit: "50" });
  for (const [name, value] of Object.entries(values)) appendParam(params, name, value);
  return `/journal?${params.toString()}`;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const languageCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const language: Language = languageCookie === "en" || languageCookie === "fa" ? languageCookie : DEFAULT_LANGUAGE;
  const params = (await searchParams) || {};
  const filters = {
    accountId: first(params.accountId) || "", ticket: first(params.ticket) || "", symbol: first(params.symbol) || "",
    status: first(params.status) || "", result: first(params.result) || "", tradeType: first(params.tradeType) || "",
    reviewStatus: first(params.reviewStatus) || "", source: first(params.source) || "", dateFrom: first(params.dateFrom) || "", dateTo: first(params.dateTo) || "",
  };
  const page = first(params.page) || "1";
  const query = new URLSearchParams({ limit: "50", page });
  appendParam(query, "accountId", filters.accountId); appendParam(query, "ticket", filters.ticket); appendParam(query, "symbol", filters.symbol);
  appendParam(query, "status", filters.status); appendParam(query, "direction", filters.tradeType); appendParam(query, "source", filters.source);
  appendParam(query, "dateFrom", filters.dateFrom); appendParam(query, "dateTo", filters.dateTo);

  const [prismaData, summaryData, accountRecords] = await Promise.all([
    fetchJournalApi<PrismaTradesResponse>(`/api/journal/trades?${query.toString()}`),
    fetchJournalApi<JournalSummaryResponse>(`/api/journal/summary?${query.toString()}`),
    prisma.tradingAccount.findMany({ where: { userId: session.user.id }, select: { id: true, name: true, broker: true, platform: true, mt5AccountNumber: true, accountType: true, currency: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const activeAccount = accountRecords.find((account) => account.id === filters.accountId) || null;
  const activeCoachActions = await prisma.tradeCoachCommitment.findMany({
    where: { userId: session.user.id, status: "ACCEPTED", ...(activeAccount ? { accountId: activeAccount.id } : {}) },
    orderBy: { acceptedAt: "desc" },
    take: activeAccount ? 1 : 4,
    select: { sourceTradeId: true, accountId: true, actionText: true, category: true, acknowledgedAt: true, acceptedAt: true },
  });
  const coachNextTradeOpened = await Promise.all(activeCoachActions.map(async (action) => {
    if (!action.acceptedAt) return false;
    const next = await prisma.trade.findFirst({
      where: { userId: session.user.id, accountId: action.accountId, openedAt: { gt: action.acceptedAt } },
      select: { id: true },
    });
    return Boolean(next);
  }));
  const activeAccountNumber = accountDisplayNumber(activeAccount);
  const currency = activeAccount?.currency || "USD";
  let trades = (prismaData.data?.trades || prismaData.trades || []).map(mapPrismaTradeToJournalTrade);
  const summary = summaryData.summary;
  if (filters.result) trades = trades.filter((trade) => trade.result === filters.result);
  if (filters.reviewStatus) trades = trades.filter((trade) => filters.reviewStatus === "reviewed" ? reviewStatus(trade.strategyReview) === "Reviewed" : reviewStatus(trade.strategyReview) !== "Reviewed");
  const pagination = prismaData.data?.pagination || prismaData.pagination || { page: Number(page), limit: 50, total: trades.length, totalPages: 1 };
  const profitFactorPercent = summary.profitFactor === null ? 0 : (summary.profitFactor / (summary.profitFactor + 1)) * 100;
  const avgWin = Math.abs(summary.averageWin || 0); const avgLoss = Math.abs(summary.averageLoss || 0); const avgTotal = Math.max(1, avgWin + avgLoss);
  const activeFilterCount =
    Object.entries(filters).filter(
      ([key, value]) => !["accountId", "dateFrom", "dateTo"].includes(key) && Boolean(value)
    ).length + (filters.dateFrom || filters.dateTo ? 1 : 0);
  const selectedTradeDate =
    filters.dateFrom === filters.dateTo && /^\d{4}-\d{2}-\d{2}$/.test(filters.dateFrom)
      ? filters.dateFrom
      : "";

  const controlClass = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-cyan-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
  return (
    <div className="space-y-5 text-slate-950 dark:text-slate-100">
      <JournalAutoRefresh />
      <div className="grid gap-4 xl:grid-cols-[minmax(420px,1fr)_minmax(0,650px)] xl:items-center xl:gap-4">
        <div data-dashboard-tour="journal-title" className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white"><DashboardText k="journal.trades.title" /></h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400 xl:whitespace-nowrap"><DashboardText k="journal.trades.subtitle" /></p>
        </div>
        <div className="grid min-w-0 gap-2.5 sm:grid-cols-[minmax(300px,1fr)_240px]">
          <AccountScopeSelect accounts={accountRecords} currentAccountId={filters.accountId} language={language} />
          <TradeDateSelect currentDate={selectedTradeDate} totalTrades={summary.totalTrades} language={language} />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"><div className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0" /><span>{language === "fa" ? "برای ثبت خودکار معامله و اسکرین‌شات، معامله را در MetaTrader باز کنید و از فعال بودن اتصال MT5 مطمئن شوید." : "For automatic trade and screenshot capture, open the trade in MetaTrader and make sure the MT5 connection is active."}</span></div></div>

      {activeCoachActions.map((action, index) => (
        <TradeCoachActiveReminder
          key={action.sourceTradeId}
          sourceTradeId={action.sourceTradeId}
          accountName={accountRecords.find((account) => account.id === action.accountId)?.name || ""}
          actionText={action.actionText}
          category={action.category}
          initialAcknowledgedAt={action.acknowledgedAt?.toISOString() ?? null}
          nextTradeAlreadyOpened={coachNextTradeOpened[index]}
        />
      ))}

      <div data-dashboard-tour="journal-summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard><div className="flex items-center justify-between"><MetricLabel>{language === "fa" ? "سود و زیان تجمعی" : "Cumulative P&L"}</MetricLabel><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{summary.totalTrades}</span></div><div className={cn("mt-3 text-3xl font-bold", summary.totalPnL > 0 ? "text-emerald-500" : summary.totalPnL < 0 ? "text-rose-500" : "text-slate-900 dark:text-white")}>{formatMoney(summary.totalPnL, currency, true)}</div><PnlChart trades={trades} /></MetricCard>
        <MetricCard><div className="flex h-full items-center justify-between gap-4"><div><MetricLabel>{language === "fa" ? "ضریب سود" : "Profit factor"}</MetricLabel><div className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">{formatNumber(summary.profitFactor, 2)}</div></div><Ring percent={profitFactorPercent} color="#4cc39a" /></div></MetricCard>
        <MetricCard><MetricLabel>{language === "fa" ? "درصد برد معاملات" : "Trade win %"}</MetricLabel><div className="mt-3 flex items-center justify-between gap-3"><div className="text-3xl font-bold text-slate-950 dark:text-white">{formatNumber(summary.winRate, 2)}%</div><Ring percent={summary.winRate} color="#4cc39a" /></div><div className="mt-1 flex justify-end gap-2 text-xs font-bold"><span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300">{summary.winningTrades}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500 dark:bg-slate-800 dark:text-slate-300">{summary.breakEvenTrades}</span><span className="rounded-full bg-rose-50 px-2 py-1 text-rose-500 dark:bg-rose-500/15 dark:text-rose-300">{summary.losingTrades}</span></div></MetricCard>
        <MetricCard><MetricLabel>{language === "fa" ? "میانگین برد / باخت" : "Avg win/loss trade"}</MetricLabel><div className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">{avgLoss ? formatNumber(avgWin / avgLoss, 2) : "–"}</div><div className="mt-5 flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="bg-emerald-500" style={{ width: `${(avgWin / avgTotal) * 100}%` }} /><span className="bg-rose-400" style={{ width: `${(avgLoss / avgTotal) * 100}%` }} /></div><div className="mt-2 flex justify-between text-sm font-bold"><span className="text-emerald-500">{formatMoney(avgWin, currency)}</span><span className="text-rose-500">-{formatMoney(avgLoss, currency)}</span></div></MetricCard>
      </div>

      <details data-dashboard-tour="journal-filters" className="group rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]" open={activeFilterCount > 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden [&::-webkit-details-marker]:hidden"><div className="flex items-center gap-3"><Settings2 className="h-5 w-5 text-slate-500" /><div><div className="text-sm font-bold text-slate-900 dark:text-white">{language === "fa" ? "فیلتر معاملات" : "Trade filters"}</div><div className="text-xs text-slate-500 dark:text-slate-400">{activeFilterCount ? `${activeFilterCount} active` : language === "fa" ? "برای نمایش فیلترها کلیک کنید" : "Click to show filters"}</div></div></div><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" /></summary>
        <form className="grid gap-3 border-t border-slate-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 dark:border-slate-800">
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>Position ID</span><input name="ticket" defaultValue={filters.ticket} placeholder="253029751" className={controlClass} /></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>Symbol</span><input name="symbol" defaultValue={filters.symbol} placeholder="XAUUSD" className={controlClass} /></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>Status</span><select name="status" defaultValue={filters.status} className={controlClass}><option value="">All</option><option value="OPEN">Open</option><option value="CLOSED">Closed</option></select></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>Result</span><select name="result" defaultValue={filters.result} className={controlClass}><option value="">All</option><option value="open">Open</option><option value="win">Win</option><option value="loss">Loss</option><option value="breakeven">Breakeven</option></select></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>Review</span><select name="reviewStatus" defaultValue={filters.reviewStatus} className={controlClass}><option value="">All</option><option value="not-reviewed">Not reviewed</option><option value="reviewed">Reviewed</option></select></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>Side</span><select name="tradeType" defaultValue={filters.tradeType} className={controlClass}><option value="">All</option><option value="BUY">Buy</option><option value="SELL">Sell</option></select></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>From</span><input name="dateFrom" type="date" defaultValue={filters.dateFrom} className={controlClass} /></label>
          <label className="space-y-1.5 text-xs font-semibold text-slate-500"><span>To</span><input name="dateTo" type="date" defaultValue={filters.dateTo} className={controlClass} /></label>
          <div className="flex items-end gap-2 sm:col-span-2"><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 text-sm font-bold text-white transition hover:bg-cyan-600"><Search className="h-4 w-4" />Apply</button><Link href={filters.accountId ? `/journal?accountId=${encodeURIComponent(filters.accountId)}` : "/journal"} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700" aria-label="Clear filters"><RotateCcw className="h-4 w-4" /></Link></div>
        </form>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]"><summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 marker:hidden [&::-webkit-details-marker]:hidden"><div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><Plus className="h-4 w-4 text-cyan-500" />{language === "fa" ? "افزودن یا ایمپورت معامله" : "Add or import trades"}</div><ChevronDown className="h-4 w-4 text-slate-400" /></summary><div className="space-y-4 border-t border-slate-100 p-4 dark:border-slate-800" data-dashboard-tour="journal-manual-entry"><ManualTradeForm accountId={activeAccount?.id} accountLabel={activeAccountNumber || undefined} /><TradeImportPanel /></div></details>

      <section data-dashboard-tour="journal-trade-list" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-base font-bold text-slate-950 dark:text-white">{language === "fa" ? "معاملات" : "Trades"}</h2><p className="mt-0.5 text-xs text-slate-500">{pagination.total} {language === "fa" ? "معامله — برای مشاهده جزئیات روی ردیف کلیک کنید" : "trades — click a row to view details"}</p></div><Settings2 className="h-5 w-5 text-slate-400" /></div>
        {trades.length ? <div className="max-h-[382px] overflow-auto [scrollbar-gutter:stable]"><table className="w-full min-w-[1540px] border-collapse text-left" dir="ltr"><thead><tr className="border-b border-slate-200 text-xs font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">{["Status", "Net P&L", "Target", "Initial risk", "SL", "Open time", "Symbol", "Side", "Duration", "Session", "Close time", "Account", "Review", ""].map((label, index) => <th key={`${label}-${index}`} className="sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-4 py-3.5 dark:bg-slate-900">{label}</th>)}</tr></thead><tbody>{trades.map((trade) => <TradeRow key={trade._id} trade={trade} language={language} accountId={filters.accountId} currency={currency} />)}</tbody></table></div> : <div className="flex flex-col items-center justify-center px-4 py-16 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Plus className="h-5 w-5" /></div><h3 className="mt-4 font-bold text-slate-900 dark:text-white"><DashboardText k="journal.trades.emptyTitle" /></h3><p className="mt-1 text-sm text-slate-500"><DashboardText k="journal.trades.emptyDescription" /></p></div>}
      </section>

      <div className="flex items-center justify-between text-sm text-slate-500"><span><DashboardText k="journal.trades.page" /> {pagination.page} <DashboardText k="journal.trades.of" /> {pagination.totalPages}</span><div className="flex gap-2"><Link href={buildPageHref(Math.max(pagination.page - 1, 1), filters)} className={cn("rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#111827]", pagination.page <= 1 && "pointer-events-none opacity-40")}><DashboardText k="journal.trades.previous" /></Link><Link href={buildPageHref(Math.min(pagination.page + 1, pagination.totalPages), filters)} className={cn("rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#111827]", pagination.page >= pagination.totalPages && "pointer-events-none opacity-40")}><DashboardText k="journal.trades.next" /></Link></div></div>
    </div>
  );
}
