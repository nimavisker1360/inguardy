"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Activity, ShieldCheck, TriangleAlert } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PRESETS, type RiskEvaluation, type RiskSettingsValues, type RiskReason } from "@/lib/risk-guardian/engine";
import { useLanguage } from "@/lib/language-context";

type Account = { id: string; name: string; broker: string | null; currency: string; ingestionMode: string };
type Event = { id: string; riskLevel: string; riskScore: number; marginLevel: number | null; dailyDrawdown: number | null; reasons: unknown; createdAt: string; resolvedAt: string | null };
type Response = { account: Account; settings: RiskSettingsValues; evaluation: RiskEvaluation | null; stale: boolean; lastUpdatedAt: string | null;
  chart: { timestamp: string; equity: number; marginLevel: number | null }[]; history: Event[];
  notifications: { id: string; sentAt: string | null; readAt: string | null; event: { riskLevel: string; riskScore: number; reasons: unknown } }[] };
type Simulation = { projectedEquity: number; projectedFreeMargin: number | null; projectedMarginLevel: number | null; projectedRiskLevel: string; estimated: boolean };
const tone: Record<string, string> = {
  SAFE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  WARNING: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  HIGH_RISK: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
  CRITICAL: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
};
const labels: Record<string, [string, string]> = {
  MARGIN_LEVEL_LOW: ["Margin level is low", "سطح مارجین پایین است"],
  MARGIN_LEVEL_CRITICAL: ["Margin level is critical", "سطح مارجین بحرانی است"],
  MARGIN_CALL_APPROACHING: ["Approaching broker margin call", "سطح مارجین به حد کال مارجین کارگزار نزدیک می‌شود"],
  MARGIN_CALL_REACHED: ["Broker margin call level reached", "سطح مارجین به حد کال مارجین کارگزار رسیده است"],
  RAPID_MARGIN_DECLINE: ["Margin level is falling rapidly", "سطح مارجین به‌سرعت افت می‌کند"],
  RAPID_EQUITY_LOSS: ["Equity is falling rapidly", "سرمایه به‌سرعت افت می‌کند"],
  DAILY_DRAWDOWN_HIGH: ["Daily drawdown is high", "افت سرمایه روزانه بالاست"],
  TOTAL_DRAWDOWN_HIGH: ["Total drawdown is high", "افت سرمایه کل بالاست"],
  FREE_MARGIN_LOW: ["Free margin is low", "مارجین آزاد پایین است"],
  EXCESSIVE_EXPOSURE: ["Exposure exceeds your limit", "میزان درگیری حساب از حد تعیین‌شده بیشتر است"],
  SYMBOL_CONCENTRATION_HIGH: ["Positions are concentrated in one symbol", "موقعیت‌ها روی یک نماد متمرکزند"],
  LOT_SIZE_ABOVE_NORMAL: ["Lot size is above your recent average", "حجم معاملات از میانگین اخیر بالاتر است"],
  POSITION_COUNT_ABOVE_NORMAL: ["Open position count is above your limit", "تعداد موقعیت‌های باز از حد تعیین‌شده بیشتر است"],
  STOP_OUT_PROXIMITY: ["Margin level is near stop-out", "سطح مارجین به استاپ‌اوت نزدیک است"],
  EQUITY_NON_POSITIVE: ["Equity is not positive", "سرمایه مثبت نیست"],
  TRADING_FREQUENCY_ABOVE_NORMAL: ["Trading frequency is above your recent average", "تعداد معاملات از میانگین اخیر بالاتر است"],
  DAILY_LOSS_ABOVE_NORMAL: ["Losses in the last 24 hours exceed your recent daily average", "زیان ۲۴ ساعت اخیر از میانگین روزانه بالاتر است"],
  RISK_PER_TRADE_ABOVE_NORMAL: ["Risk per trade is above your recent average", "ریسک هر معامله از میانگین اخیر بالاتر است"],
};
const reasonText = (reason: RiskReason, fa: boolean) => labels[reason.code]?.[fa ? 1 : 0] ?? reason.code.replaceAll("_", " ");
const mainReason = (reasons: RiskReason[], riskLevel?: string) => {
  const matching = riskLevel ? reasons.filter(reason => reason.severity === riskLevel) : reasons;
  const candidates = matching.length ? matching : reasons;
  return candidates.find(reason => reason.code === "MARGIN_CALL_REACHED")
    ?? candidates.find(reason => reason.code === "MARGIN_CALL_APPROACHING") ?? candidates[0];
};
const fmt = (value: number | null | undefined, digits = 1) => value == null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
const percent = (value: number | null | undefined) => value == null ? "—" : `${fmt(value)}%`;
const money = (value: number | null | undefined, currency: string) => value == null ? "—" : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)} ${currency}`;
const velocity = (equity: number | null, margin: number | null, currency: string) =>
  [equity == null ? null : `${fmt(equity)} ${currency}`, margin == null ? null : `${fmt(margin)} pp`].filter(Boolean).join(" · ") || "—";
const panel = "rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_36px_-28px_rgba(15,23,42,.5)] sm:p-6 dark:border-slate-700/70 dark:bg-[#111827]";

export function RiskGuardianClient({ accounts, initialAccountId }: { accounts: Account[]; initialAccountId?: string }) {
  const { language } = useLanguage();
  const fa = language === "fa";
  const [accountId, setAccountId] = useState(initialAccountId ?? accounts[0]?.id ?? "");
  const [data, setData] = useState<Response | null>(null);
  const [settings, setSettings] = useState<RiskSettingsValues | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loss, setLoss] = useState(500);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [simulationError, setSimulationError] = useState("");
  const simulationRequest = useRef(0);
  const load = useCallback(async (id: string) => {
    simulationRequest.current += 1;
    setLoading(true); setError(""); setData(null); setSimulation(null);
    try {
      const response = await fetch(`/api/risk-guardian/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(fa ? "دریافت داده ریسک ناموفق بود." : "Could not load risk data.");
      const value = await response.json() as Response;
      setData(value); setSettings(value.settings);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
    finally { setLoading(false); }
  }, [fa]);
  useEffect(() => { if (accountId) void load(accountId); }, [accountId, load]);
  async function saveSettings() {
    if (!settings) return;
    setSaving(true); setError(""); setSaved(false);
    try {
      const response = await fetch(`/api/risk-guardian/${encodeURIComponent(accountId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not save settings");
      setSaved(true); await load(accountId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Error"); }
    finally { setSaving(false); }
  }
  async function runSimulation() {
    const requestId = ++simulationRequest.current;
    setSimulationError(""); setSimulation(null);
    try {
      const response = await fetch(`/api/risk-guardian/${encodeURIComponent(accountId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ additionalLoss: loss }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Simulation unavailable");
      if (requestId === simulationRequest.current) setSimulation(payload as Simulation);
    } catch (cause) { if (requestId === simulationRequest.current) setSimulationError(cause instanceof Error ? cause.message : "Error"); }
  }
  function chooseLoss(value: number) {
    simulationRequest.current += 1;
    setLoss(value);
    setSimulation(null);
    setSimulationError("");
  }
  const evaluation = data?.evaluation;
  const m = evaluation?.metrics as RiskEvaluation["metrics"];
  const currency = data?.account.currency ?? "USD";
  return <div className="mx-auto max-w-7xl space-y-6 pb-14" dir={fa ? "rtl" : "ltr"}>
    <header className="flex flex-col gap-5 pb-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-4"><span className="mt-1 hidden h-12 w-1 rounded-full bg-gradient-to-b from-violet-500 to-cyan-400 sm:block" aria-hidden />
        <div><p className="text-[11px] font-bold uppercase tracking-[.22em] text-violet-600 dark:text-violet-400">Inguardy / {fa ? "حفاظت از حساب" : "Account protection"}</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">Risk Guardian</h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{fa ? "ریسک حساب را پیش از بحرانی شدن شرایط پایش کنید." : "Monitor account risk before conditions become critical."}</p></div></div>
      {accounts.length > 0 && <label className="w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-[0_8px_24px_-20px_rgba(15,23,42,.5)] sm:w-80 dark:border-slate-700 dark:bg-[#111827]">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{fa ? "حساب معاملاتی" : "Trading account"}</span>
        <select aria-label={fa ? "انتخاب حساب" : "Select account"} value={accountId} onChange={event => setAccountId(event.target.value)} className="mt-0.5 w-full bg-transparent text-sm font-semibold text-slate-900 outline-none dark:text-white">{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
      </label>}
    </header>
    {!accounts.length && <section className={panel}><p>{fa ? "هنوز حساب معاملاتی متصل ندارید." : "No trading account is connected yet."}</p><Link className="mt-3 inline-block text-violet-600" href="/dashboard/accounts">{fa ? "مدیریت حساب‌ها" : "Manage accounts"} →</Link></section>}
    {loading && <section className={panel} role="status">{fa ? "در حال بارگذاری داده ریسک…" : "Loading risk data…"}</section>}
    {error && <section className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-500/10" role="alert">{error} <button onClick={() => void load(accountId)} className="ms-2 underline">{fa ? "تلاش دوباره" : "Retry"}</button></section>}
    {data && <>
      {data.notifications.length > 0 && <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "اعلان‌های اخیر" : "Recent alerts"}</h2><ul className="mt-3 grid gap-2 sm:grid-cols-2">{data.notifications.slice(0, 4).map(notification => { const reasons = Array.isArray(notification.event.reasons) ? notification.event.reasons as RiskReason[] : []; const reason = mainReason(reasons, notification.event.riskLevel); return <li key={notification.id} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span className={`rounded px-2 py-0.5 text-xs font-bold ${tone[notification.event.riskLevel]}`}>{notification.event.riskLevel.replace("_", " ")}</span><span className="ms-2 text-slate-700 dark:text-slate-200">{reason ? reasonText(reason, fa) : "Risk alert"}</span><p className="mt-1 text-xs text-slate-500">{notification.sentAt ? new Date(notification.sentAt).toLocaleString() : "—"} · {notification.event.riskScore}/100</p></li>; })}</ul></section>}
      {data.stale && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-500/10 dark:text-amber-200" role="status"><TriangleAlert size={18} className="mt-0.5 shrink-0" /><div><p className="font-semibold">{fa ? "دادهٔ حساب قدیمی است" : "Account data is outdated"}</p><p className="mt-0.5 text-xs leading-5 text-amber-800/80 dark:text-amber-200/80">{fa ? "امتیاز ریسک تا دریافت دادهٔ جدید به‌عنوان مقدار فعلی نمایش داده نمی‌شود." : "The risk score is paused until a fresh account snapshot arrives."} {data.lastUpdatedAt && `${fa ? "آخرین به‌روزرسانی" : "Last update"}: ${new Date(data.lastUpdatedAt).toLocaleString()}`}</p></div></div>}
      {!evaluation && <section className={panel}>{fa ? "برای ارزیابی ریسک به اسنپ‌شات حساب نیاز است. داده کافی موجود نیست." : "Insufficient account snapshots to evaluate risk."}</section>}
      {evaluation && <>
        <RiskOverview evaluation={evaluation} account={data.account} stale={data.stale} currency={currency} fa={fa} />
        <div className="grid gap-4 md:grid-cols-3">
          <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "افت سرمایه" : "Drawdown"}</h2><Metric label={fa ? "روزانه" : "Daily"} value={percent(m.dailyDrawdown)} limit={percent(data.settings.maxDailyDrawdown)} /><Metric label={fa ? "کل" : "Total"} value={percent(m.totalDrawdown)} limit={percent(data.settings.maxTotalDrawdown)} /><p className="mt-2 text-xs text-slate-500">{fa ? "افت روزانه به اسنپ‌شات آغاز روز UTC نیاز دارد؛ افت کل از بیشترین سرمایه ثبت‌شده محاسبه می‌شود." : "Daily drawdown needs a snapshot near the start of the UTC day. Total drawdown uses the highest recorded equity."}</p></section>
          <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "درگیری حساب" : "Exposure"}</h2><Metric label={fa ? "مجموع لات" : "Total lots"} value={fmt(m.totalLots, 2)} limit={fmt(data.settings.maxTotalLots, 2)} /><Metric label={fa ? "موقعیت‌های باز" : "Open positions"} value={String(m.openPositions)} limit={String(data.settings.maxOpenPositions)} /><Metric label={fa ? "خرید / فروش" : "Long / short"} value={`${fmt(m.longLots, 2)} / ${fmt(m.shortLots, 2)}`} /><Metric label={fa ? "مارجین مصرفی / سرمایه" : "Margin used / equity"} value={percent(m.marginUtilizationPercent)} limit={percent(data.settings.maxExposurePercent)} /><p className="mt-3 text-xs text-slate-500">{m.perSymbol.slice(0, 3).map(row => `${row.symbol} ${fmt(row.percent)}%`).join(" · ") || (fa ? "موقعیت باز ندارد" : "No open positions")}</p></section>
          <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "سرعت افت" : "Loss velocity"}</h2>{([5, 15, 30] as const).map(window => <Metric key={window} label={`${window} min`} value={velocity(m[`equityChange${window}m`], m[`marginChange${window}m`], currency)} />)}<p className="mt-3 text-xs text-slate-500">{m.rapidLossDetected ? (fa ? "افت سریع شناسایی شد." : "Rapid decline detected.") : m.openPositions === 0 && [m.equityChange5m, m.equityChange15m, m.equityChange30m].every(value => value == null || Math.abs(value) < 0.01) ? (fa ? "معاملهٔ بازی وجود ندارد و سرمایه در بازه‌های ثبت‌شده تغییری نکرده است." : "No positions are open, and equity has not changed in the recorded windows.") : (fa ? "افت سریع شناسایی نشد؛ بازه‌های بدون اسنپ‌شات محاسبه نمی‌شوند." : "No rapid decline detected; windows without enough snapshots are omitted.")}</p></section>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "روند اخیر" : "Recent trend"}</h2>{data.chart.length >= 2 ? <div className="mt-4 h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.chart.map(row => ({ ...row, time: new Date(row.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }))}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis yAxisId="equity" tick={{ fontSize: 11 }} width={50} /><YAxis yAxisId="margin" orientation="right" tick={{ fontSize: 11 }} width={45} /><Tooltip /><Area yAxisId="equity" dataKey="equity" stroke="#7c3aed" fill="#7c3aed33" /><Area yAxisId="margin" dataKey="marginLevel" stroke="#f59e0b" fill="#f59e0b22" /></AreaChart></ResponsiveContainer></div> : <p className="mt-4 text-sm text-slate-500">{fa ? "داده کافی برای نمودار وجود ندارد." : "Insufficient data for a chart."}</p>}</section>
          <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "هشدارهای فعال" : "Active warnings"}</h2>{evaluation.reasons.length && !data.stale ? <ul className="mt-3 space-y-2">{evaluation.reasons.map((reason, index) => <li key={`${reason.code}-${index}`} className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900"><span className={`me-2 rounded px-2 py-0.5 text-[10px] font-bold ${tone[reason.severity]}`}>{reason.severity.replace("_", " ")}</span><span className="dark:text-slate-200">{reasonText(reason, fa)}</span><span className="ms-2 text-xs text-slate-500">{fmt(reason.currentValue)}</span></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">{data.stale ? (fa ? "هشدار فعال قابل اتکا نیست." : "Current warnings are unavailable while data is stale.") : (fa ? "هشدار فعالی وجود ندارد." : "No active warnings.")}</p>}</section>
        </div>
        <section className={panel}>
          <h2 className="text-lg font-bold text-slate-950 dark:text-white">{fa ? "شبیه‌ساز «چه می‌شود اگر؟»" : "What-if simulator"}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {fa
              ? "ببینید اگر حساب شما از این لحظه زیان بیشتری داشته باشد، سرمایه و وضعیت ریسک آن چه تغییری می‌کند. مبلغ زیان فرضی را با عدد مثبت وارد کنید یا یکی از گزینه‌های آماده را انتخاب کنید."
              : "See how another loss from this point could affect your equity and risk. Enter a positive loss amount or choose one of the presets."}
          </p>
          <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-sm leading-6 text-slate-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-slate-200">
            {fa
              ? `مثلاً ۵۰۰ ${currency} یعنی در این محاسبه، ۵۰۰ ${currency} از سرمایه و مارجین آزاد فعلی کم می‌شود. پس از زدن «محاسبه»، مقادیر تخمینی را می‌بینید. هیچ معامله‌ای اجرا نمی‌شود و حساب شما تغییر نمی‌کند.`
              : `For example, 500 ${currency} means the estimate subtracts 500 ${currency} from current equity and free margin. Select Simulate to see the projected values. No trade is placed and your account is not changed.`}
          </div>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {fa ? `زیان فرضی (${currency})` : `Hypothetical loss (${currency})`}
              <input aria-label={fa ? "مبلغ زیان فرضی" : "Hypothetical loss amount"} type="number" min="0" value={loss} onChange={event => chooseLoss(Number(event.target.value))} className="mt-1.5 block w-44 rounded-xl border border-slate-200 bg-white p-2.5 text-sm font-semibold tabular-nums text-slate-950 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
            </label>
            {[100, 250, 500, 1000].map(value => <button key={value} type="button" aria-label={fa ? `فرض زیان ${value} ${currency}` : `Assume a loss of ${value} ${currency}`} aria-pressed={loss === value} onClick={() => chooseLoss(value)} className={`rounded-xl border px-3.5 py-2.5 text-sm font-semibold tabular-nums transition ${loss === value ? "border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : "border-slate-200 text-slate-700 hover:border-violet-300 dark:border-slate-700 dark:text-slate-200"}`}>−{value}</button>)}
            <button type="button" disabled={data.stale} onClick={() => void runSimulation()} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{fa ? "محاسبهٔ نتیجه" : "See projected result"}</button>
          </div>
          {m.usedMargin === 0 && <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">{fa ? "اکنون مارجینی مصرف نمی‌شود؛ تا زمانی که معامله‌ای از مارجین استفاده نکند، سطح مارجین تخمینی نمایش داده نمی‌شود." : "No margin is in use right now, so a projected margin level cannot be shown until a position uses margin."}</p>}
          {data.stale && <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-300">{fa ? "دادهٔ حساب قدیمی است؛ محاسبه پس از دریافت دادهٔ تازه فعال می‌شود." : "Account data is outdated. Simulation will be available after a fresh update."}</p>}
          {simulationError && <p className="mt-3 text-sm text-rose-600" role="alert">{simulationError}</p>}
          {simulation && <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60" role="status">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{fa ? `نتیجهٔ تخمینی پس از ${money(loss, currency)} زیان` : `Estimated after a ${money(loss, currency)} loss`}</h3>
            <div className="grid gap-3 sm:grid-cols-4"><Metric label={fa ? "سرمایه تخمینی" : "Projected equity"} value={money(simulation.projectedEquity, currency)} /><Metric label={fa ? "مارجین آزاد تخمینی" : "Projected free margin"} value={money(simulation.projectedFreeMargin, currency)} /><Metric label={fa ? "سطح مارجین تخمینی" : "Projected margin level"} value={percent(simulation.projectedMarginLevel)} /><Metric label={fa ? "ریسک تخمینی" : "Projected risk"} value={simulation.projectedRiskLevel.replace("_", " ")} /></div>
          </div>}
        </section>
      </>}
      <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "تاریخچه ریسک" : "Risk history"}</h2>{data.history.length ? <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-start text-xs"><thead><tr className="border-b text-slate-500 dark:border-slate-700">{[fa ? "زمان" : "Time", fa ? "وضعیت" : "Level", fa ? "امتیاز" : "Score", fa ? "علت اصلی" : "Main reason", fa ? "مارجین" : "Margin", fa ? "افت روزانه" : "Daily drawdown", fa ? "رویداد" : "Status"].map(item => <th key={item} className="p-2 text-start">{item}</th>)}</tr></thead><tbody>{data.history.map(event => { const reasons = Array.isArray(event.reasons) ? event.reasons as RiskReason[] : []; const reason = mainReason(reasons, event.riskLevel); return <tr key={event.id} className="border-b dark:border-slate-800"><td className="p-2">{new Date(event.createdAt).toLocaleString()}</td><td className="p-2"><span className={`rounded px-2 py-1 ${tone[event.riskLevel]}`}>{event.riskLevel.replace("_", " ")}</span></td><td className="p-2">{event.riskScore}</td><td className="p-2">{event.riskLevel === "SAFE" ? (fa ? "بازیابی حساب" : "Account recovered") : reason ? reasonText(reason, fa) : "—"}</td><td className="p-2">{fmt(event.marginLevel)}%</td><td className="p-2">{fmt(event.dailyDrawdown)}%</td><td className="p-2">{event.resolvedAt ? (fa ? "پایان‌یافته" : "Resolved") : (fa ? "فعال" : "Active")}</td></tr>; })}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">{fa ? "رویدادی ثبت نشده است." : "No risk events yet."}</p>}</section>
      {settings && <section className={panel}><h2 className="font-bold dark:text-white">{fa ? "تنظیمات Risk Guardian" : "Risk Guardian settings"}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs text-slate-500">{fa ? "حالت ریسک" : "Risk mode"}<select value={settings.riskMode} onChange={event => { const mode = event.target.value as RiskSettingsValues["riskMode"]; setSettings({ ...settings, riskMode: mode, ...(mode === "CUSTOM" ? {} : PRESETS[mode]) }); }} className="mt-1 block w-full rounded-lg border border-slate-200 bg-transparent p-2 text-sm dark:border-slate-700 dark:text-white">{["CONSERVATIVE", "BALANCED", "AGGRESSIVE", "CUSTOM"].map(mode => <option key={mode}>{mode}</option>)}</select></label>{([ ["warningMarginLevel", "Warning margin %"], ["highRiskMarginLevel", "High risk margin %"], ["criticalMarginLevel", "Critical margin %"], ["marginCallLevel", "Margin call %"], ["stopOutLevel", "Stop-out %"], ["maxDailyDrawdown", "Daily drawdown %"], ["maxTotalDrawdown", "Total drawdown %"], ["maxOpenPositions", "Max open positions"], ["maxTotalLots", "Max total lots"], ["maxExposurePercent", "Max margin used / equity %"], ["lossVelocityThreshold", "Rapid loss %"], ["notificationCooldownMinutes", "Notification cooldown (min)"] ] as const).map(([key, label]) => <label key={key} className="text-xs text-slate-500">{label}<input type="number" step={key === "maxOpenPositions" || key === "notificationCooldownMinutes" ? "1" : "any"} disabled={settings.riskMode !== "CUSTOM" && ["warningMarginLevel", "highRiskMarginLevel", "criticalMarginLevel", "maxDailyDrawdown", "maxTotalDrawdown", "maxOpenPositions", "maxTotalLots", "maxExposurePercent", "lossVelocityThreshold"].includes(key)} value={settings[key] ?? ""} onChange={event => setSettings({ ...settings, [key]: event.target.value === "" ? null : Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-slate-200 bg-transparent p-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:text-white" /></label>)}</div><div className="mt-4 flex flex-wrap gap-4 text-sm dark:text-slate-200">{([ ["enabled", "Enabled"], ["inAppAlerts", "In-app alerts"], ["emailAlerts", "Email alerts"] ] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={settings[key]} onChange={event => setSettings({ ...settings, [key]: event.target.checked })} />{label}</label>)}</div><p className="mt-2 text-xs text-slate-500">{fa ? "اعلان پوش و تلگرام پس از اتصال سرویس مربوط فعال خواهند شد." : "Push and Telegram delivery require future channel integrations."}</p><button disabled={saving} onClick={() => void saveSettings()} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? (fa ? "در حال ذخیره…" : "Saving…") : (fa ? "ذخیره تنظیمات" : "Save settings")}</button>{saved && <span className="ms-3 text-sm text-emerald-600">{fa ? "ذخیره شد" : "Saved"}</span>}</section>}
    </>}
  </div>;
}

