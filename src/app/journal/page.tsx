import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, CalendarDays, ChevronDown, CreditCard, Eye, Info, Plus, RotateCcw, Search } from "lucide-react";
import {
  fetchJournalApi,
  type JournalTradeDto,
  type JournalSummaryResponse,
  mapPrismaTradeToJournalTrade,
  type PrismaTradesResponse,
} from "@/app/journal/_lib/journal-api";
import { AccountScopeSelect } from "@/app/journal/account-scope-select";
import { DeleteTradeButton } from "@/app/journal/delete-trade-button";
import { ManualTradeForm } from "@/app/journal/manual-trade-form";
import { TradeImportPanel } from "@/app/journal/trade-import-panel";
import { JournalAutoRefresh } from "@/app/journal/journal-auto-refresh";
import { DashboardText } from "@/components/dashboard/DashboardText";
import { StrategyComplianceBadge } from "@/components/journal/StrategyComplianceBadge";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  type Language,
} from "@/lib/language-preferences";
import {
  EXCEL_JOURNAL_IMPORT_SOURCE,
  MT5_HTML_IMPORT_SOURCE,
  isImportedTradeSource,
} from "@/lib/journal/trade-source";
import { getSession } from "@/lib/server-auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type JournalPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function appendParam(params: URLSearchParams, name: string, value: string | undefined) {
  if (value && value.trim()) {
    params.set(name, value.trim());
  }
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value: string | null | undefined, language: Language) {
  if (!value) {
    return language === "fa" ? "بدون تاریخ" : "No date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

type JournalAccountHeader = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
  mt5AccountNumber: string | null;
};

function accountDisplayNumber(account: JournalAccountHeader | null) {
  return account?.mt5AccountNumber || account?.name || null;
}

function tradeDateKey(trade: JournalTradeDto) {
  if (!trade.openTime) {
    return "undated";
  }

  const date = new Date(trade.openTime);

  if (Number.isNaN(date.getTime())) {
    return "undated";
  }

  return date.toISOString().slice(0, 10);
}

function groupTradesByDate(trades: JournalTradeDto[], language: Language) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      trades: JournalTradeDto[];
      totalPnl: number;
    }
  >();

  for (const trade of trades) {
    const key = tradeDateKey(trade);
    const group = groups.get(key) || {
      key,
      label:
        key === "undated"
          ? language === "fa"
            ? "بدون تاریخ"
            : "No date"
          : formatDateOnly(trade.openTime, language),
      trades: [],
      totalPnl: 0,
    };

    group.trades.push(trade);
    group.totalPnl += Number(trade.profit || 0);
    groups.set(key, group);
  }

  return Array.from(groups.values());
}

function badgeClass(kind: "status" | "side", value: string | null | undefined) {
  const normalized = String(value || "").toLowerCase();

  if (kind === "side") {
    return normalized === "sell"
      ? "border-red-500/30 bg-red-500/10 text-[#EF4444]"
      : "border-emerald-500/30 bg-emerald-500/10 text-[#10B981]";
  }

  if (normalized === "closed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-[#10B981]";
  }

  if (normalized === "open") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function reviewStatus(strategyReview: { followedPlan?: string | null } | null | undefined) {
  if (!strategyReview || strategyReview.followedPlan === "NOT_REVIEWED") {
    return "Not Reviewed";
  }

  return "Reviewed";
}

function reviewStatusBadgeClass(value: string) {
  if (value === "Reviewed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: ReactNode;
  value: string;
  tone?: "neutral" | "profit" | "loss" | "blue";
}) {
  const toneClass =
    tone === "profit"
      ? "text-emerald-300"
      : tone === "loss"
        ? "text-red-300"
        : tone === "blue"
          ? "text-blue-200"
          : "text-white";

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-400">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold", toneClass)}>{value}</div>
    </div>
  );
}

function sourceLabel(source: string | null | undefined, setup: string | null | undefined, language: Language) {
  if (source?.trim().toUpperCase() === "CTRADER_DIRECT") {
    return "cTrader";
  }

  if (source === MT5_HTML_IMPORT_SOURCE) {
    return "MT5 HTML";
  }

  if (source === EXCEL_JOURNAL_IMPORT_SOURCE) {
    return "Excel";
  }

  if (source === "expert_advisor" || isImportedTradeSource(source, setup)) {
    return "MT5";
  }

  return language === "fa" ? "دستی" : "Manual";
}

