"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Brain, CalendarDays, ChevronDown, ClipboardCheck, Edit, Lock, Plus, Trash2 } from "lucide-react";
import { PnlText } from "@/components/dashboard/PnlText";
import { TradeDirectionBadge } from "@/components/dashboard/TradeDirectionBadge";
import { TradeStatusBadge } from "@/components/dashboard/TradeStatusBadge";
import { useLanguage } from "@/lib/language-context";
import { isTradeManuallyReviewed } from "@/lib/trade-review-status";
import {
  formatDate,
  formatNumber,
  toNumber,
  type TradeDto,
} from "@/components/dashboard/types";

function reviewStatusKey(trade: TradeDto) {
  if (isTradeManuallyReviewed(trade)) {
    return "dashboard.reviewStatus.reviewed";
  }

  return "dashboard.reviewStatus.notReviewed";
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) {
    return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  }

  if (score >= 80) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (score >= 60) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-200";
  }

  return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-200";
}

function reviewStatusClass(trade: TradeDto) {
  if (isTradeManuallyReviewed(trade)) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  return "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
}

function aiActionKey(trade: TradeDto, aiAnalysisEnabled: boolean) {
  if (!aiAnalysisEnabled && trade.aiReviewStatus !== "REVIEWED") {
    return "dashboard.aiReview.upgrade";
  }

  if (trade.aiReviewStatus === "REVIEWED") {
    return "dashboard.aiReview.view";
  }

  if (trade.aiReviewStatus === "FAILED") {
    return "dashboard.aiReview.retry";
  }

  return "dashboard.aiReview.generate";
}

function planComplianceLabel(trade: TradeDto) {
  if (typeof trade.checklistCompletionPercent === "number") {
    return `${Math.round(trade.checklistCompletionPercent)}%`;
  }

  if (!trade.strategyReview || trade.strategyReview.followedPlan === "NOT_REVIEWED") {
    return "-";
  }

  return `${Math.round(trade.strategyReview.compliancePercent)}%`;
}

function tradeDateKey(trade: TradeDto) {
  return trade.openedAt?.slice(0, 10) || "undated";
}

function tradeCountLabel(count: number, language: "en" | "fa") {
  if (language === "fa") {
    return `${count} معامله`;
  }

  return `${count} ${count === 1 ? "trade" : "trades"}`;
}

function currentStopLoss(trade: TradeDto) {
  return trade.currentStopLoss ?? trade.stopLoss;
}

function currentTakeProfit(trade: TradeDto) {
  return trade.currentTakeProfit ?? trade.takeProfit;
}

