"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type Summary = { evaluation: { level: string; score: number; metrics: { marginLevel: number | null } } | null; stale: boolean; notifications: { id: string; readAt: string | null }[] };
const tones: Record<string, string> = { SAFE: "text-emerald-600", WARNING: "text-amber-600", HIGH_RISK: "text-orange-600", CRITICAL: "text-rose-600" };

export function RiskGuardianWidget({ accountId }: { accountId: string | null | undefined }) {
  const { language } = useLanguage();
  const fa = language === "fa";
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!accountId) { setSummary(null); return; }
    const controller = new AbortController();
    setLoading(true); setSummary(null);
    fetch(`/api/risk-guardian/${encodeURIComponent(accountId)}`, { signal: controller.signal, cache: "no-store" })
      .then(response => response.ok ? response.json() as Promise<Summary> : Promise.reject(new Error("Risk data unavailable")))
      .then(setSummary).catch(() => { if (!controller.signal.aborted) setSummary(null); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [accountId]);
  return <section className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><ShieldAlert size={20} /></span><div><h2 className="text-sm font-bold text-slate-950 dark:text-white">{fa ? "ریسک حساب" : "Account risk"}{summary?.notifications?.some(item => !item.readAt) && <span className="ms-2 inline-block h-2 w-2 rounded-full bg-rose-500" aria-label="Unread risk alerts" />}</h2><p className="mt-1 text-xs text-slate-500">{loading ? (fa ? "در حال بارگذاری…" : "Loading…") : !accountId ? (fa ? "حساب انتخاب نشده" : "Select an account") : !summary?.evaluation ? (fa ? "داده کافی نیست" : "Insufficient data") : summary.stale ? (fa ? "داده حساب قدیمی است" : "Account data is outdated") : <><strong className={tones[summary.evaluation.level]}>{summary.evaluation.level.replace("_", " ")}</strong><span className="mx-2">·</span>{fa ? "امتیاز" : "Score"} {summary.evaluation.score}/100<span className="mx-2">·</span>{fa ? "مارجین" : "Margin"} {summary.evaluation.metrics.marginLevel == null ? "—" : `${summary.evaluation.metrics.marginLevel.toFixed(0)}%`}</>}</p></div></div>
    <Link href={accountId ? `/dashboard/risk-guardian?accountId=${encodeURIComponent(accountId)}` : "/dashboard/risk-guardian"} className="text-sm font-semibold text-violet-600 hover:underline dark:text-violet-300">{fa ? "جزئیات ریسک" : "View risk details"} →</Link>
  </section>;
}
