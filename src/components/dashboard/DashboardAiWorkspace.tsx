"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  LoaderCircle,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { journalAiPrompts, useJournalAiChat } from "@/components/dashboard/useJournalAiChat";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type JournalAiAccount = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
};

export function DashboardAiWorkspace({
  accounts,
  initialAccountId,
}: {
  accounts: JournalAiAccount[];
  initialAccountId?: string | null;
}) {
  const { language } = useLanguage();
  const isRtl = language === "fa";
  const [accountId, setAccountId] = useState(initialAccountId || "");
  const [input, setInput] = useState("");
  const { messages, loading, meta, ask, newChat } = useJournalAiChat({ language, accountId });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    await ask(question);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  function resetChat() {
    newChat();
    setInput("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const copy = isRtl
    ? {
        eyebrow: "دستیار هوشمند ژورنال",
        title: "Ingyardy AI",
        subtitle: "از داده‌های واقعی ژورنال خود سؤال کنید و پاسخ‌های مستند و عملی بگیرید.",
        newChat: "گفتگوی جدید",
        scope: "محدوده تحلیل",
        allAccounts: "همه حساب‌ها",
        allAccountsHelp: "عملکرد همه حساب‌های معاملاتی شما",
        prompts: "پیشنهاد برای شروع",
        privacy: "پاسخ‌ها فقط بر اساس داده‌های ژورنال شما ساخته می‌شوند.",
        noTrades: "برای تحلیل دقیق‌تر، ابتدا چند معامله و یادداشت ژورنال ثبت کنید.",
        emptyTitle: "چه چیزی را می‌خواهید بررسی کنیم؟",
        emptyBody: "درباره عملکرد، ستاپ‌ها، روان‌شناسی، مدیریت ریسک یا اشتباهات تکراری خود بپرسید.",
        placeholder: "سؤال خود را درباره ژورنال بنویسید…",
        disclaimer: "این پاسخ‌ها برای مرور فرایند معاملاتی هستند و توصیه مالی محسوب نمی‌شوند.",
        analyzed: "معامله بررسی شد",
        closed: "بسته‌شده",
      }
    : {
        eyebrow: "Journal intelligence",
        title: "Ingyardy AI",
        subtitle: "Ask questions about your real journal data and get grounded, actionable answers.",
        newChat: "New chat",
        scope: "Analysis scope",
        allAccounts: "All accounts",
        allAccountsHelp: "Performance across all your trading accounts",
        prompts: "Try asking",
        privacy: "Answers are generated only from your journal data.",
        noTrades: "Log a few trades and journal notes to unlock a more useful analysis.",
        emptyTitle: "What would you like to review?",
        emptyBody: "Ask about performance, setups, psychology, risk management, or repeated mistakes.",
        placeholder: "Ask a question about your journal…",
        disclaimer: "Responses support process review and are not financial advice.",
        analyzed: "trades analyzed",
        closed: "closed",
      };

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5" dir={isRtl ? "rtl" : "ltr"}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-600 dark:text-sky-400">
            <Sparkles className="h-4 w-4" />
            {copy.eyebrow}
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={resetChat}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-700"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {copy.newChat}
        </button>
      </header>

      <div className="grid min-h-[650px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-950 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70 lg:border-b-0 lg:border-e">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
            {copy.scope}
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-sky-950"
            >
              <option value="">{copy.allAccounts}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {accountId
              ? [accounts.find((account) => account.id === accountId)?.broker, accounts.find((account) => account.id === accountId)?.platform].filter(Boolean).join(" · ")
              : copy.allAccountsHelp}
          </p>

          <div className="my-5 border-t border-slate-200 dark:border-slate-800" />

          <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">{copy.prompts}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {journalAiPrompts[language].map((prompt, index) => {
              const icons = [BarChart3, BookOpenCheck, CheckCircle2, BrainCircuit];
              const Icon = icons[index];
              return (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => void send(prompt)}
                  className="group flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-start text-xs font-semibold leading-5 text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-700 dark:hover:text-sky-300"
                >
                  <Icon className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-sky-500" />
                  {prompt}
                </button>
              );
            })}
          </div>

          <div className="mt-5 rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs leading-5 text-sky-800 dark:border-sky-900/70 dark:bg-sky-950/35 dark:text-sky-200">
            <ShieldCheck className="mb-2 h-4 w-4" />
            {copy.privacy}
          </div>
        </aside>

        <section className="flex min-h-[560px] min-w-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
            {messages.length === 0 && !loading ? (
              <div className="mx-auto flex h-full max-w-lg flex-col items-center justify-center py-10 text-center">
                <span className="grid h-20 w-20 place-items-center overflow-hidden rounded-[22px] bg-[#15191f] shadow-xl ring-8 ring-sky-50 dark:ring-sky-950/50">
                  <Image src="/images/ingyardy-ai.png" alt="Ingyardy AI" width={80} height={80} className="h-[72px] w-[72px] object-contain" priority />
                </span>
                <h2 className="mt-7 text-xl font-bold text-slate-950 dark:text-white">{copy.emptyTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{copy.emptyBody}</p>
                {accounts.length === 0 ? (
                  <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{copy.noTrades}</p>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-3xl space-y-5">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex gap-3", message.role === "user" && "justify-end")}>
                    {message.role === "assistant" ? (
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-sky-100 dark:ring-sky-950">
                        <Image src="/images/ingyardy-ai.png" alt="" width={36} height={36} className="h-8 w-8 object-contain" />
                      </span>
                    ) : null}
                    <div className={cn(
                      "max-w-[86%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 sm:max-w-[78%]",
                      message.role === "user"
                        ? "rounded-se-md bg-slate-900 text-white dark:bg-sky-600"
                        : message.failed
                          ? "rounded-ss-md border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                          : "rounded-ss-md border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                    )}>
                      {message.content}
                    </div>
                  </div>
                ))}
                {loading ? (
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-sky-100 dark:ring-sky-950">
                      <Image src="/images/ingyardy-ai.png" alt="" width={36} height={36} className="h-8 w-8 object-contain" />
                    </span>
                    <span className="flex items-center gap-1 rounded-2xl rounded-ss-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                      <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-.3s]" />
                      <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-.15s]" />
                      <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
                    </span>
                  </div>
                ) : null}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <footer className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:px-6">
            {meta ? (
              <div className="mx-auto mb-2 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                <span>{meta.totalTrades} {copy.analyzed}</span>
                <span aria-hidden="true">•</span>
                <span>{meta.closedTrades} {copy.closed}</span>
                {meta.accountName ? <><span aria-hidden="true">•</span><span>{meta.accountName}</span></> : null}
              </div>
            ) : null}
            <form onSubmit={submit} className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 dark:border-slate-700 dark:bg-slate-900 dark:focus-within:ring-sky-950">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={2000}
                placeholder={copy.placeholder}
                aria-label={copy.placeholder}
                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label={isRtl ? "ارسال" : "Send"}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className={cn("h-4 w-4", isRtl && "rotate-180")} />}
              </button>
            </form>
            <p className="mt-2 text-center text-[10px] text-slate-400">{copy.disclaimer}</p>
          </footer>
        </section>
      </div>
    </div>
  );
}
