"use client";

import { AlertCircle, CheckCircle2, Clock3, RefreshCw, RotateCcw, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApiResult, TradeLockerConnectionDto, TradingAccountDto } from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

function formatDate(value: string | null, language: string) {
  if (!value) return language === "fa" ? "هنوز انجام نشده" : "Not synced yet";
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TradeLockerConnectionPanel({
  account,
  onChanged,
  onReconnect,
}: {
  account: TradingAccountDto;
  onChanged: () => Promise<void>;
  onReconnect: () => void;
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const [connection, setConnection] = useState(account.tradeLockerConnection);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => setConnection(account.tradeLockerConnection), [account.tradeLockerConnection]);
  useEffect(() => {
    if (!connection?.enabled || connection.status === "DISCONNECTED") return;
    const refresh = async () => {
      const response = await fetch(`/api/trading-accounts/${account.id}/tradelocker-sync-status`, { cache: "no-store" });
      const result = (await response.json()) as ApiResult<{ tradeLockerConnection: TradeLockerConnectionDto | null }>;
      if (response.ok && result.data?.tradeLockerConnection) setConnection(result.data.tradeLockerConnection);
    };
    const interval = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(interval);
  }, [account.id, connection?.enabled, connection?.status]);

  if (!connection) return null;
  const healthy = connection.status === "CONNECTED";
  const failed = connection.status === "ERROR" || connection.status === "REAUTH_REQUIRED";
  const StatusIcon = healthy ? CheckCircle2 : failed ? AlertCircle : Clock3;
  const labels: Record<TradeLockerConnectionDto["status"], string> = {
    CONNECTED: isFa ? "متصل" : "Connected",
    SYNCING: isFa ? "در حال همگام‌سازی" : "Syncing",
    ERROR: isFa ? "خطای اتصال" : "Connection error",
    REAUTH_REQUIRED: isFa ? "نیازمند اتصال مجدد" : "Reconnect required",
    DISCONNECTED: isFa ? "قطع‌شده" : "Disconnected",
  };

  async function run(action: "sync" | "disconnect") {
    if (action === "disconnect" && !window.confirm(isFa ? "اتصال TradeLocker قطع شود؟ معاملات واردشده حفظ می‌شوند." : "Disconnect TradeLocker? Imported trades will be preserved.")) return;
    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(`/api/trading-accounts/${account.id}/tradelocker-${action}`, { method: "POST" });
      const result = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !result.success) throw new Error(result.message || (isFa ? "عملیات انجام نشد." : "Action failed."));
      setMessage(action === "sync" ? (isFa ? "همگام‌سازی انجام شد." : "Synchronization completed.") : (isFa ? "اتصال قطع شد." : "Connection disconnected."));
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (isFa ? "عملیات انجام نشد." : "Action failed."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 border-t border-slate-800 pt-4" aria-label="TradeLocker direct sync">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", healthy ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : failed ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-amber-500/30 bg-amber-500/10 text-amber-200")}> 
            <StatusIcon className={cn("h-4 w-4", connection.status === "SYNCING" && "animate-pulse")} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">TradeLocker · {labels[connection.status]}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400" dir="ltr">#{connection.tradeLockerAccountId} · {connection.environment} · {connection.server}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {connection.enabled && connection.status !== "REAUTH_REQUIRED" ? (
            <button type="button" onClick={() => run("sync")} disabled={busy !== null || connection.status === "SYNCING"} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-500/30 px-3 text-xs font-semibold text-blue-100 hover:bg-blue-500/10 disabled:opacity-50">
              <RefreshCw className={cn("h-4 w-4", busy === "sync" && "animate-spin")} />{isFa ? "همگام‌سازی" : "Sync now"}
            </button>
          ) : (
            <button type="button" onClick={onReconnect} className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-3 text-xs font-semibold text-amber-100 hover:bg-amber-500/10">
              <RotateCcw className="h-4 w-4" />{isFa ? "اتصال مجدد" : "Reconnect"}
            </button>
          )}
          <button type="button" onClick={() => run("disconnect")} disabled={busy !== null || !connection.enabled} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-red-200 hover:bg-red-500/10 disabled:opacity-40" aria-label={isFa ? "قطع اتصال TradeLocker" : "Disconnect TradeLocker"}>
            {busy === "disconnect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <p>{isFa ? "آخرین همگام‌سازی:" : "Last sync:"} <span className="text-slate-200">{formatDate(connection.lastSyncAt, language)}</span></p>
        <p>{isFa ? "رکوردهای واردشده:" : "Imported records:"} <span className="text-slate-200">{connection.importedOrderCount + connection.importedExecutionCount}</span></p>
      </div>
      {connection.lastError ? <p className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">{connection.lastError}</p> : null}
      {message ? <p className="mt-2 text-xs text-slate-200">{message}</p> : null}
    </section>
  );
}
