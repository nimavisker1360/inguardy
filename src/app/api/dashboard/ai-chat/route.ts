import { NextResponse } from "next/server";
import { z } from "zod";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { GeminiClientError } from "@/server/ai/gemini-client";
import {
  answerJournalQuestion,
  JournalChatAccountError,
} from "@/server/ai/journal-chat-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2_000),
});

const requestSchema = z.object({
  accountId: z.string().trim().min(1).max(100).nullable().optional(),
  language: z.enum(["en", "fa"]).default("en"),
  messages: z.array(messageSchema).min(1).max(10).superRefine((messages, context) => {
    if (messages[0]?.role !== "user") {
      context.addIssue({ code: "custom", message: "Conversation must start with a user message" });
    }
    for (let index = 1; index < messages.length; index += 1) {
      if (messages[index].role === messages[index - 1].role) {
        context.addIssue({ code: "custom", message: "Conversation roles must alternate" });
        break;
      }
    }
  }),
});

const RATE_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT = 20;
const requestBuckets = new Map<string, number[]>();

function errorText(language: "en" | "fa", key: "invalid" | "lastUser" | "rate" | "unavailable" | "failed") {
  const copy = {
    en: {
      invalid: "The message is not valid.",
      lastUser: "The last message must be from the user.",
      rate: "Too many requests. Please try again in a few minutes.",
      unavailable: "Ingyardy AI is temporarily unavailable. Please try again.",
      failed: "Ingyardy AI could not answer this question.",
    },
    fa: {
      invalid: "پیام ارسال‌شده معتبر نیست.",
      lastUser: "آخرین پیام باید از طرف کاربر باشد.",
      rate: "تعداد درخواست‌ها زیاد است؛ چند دقیقه دیگر دوباره تلاش کنید.",
      unavailable: "در حال حاضر پاسخ‌گویی هوش مصنوعی ممکن نیست؛ دوباره تلاش کنید.",
      failed: "پاسخ‌گویی به سؤال با خطا روبه‌رو شد.",
    },
  } as const;

  return copy[language][key];
}

function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (requestBuckets.get(userId) || []).filter((time) => now - time < RATE_WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    requestBuckets.set(userId, recent);
    return true;
  }

  recent.push(now);
  requestBuckets.set(userId, recent);
  return false;
}

export async function POST(request: Request) {
  let responseLanguage: "en" | "fa" = "en";

  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    responseLanguage = body && typeof body === "object" && body.language === "fa" ? "fa" : "en";
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: errorText(responseLanguage, "invalid") },
        { status: 400 }
      );
    }

    if (parsed.data.messages.at(-1)?.role !== "user") {
      return NextResponse.json(
        { ok: false, error: errorText(responseLanguage, "lastUser") },
        { status: 400 }
      );
    }

    if (rateLimited(user.id)) {
      return NextResponse.json(
        { ok: false, error: errorText(responseLanguage, "rate") },
        { status: 429 }
      );
    }

    await requireFeatureAccess(user.id, "aiAnalysis");
    const result = await answerJournalQuestion({
      userId: user.id,
      accountId: parsed.data.accountId,
      language: parsed.data.language,
      messages: parsed.data.messages,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const accessResponse = subscriptionAccessResponse(error);
    if (accessResponse) return accessResponse;

    if (error instanceof JournalChatAccountError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 404 });
    }

    if (error instanceof GeminiClientError) {
      const status = error.message.includes("GEMINI_API_KEY") ? 500 : 502;
      return NextResponse.json(
        { ok: false, error: errorText(responseLanguage, "unavailable") },
        { status }
      );
    }

    return NextResponse.json(
      { ok: false, error: errorText(responseLanguage, "failed") },
      { status: 500 }
    );
  }
}
