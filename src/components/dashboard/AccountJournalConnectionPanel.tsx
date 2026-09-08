"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Power, RefreshCw } from "lucide-react";
import { MT5_JOURNAL_API_PATH, PRODUCTION_SITE_URL } from "@/lib/deployment-url";
import { cn } from "@/lib/utils";
import { useLanguage, type Language } from "@/lib/language-context";
import type { TradingAccountDto } from "@/components/dashboard/types";

type JournalConfigResponse = {
  ok: boolean;
  error?: string;
  apiUrl?: string;
  journalEnabled?: boolean;
  hasSecret?: boolean;
  secret?: string | null;
  lastConnectedAt?: string | null;
  lastSyncAt?: string | null;
};

type RegenerateResponse = {
  ok: boolean;
  error?: string;
  secret?: string;
  apiUrl?: string;
};

const REVEAL_TIMEOUT_MS = 15000;

type ConnectionStatus = "subscriptionRequired" | "disabled" | "connected" | "notConnected";

function formatDate(
  value: string | null | undefined,
  language: Language,
  neverLabel: string
) {
  if (!value) {
    return neverLabel;
  }

  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toEaBaseUrl(value: string) {
  return value.replace(new RegExp(`${MT5_JOURNAL_API_PATH}$`), "");
}

function getInitialApiUrl() {
  return typeof window === "undefined" ? PRODUCTION_SITE_URL : window.location.origin;
}

function maskConnectionKey(value: string, hasSecret: boolean, savedMessage: string) {
  if (!hasSecret) {
    return "";
  }

  if (!value) {
    return savedMessage;
  }

  return "************************";
}

export function AccountJournalConnectionPanel({
  account,
  journalAccess,
}: {
  account: TradingAccountDto;
  journalAccess: {
    canUseJournal: boolean;
    status: string;
    message: string | null;
  };
}) {
  const { language, t } = useLanguage();
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);
  const [secret, setSecret] = useState(account.journalUploadSecret || "");
  const [journalEnabled, setJournalEnabled] = useState(account.journalEnabled);
  const [hasSecret, setHasSecret] = useState(Boolean(account.hasJournalSecret));
  const [lastConnectedAt, setLastConnectedAt] = useState(account.lastConnectedAt);
  const [lastSyncAt, setLastSyncAt] = useState(account.lastSyncAt);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"api" | "secret" | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const connectionStatus: ConnectionStatus = !journalAccess.canUseJournal
    ? "subscriptionRequired"
    : !journalEnabled
      ? "disabled"
      : hasSecret
        ? "connected"
        : "notConnected";

  useEffect(() => {
    if (!keyRevealed) {
      return;
    }

    const timeoutId = window.setTimeout(() => setKeyRevealed(false), REVEAL_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [keyRevealed, secret]);

  async function regenerateSecret() {
    if (
      hasSecret &&
      !window.confirm(
        t("dashboard.journalConnection.confirmReplace")
      )
    ) {
      return;
    }

    setStatus("saving");
    setMessage("");
    setCopied(null);
    setKeyRevealed(false);

    try {
      const response = await fetch(
        `/api/trading-accounts/${account.id}/journal-secret/regenerate`,
        { method: "POST" }
      );
      const data = (await response.json()) as RegenerateResponse;

      if (!response.ok || !data.ok || !data.secret) {
        throw new Error(data.error || t("dashboard.journalConnection.replaceFailed"));
      }

      setApiUrl(data.apiUrl ? toEaBaseUrl(data.apiUrl) : apiUrl);
      setSecret(data.secret);
      setHasSecret(true);
      setJournalEnabled(true);
      setStatus("success");
      setMessage(t("dashboard.journalConnection.replaced"));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t("dashboard.journalConnection.replaceFailed"));
    }
  }

  async function toggleJournal() {
    const nextEnabled = !journalEnabled;

    if (
      journalEnabled &&
      !window.confirm(
        t("dashboard.journalConnection.confirmPause")
      )
    ) {
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(
        `/api/trading-accounts/${account.id}/journal-config`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ journalEnabled: nextEnabled }),
        }
      );
      const data = (await response.json()) as JournalConfigResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || t("dashboard.journalConnection.updateFailed"));
      }

      setApiUrl(data.apiUrl ? toEaBaseUrl(data.apiUrl) : apiUrl);
      setJournalEnabled(Boolean(data.journalEnabled));
      setHasSecret(Boolean(data.hasSecret));
      setSecret(data.secret || "");
      setKeyRevealed(false);
      setLastConnectedAt(data.lastConnectedAt || null);
      setLastSyncAt(data.lastSyncAt || null);
      setStatus("success");
      setMessage(
        nextEnabled
          ? t("dashboard.journalConnection.importEnabled")
          : t("dashboard.journalConnection.importPaused")
      );
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t("dashboard.journalConnection.updateFailed"));
    }
  }

  async function copyValue(value: string, type: "api" | "secret") {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const maskedConnectionKey = maskConnectionKey(
    secret,
    hasSecret,
    t("dashboard.journalConnection.savedKeyMessage")
  );
  const eaSecretValue = keyRevealed
    ? secret
    : hasSecret
      ? "************************"
      : t("dashboard.journalConnection.generatedKeyPlaceholder");

  return (
    <div className="mt-4 rounded-xl border border-slate-800 bg-[#111827] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-300">
            <KeyRound className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">
              {t("dashboard.journalConnection.title")}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {t("dashboard.journalConnection.accountNumber")}: {account.mt5AccountNumber || account.name}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={regenerateSecret}
            disabled={status === "saving" || !journalAccess.canUseJournal}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", status === "saving" && "animate-spin")} />
            {hasSecret
              ? t("dashboard.journalConnection.replaceKey")
              : t("dashboard.journalConnection.generateKey")}
          </button>
          <button
            type="button"
            onClick={toggleJournal}
            disabled={status === "saving" || !journalAccess.canUseJournal}
            className={cn(
              "inline-flex h-9 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
              journalEnabled
                ? "border-red-500/30 text-red-200 hover:bg-red-500/10"
                : "border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
            )}
          >
            <Power className="h-3.5 w-3.5" />
            {journalEnabled
              ? t("dashboard.journalConnection.pauseImport")
              : t("dashboard.journalConnection.enableImport")}
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="font-semibold uppercase text-slate-500">{t("dashboard.journalConnection.connectionStatus")}</div>
          <div
            className={cn(
              "mt-1 font-semibold",
              connectionStatus === "connected" && "text-emerald-300",
              connectionStatus === "notConnected" && "text-amber-200",
              connectionStatus === "disabled" && "text-slate-300",
              connectionStatus === "subscriptionRequired" && "text-red-200"
            )}
          >
            {t(`dashboard.journalConnection.status.${connectionStatus}`)}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="font-semibold uppercase text-slate-500">{t("dashboard.journalConnection.account")}</div>
          <div className="mt-1 font-semibold text-slate-100">
            {account.name} {account.mt5AccountNumber ? `(${account.mt5AccountNumber})` : ""}
          </div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="font-semibold uppercase text-slate-500">{t("dashboard.journalConnection.broker")}</div>
          <div className="mt-1 font-semibold text-slate-100">{account.broker || "-"}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <div className="font-semibold uppercase text-slate-500">{t("dashboard.journalConnection.platform")}</div>
          <div className="mt-1 font-semibold text-slate-100">{account.platform || "-"}</div>
        </div>
      </div>

      {journalAccess.message ? (
        <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
          {journalAccess.message}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">
            {t("dashboard.journalConnection.apiBaseUrl")}
          </span>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              readOnly
              value={apiUrl}
              className="h-10 min-w-0 basis-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 outline-none sm:flex-1 sm:basis-0"
            />
            <button
              type="button"
              onClick={() => copyValue(apiUrl, "api")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800"
              aria-label={t("dashboard.journalConnection.copyApiUrl")}
              title={t("dashboard.journalConnection.copyApiUrl")}
            >
              {copied === "api" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">
            {t("dashboard.journalConnection.connectionKey")}
          </span>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              readOnly
              value={keyRevealed ? secret : maskedConnectionKey}
              className="h-10 min-w-0 basis-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 outline-none sm:flex-1 sm:basis-0"
            />
            <button
              type="button"
              onClick={() => setKeyRevealed((value) => !value)}
              disabled={!secret}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={
                keyRevealed
                  ? t("dashboard.journalConnection.hideKey")
                  : t("dashboard.journalConnection.revealKey")
              }
              title={
                keyRevealed
                  ? t("dashboard.journalConnection.hideKey")
                  : t("dashboard.journalConnection.revealKey")
              }
            >
              {keyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => copyValue(secret, "secret")}
              disabled={!secret}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label={t("dashboard.journalConnection.copyConnectionKey")}
              title={t("dashboard.journalConnection.copyConnectionKey")}
            >
              {copied === "secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </label>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
        <div>
          {t("dashboard.journalConnection.mt5Import")}:{" "}
          {journalEnabled
            ? t("dashboard.journalConnection.enabled")
            : t("dashboard.journalConnection.paused")}
        </div>
        <div>
          {t("dashboard.journalConnection.lastConnected")}:{" "}
          {formatDate(lastConnectedAt, language, t("dashboard.journalConnection.never"))}
        </div>
        <div>
          {t("dashboard.journalConnection.lastSync")}:{" "}
          {formatDate(lastSyncAt, language, t("dashboard.journalConnection.never"))}
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
        <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
          {t("dashboard.journalConnection.eaSettingsHelper")}
        </div>
        <pre className="overflow-x-auto text-xs leading-6 text-slate-200">{`JOURNAL_API_BASE_URL = ${apiUrl}
JOURNAL_UPLOAD_SECRET = ${eaSecretValue}
JOURNAL_ENABLED = true
DEBUG_MODE = true`}</pre>
      </div>

      <div
        className={cn(
          "mt-3 min-h-4 text-xs font-medium",
          status === "success" && "text-emerald-300",
          status === "error" && "text-red-300",
          status === "saving" && "text-blue-300",
          status === "idle" && "text-slate-400"
        )}
      >
        {status === "saving" ? t("dashboard.journalConnection.saving") : message}
      </div>
    </div>
  );
}