function Metric({ label, value, limit }: { label: string; value: string; limit?: string }) {
  return <div className="mt-3 flex items-baseline justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-b-0 dark:border-slate-800"><span className="text-slate-500">{label}</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{value}{limit && <small className="ms-1 font-normal text-slate-400">/ {limit}</small>}</span></div>;
}

const riskNames: Record<string, [string, string]> = {
  SAFE: ["Safe", "ایمن"], WARNING: ["Warning", "هشدار"],
  HIGH_RISK: ["High risk", "ریسک بالا"], CRITICAL: ["Critical", "بحرانی"],
  STALE: ["Data outdated", "داده قدیمی"],
};
const overviewTone: Record<string, string> = {
  SAFE: "border-emerald-400/25 bg-emerald-400/15 text-emerald-100",
  WARNING: "border-amber-400/25 bg-amber-400/15 text-amber-100",
  HIGH_RISK: "border-orange-400/25 bg-orange-400/15 text-orange-100",
  CRITICAL: "border-rose-400/25 bg-rose-400/15 text-rose-100",
  STALE: "border-slate-400/25 bg-slate-400/15 text-slate-200",
};

function OverviewStat({ label, value, detail, valueClassName = "text-white" }: {
  label: string; value: string; detail?: string; valueClassName?: string;
}) {
  return <div className="min-w-0">
    <p className="text-[11px] font-medium text-slate-400">{label}</p>
    <p className={`mt-1 truncate text-sm font-semibold tabular-nums sm:text-base ${valueClassName}`} title={value}>{value}</p>
    {detail && <p className="mt-0.5 text-[11px] text-slate-400">{detail}</p>}
  </div>;
}

