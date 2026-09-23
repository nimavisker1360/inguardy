"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CircleHelp, Loader2, Sparkles, Target } from "lucide-react";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import { useLanguage } from "@/lib/language-context";
import { coachActionText, type CoachRow } from "@/lib/journal/trade-coach-comparison";

type Commitment = {
  id: string;
  actionText: string;
  evidence: string;
  category: string;
  status: string;
  acceptedAt: string | null;
  acknowledgedAt: string | null;
  evaluatedTradeId: string | null;
  verdict: string | null;
  verdictReason: string | null;
  reflection: string | null;
};
type CoachResponse = {
  ok: boolean;
  comparison?: CoachRow[];
  ownCommitment?: Commitment | null;
  followUp?: Commitment | null;
  error?: string;
};

const names: Record<CoachRow["id"], { en: string; fa: string }> = {
  risk: { en: "Risk limit", fa: "سقف ریسک" },
  reward: { en: "Planned R:R", fa: "نسبت سود به زیان برنامه" },
  direction: { en: "Allowed direction", fa: "جهت مجاز پلن" },
  checklist: { en: "Required checklist before entry", fa: "چک‌لیست ضروری پیش از ورود" },
  discipline: { en: "Strategy review", fa: "پایبندی به استراتژی" },
  documentation: { en: "Trade documentation", fa: "ثبت اطلاعات معامله" },
  preparation: { en: "Same-day preparation", fa: "آماده‌سازی همان روز" },
};

