"use client";

import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { StrategyAnalyticsDto } from "@/types/playbooks";

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function valueTone(value: number | null | undefined) {
  const number = Number(value || 0);
  return cn(number > 0 && "text-emerald-300", number < 0 && "text-red-300");
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
      <div className="text-xs font-medium uppercase text-slate-400">{label}</div>
      <div className={cn("mt-1 text-sm font-semibold text-white", tone)}>{value}</div>
    </div>
  );
}

export function StrategyPerformanceSummary({
  analytics,
  compact = false,
}: {
  analytics: StrategyAnalyticsDto | undefined;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const data = analytics || {
    totalTrades: 0,
    netPnl: 0,
    winRate: 0,
    lossRate: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: null,
    averageRR: 0,
    bestTrade: null,
    worstTrade: null,
  };

  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4")}>
      <Metric label={t("journal.analytics.totalTrades")} value={formatNumber(data.totalTrades, 0)} />
      <Metric label={t("journal.analytics.winRate")} value={`${formatNumber(data.winRate, 1)}%`} tone="text-emerald-300" />
      <Metric label={t("journal.analytics.netPnl")} value={formatMoney(data.netPnl)} tone={valueTone(data.netPnl)} />
      <Metric label={t("journal.analytics.profitFactor")} value={formatNumber(data.profitFactor, 2)} />
      {!compact ? (
        <>
          <Metric label={t("journal.analytics.lossRate")} value={`${formatNumber(data.lossRate, 1)}%`} />
          <Metric label={t("journal.analytics.averageWin")} value={formatMoney(data.averageWin)} tone="text-emerald-300" />
          <Metric label={t("journal.analytics.averageLoss")} value={formatMoney(data.averageLoss)} tone="text-red-300" />
          <Metric label={t("journal.analytics.averageRr")} value={formatNumber(data.averageRR, 2)} />
          <Metric label={t("journal.analytics.bestTrade")} value={data.bestTrade ? formatMoney(data.bestTrade.pnl) : "$0.00"} tone="text-emerald-300" />
          <Metric label={t("journal.analytics.worstTrade")} value={data.worstTrade ? formatMoney(data.worstTrade.pnl) : "$0.00"} tone="text-red-300" />
        </>
      ) : null}
    </div>
  );
}