function TradeRow({
  trade,
  language,
  accountId,
}: {
  trade: JournalTradeDto;
  language: Language;
  accountId?: string;
}) {
  const hasChecklistCompliance =
    typeof trade.checklistCompletionPercent === "number";
  const compliancePercent = hasChecklistCompliance
    ? trade.checklistCompletionPercent
    : trade.strategyReview?.compliancePercent;
  const detailHref = accountId
    ? `/journal/${trade._id}?accountId=${encodeURIComponent(accountId)}`
    : `/journal/${trade._id}`;

  return (
    <tr className="text-[#E5E7EB] hover:bg-slate-800/50">
      <td className="whitespace-nowrap px-4 py-4 text-slate-300">
        {formatDate(trade.openTime, language)}
      </td>
      <td className="px-3 py-4 font-semibold text-white">
        <Link href={detailHref} className="hover:text-blue-200">
          {trade.symbol}
        </Link>
      </td>
      <td className="whitespace-nowrap px-3 py-4 font-mono text-xs text-slate-300">
        {trade.positionId || trade.ticket || "-"}
      </td>
      <td className="px-3 py-4">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize",
            badgeClass("side", trade.tradeType)
          )}
        >
          {trade.tradeType === "sell" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )}
          <DashboardText k={trade.tradeType === "sell" ? "journal.tradeDetail.sell" : "journal.tradeDetail.buy"} />
        </span>
      </td>
      <td className="px-3 py-4">
        <span
          className={cn(
            "inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize",
            badgeClass("status", trade.status)
          )}
        >
          <DashboardText
            k={
              trade.status === "closed"
                ? "journal.tradeDetail.closed"
                : trade.status === "open"
                  ? "journal.tradeDetail.open"
                  : "journal.tradeDetail.cancelled"
            }
          />
        </span>
      </td>
      <td className="px-3 py-4">{formatNumber(trade.lotSize, 3)}</td>
      <td className="px-3 py-4 text-slate-300">{trade.accountNumber || "-"}</td>
      <td className="px-3 py-4 text-slate-300">
        {trade.strategyReview?.strategyNameSnapshot || trade.setup || "-"}
      </td>
      <td className="px-3 py-4 text-slate-300">
        {sourceLabel(trade.source || trade.entrySource, trade.setup, language)}
      </td>
      <td className="px-3 py-4">
        <span
          className={cn(
            "inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold",
            reviewStatusBadgeClass(reviewStatus(trade.strategyReview))
          )}
        >
          {reviewStatus(trade.strategyReview)}
        </span>
      </td>
      <td className="px-3 py-4">
        <StrategyComplianceBadge
          percent={compliancePercent}
          violatedRules={hasChecklistCompliance ? 0 : trade.strategyReview?.violatedRules || 0}
          reviewed={hasChecklistCompliance || Boolean(trade.strategyReview && trade.strategyReview.followedPlan !== "NOT_REVIEWED")}
        />
      </td>
      <td className="px-3 py-4">{formatNumber(trade.entryPrice, 5)}</td>
      <td className="px-3 py-4">{formatNumber(trade.stopLoss, 5)}</td>
      <td className="px-3 py-4">{formatNumber(trade.takeProfit, 5)}</td>
      <td className="px-3 py-4">{formatNumber(trade.closePrice, 5)}</td>
      <td
        className={cn(
          "px-3 py-4 font-semibold",
          Number(trade.profit || 0) > 0 && "text-[#10B981]",
          Number(trade.profit || 0) < 0 && "text-[#EF4444]",
          !trade.profit && "text-slate-300"
        )}
      >
        {formatNumber(trade.profit, 2)}
      </td>
      <td className="px-3 py-4">{formatNumber(trade.actualRR, 2)}</td>
      <td className="px-3 py-4">
        <div className="flex flex-wrap gap-2">
          <Link
            href={detailHref}
            className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-800 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            aria-label={language === "fa" ? "باز کردن بررسی معامله" : "Open trade review"}
            title={language === "fa" ? "باز کردن بررسی معامله" : "Open trade review"}
          >
            <Eye className="h-4 w-4" />
            {language === "fa" ? "بررسی" : "Open trade review"}
          </Link>
          <DeleteTradeButton
            tradeId={trade._id}
            symbol={trade.symbol}
            language={language}
          />
        </div>
      </td>
    </tr>
  );
}