function groupTradesByDate(trades: TradeDto[], language: "en" | "fa") {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      trades: TradeDto[];
      totalPnl: number;
      currency: string;
    }
  >();

  trades.forEach((trade) => {
    const key = tradeDateKey(trade);
    const group = groups.get(key) || {
      key,
      label: key === "undated" ? (language === "fa" ? "بدون تاریخ" : "Undated") : formatDate(trade.openedAt),
      trades: [],
      totalPnl: 0,
      currency: trade.account?.currency || "USD",
    };
    const pnl = toNumber(trade.profitLoss);

    group.trades.push(trade);
    group.totalPnl += pnl || 0;
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

export function TradeTable({
  trades,
  aiAnalysisEnabled = false,
  onNewTrade,
  onEdit,
  onAIReview,
  onClose,
  onDelete,
}: {
  trades: TradeDto[];
  aiAnalysisEnabled?: boolean;
  onNewTrade?: () => void;
  onEdit?: (trade: TradeDto) => void;
  onAIReview?: (trade: TradeDto) => void;
  onClose?: (trade: TradeDto) => void;
  onDelete?: (trade: TradeDto) => void;
}) {
  const { language, t } = useLanguage();
  const groupedTrades = useMemo(() => groupTradesByDate(trades, language), [trades, language]);
  const planComplianceHeader =
    language === "fa" ? "پایبندی\u00a0به\u00a0پلن" : t("dashboard.table.planCompliance");
  const tableHead = (
    <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400">
      <tr>
        <th className="px-4 py-3">{t("dashboard.table.openTime")}</th>
        <th className="px-3 py-3">{t("dashboard.table.symbol")}</th>
        <th className="px-3 py-3">{t("dashboard.table.direction")}</th>
        <th className="px-3 py-3">{t("dashboard.table.account")}</th>
        <th className="px-3 py-3">{t("dashboard.table.entry")}</th>
        <th className="px-3 py-3">SL</th>
        <th className="px-3 py-3">TP</th>
        <th className="px-3 py-3">{t("dashboard.table.exit")}</th>
        <th className="px-3 py-3">{t("dashboard.table.pnl")}</th>
        <th className="px-3 py-3">{t("dashboard.table.rr")}</th>
        <th className="px-3 py-3">{t("dashboard.table.playbook")}</th>
        <th className="px-3 py-3">{t("dashboard.table.reviewStatus")}</th>
        <th className="px-5 py-3 text-center" style={{ whiteSpace: "nowrap", width: 210 }}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>{planComplianceHeader}</span>
        </th>
        <th className="px-3 py-3 text-left" style={{ whiteSpace: "nowrap", width: 150 }}>
          <span style={{ display: "inline-block", whiteSpace: "nowrap" }}>{t("dashboard.table.status")}</span>
        </th>
        <th className="min-w-[280px] whitespace-nowrap px-3 py-3 text-center">{t("dashboard.table.actions")}</th>
      </tr>
    </thead>
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
      {trades.length > 0 ? (
        <div className="space-y-3 p-3">
          {groupedTrades.map((group, groupIndex) => (
            <details
              key={group.key}
              open={groupIndex === 0}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/30 [&[open]>summary_.date-chevron]:rotate-180"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 bg-slate-50 px-4 py-3 marker:hidden dark:bg-[#111827] sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-600 dark:border-slate-800 dark:bg-[#0F172A] dark:text-blue-300">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-950 dark:text-white">{group.label}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {tradeCountLabel(group.trades.length, language)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PnlText value={group.totalPnl} currency={group.currency} />
                  <ChevronDown className="date-chevron h-4 w-4 text-slate-400 transition-transform" />
                </div>
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[2190px] table-fixed text-left text-sm">
                  <colgroup>
                    <col style={{ width: 150 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 80 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 210 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 330 }} />
                  </colgroup>
                  {tableHead}
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {group.trades.map((trade) => (
                      <tr key={trade.id} className="text-slate-700 hover:bg-slate-50 dark:text-[#E5E7EB] dark:hover:bg-slate-800/50">
                        <td className="whitespace-nowrap px-4 py-4 text-slate-500 dark:text-slate-300">
                          {formatDate(trade.openedAt)}
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-950 dark:text-white">
                          <Link href={`/journal/${trade.id}`} className="hover:text-blue-600 dark:hover:text-blue-200">
                            {trade.symbol}
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          <TradeDirectionBadge direction={trade.direction} />
                        </td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-300">{trade.account?.name || "-"}</td>
                        <td className="px-3 py-3">{formatNumber(trade.entryPrice, 5)}</td>
                        <td className="px-3 py-3 text-red-600 dark:text-red-300">{formatNumber(currentStopLoss(trade), 5)}</td>
                        <td className="px-3 py-3 text-emerald-600 dark:text-emerald-300">{formatNumber(currentTakeProfit(trade), 5)}</td>
                        <td className="px-3 py-3">{formatNumber(trade.exitPrice, 5)}</td>
                        <td className="px-3 py-3">
                          <PnlText
                            value={trade.profitLoss}
                            currency={trade.account?.currency || "USD"}
                          />
                        </td>
                        <td className="px-3 py-3">{formatNumber(trade.rr, 2)}</td>
                        <td className="px-3 py-3 text-slate-500 dark:text-slate-300">
                          {trade.strategyReview?.strategyNameSnapshot || trade.setup || "-"}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold ${reviewStatusClass(trade)}`}>
                            {t(reviewStatusKey(trade))}
                          </span>
                          {trade.aiReviewStatus === "REVIEWED" && trade.aiReviewScore !== null ? (
                            <div className={`mt-1 inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${scoreTone(trade.aiReviewScore)}`}>
                              {t("dashboard.table.aiScore")}: {trade.aiReviewScore}/100
                            </div>
                          ) : null}
                        </td>
                        <td className="px-5 py-3 text-center" style={{ whiteSpace: "nowrap", width: 210 }}>
                          {planComplianceLabel(trade)}
                        </td>
                        <td className="px-3 py-3 text-left" style={{ whiteSpace: "nowrap", width: 150 }}>
                          <TradeStatusBadge status={trade.status} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex justify-center gap-2">
                            {onEdit ? (
                              <button
                                type="button"
                                onClick={() => onEdit(trade)}
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                aria-label={t("dashboard.actions.reviewTrade")}
                                title={t("dashboard.actions.reviewTrade")}
                              >
                                <ClipboardCheck className="h-4 w-4" />
                                {t("dashboard.actions.review")}
                              </button>
                            ) : (
                              <Link
                                href={`/journal/${trade.id}`}
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-blue-500/30 px-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                                aria-label={t("dashboard.actions.reviewTrade")}
                                title={t("dashboard.actions.reviewTrade")}
                              >
                                <ClipboardCheck className="h-4 w-4" />
                                {t("dashboard.actions.review")}
                              </Link>
                            )}
                            {onAIReview ? (
                              (() => {
                                const actionLabel = t(aiActionKey(trade, aiAnalysisEnabled));
                                return (
                                  <button
                                    type="button"
                                    onClick={() => onAIReview(trade)}
                                    disabled={!aiAnalysisEnabled && trade.aiReviewStatus !== "REVIEWED"}
                                    className="inline-flex h-8 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-violet-500/30 px-2.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-violet-300 dark:hover:bg-violet-500/10"
                                    aria-label={actionLabel}
                                    title={actionLabel}
                                  >
                                    <Brain className="h-4 w-4" />
                                    {actionLabel}
                                  </button>
                                );
                              })()
                            ) : null}
                            {onEdit ? (
                              <button
                                type="button"
                                onClick={() => onEdit(trade)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                                aria-label={t("dashboard.actions.editTrade")}
                                title={t("dashboard.actions.editTrade")}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            ) : null}
                            {onClose && trade.status === "OPEN" ? (
                              <button
                                type="button"
                                onClick={() => onClose(trade)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-[#10B981] hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800"
                                aria-label={t("dashboard.actions.closeTrade")}
                                title={t("dashboard.actions.closeTrade")}
                              >
                                <Lock className="h-4 w-4" />
                              </button>
                            ) : null}
                            {onDelete ? (
                              <button
                                type="button"
                                onClick={() => onDelete(trade)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/30 text-[#EF4444] hover:bg-red-500/10"
                                aria-label={t("dashboard.actions.deleteTrade")}
                                title={t("dashboard.actions.deleteTrade")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      ) : null}
      {trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-[#111827]">
            <Plus className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
            {t("dashboard.table.noTrades")}
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("dashboard.table.noTradesHint")}
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/dashboard/accounts"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("dashboard.actions.connectMt5")}
            </Link>
            {onNewTrade ? (
              <button
                type="button"
                onClick={onNewTrade}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
              >
                {t("dashboard.trades.newTrade")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
