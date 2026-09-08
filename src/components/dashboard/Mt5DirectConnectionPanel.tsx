"use client";

import { AlertCircle, CheckCircle2, Clock3, RefreshCw, Server, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import type { ApiResult, Mt5DirectConnectionDto, TradingAccountDto } from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

function maskedLogin(login: string) {
  if (login.length <= 4) return login;
  return `${"*".repeat(Math.min(login.length - 4, 6))}${login.slice(-4)}`;
}

function formatSyncDate(value: string | null, language: string) {
  if (!value) return language === "fa" ? "هنوز انجام نشده" : "Not synced yet";
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function Mt5DirectConnectionPanel({
  account,
  onChanged,
}: {
  account: TradingAccountDto;
  onChanged: () => Promise<void>;
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const [connection, setConnection] = useState(account.directConnection);
  const [busy, setBusy] = useState<"sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => setConnection(account.directConnection), [account.directConnection]);

  useEffect(() => {
    if (!connection?.enabled || connection.status === "DISCONNECTED") return;

    const refreshStatus = async () => {
      const response = await fetch(`/api/trading-accounts/${account.id}/sync-status`, {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResult<{
        directConnection: Mt5DirectConnectionDto | null;
      }>;
      if (response.ok && result.data?.directConnection) {
        setConnection(result.data.directConnection);
      }
    };

    const interval = window.setInterval(refreshStatus, 15_000);
    return () => window.clearInterval(interval);
  }, [account.id, connection?.enabled, connection?.status]);

  if (!connection) return null;

  const statusLabels: Record<Mt5DirectConnectionDto["status"], string> = {
    PENDING: isFa ? "در صف اتصال" : "Pending",
    CONNECTING: isFa ? "در حال اتصال" : "Connecting",
    INITIAL_SYNC: isFa ? "همگام‌سازی اولیه" : "Initial sync",
    ACTIVE: isFa ? "همگام‌سازی فعال" : "Sync active",
    ERROR: isFa ? "خطای اتصال" : "Connection error",
    DISCONNECTED: isFa ? "قطع شده" : "Disconnected",
  };
  const healthy = connection.status === "ACTIVE";
  const failed = connection.status === "ERROR";
  const StatusIcon = healthy ? CheckCircle2 : failed ? AlertCircle : Clock3;

  async function runAction(action: "sync" | "disconnect") {
    if (
      action === "disconnect" &&
      !window.confirm(
        isFa
          ? "اتصال MT5 قطع شود؟ معاملات واردشده حذف نمی‌شوند."
          : "Disconnect MT5? Imported trades will be preserved."
      )
    ) {
      return;
    }

    setBusy(action);
    setMessage("");
    try {
      const response = await fetch(`/api/trading-accounts/${account.id}/${action}`, {
        method: "POST",
      });
      const result = (await response.json()) as ApiResult<unknown>;
      if (!response.ok || !result.success) {
        throw new Error(result.message || (isFa ? "عملیات انجام نشد." : "Action failed."));
      }
      setMessage(
        action === "sync"
          ? isFa
            ? "همگام‌سازی با موفقیت انجام شد."
            : "Synchronization completed."
          : isFa
            ? "اتصال قطع شد."
            : "Connection disconnected."
      );
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : isFa ? "عملیات انجام نشد." : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mt-4 border-t border-slate-800 pt-4" aria-label="MT5 direct sync">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
              healthy
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : failed
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-200"
            )}
          >
            <StatusIcon className={cn("h-4 w-4", connection.status === "CONNECTING" && "animate-pulse")} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{statusLabels[connection.status]}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400" dir="ltr">
              {connection.server} / {maskedLogin(connection.login)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {connection.enabled ? (
            <button
              type="button"
              onClick={() => runAction("sync")}
              disabled={busy !== null || connection.status === "CONNECTING"}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-500/30 px-3 text-xs font-semibold text-blue-100 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", busy === "sync" && "animate-spin")} />
              {isFa ? "همگام‌سازی" : "Sync now"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => runAction("disconnect")}
            disabled={busy !== null || !connection.enabled}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-red-200 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label={isFa ? "قطع اتصال MT5" : "Disconnect MT5"}
            title={isFa ? "قطع اتصال MT5" : "Disconnect MT5"}
          >
            {busy === "disconnect" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-slate-300">
          <Server className="h-4 w-4 shrink-0 text-slate-500" />
          <span>{isFa ? "آخرین همگام‌سازی:" : "Last sync:"}</span>
          <span className="ms-auto text-slate-100">{formatSyncDate(connection.lastSyncAt, language)}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-slate-300">
          <span>{isFa ? "رکوردهای بروکر" : "Broker deals"}</span>
          <strong className="ms-auto text-white">{connection.importedDealCount.toLocaleString("en-US")}</strong>
        </div>
      </div>

      {connection.lastError ? (
        <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
          {connection.lastError}
        </p>
      ) : null}
      {message ? <p className="mt-3 text-xs font-medium text-slate-200">{message}</p> : null}
    </section>
  );
}