function buildPageHref(page: number, values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", "50");

  for (const [name, value] of Object.entries(values)) {
    appendParam(params, name, value);
  }

  return `/journal?${params.toString()}`;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const languageCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const language: Language =
    languageCookie === "en" || languageCookie === "fa"
      ? languageCookie
      : DEFAULT_LANGUAGE;
  const params = (await searchParams) || {};
  const filters = {
    accountId: first(params.accountId) || "",
    ticket: first(params.ticket) || "",
    symbol: first(params.symbol) || "",
    status: first(params.status) || "",
    result: first(params.result) || "",
    tradeType: first(params.tradeType) || "",
    reviewStatus: first(params.reviewStatus) || "",
    source: first(params.source) || "",
    dateFrom: first(params.dateFrom) || "",
    dateTo: first(params.dateTo) || "",
  };
  const page = first(params.page) || "1";
  const query = new URLSearchParams();
  query.set("limit", "50");
  query.set("page", page);

  appendParam(query, "accountId", filters.accountId);
  appendParam(query, "ticket", filters.ticket);
  appendParam(query, "symbol", filters.symbol);
  appendParam(query, "status", filters.status);
  appendParam(query, "direction", filters.tradeType);
  appendParam(query, "source", filters.source);
  appendParam(query, "dateFrom", filters.dateFrom);
  appendParam(query, "dateTo", filters.dateTo);

  const [prismaData, summaryData, accountRecords] = await Promise.all([
    fetchJournalApi<PrismaTradesResponse>(`/api/journal/trades?${query.toString()}`),
    fetchJournalApi<JournalSummaryResponse>(`/api/journal/summary?${query.toString()}`),
    prisma.tradingAccount.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        broker: true,
        platform: true,
        mt5AccountNumber: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const activeAccount =
    accountRecords.find((account) => account.id === filters.accountId) || null;
  const activeAccountNumber = accountDisplayNumber(activeAccount);
  let trades = (prismaData.data?.trades || prismaData.trades || []).map(
    mapPrismaTradeToJournalTrade
  );
  const summary = summaryData.summary;

  if (filters.result) {
    trades = trades.filter((trade) => trade.result === filters.result);
  }

  if (filters.reviewStatus) {
    trades = trades.filter((trade) => {
      const status = reviewStatus(trade.strategyReview);

      return filters.reviewStatus === "reviewed"
        ? status === "Reviewed"
        : status !== "Reviewed";
    });
  }

  const pagination =
    prismaData.data?.pagination || prismaData.pagination || {
      page: Number(page),
      limit: 50,
      total: trades.length,
      totalPages: 1,
    };
  const groupedTrades = groupTradesByDate(trades, language);

  return (
    <div className="space-y-5">
      <JournalAutoRefresh />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div data-dashboard-tour="journal-title">
          <h1 className="text-2xl font-semibold text-white"><DashboardText k="journal.trades.title" /></h1>
          <p className="mt-1 text-sm text-slate-400">
            <DashboardText k="journal.trades.subtitle" />
          </p>
          <div className="mt-3 max-w-3xl rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100 shadow-sm shadow-red-950/20">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
              <div className="space-y-1">
                <p className="font-semibold text-red-100" dir={language === "fa" ? "rtl" : "ltr"}>
                  {language === "fa"
                    ? "برای ثبت خودکار معامله و اسکرین‌شات، ابتدا معامله را داخل MetaTrader باز کنید و مطمئن شوید اتصال MT5 فعال است."
                    : "To automatically record the trade and screenshots, open the trade in MetaTrader first and make sure the MT5 connection is active."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0F172A] px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-200">
              <CreditCard className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase text-slate-400">
                {language === "fa" ? "حساب فعال" : "Active account"}
              </div>
              <div className="mt-1 truncate text-base font-semibold text-white">
                {activeAccountNumber
                  ? language === "fa"
                    ? `شماره حساب ${activeAccountNumber}`
                    : `Account ${activeAccountNumber}`
                  : language === "fa"
                    ? "همه حساب‌ها"
                    : "All accounts"}
              </div>
              {activeAccount ? (
                <div className="mt-1 truncate text-xs text-slate-400">
                  {[activeAccount.broker, activeAccount.platform].filter(Boolean).join(" / ") || "-"}
                </div>
              ) : filters.accountId ? (
                <div className="mt-1 text-xs text-red-200">
                  {language === "fa"
                    ? "این حساب پیدا نشد یا برای کاربر فعلی نیست."
                    : "This account was not found for the current user."}
                </div>
              ) : null}
            </div>
          </div>
          <AccountScopeSelect
            accounts={accountRecords}
            currentAccountId={filters.accountId}
            language={language}
          />
        </div>
      </div>

      <div data-dashboard-tour="journal-manual-entry">
        <ManualTradeForm
          accountId={activeAccount?.id}
          accountLabel={activeAccountNumber || undefined}
        />
      </div>

      <TradeImportPanel />

      <div data-dashboard-tour="journal-summary" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={<DashboardText k="journal.analytics.totalTrades" />}
          value={formatNumber(summary.totalTrades, 0)}
          tone="blue"
        />
        <SummaryCard
          label={<DashboardText k="journal.analytics.winRate" />}
          value={`${formatNumber(summary.winRate, 1)}%`}
          tone="profit"
        />
        <SummaryCard
          label={<DashboardText k="journal.analytics.totalNetPnl" />}
          value={formatNumber(summary.totalPnL, 2)}
          tone={summary.totalPnL > 0 ? "profit" : summary.totalPnL < 0 ? "loss" : "neutral"}
        />
        <SummaryCard
          label={<DashboardText k="journal.analytics.profitFactor" />}
          value={formatNumber(summary.profitFactor, 2)}
        />
      </div>

      <div data-dashboard-tour="journal-filters" className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white"><DashboardText k="journal.trades.filters" /></h2>
            <p className="text-xs text-slate-400"><DashboardText k="journal.trades.filtersDescription" /></p>
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-12">
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400 2xl:col-span-2">
            {language === "fa" ? "حساب" : "Account"}
            <select
              name="accountId"
              defaultValue={filters.accountId}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            >
              <option value="">{language === "fa" ? "همه حساب‌ها" : "All accounts"}</option>
              {accountRecords.map((account) => {
                const displayNumber = accountDisplayNumber(account);
                const brokerLabel = [account.broker, account.platform]
                  .filter(Boolean)
                  .join(" / ");

                return (
                  <option key={account.id} value={account.id}>
                    {displayNumber}
                    {brokerLabel ? ` - ${brokerLabel}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            Position ID
            <input
              name="ticket"
              defaultValue={filters.ticket}
              inputMode="numeric"
              placeholder="253029751"
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-blue-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            <DashboardText k="journal.tradeDetail.symbol" />
            <input
              name="symbol"
              defaultValue={filters.symbol}
              placeholder="EURUSD"
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm uppercase text-[#E5E7EB] outline-none focus:border-blue-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            <DashboardText k="journal.tradeDetail.status" />
            <select
              name="status"
              defaultValue={filters.status}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            >
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            <DashboardText k="journal.trades.result" />
            <select
              name="result"
              defaultValue={filters.result}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="win">Win</option>
              <option value="loss">Loss</option>
              <option value="breakeven">Breakeven</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            Review
            <select
              name="reviewStatus"
              defaultValue={filters.reviewStatus}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            >
              <option value="">All</option>
              <option value="not-reviewed">Not Reviewed</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            Source
            <select
              name="source"
              defaultValue={filters.source}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            >
              <option value="">All</option>
              <option value="MANUAL">Manual</option>
              <option value="MT5">MT5</option>
              <option value="MT5_HTML">MT5 HTML</option>
              <option value="EXCEL">Excel</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            <DashboardText k="journal.trades.buySell" />
            <select
              name="tradeType"
              defaultValue={filters.tradeType}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            >
              <option value="">All</option>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            <DashboardText k="journal.trades.from" />
            <input
              name="dateFrom"
              type="date"
              defaultValue={filters.dateFrom}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            <DashboardText k="journal.trades.to" />
            <input
              name="dateTo"
              type="date"
              defaultValue={filters.dateTo}
              className="h-11 w-full rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
            />
          </label>
          <div className="flex gap-2 self-end">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Search className="h-4 w-4" />
              <DashboardText k="journal.trades.filter" />
            </button>
            <Link
              href={
                filters.accountId
                  ? `/journal?accountId=${encodeURIComponent(filters.accountId)}`
                  : "/journal"
              }
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800"
              aria-label="Clear filters"
              title="Clear filters"
            >
              <RotateCcw className="h-4 w-4" />
            </Link>
          </div>
        </form>
      </div>

      {groupedTrades.length > 0 ? (
        <div data-dashboard-tour="journal-trade-list" className="space-y-3">
          {groupedTrades.map((group, index) => (
            <details
              key={group.key}
              open={index === 0}
              className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] shadow-sm [&[open]>summary_.date-chevron]:rotate-180"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 border-b border-slate-800 bg-[#111827] px-4 py-3 marker:hidden sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-[#0F172A] text-blue-300">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">{group.label}</h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {group.trades.length} معامله
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-semibold",
                      group.totalPnl > 0 && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
                      group.totalPnl < 0 && "border-red-500/30 bg-red-500/10 text-red-200",
                      group.totalPnl === 0 && "border-slate-700 bg-slate-900 text-slate-300"
                    )}
                  >
                    PnL: {formatNumber(group.totalPnl, 2)}
                  </span>
                  <ChevronDown className="date-chevron h-4 w-4 text-slate-500 transition-transform" />
                </div>
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1580px] text-left text-sm">
                  <thead className="border-b border-slate-800 bg-[#111827]/80 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3"><DashboardText k="journal.trades.openTime" /></th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.symbol" /></th>
                      <th className="px-3 py-3">Position ID</th>
                      <th className="px-3 py-3"><DashboardText k="journal.trades.direction" /></th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.status" /></th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.lotSize" /></th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.account" /></th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.strategy" /></th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3">Review Status</th>
                      <th className="px-3 py-3"><DashboardText k="journal.trades.compliance" /></th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.entry" /></th>
                      <th className="px-3 py-3">SL</th>
                      <th className="px-3 py-3">TP</th>
                      <th className="px-3 py-3"><DashboardText k="journal.tradeDetail.exit" /></th>
                      <th className="px-3 py-3">PnL</th>
                      <th className="px-3 py-3">R:R</th>
                      <th className="px-3 py-3"><DashboardText k="journal.trades.actions" /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {group.trades.map((trade) => (
                      <TradeRow
                        key={trade._id}
                        trade={trade}
                        language={language}
                        accountId={filters.accountId}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div data-dashboard-tour="journal-trade-list" className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] shadow-sm">
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-800 bg-[#111827] text-slate-400">
              <Plus className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-white"><DashboardText k="journal.trades.emptyTitle" /></h3>
            <p className="mt-1 text-sm text-slate-400"><DashboardText k="journal.trades.emptyDescription" /></p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          <DashboardText k="journal.trades.page" /> {pagination.page} <DashboardText k="journal.trades.of" /> {pagination.totalPages} / {pagination.total} <DashboardText k="journal.analytics.trades" />
        </span>
        <div className="flex gap-2">
          <Link
            href={buildPageHref(Math.max(pagination.page - 1, 1), filters)}
            className={cn(
              "rounded-xl border border-slate-800 px-3 py-2 hover:bg-slate-800",
              pagination.page <= 1 && "pointer-events-none opacity-40"
            )}
          >
            <DashboardText k="journal.trades.previous" />
          </Link>
          <Link
            href={buildPageHref(Math.min(pagination.page + 1, pagination.totalPages), filters)}
            className={cn(
              "rounded-xl border border-slate-800 px-3 py-2 hover:bg-slate-800",
              pagination.page >= pagination.totalPages && "pointer-events-none opacity-40"
            )}
          >
            <DashboardText k="journal.trades.next" />
          </Link>
        </div>
      </div>
    </div>
  );
}