function statusTone(status: CoachRow["status"]) {
  if (status === "PASS") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  if (status === "ALERT") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

const missingHelp: Record<CoachRow["id"], { fa: string; en: string }> = {
  risk: { fa: "سقف ریسک پلی‌بوک یا مبلغ ریسک و موجودی معامله ثبت نشده است.", en: "Add the playbook risk limit and the trade's risk amount and opening balance." },
  reward: { fa: "حداقل نسبت سود به زیان پلی‌بوک یا قیمت ورود، حد ضرر و حد سود اولیه ثبت نشده است.", en: "Add the playbook minimum and the trade's entry, initial stop and target." },
  direction: { fa: "یک پلی‌بوک برای این معامله انتخاب کن.", en: "Select a playbook for this trade." },
  checklist: { fa: "چک‌لیست ضروری باید پیش از ورود ثبت شده باشد.", en: "Required checklist items must be recorded before entry." },
  discipline: { fa: "بررسی استراتژی این معامله را کامل کن.", en: "Complete this trade's strategy review." },
  documentation: { fa: "ستاپ و دلیل ورود را ثبت کن.", en: "Record the setup and entry reason." },
  preparation: { fa: "اطلاعات آماده‌سازی به این معامله وصل نیست.", en: "Preparation is not linked to this trade." },
};

export function TradeCoachPanel({ trade, enabled }: { trade: PrismaTradeDto; enabled: boolean }) {
  const { language } = useLanguage();
  const fa = language === "fa";
  const [data, setData] = useState<CoachResponse | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reflection, setReflection] = useState("");
  const busyRef = useRef(false);

  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    void fetch(`/api/trades/${trade.id}/coach`).then(async (response) => {
      const result = (await response.json()) as CoachResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not load coach review.");
      if (active) setData(result);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load coach review.");
    });
    return () => { active = false; };
  }, [trade.id, trade.updatedAt]);

  const run = useCallback(async (action: "suggest" | "accept" | "evaluate" | "reflect" | "cancel", text?: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    setError("");
    try {
      const response = await fetch(`/api/trades/${trade.id}/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, language, ...(action === "reflect" ? { reflection: text ?? "" } : {}) }),
      });
      const result = (await response.json()) as CoachResponse;
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not update coach review.");
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update coach review.");
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }, [trade.id, language]);

  useEffect(() => {
    if (enabled && trade.status === "CLOSED" && data && !data.ownCommitment) {
      void run("suggest");
    }
  }, [enabled, trade.status, data, run]);

  useEffect(() => {
    if (enabled && trade.status === "CLOSED" && data?.followUp?.status === "ACCEPTED") {
      void run("evaluate");
    }
  }, [enabled, trade.status, data?.followUp?.id, data?.followUp?.status, run]);

  useEffect(() => {
    setReflection(data?.followUp?.reflection ?? "");
  }, [data?.followUp?.id, data?.followUp?.reflection]);

  function saveReflection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("reflect", reflection);
  }

  const statusText: Record<CoachRow["status"], string> = fa
    ? { PASS: "مطابق پلن", ALERT: "نیاز به بررسی", MISSING: "اطلاعات ناقص", CONTEXT: "اطلاعات روز" }
    : { PASS: "Matches plan", ALERT: "Review", MISSING: "Incomplete", CONTEXT: "Day context" };
  const comparison = data?.comparison ?? [];
  const passCount = comparison.filter((row) => row.status === "PASS").length;
  const alertCount = comparison.filter((row) => row.status === "ALERT").length;
  const missingCount = comparison.filter((row) => row.status === "MISSING").length;
  const actionLabel = (commitment: Commitment) => coachActionText(commitment.category, language) ?? commitment.actionText;

  return (
    <section className="mt-5 rounded-xl border border-blue-200 bg-white p-4 dark:border-blue-500/25 dark:bg-[#0b1220]" dir={fa ? "rtl" : "ltr"}>
      <div className="flex items-start gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white"><Target className="h-4 w-4" /></span>
        <div>
          <h2 className="text-sm font-semibold text-slate-950 dark:text-white">{fa ? "بررسی معامله" : "Trade review"}</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{fa ? "معامله‌ات با برنامه‌ای که ثبت کرده‌ای مقایسه می‌شود." : "See how this trade compares with your recorded plan."}</p>
        </div>
      </div>

      {!data && !error ? <p className="mt-4 flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{fa ? "در حال بررسی اطلاعات…" : "Comparing records…"}</p> : null}
      {data?.comparison ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">{passCount} {fa ? "مطابق" : "matched"}</span>
            {alertCount > 0 ? <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">{alertCount} {fa ? "نیاز به بررسی" : "to review"}</span> : null}
            {missingCount > 0 ? <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{missingCount} {fa ? "اطلاعات ناقص" : "incomplete"}</span> : null}
          </div>
          {missingCount > 0 ? <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{fa ? "اطلاعات ناقص به معنی اشتباه در معامله نیست." : "Incomplete information does not mean the trade broke a rule."}</p> : null}
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-200">
            {fa ? "دیدن جزئیات بررسی" : "See review details"}
          </summary>
          <div className="mt-3 space-y-2">{data.comparison.map((row) => (
            <div key={row.id} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{names[row.id][fa ? "fa" : "en"]}</span>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(row.status)}`}>{statusText[row.status]}</span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] leading-5 text-slate-600 dark:text-slate-300">
                <div><span className="text-slate-400">{fa ? "برنامهٔ من: " : "My plan: "}</span><span dir="auto">{row.plan === "—" ? (fa ? "ثبت نشده" : "Not recorded") : row.plan}</span></div>
                <div><span className="text-slate-400">{fa ? "این معامله: " : "This trade: "}</span><span dir="auto">{row.actual === "—" ? (fa ? "ثبت نشده" : "Not recorded") : row.actual}</span></div>
              </div>
              {row.status === "MISSING" || row.status === "CONTEXT" ? <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{missingHelp[row.id][fa ? "fa" : "en"]}</p> : null}
            </div>
          ))}</div>
        </details>
        </>
      ) : null}

      <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-500/25 dark:bg-violet-500/10">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-800 dark:text-violet-100"><Sparkles className="h-3.5 w-3.5" />{fa ? "هدف معاملهٔ بعدی" : "Next trade goal"}</div>
        {data?.ownCommitment ? (
          <>
            <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">{actionLabel(data.ownCommitment)}</p>
            {data.ownCommitment.status === "PROPOSED" ? <button type="button" onClick={() => void run("accept")} disabled={Boolean(busy)} className="mt-3 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{fa ? "انتخاب این هدف" : "Choose this goal"}</button> : null}
            {data.ownCommitment.status === "ACCEPTED" ? <p className="mt-2 flex items-center gap-1 text-xs text-violet-700 dark:text-violet-200"><CheckCircle2 className="h-3.5 w-3.5" />{fa ? "ذخیره شد. بعد از بسته‌شدن معاملهٔ بعدی نتیجه را می‌بینی." : "Saved. See the result after your next trade closes."}</p> : null}
            {data.ownCommitment.status === "ACCEPTED" && data.ownCommitment.acknowledgedAt ? <p className="mt-1 text-[11px] text-slate-500">{fa ? "در چک‌لیست پیش از معامله مرور شد." : "Reviewed in the pre-trade reminder."}</p> : null}
            {data.ownCommitment.status === "ACCEPTED" ? <button type="button" onClick={() => void run("cancel")} disabled={Boolean(busy)} className="mt-2 block text-[11px] text-slate-500 underline disabled:opacity-50">{fa ? "لغو هدف" : "Cancel goal"}</button> : null}
            {data.ownCommitment.status === "CANCELLED" ? <p className="mt-2 text-xs text-slate-500">{fa ? "این اقدام کنار گذاشته شد." : "This action was dismissed."}</p> : null}
          </>
        ) : data ? (
          enabled ? <button type="button" onClick={() => void run("suggest")} disabled={Boolean(busy)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy === "suggest" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}{fa ? "پیشنهاد AI را بساز" : "Generate AI action"}</button>
            : <p className="mt-2 text-xs text-slate-500">{fa ? "برای پیشنهاد AI، دسترسی تحلیل AI لازم است." : "AI analysis access is required for a suggested action."}</p>
        ) : null}
      </div>

      {data?.followUp ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/25 dark:bg-blue-500/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 dark:text-blue-100"><CircleHelp className="h-3.5 w-3.5" />{fa ? "نتیجهٔ هدف معاملهٔ قبل" : "Previous trade goal result"}</div>
          <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-100">{actionLabel(data.followUp)}</p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {data.followUp.acknowledgedAt && trade.openedAt && new Date(data.followUp.acknowledgedAt) <= new Date(trade.openedAt)
              ? (fa ? "این یادآور پیش از ورود علامت زده شد." : "The reminder was checked before entry.")
              : (fa ? "تأیید مرور پیش از ورود برای این معامله ثبت نشده است." : "No pre-entry confirmation was recorded for this trade.")}
          </p>
          {data.followUp.status === "ACCEPTED" ? (
            trade.status === "CLOSED"
              ? <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">{busy === "evaluate" ? (fa ? "در حال سنجش با داده‌های این معامله…" : "Checking this trade’s records…") : (fa ? "برای سنجش دوباره، دکمه را بزنید." : "Retry the evidence check if needed.")}</p>
              : <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">{fa ? "پس از بسته‌شدن معامله، نتیجه با داده‌های ثبت‌شده سنجیده می‌شود." : "The result will be checked against recorded data after this trade closes."}</p>
          ) : (
            <>
              <p className="mt-2 text-xs font-semibold text-blue-800 dark:text-blue-100">{data.followUp.verdict === "MET" ? (fa ? "انجام شد" : "Met") : data.followUp.verdict === "NOT_MET" ? (fa ? "انجام نشد" : "Not met") : (fa ? "داده کافی نیست" : "Unclear")}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{data.followUp.verdictReason}</p>
              <form onSubmit={saveReflection} className="mt-2 space-y-2">
                <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} maxLength={500} rows={2} placeholder={fa ? "برداشت یا توضیح خودتان را ثبت کنید…" : "Add your own reflection…"} className="w-full rounded-lg border border-blue-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                <button type="submit" disabled={Boolean(busy) || reflection === (data.followUp.reflection ?? "")} className="rounded-lg border border-blue-300 px-3 py-1.5 text-xs font-semibold text-blue-800 disabled:opacity-50 dark:border-blue-500/40 dark:text-blue-200">{fa ? "ذخیرهٔ برداشت من" : "Save my reflection"}</button>
              </form>
            </>
          )}
          {data.followUp.status === "ACCEPTED" && trade.status === "CLOSED" && error ? <button type="button" onClick={() => void run("evaluate")} className="mt-2 text-xs font-semibold text-blue-700 underline dark:text-blue-200">{fa ? "تلاش دوباره" : "Retry check"}</button> : null}
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-3 text-xs text-red-600 dark:text-red-300">{error}</p> : null}
    </section>
  );
}
