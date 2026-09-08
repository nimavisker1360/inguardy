"use client";

import Link from "next/link";
import { memo } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock,
  Info,
  Percent,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import { formatSignalDateTime } from "@/lib/signal-time";

export interface SignalCardProps {
  id: string;
  pair: string;
  type: "buy" | "sell";
  price: number;
  takeProfit: number[];
  stopLoss: number;
  timestamp: string;
  success?: boolean;
  isPremium?: boolean;
  pairColor?: string;
  isOpen?: boolean;
  closeReason?: "TP" | "SL";
  closePrice?: number;
  closedAt?: string;
  createdAt?: string;
  source?: string;
  timeframe?: string;
  ticket?: string;
  resultSource?: "stored" | "derived" | "python";
  detailsHref?: string;
  isDetailsOpen?: boolean;
  onDetails?: () => void;
  className?: string;
}

function formatNumber(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 5,
  });
}

function formatDateTime(value: string | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatSignalDateTime(date);
}

function SignalCardComponent({
  id,
  pair,
  type,
  price,
  takeProfit,
  stopLoss,
  timestamp,
  success,
  isOpen = true,
  closeReason,
  closePrice,
  closedAt,
  createdAt,
  source,
  timeframe,
  ticket,
  resultSource,
  detailsHref = "/signals",
  isDetailsOpen = false,
  onDetails,
  className,
}: SignalCardProps) {
  const { t } = useLanguage();
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const resultSuccess =
    closeReason === "TP" ? true : closeReason === "SL" ? false : success;
  const isTakeProfitClosed = !isOpen && closeReason === "TP";
  const isStopLossClosed = !isOpen && closeReason === "SL";
  const directionColor = type === "buy" ? "text-emerald-700 dark:text-green-300" : "text-red-700 dark:text-red-300";
  const directionBg =
    type === "buy"
      ? "bg-emerald-50 border-emerald-300 dark:bg-green-500/10 dark:border-green-500/30"
      : "bg-red-50 border-red-300 dark:bg-red-500/10 dark:border-red-500/30";
  const stateClass = isTakeProfitClosed
    ? "border-emerald-300 bg-white text-slate-950 dark:border-green-500/40 dark:bg-gray-950/90 dark:text-white"
    : isStopLossClosed
      ? "border-red-300 bg-white text-slate-950 dark:border-red-500/40 dark:bg-gray-950/90 dark:text-white"
      : isOpen
        ? "border-emerald-200 bg-white text-slate-950 dark:border-green-500/25 dark:bg-gray-950/90 dark:text-white"
        : "border-slate-200 bg-white text-slate-950 dark:border-gray-800 dark:bg-gray-950/90 dark:text-white";
  const statusClass = isOpen
    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30"
    : isTakeProfitClosed
      ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30"
      : isStopLossClosed
        ? "bg-red-50 text-red-700 border-red-300 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30"
        : "bg-slate-100 text-slate-700 border-slate-300 dark:bg-gray-700/40 dark:text-gray-300 dark:border-gray-700";
  const statusLabel = isOpen
    ? translate("open", "OPEN")
    : closeReason === "TP"
      ? translate("tpHit", "TP Hit")
      : closeReason === "SL"
        ? translate("slHit", "SL Hit")
        : translate("closed", "CLOSED");
  const resultLabel = isOpen
    ? translate("running", "Running")
    : closeReason === "TP"
      ? translate("tpHit", "TP Hit")
      : closeReason === "SL"
        ? translate("slHit", "SL Hit")
        : translate("closed", "Closed");
  const resultDescription = isOpen
    ? translate("tradeActive", "Trade is still active")
    : closeReason === "TP"
      ? translate("takeProfitHit", "Take Profit hit")
      : closeReason === "SL"
        ? translate("stopLossHit", "Stop Loss hit")
        : translate("closedNoResult", "Closed without TP/SL result");
  const resultSourceLabel =
    resultSource === "derived"
      ? translate("derivedResult", "Derived from later prices")
      : resultSource === "python"
        ? translate("pythonMt5Result", "Python MT5 ticks")
      : resultSource === "stored"
        ? translate("storedResult", "Confirmed by close event")
        : "-";
  const resultClass = isOpen
    ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200"
    : closeReason === "TP"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-green-500/35 dark:bg-green-500/10 dark:text-green-200"
      : closeReason === "SL"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-200"
        : "border-slate-200 bg-slate-100 text-slate-600 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300";
  const resultTextClass = isOpen
    ? "text-blue-700 dark:text-blue-200"
    : closeReason === "TP"
      ? "text-emerald-700 dark:text-green-200"
      : closeReason === "SL"
        ? "text-red-700 dark:text-red-200"
        : "text-slate-600 dark:text-gray-300";
  const detailsLabel = translate("details", "Details");
  const primaryTakeProfit = takeProfit[0];
  const ResultIcon = isOpen
    ? Clock
    : closeReason === "SL"
      ? XCircle
      : CheckCircle2;

  return (
    <article
      id={`signal-${id}`}
      dir="ltr"
      className={cn(
        "rounded-lg border p-3 text-left shadow-sm backdrop-blur-sm transition-colors",
        stateClass,
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-base font-bold tracking-normal text-slate-950 dark:text-white">
          {pair}
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-semibold",
              directionBg,
              directionColor
            )}
          >
            {type === "buy" ? (
              <ArrowUpCircle className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownCircle className="h-3.5 w-3.5" />
            )}
            {type === "buy" ? translate("buy", "Buy") : translate("sell", "Sell")}
          </span>

          <span
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold",
              statusClass
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-gray-800/80 dark:bg-black/30">
        <div className="min-w-0">
          <div className="truncate text-[11px] uppercase text-slate-500 dark:text-gray-500">
            {translate("entryPrice", "Entry")}
          </div>
          <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {formatNumber(price)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] uppercase text-slate-500 dark:text-gray-500">
            {translate("stopLoss", "Stop Loss")}
          </div>
          <div className="truncate text-sm font-semibold text-red-600 dark:text-red-300">
            {formatNumber(stopLoss)}
          </div>
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] uppercase text-slate-500 dark:text-gray-500">
            {translate("takeProfit1", "Take Profit 1")}
          </div>
          <div className="truncate text-sm font-semibold text-emerald-600 dark:text-green-300">
            {formatNumber(primaryTakeProfit)}
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-2 flex items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs",
          resultClass
        )}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 font-semibold">
          <ResultIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{resultLabel}</span>
        </span>
        <span className="shrink-0 text-[11px] opacity-90">
          {isOpen
            ? translate("noCloseYet", "No close yet")
            : `${translate("closePrice", "Close")}: ${formatNumber(closePrice)}`}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-2 dark:border-gray-800">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
          <Clock className="h-3.5 w-3.5 shrink-0 text-blue-500 dark:text-blue-300" />
          <span className="truncate">{timestamp}</span>
        </div>

        {onDetails ? (
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
            aria-expanded={isDetailsOpen}
          >
            <Info className="h-3.5 w-3.5" />
            {detailsLabel}
          </button>
        ) : (
          <Link
            href={detailsHref}
            className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
          >
            <Info className="h-3.5 w-3.5" />
            {detailsLabel}
          </Link>
        )}
      </div>

      {isDetailsOpen && (
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-gray-800 dark:text-gray-300">
          <div className="col-span-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-gray-800 dark:bg-black/25">
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("result", "Result")}
            </span>
            <span
              className={cn(
                "mt-1 inline-flex items-center gap-1.5 font-semibold",
                resultTextClass
              )}
            >
              <ResultIcon className="h-3.5 w-3.5" />
              {resultLabel}
            </span>
            <span className="mt-1 block text-slate-500 dark:text-gray-400">{resultDescription}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("entryPrice", "Entry")}
            </span>
            <span className="font-medium text-slate-950 dark:text-white">{formatNumber(price)}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("stopLoss", "Stop Loss")}
            </span>
            <span className="font-medium text-red-600 dark:text-red-300">
              {formatNumber(stopLoss)}
            </span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("takeProfit1", "Take Profit 1")}
            </span>
            <span className="font-medium text-emerald-600 dark:text-green-300">
              {formatNumber(primaryTakeProfit)}
            </span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("closePrice", "Close Price")}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                resultSuccess === undefined
                  ? "text-slate-600 dark:text-gray-300"
                  : resultSuccess
                    ? "text-emerald-600 dark:text-green-300"
                    : "text-red-600 dark:text-red-300"
              )}
            >
              {resultSuccess !== undefined && <Percent className="h-3 w-3" />}
              {formatNumber(closePrice)}
            </span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("openedAt", "Opened At")}
            </span>
            <span className="font-medium">{formatDateTime(createdAt)}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("closedAt", "Closed At")}
            </span>
            <span className="font-medium">{formatDateTime(closedAt)}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("timeframe", "Timeframe")}
            </span>
            <span className="font-medium">{timeframe || "-"}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("source", "Source")}
            </span>
            <span className="font-medium">{source || "-"}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("resultSource", "Result Source")}
            </span>
            <span className="font-medium">{resultSourceLabel}</span>
          </div>
          <div>
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("ticket", "Ticket")}
            </span>
            <span className="font-medium">{ticket || "-"}</span>
          </div>
          <div className="min-w-0">
            <span className="block text-slate-500 dark:text-gray-500">
              {translate("signalId", "Signal ID")}
            </span>
            <span className="block truncate font-medium" title={id}>
              {id}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export const SignalCard = memo(SignalCardComponent);
SignalCard.displayName = "SignalCard";
