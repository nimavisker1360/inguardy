"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type JournalAiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  failed?: boolean;
};

export type JournalAiMeta = {
  accountName: string | null;
  totalTrades: number;
  closedTrades: number;
  generatedAt: string;
};

export const journalAiPrompts = {
  en: [
    "Show my best setups",
    "Review recent trades",
    "Build today's plan",
    "My repeated mistakes",
  ],
  fa: [
    "بهترین ستاپ‌هایم را نشان بده",
    "معاملات اخیرم را مرور کن",
    "برنامه معاملاتی امروز را بساز",
    "اشتباهات تکراری من چیست؟",
  ],
} as const;

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useJournalAiChat({
  language,
  accountId,
}: {
  language: "en" | "fa";
  accountId?: string | null;
}) {
  const isRtl = language === "fa";
  const [messages, setMessages] = useState<JournalAiMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<JournalAiMeta | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const scopeRef = useRef(accountId || "all");

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    const nextScope = accountId || "all";
    if (scopeRef.current === nextScope) return;

    requestRef.current?.abort();
    requestRef.current = null;
    scopeRef.current = nextScope;
    setMessages([]);
    setMeta(null);
    setLoading(false);
  }, [accountId]);

  const ask = useCallback(async (question: string) => {
    const normalized = question.trim();
    if (!normalized || loading) return;

    const userMessage: JournalAiMessage = { id: messageId(), role: "user", content: normalized };
    let cleanMessages = messages.filter((message) => !message.failed);
    if (messages.at(-1)?.failed && cleanMessages.at(-1)?.role === "user") {
      cleanMessages = cleanMessages.slice(0, -1);
    }
    const nextMessages = [...cleanMessages, userMessage];
    setMessages(nextMessages);
    setLoading(true);

    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;

    try {
      const response = await fetch("/api/dashboard/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          accountId: accountId || null,
          language,
          messages: nextMessages.slice(-9).map(({ role, content }) => ({ role, content })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        answer?: string;
        error?: string;
        message?: string;
        meta?: JournalAiMeta;
      } | null;

      if (!response.ok || !payload?.ok || !payload.answer) {
        throw new Error(
          payload?.error || payload?.message ||
            (isRtl ? "پاسخی دریافت نشد. دوباره تلاش کنید." : "No answer was received. Please try again.")
        );
      }

      setMessages((current) => [
        ...current,
        { id: messageId(), role: "assistant", content: payload.answer || "" },
      ]);
      setMeta(payload.meta || null);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessages((current) => [
        ...current,
        {
          id: messageId(),
          role: "assistant",
          failed: true,
          content: error instanceof Error
            ? error.message
            : isRtl ? "خطایی رخ داد. دوباره تلاش کنید." : "Something went wrong. Please try again.",
        },
      ]);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [accountId, isRtl, language, loading, messages]);

  const newChat = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    setLoading(false);
    setMessages([]);
    setMeta(null);
  }, []);

  return { messages, loading, meta, ask, newChat };
}
