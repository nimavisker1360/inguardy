"use client";

import { AlertCircle, CheckCircle2, Clock3, RefreshCw, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import type {
  ApiResult,
  CtraderDirectConnectionDto,
  TradingAccountDto,
} from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

function maskedAccount(value: string) {
  if (value.length <= 4) return value;
  return `${"*".repeat(Math.min(value.length - 4, 6))}${value.slice(-4)}`;
}

function formatDate(value: string | null, isFa: boolean) {
  if (!value) return isFa ? "هنوز انجام نشده" : "Not synced yet";
  return new Intl.DateTimeFormat(isFa ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CtraderDirectConnectionPanel({
  account,
  onChanged,
}: {
  account: TradingAccountDto;
  onChanged: () => Promise<void>;
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const [connection, setConnection] = useState(account.ctraderConnection);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => setConnection(account.ctraderConnection), [account.ctraderConnection]);
  useEffect(() => {
    if (!connection?.enabled || connection.status === "DISCONNECTED") return;
    const refresh = async () => {
      const response = await fetch(
        `/api/trading-accounts/${account.id}/ctrader-sync-status`,
        { cache: "no-store" }
      );
      const result = (await response.json()) as ApiResult<{
        ctraderConnection: CtraderDirectConnectionDto | null;
      }>;
      if (response.ok && result.data?.ctraderConnection) {
        setConnection(result.data.ctraderConnection);
      }
    };
    const interval = window.setInterval(refresh, 15_000);
    return () => window.clearInterval(interval);
  }, [account.id, connection?.enabled, connection?.status]);

  if (!connection) return null;
  const labels: Record<CtraderDirectConnectionDto["status"], string> = {
    PENDING: isFa ? "در صف اتصال" : "Pending",
    CONNECTING: isFa ? "در حال اتصال" : "Connecting",
    INITIAL_SYNC: isFa ? "همگام‌سازی اولیه" : "Initial sync",
    ACTIVE: isFa ? "همگام‌سازی فعال" : "Sync active",
    ERROR: isFa ? "خطای اتصال" : "Connection error",
    DISCONNECTED: isFa ? "قطع‌شده" : "Disconnected",
  };
  const healthy = connection.status === "ACTIVE";
  const failed = connection.status === "ERROR";
  const StatusIcon = healthy ? CheckCircle2 : failed ? AlertCircle : Clock3;

  async function act(action: "sync" | "disconnect") {
    if (
      action === "disconnect" &&
      !window.confirm(
        isFa
          ? "اتصال cTrader قطع شود؟ معاملات واردشده حذف نمی‌شوند."
          : "Disconnect cTrader? Imported trades will be preserved."
      )
    ) return;

    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(
        `/api/trading-accounts/${account.id}/ctrader-${action}`,
        { method: "POST" }
      );
      const result = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !result.success) {
        throw new Error(result.message || (isFa ? "عملیات انجام نشد." : "Action failed."));
      }
      setMessage(
        action === "sync"
          ? isFa ? "همگام‌سازی با موفقیت انجام شد." : "Synchronization completed."
          : isFa ? "اتصال قطع شد." : "Connection disconnected."
      );
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : isFa ? "عملیات انجام نشد." : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  const displayAccount = connection.traderLogin || connection.ctidTraderAccountId;
  return (
    <section className="mt-4 border-t border-slate-800 pt-4" aria-label="cTrader direct sync">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            healthy
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : failed
                ? "border-red-500/30 bg-red-500/10 text-red-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          )}>
            <StatusIcon className={cn("h-4 w-4", connection.status === "CONNECTING" && "animate-pulse")} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{labels[connection.status]}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400" dir="ltr">
              cTrader {connection.environment.toUpperCase()} / {maskedAccount(displayAccount)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {connection.enabled ? (
            <button
              type="button"
              onClick={() => act("sync")}
              disabled={busy !== null || connection.status === "CONNECTING"}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-500/30 px-3 text-xs font-semibold text-blue-100 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", busy === "sync" && "animate-spin")} />
              {isFa ? "همگام‌سازی" : "Sync now"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => act("disconnect")}
            disabled={busy !== null || !connection.enabled}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isFa ? "قطع اتصال cTrader" : "Disconnect cTrader"}
            title={isFa ? "قطع اتصال cTrader" : "Disconnect cTrader"}
          >
            {busy === "disconnect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
        <p>{isFa ? "آخرین همگام‌سازی:" : "Last sync:"} <span className="text-slate-200">{formatDate(connection.lastSyncAt, isFa)}</span></p>
        <p>{isFa ? "تعداد اجراهای واردشده:" : "Imported executions:"} <span className="text-slate-200">{connection.importedDealCount}</span></p>
      </div>
      {connection.lastError ? <p className="mt-2 text-xs text-red-300">{connection.lastError}</p> : null}
      {message ? <p className="mt-2 text-xs text-slate-200">{message}</p> : null}
    </section>
  );
}

