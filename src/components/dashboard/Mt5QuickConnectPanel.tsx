"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, RefreshCw } from "lucide-react";
import { PRODUCTION_SITE_URL } from "@/lib/deployment-url";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type QuickConnectResponse = {
  ok: boolean;
  error?: string;
  secret?: string;
  apiUrl?: string;
};

const REVEAL_TIMEOUT_MS = 15000;

function getInitialApiUrl() {
  return typeof window === "undefined" ? PRODUCTION_SITE_URL : window.location.origin;
}

function maskConnectionKey(value: string) {
  return value ? "************************" : "";
}

export function Mt5QuickConnectPanel({
  onCreated,
}: {
  onCreated: () => Promise<void>;
}) {
  const { language } = useLanguage();
  const text = language === "fa"
    ? {
        title: "اتصال سریع MT5",
        description:
          "ابتدا یک کلید بسازید، آن را در EA وارد کنید، سپس اولین معامله MT5 این اتصال را به‌صورت خودکار به شماره واقعی حساب وصل می‌کند.",
        generateKey: "ساخت کلید MT5",
        generating: "در حال ساخت...",
        generateFailed: "ساخت کلید MT5 ناموفق بود",
        secretReady: "کلید اتصال MT5 آماده است. فقط وقتی آماده وارد کردن آن در MT5 هستید آن را Reveal کنید.",
        copyApiUrl: "کپی آدرس API",
        copySecret: "کپی کلید اتصال MT5",
        revealKey: "نمایش کلید اتصال MT5",
        hideKey: "پنهان کردن کلید اتصال MT5",
      }
    : {
        title: "MT5 Quick Connect",
        description:
          "Generate a key first, put it in the EA, and the first MT5 trade will attach this connection to the real account number automatically.",
        generateKey: "Generate MT5 connection key",
        generating: "Generating...",
        generateFailed: "Failed to generate MT5 key",
        secretReady: "MT5 connection key is ready. Use Reveal only when you are ready to enter it in MT5.",
        copyApiUrl: "Copy API URL",
        copySecret: "Copy MT5 connection key",
        revealKey: "Reveal MT5 connection key",
        hideKey: "Hide MT5 connection key",
      };
  const [apiUrl, setApiUrl] = useState(getInitialApiUrl);
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState<"api" | "secret" | null>(null);
  const [keyRevealed, setKeyRevealed] = useState(false);

  useEffect(() => {
    if (!keyRevealed) {
      return;
    }

    const timeoutId = window.setTimeout(() => setKeyRevealed(false), REVEAL_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [keyRevealed, secret]);

  async function generateQuickConnect() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/trading-accounts/mt5-quick-connect", {
        method: "POST",
      });
      const data = (await response.json()) as QuickConnectResponse;

      if (!response.ok || !data.ok || !data.secret) {
        throw new Error(data.error || text.generateFailed);
      }

      setApiUrl((data.apiUrl || apiUrl).replace(/\/api\/mt5\/journal$/, ""));
      setSecret(data.secret);
      setKeyRevealed(false);
      setStatus("success");
      setMessage(text.secretReady);
      await onCreated();
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : text.generateFailed);
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

  return (
    <section className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-950 dark:text-white">
              {text.title}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
              {text.description}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={generateQuickConnect}
          disabled={status === "saving"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={cn("h-4 w-4", status === "saving" && "animate-spin")} />
          {text.generateKey}
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            JOURNAL_API_BASE_URL
          </span>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              readOnly
              value={apiUrl}
              className="h-10 min-w-0 basis-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:flex-1 sm:basis-0"
            />
            <button
              type="button"
              onClick={() => copyValue(apiUrl, "api")}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={text.copyApiUrl}
              title={text.copyApiUrl}
            >
              {copied === "api" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            MT5 connection key
          </span>
          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              readOnly
              value={keyRevealed ? secret : maskConnectionKey(secret)}
              className="h-10 min-w-0 basis-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:flex-1 sm:basis-0"
            />
            <button
              type="button"
              onClick={() => setKeyRevealed((value) => !value)}
              disabled={!secret}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={keyRevealed ? text.hideKey : text.revealKey}
              title={keyRevealed ? text.hideKey : text.revealKey}
            >
              {keyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => copyValue(secret, "secret")}
              disabled={!secret}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={text.copySecret}
              title={text.copySecret}
            >
              {copied === "secret" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </label>
      </div>

      <div
        className={cn(
          "mt-3 min-h-5 text-sm font-medium",
          status === "success" && "text-emerald-700 dark:text-emerald-300",
          status === "error" && "text-red-700 dark:text-red-300",
          status === "saving" && "text-blue-700 dark:text-blue-300",
          status === "idle" && "text-slate-500 dark:text-slate-400"
        )}
      >
        {status === "saving" ? text.generating : message}
      </div>
    </section>
  );
}
