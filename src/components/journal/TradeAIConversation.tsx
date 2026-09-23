"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import { useLanguage } from "@/lib/language-context";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  isIntro: boolean;
  createdAt: string;
};

type ChatResponse = { ok: boolean; messages?: ChatMessage[]; error?: string };

function number(value: string | number | null | undefined) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function TradeAIConversation({ trade, enabled }: { trade: PrismaTradeDto; enabled: boolean }) {
  const { language } = useLanguage();
  const fa = language === "fa";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const risk = number(trade.riskAmount);
  const pnl = number(trade.profitLoss);
  const closed = trade.status === "CLOSED";
  const currency = trade.account?.currency || "";
  const scale = Math.max(Math.abs(risk ?? 0), Math.abs(pnl ?? 0), 1);
  const formatMoney = (amount: number) => `${amount.toLocaleString(language === "fa" ? "fa-IR" : "en-US", { maximumFractionDigits: 2 })} ${currency}`.trim();
  const answeredQuestions = messages.filter((message) => message.role === "user").length;
  const interviewComplete = answeredQuestions >= 3;

  useEffect(() => {
    let active = true;
    const url = `/api/trades/${trade.id}/ai-chat`;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(url);
        const data = (await response.json()) as ChatResponse;
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not load conversation.");
        if (!active) return;
        if (data.messages?.length || !enabled) {
          setMessages(data.messages ?? []);
          return;
        }
        const introResponse = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "intro", language }),
        });
        const introData = (await introResponse.json()) as ChatResponse;
        if (!introResponse.ok || !introData.ok) throw new Error(introData.error || "Could not start conversation.");
        if (active) setMessages(introData.messages ?? []);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load conversation.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [trade.id, enabled, language]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || sending || loading || !enabled) return;
    setSending(true);
    setError("");
    setInput("");
    try {
      const response = await fetch(`/api/trades/${trade.id}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", language, content: trimmed }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not send message.");
      setMessages(data.messages ?? []);
    } catch (cause) {
      setInput(trimmed);
      setError(cause instanceof Error ? cause.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  async function restartReview() {
    if (sending || loading || !enabled) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/trades/${trade.id}/ai-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", language }),
      });
      const data = (await response.json()) as ChatResponse;
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not restart review.");
      setMessages(data.messages ?? []);
      setInput("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not restart review.");
    } finally {
      setSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white dark:border-violet-500/25 dark:from-[#17152b] dark:to-[#0b1220]" dir={fa ? "rtl" : "ltr"}>
      <div className="border-b border-violet-200/70 px-4 py-3 dark:border-violet-500/20">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-600 text-white"><Bot className="h-4 w-4" /></span>
          {fa ? "بازبینی معامله با AI" : "AI guided trade review"}
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {fa ? "AI سؤال‌ها را یکی‌یکی می‌پرسد و پس از سه پاسخ، نتیجه را جمع‌بندی می‌کند." : "AI asks one question at a time and concludes after three answers."}
        </p>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-lg border border-violet-200 bg-white/70 px-3 py-2 text-xs font-medium text-violet-800 dark:border-violet-500/30 dark:bg-slate-900/50 dark:text-violet-200">
          {interviewComplete
            ? (fa ? "جمع‌بندی آماده است؛ می‌توانید گفت‌وگو را ادامه دهید." : "Review complete. You can continue the conversation.")
            : (fa ? `سؤال ${Math.min(answeredQuestions + 1, 3)} از ۳ · به سؤال AI پاسخ بدهید.` : `Question ${Math.min(answeredQuestions + 1, 3)} of 3 · Answer AI's question.`)}
        </div>
        {enabled && !loading && messages.length > 0 ? <button type="button" onClick={() => void restartReview()} disabled={sending} className="text-[11px] text-violet-700 underline disabled:opacity-50 dark:text-violet-200">{fa ? "شروع بازبینی جدید" : "Start a new guided review"}</button> : null}
        <div className="rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-100">{trade.symbol} · {trade.direction} · {trade.setup || (fa ? "ستاپ ثبت نشده" : "No setup recorded")}</span>
            <span className="text-slate-500 dark:text-slate-400">{closed ? (fa ? "بسته‌شده" : "Closed") : trade.status === "CANCELLED" ? (fa ? "لغوشده" : "Cancelled") : (fa ? "باز / در جریان" : "Open / in progress")}</span>
          </div>
          {(risk !== null && risk > 0) || (closed && pnl !== null) ? (
            <div className="mt-3 space-y-2" aria-label={fa ? "نمودار ریسک و نتیجه" : "Risk and outcome chart"}>
              {risk !== null && risk > 0 ? (
                <div className="grid grid-cols-[72px_1fr_auto] items-center gap-2 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{fa ? "ریسک ثبت‌شده" : "Recorded risk"}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(3, Math.abs(risk) / scale * 100)}%` }} /></div>
                  <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200" dir="ltr">{formatMoney(risk)}</span>
                </div>
              ) : null}
              {closed && pnl !== null ? (
                <div className="grid grid-cols-[72px_1fr_auto] items-center gap-2 text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{fa ? "نتیجهٔ واقعی" : "Realized result"}</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full ${pnl >= 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${Math.max(3, Math.abs(pnl) / scale * 100)}%` }} /></div>
                  <span className={`font-semibold tabular-nums ${pnl >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-red-600 dark:text-red-300"}`} dir="ltr">{pnl > 0 ? "+" : ""}{formatMoney(pnl)}</span>
                </div>
              ) : null}
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">{fa ? "برای نمودار، مقدار ریسک یا نتیجه ثبت نشده است." : "Record risk or result to show a comparison chart."}</p>}
        </div>

        <div className="max-h-80 space-y-3 overflow-y-auto" aria-live="polite">
          {loading ? <p className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-200"><Loader2 className="h-3.5 w-3.5 animate-spin" />{fa ? "در حال آماده‌سازی پیام AI…" : "Preparing the AI message…"}</p> : null}
          {!loading && messages.length === 0 && !error ? <p className="text-xs text-slate-500">{enabled ? (fa ? "هنوز پیامی ثبت نشده است." : "No message yet.") : (fa ? "برای شروع گفت‌وگو، دسترسی تحلیل AI لازم است." : "AI analysis access is required to start a conversation.")}</p> : null}
          {messages.map((message) => (
            <div key={message.id} className={`rounded-lg px-3 py-2 text-sm leading-6 ${message.role === "assistant" ? "border border-violet-200 bg-white text-slate-800 dark:border-violet-500/25 dark:bg-slate-900 dark:text-slate-100" : "ms-6 bg-blue-600 text-white"}`}>
              {message.role === "assistant" ? <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase text-violet-600 dark:text-violet-300"><Sparkles className="h-3 w-3" />Inguardy AI</div> : null}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          {sending ? <p className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-200"><Loader2 className="h-3.5 w-3.5 animate-spin" />{fa ? "در حال تحلیل…" : "Analyzing…"}</p> : null}
        </div>
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
        {enabled && !loading ? (
          <>
            <form onSubmit={submit} className="flex gap-2">
              <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} aria-label={fa ? "پاسخ به AI" : "Answer AI"} placeholder={interviewComplete ? (fa ? "سؤال یا توضیح دیگری بنویسید…" : "Ask a follow-up or add context…") : (fa ? "پاسخ خود را اینجا بنویسید…" : "Write your answer here…")} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              <button type="submit" disabled={!input.trim() || sending} className="grid w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white disabled:opacity-50" aria-label={fa ? "ارسال" : "Send"}><Send className="h-4 w-4" /></button>
            </form>
            {!interviewComplete ? <button type="button" onClick={() => void send(fa ? "یادم نیست؛ لطفاً با اطلاعات موجود ادامه بده." : "I don't remember; please continue with the available information.")} disabled={sending} className="text-[11px] text-slate-500 underline disabled:opacity-50 dark:text-slate-400">{fa ? "یادم نیست؛ سؤال بعدی" : "I don't remember · next question"}</button> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
