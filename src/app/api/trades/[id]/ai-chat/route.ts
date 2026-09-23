import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import { GeminiClientError } from "@/server/ai/gemini-client";
import { answerTradeChat, TradeChatNotFoundError } from "@/server/ai/trade-chat-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const requestSchema = z.object({
  language: z.enum(["en", "fa"]).default("en"),
  action: z.enum(["intro", "message", "restart"]),
  content: z.string().trim().min(1).max(2000).optional(),
}).refine((data) => data.action !== "message" || Boolean(data.content), {
  message: "Message required",
});

const buckets = new Map<string, number[]>();
function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (buckets.get(userId) ?? []).filter((time) => now - time < 600_000);
  if (recent.length >= 20) return true;
  buckets.set(userId, [...recent, now]);
  return false;
}

async function loadMessages(userId: string, tradeId: string) {
  return prisma.tradeAIChatMessage.findMany({
    where: { userId, tradeId },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, role: true, content: true, isIntro: true, createdAt: true },
  });
}

function activeSession<T extends { isIntro: boolean }>(messages: T[]) {
  const start = messages.findLastIndex((message) => message.isIntro);
  return start >= 0 ? messages.slice(start) : messages;
}

function errorResponse(error: unknown) {
  const auth = authErrorResponse(error);
  if (auth) return auth;
  const access = subscriptionAccessResponse(error);
  if (access) return access;
  if (error instanceof TradeChatNotFoundError) {
    return NextResponse.json({ ok: false, error: "Trade not found" }, { status: 404 });
  }
  if (error instanceof GeminiClientError) {
    return NextResponse.json({ ok: false, error: "AI is temporarily unavailable. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ ok: false, error: "Could not load the trade conversation." }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const trade = await prisma.trade.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!trade) throw new TradeChatNotFoundError();
    return NextResponse.json({ ok: true, messages: activeSession(await loadMessages(user.id, id)) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const trade = await prisma.trade.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!trade) throw new TradeChatNotFoundError();

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid message." }, { status: 400 });
    }

    const history = activeSession(await loadMessages(user.id, id));
    if (parsed.data.action === "intro" && history.length > 0) {
      return NextResponse.json({ ok: true, messages: history });
    }
    await requireFeatureAccess(user.id, "aiAnalysis");
    if (rateLimited(user.id)) {
      return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const recentConversation = history.slice(-9).map((message) => ({
      role: message.role === "assistant" ? "assistant" as const : "user" as const,
      content: message.content,
    }));
    while (recentConversation[0]?.role === "assistant") recentConversation.shift();
    const answer = await answerTradeChat({
      userId: user.id,
      tradeId: id,
      language: parsed.data.language,
      intro: parsed.data.action !== "message",
      interviewTurn: parsed.data.action === "message" ? history.filter((message) => message.role === "user").length + 1 : 0,
      previousQuestion: parsed.data.action === "message" ? history.filter((message) => message.role === "assistant").at(-1)?.content ?? null : null,
      messages: parsed.data.action !== "message"
        ? []
        : [...recentConversation, { role: "user", content: parsed.data.content! }],
    });

    if (parsed.data.action === "restart") {
      await prisma.$transaction(async (tx) => {
        await tx.tradeAIChatMessage.updateMany({ where: { tradeId: id, userId: user.id, isIntro: true }, data: { isIntro: false } });
        await tx.tradeAIChatMessage.create({ data: { tradeId: id, userId: user.id, role: "assistant", content: answer, isIntro: true } });
      });
    } else if (parsed.data.action === "intro") {
      try {
        await prisma.tradeAIChatMessage.create({
          data: { tradeId: id, userId: user.id, role: "assistant", content: answer, isIntro: true },
        });
      } catch (error) {
        // A second tab may have created the unique introduction while the model answered.
        const existing = activeSession(await loadMessages(user.id, id));
        if (existing.length > 0) return NextResponse.json({ ok: true, messages: existing });
        throw error;
      }
    } else {
      await prisma.$transaction([
        prisma.tradeAIChatMessage.create({ data: {
          tradeId: id, userId: user.id, role: "user", content: parsed.data.content!,
        } }),
        prisma.tradeAIChatMessage.create({ data: {
          tradeId: id, userId: user.id, role: "assistant", content: answer,
        } }),
      ]);
    }

    return NextResponse.json({ ok: true, messages: activeSession(await loadMessages(user.id, id)) });
  } catch (error) {
    return errorResponse(error);
  }
}