function RiskOverview({ evaluation, account, stale, currency, fa }: {
  evaluation: RiskEvaluation; account: Account; stale: boolean; currency: string; fa: boolean;
}) {
  const m = evaluation.metrics;
  const level = stale ? "STALE" : evaluation.level;
  const floating = m.equity - m.balance;
  const floatingValue = `${floating > 0 ? "+" : ""}${money(floating, currency)}`;
  const valuesMatch = m.openPositions === 0 && m.usedMargin === 0 && m.freeMargin != null
    && Math.abs(m.balance - m.equity) < 0.01 && Math.abs(m.equity - m.freeMargin) < 0.01;
  const noMargin = m.usedMargin === 0;
  const stopOutSource = m.stopOutSource === "BROKER" ? (fa ? "کارگزار" : "Broker")
    : m.stopOutSource === "USER" ? (fa ? "تنظیمات شما" : "Your settings") : (fa ? "پیش‌فرض" : "Default estimate");

  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
    <section className="risk-guardian-hero relative isolate min-w-0 overflow-hidden rounded-[30px] border border-slate-800 bg-[#101b33] p-6 text-white shadow-[0_24px_60px_-35px_rgba(15,23,42,.8)] sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -end-20 -top-28 -z-10 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-36 -start-24 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-violet-200"><ShieldCheck size={22} strokeWidth={1.8} /></span>
          <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[.18em] text-violet-200">{fa ? "نمای کلی حساب" : "Account overview"}</p>
            <h2 className="mt-0.5 truncate text-base font-semibold sm:text-lg" title={account.name}>{account.name}</h2>
            <p className="truncate text-xs text-slate-400">{account.broker || (fa ? "کارگزار ثبت نشده" : "Broker unavailable")}</p></div>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${overviewTone[level]}`}>
          <span className="h-1.5 w-1.5 rounded-full bg-current" />{riskNames[level]?.[fa ? 1 : 0] ?? level}
        </span>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:items-end">
        <div><p className="text-xs font-medium text-slate-400">{fa ? "امتیاز ریسک" : "Risk score"}</p>
          <div className="mt-1 flex items-baseline gap-1.5" dir="ltr"><strong className="text-6xl font-semibold leading-none tracking-[-.07em] tabular-nums sm:text-7xl">{stale ? "—" : evaluation.score}</strong><span className="text-base text-slate-400">/ 100</span></div>
          <p className="mt-2 text-xs text-slate-400">{stale ? (fa ? "تا دریافت داده تازه محاسبه نمی‌شود" : "Waiting for fresh account data") : (fa ? "بر اساس آخرین دادهٔ حساب" : "Based on the latest account snapshot")}</p>
        </div>
        <div className="sm:text-end"><p className="text-xs font-medium text-slate-400">{fa ? "سرمایه فعلی" : "Current equity"}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl" dir="ltr">{money(m.equity, currency)}</p>
          <p className="mt-2 text-xs text-slate-400">{fa ? "ارزش حساب با سود و زیان شناور" : "Account value including floating P/L"}</p>
        </div>
      </div>

      <div className="mt-7" dir="ltr">
        <div className="relative h-2.5 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 via-orange-400 to-rose-500">
          {!stale && <span className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_3px_#101b33]" style={{ left: `${Math.max(2, Math.min(98, evaluation.score))}%` }} aria-label={`${evaluation.score} / 100`} />}
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400"><span>{fa ? "ایمن" : "Safe"}</span><span>{fa ? "هشدار" : "Warning"}</span><span>{fa ? "ریسک بالا" : "High risk"}</span><span>{fa ? "بحرانی" : "Critical"}</span></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 sm:grid-cols-3">
        {valuesMatch ? <>
          <OverviewStat label={fa ? "سود و زیان شناور" : "Floating P/L"} value={floatingValue} valueClassName={floating < 0 ? "text-rose-300" : "text-emerald-300"} />
          <OverviewStat label={fa ? "مارجین مصرفی" : "Margin in use"} value={money(m.usedMargin, currency)} />
          <OverviewStat label={fa ? "موقعیت باز" : "Open positions"} value={String(m.openPositions)} />
        </> : <>
          <OverviewStat label={fa ? "موجودی" : "Balance"} value={money(m.balance, currency)} />
          <OverviewStat label={fa ? "سود و زیان شناور" : "Floating P/L"} value={floatingValue} valueClassName={floating < 0 ? "text-rose-300" : "text-emerald-300"} />
          <OverviewStat label={fa ? "مارجین آزاد" : "Free margin"} value={money(m.freeMargin, currency)} />
        </>}
      </div>
      {valuesMatch && <p className="mt-4 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-5 text-slate-300">{fa ? "چون معاملهٔ بازی ندارید، موجودی، سرمایه و مارجین آزاد شما برابرند." : "With no open positions, balance, equity and free margin are equal."}</p>}
    </section>

    <section className={`${panel} flex min-w-0 flex-col`}>
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"><Activity size={21} strokeWidth={1.8} /></span>
        <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-violet-600 dark:text-violet-300">{fa ? "پایش مارجین" : "Margin monitor"}</p><h2 className="text-lg font-bold text-slate-950 dark:text-white">{fa ? "ایمنی مارجین" : "Margin safety"}</h2></div></div>

      <div className="mt-6 rounded-[22px] border border-slate-100 bg-slate-50 p-5 dark:border-slate-700/70 dark:bg-slate-900/70">
        {m.marginLevel == null ? <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{noMargin ? <ShieldCheck size={19} /> : <TriangleAlert size={19} />}</span>
          <div><p className="font-semibold text-slate-950 dark:text-white">{noMargin ? (fa ? "مارجینی مصرف نشده" : "No margin in use") : (fa ? "سطح مارجین در دسترس نیست" : "Margin level unavailable")}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{noMargin ? (fa ? "سطح مارجین وقتی معامله‌ای از مارجین استفاده کند نمایش داده می‌شود." : "Margin level appears when a position starts using margin.") : (fa ? "دادهٔ مارجین از اتصال حساب دریافت نشده است." : "The account connection has not provided margin data.")}</p></div></div>
          : <div className="flex items-end justify-between gap-4"><div><p className="text-xs text-slate-500">{fa ? "سطح مارجین فعلی" : "Current margin level"}</p><p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums text-slate-950 dark:text-white" dir="ltr">{fmt(m.marginLevel)}%</p></div>
            {m.distanceToCriticalMargin != null && <div className="text-end"><p className="text-xs text-slate-500">{fa ? "فاصله تا حد بحرانی" : "Above critical level"}</p><p className="mt-1 text-lg font-semibold tabular-nums text-slate-700 dark:text-slate-200" dir="ltr">{fmt(m.distanceToCriticalMargin)} pp</p></div>}</div>}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-amber-500/15 dark:bg-amber-500/5"><p className="text-xs text-amber-800/80 dark:text-amber-200/70">{fa ? "مارجین کال" : "Margin call"}</p><strong className="mt-1 block text-xl font-semibold tabular-nums text-amber-950 dark:text-amber-100" dir="ltr">{fmt(m.marginCallLevel)}%</strong></div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 px-4 py-3 dark:border-rose-500/15 dark:bg-rose-500/5"><p className="text-xs text-rose-800/80 dark:text-rose-200/70">{fa ? "استاپ‌اوت" : "Stop-out"}</p><strong className="mt-1 block text-xl font-semibold tabular-nums text-rose-950 dark:text-rose-100" dir="ltr">{fmt(m.stopOutLevel)}%</strong></div>
      </div>
      <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-700/70">
        <div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium text-slate-500 dark:text-slate-400">{fa ? "درگیری سرمایه با مارجین" : "Equity committed to margin"}</span><strong className="tabular-nums text-slate-900 dark:text-white" dir="ltr">{percent(m.marginUtilizationPercent)}</strong></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" role={m.marginUtilizationPercent == null ? undefined : "meter"} aria-label={fa ? "درگیری سرمایه با مارجین" : "Equity committed to margin"} aria-valuenow={m.marginUtilizationPercent ?? undefined} aria-valuemin={0} aria-valuemax={Math.max(100, m.marginUtilizationPercent ?? 100)}>
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" style={{ width: `${Math.max(0, Math.min(100, m.marginUtilizationPercent ?? 0))}%` }} />
        </div>
        {noMargin && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{fa ? "در حال حاضر سرمایه‌ای برای نگهداری معامله قفل نشده است." : "No equity is currently committed to open positions."}</p>}
      </div>
      <p className="mt-auto pt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">{fa ? "منبع حد استاپ‌اوت" : "Stop-out source"}: <span className="font-semibold text-slate-700 dark:text-slate-200">{stopOutSource}</span>{m.stopOutSource === "DEFAULT" ? (fa ? "؛ این حد تخمینی است." : "; this threshold is an estimate.") : "."}</p>
      {m.estimatedEquityBuffer != null && <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{fa ? "بافر تخمینی تا حد بحرانی" : "Estimated buffer to critical"}: <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">{money(m.estimatedEquityBuffer, currency)}</span>. {fa ? "تضمین زیان ایمن نیست." : "This is not a safe-loss guarantee."}</p>}
    </section>
  </div>;
}
