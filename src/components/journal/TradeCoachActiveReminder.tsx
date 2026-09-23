"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Target } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { coachActionText } from "@/lib/journal/trade-coach-comparison";

export function TradeCoachActiveReminder({
  sourceTradeId,
  accountName,
  actionText,
  category,
  initialAcknowledgedAt,
  nextTradeAlreadyOpened,
}: {
  sourceTradeId: string;
  accountName: string;
  actionText: string;
  category: string;
  initialAcknowledgedAt: string | null;
  nextTradeAlreadyOpened: boolean;
}) {
  const { language } = useLanguage();
  const fa = language === "fa";
  const [acknowledgedAt, setAcknowledgedAt] = useState(initialAcknowledgedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function acknowledge() {
    if (busy || acknowledgedAt || nextTradeAlreadyOpened) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/trades/${sourceTradeId}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge", language }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.ownCommitment?.acknowledgedAt) {
        throw new Error(result.error || "Could not save checklist item.");
      }
      setAcknowledgedAt(result.ownCommitment.acknowledgedAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save checklist item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-500/30 dark:bg-violet-500/10" dir={fa ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-800 dark:text-violet-200"><Target className="h-4 w-4" />{fa ? "یادآور معاملهٔ بعد · چک‌لیست مربی" : "Next-trade reminder · Coach checklist"}<span className="font-normal text-slate-500">{accountName}</span></div>
          <p className="mt-1 text-sm leading-6 text-slate-800 dark:text-slate-100">{coachActionText(category, language) ?? actionText}</p>
          <Link href={`/journal/${sourceTradeId}`} className="mt-1 inline-block text-[11px] text-violet-700 underline dark:text-violet-300">{fa ? "مشاهدهٔ معاملهٔ مبنا" : "View source trade"}</Link>
        </div>
        <button type="button" onClick={acknowledge} disabled={busy || Boolean(acknowledgedAt) || nextTradeAlreadyOpened} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-800 disabled:opacity-70 dark:border-violet-500/40 dark:bg-slate-900 dark:text-violet-200">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {acknowledgedAt ? (fa ? "مرور شد" : "Reviewed") : nextTradeAlreadyOpened ? (fa ? "معاملهٔ بعد باز شده" : "Next trade already opened") : (fa ? "قبل از معامله مرور کردم" : "Reviewed before trading")}
        </button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </div>
  );
}
