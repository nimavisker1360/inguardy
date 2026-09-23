"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, Expand, LoaderCircle, MessageSquarePlus, Send, X } from "lucide-react";
import { journalAiPrompts, useJournalAiChat } from "@/components/dashboard/useJournalAiChat";
import { cn } from "@/lib/utils";

type DashboardAiAssistantProps = {
  language: "en" | "fa";
  activeAccountId?: string | null;
  activeAccountName?: string | null;
};

export function DashboardAiAssistant({
  language,
  activeAccountId,
  activeAccountName,
}: DashboardAiAssistantProps) {
  const isRtl = language === "fa";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");
  const { messages, loading, ask, newChat } = useJournalAiChat({ language, accountId: activeAccountId });
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (isRtl || open || input) return;

    const questions = [
      activeAccountName ? `How is ${activeAccountName} performing?` : "How did I perform this week?",
      "What are my most common trading mistakes?",
      "Which setups work best for me?",
      "How can I improve my risk management?",
      "Am I following my trading plan?",
    ];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAnimatedPlaceholder(questions[0]);
      return;
    }

    let questionIndex = 0;
    let characterIndex = 0;
    let deleting = false;
    let timer: number;

    function animate() {
      const question = questions[questionIndex];
      characterIndex += deleting ? -1 : 1;
      setAnimatedPlaceholder(question.slice(0, characterIndex));

      if (characterIndex === question.length) {
        deleting = true;
        timer = window.setTimeout(animate, 1800);
      } else if (characterIndex === 0) {
        deleting = false;
        questionIndex = (questionIndex + 1) % questions.length;
        timer = window.setTimeout(animate, 350);
      } else {
        timer = window.setTimeout(animate, deleting ? 35 : 70);
      }
    }

    setAnimatedPlaceholder("");
    timer = window.setTimeout(animate, 350);
    return () => window.clearTimeout(timer);
  }, [activeAccountName, input, isRtl, open]);

  async function askQuestion(question: string) {
    if (!question.trim() || loading) return;
    setInput("");
    setOpen(true);
    await ask(question);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void askQuestion(input);
  }

  function resetChat() {
    newChat();
    setInput("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  const placeholder = activeAccountName
    ? isRtl ? `درباره ژورنال ${activeAccountName} بپرسید…` : `Ask about ${activeAccountName}…`
    : isRtl ? "درباره ژورنال معاملاتی خود بپرسید…" : "Ask about your trading journal…";

  return (
    <>
      <form
        onSubmit={submit}
        className="group mt-5 flex min-h-[70px] w-full max-w-[520px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-start shadow-[0_8px_25px_rgba(15,23,42,0.08)] transition focus-within:border-sky-400 focus-within:shadow-[0_12px_30px_rgba(14,165,233,0.12)] dark:border-slate-700 dark:bg-slate-900 dark:focus-within:border-sky-600"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#15191f] shadow-sm">
          <Image src="/images/ingyardy-ai.png" alt="Ingyardy AI" width={40} height={40} className="h-9 w-9 object-contain" />
        </span>
        <label className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-slate-950 dark:text-white">Ingyardy AI</span>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onFocus={() => setOpen(true)}
            maxLength={2000}
            className="mt-1 block w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            placeholder={isRtl || open ? placeholder : animatedPlaceholder}
            aria-label={placeholder}
          />
        </label>
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label={isRtl ? "ارسال سؤال" : "Send question"}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-sky-100 hover:text-sky-700 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-slate-800 dark:text-slate-300"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />}
        </button>
      </form>

      <div className="mt-3 flex max-w-[680px] flex-wrap justify-center gap-2">
        {journalAiPrompts[language].map((prompt) => (
          <button key={prompt} type="button" onClick={() => void askQuestion(prompt)} className="dashboard-home-chip">
            {prompt}
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[60px] z-[65]" aria-live="polite">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-label={isRtl ? "بستن گفتگو" : "Close chat"}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={isRtl ? "گفتگو با هوش مصنوعی اینگاردی" : "Chat with Ingyardy AI"}
            dir={isRtl ? "rtl" : "ltr"}
            className={cn(
              "absolute inset-y-0 flex w-full flex-col border-slate-200 bg-white shadow-[-16px_0_50px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-950 sm:max-w-[460px]",
              isRtl ? "left-0 border-r" : "right-0 border-l"
            )}
          >
            <header className="flex h-[62px] shrink-0 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
              <button
                type="button"
                onClick={resetChat}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                <MessageSquarePlus className="h-4 w-4" />
                {isRtl ? "گفتگوی جدید" : "New chat"}
              </button>
              <div className="flex-1" />
              <span className="hidden text-[11px] text-slate-400 sm:block">
                {activeAccountName || (isRtl ? "همه ژورنال" : "All journal")}
              </span>
              <Link
                href="/dashboard/ai-reader"
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900"
                aria-label={isRtl ? "باز کردن صفحه کامل" : "Open full page"}
                title={isRtl ? "صفحه کامل" : "Full page"}
              >
                <Expand className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-900"
                aria-label={isRtl ? "بستن" : "Close"}
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5">
              {messages.length === 0 && !loading ? (
                <div className="mx-auto flex h-full max-w-[340px] flex-col items-center justify-center text-center">
                  <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-4 ring-sky-100 dark:ring-sky-950">
                    <Image src="/images/ingyardy-ai.png" alt="Ingyardy AI" width={64} height={64} className="h-14 w-14 object-contain" />
                  </span>
                  <h2 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">Ingyardy AI</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {isRtl
                      ? "از معاملات، آمار، اشتباهات، احساسات و یادداشت‌های ژورنال خود سؤال کنید."
                      : "Ask about your trades, statistics, mistakes, emotions, and journal notes."}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((message) => (
                    <div key={message.id} className={cn("flex gap-2.5", message.role === "user" && "justify-end")}>
                      {message.role === "assistant" && (
                        <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-sky-100 dark:ring-sky-950">
                          <Image src="/images/ingyardy-ai.png" alt="" width={32} height={32} className="h-7 w-7 object-contain" />
                        </span>
                      )}
                      <div
                        className={cn(
                          "max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6",
                          message.role === "user"
                            ? "rounded-tr-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white"
                            : message.failed
                              ? "rounded-tl-md border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
                              : "rounded-tl-md border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-slate-950 ring-2 ring-sky-100 dark:ring-sky-950">
                        <Image src="/images/ingyardy-ai.png" alt="" width={32} height={32} className="h-7 w-7 object-contain" />
                      </span>
                      <span className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                        <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-.3s]" />
                        <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-.15s]" />
                        <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
                      </span>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <form onSubmit={submit} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm focus-within:border-sky-400 dark:border-slate-700 dark:bg-slate-900">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  maxLength={2000}
                  placeholder={isRtl ? "هر سؤالی درباره ژورنال بپرسید…" : "Ask anything about your journal…"}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label={isRtl ? "ارسال" : "Send"}
                >
                  {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className={cn("h-4 w-4", isRtl && "rotate-180")} />}
                </button>
              </form>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                {isRtl ? "پاسخ‌ها فقط بر اساس ژورنال شما هستند و توصیه مالی محسوب نمی‌شوند." : "Answers use your journal only and are not financial advice."}
              </p>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
