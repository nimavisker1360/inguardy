import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { evaluateCoachAction } from "@/lib/journal/trade-coach-comparison";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import { GeminiClientError } from "@/server/ai/gemini-client";
import {
  CoachTradeNotFoundError,
  loadTradeCoachContext,
  serializeCoachCommitment,
  suggestCoachAction,
} from "@/server/ai/trade-coach-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };
const bodySchema = z.object({
  action: z.enum(["suggest", "accept", "evaluate", "reflect", "cancel", "acknowledge"]),
  language: z.enum(["en", "fa"]).default("en"),
  reflection: z.string().trim().max(500).optional(),
});

function payload(context: Awaited<ReturnType<typeof loadTradeCoachContext>>) {
  return {
    ok: true,
    comparison: context.rows,
    tradeStatus: context.trade.status,
    ownCommitment: context.own ? serializeCoachCommitment(context.own) : null,
    followUp: context.followUp ? serializeCoachCommitment(context.followUp) : null,
  };
}

function errorResponse(error: unknown) {
  const auth = authErrorResponse(error);
  if (auth) return auth;
  const access = subscriptionAccessResponse(error);
  if (access) return access;
  if (error instanceof CoachTradeNotFoundError) {
    return NextResponse.json({ ok: false, error: "Trade not found" }, { status: 404 });
  }
  if (error instanceof GeminiClientError || error instanceof z.ZodError || error instanceof SyntaxError) {
    return NextResponse.json({ ok: false, error: "AI could not prepare a reliable action. Please retry." }, { status: 502 });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ ok: false, error: "Another action is already active for this account." }, { status: 409 });
  }
  return NextResponse.json({ ok: false, error: "Could not update trade coaching." }, { status: 500 });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return NextResponse.json(payload(await loadTradeCoachContext(user.id, id)));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid coaching request." }, { status: 400 });
    }
    const view = await loadTradeCoachContext(user.id, id);
    const { action, language } = parsed.data;

    if (action === "suggest") {
      if (!view.own) {
        await requireFeatureAccess(user.id, "aiAnalysis");
        const suggestion = await suggestCoachAction(view.rows, language);
        try {
          await prisma.tradeCoachCommitment.create({ data: {
            userId: user.id,
            accountId: view.trade.accountId,
            sourceTradeId: id,
            ...suggestion,
          } });
        } catch (error) {
          const existing = await prisma.tradeCoachCommitment.findUnique({ where: { sourceTradeId: id } });
          if (!existing) throw error;
        }
      }
    } else if (action === "accept") {
      await requireFeatureAccess(user.id, "aiAnalysis");
      if (!view.own || view.own.userId !== user.id || view.own.status !== "PROPOSED") {
        return NextResponse.json({ ok: false, error: "No proposed action to accept." }, { status: 409 });
      }
      const active = await prisma.tradeCoachCommitment.findFirst({
        where: { userId: user.id, accountId: view.trade.accountId, status: "ACCEPTED" },
        select: { id: true },
      });
      if (active) {
        return NextResponse.json({ ok: false, error: "Finish the current next-trade follow-up before accepting another action." }, { status: 409 });
      }
      await prisma.tradeCoachCommitment.updateMany({
        where: { id: view.own.id, userId: user.id, status: "PROPOSED" },
        data: { status: "ACCEPTED", acceptedAt: new Date() },
      });
    } else if (action === "acknowledge") {
      if (!view.own || view.own.userId !== user.id || view.own.status !== "ACCEPTED") {
        return NextResponse.json({ ok: false, error: "No accepted action to acknowledge." }, { status: 409 });
      }
      if (!view.own.acknowledgedAt && view.own.acceptedAt) {
        const nextTrade = await prisma.trade.findFirst({
          where: { userId: user.id, accountId: view.trade.accountId, openedAt: { gt: view.own.acceptedAt } },
          select: { id: true },
        });
        if (nextTrade) {
          return NextResponse.json({ ok: false, error: "The next trade has already opened." }, { status: 409 });
        }
      }
      await prisma.tradeCoachCommitment.updateMany({
        where: { id: view.own.id, userId: user.id, status: "ACCEPTED", acknowledgedAt: null },
        data: { acknowledgedAt: new Date() },
      });
    } else if (action === "cancel") {
      if (!view.own || view.own.userId !== user.id || view.own.status !== "ACCEPTED") {
        return NextResponse.json({ ok: false, error: "No active action to cancel." }, { status: 409 });
      }
      await prisma.tradeCoachCommitment.update({
        where: { id: view.own.id },
        data: { status: "CANCELLED" },
      });
    } else if (action === "evaluate") {
      await requireFeatureAccess(user.id, "aiAnalysis");
      const commitment = view.followUp;
      if (!commitment || commitment.userId !== user.id || commitment.status !== "ACCEPTED") {
        return NextResponse.json({ ok: false, error: "No pending follow-up for this trade." }, { status: 409 });
      }
      if (view.trade.status !== "CLOSED") {
        return NextResponse.json({ ok: false, error: "The trade must be closed before evaluation." }, { status: 422 });
      }
      const row = view.rows.find((item) => item.id === commitment.category);
      const assessment = evaluateCoachAction(row, language);
      await prisma.tradeCoachCommitment.updateMany({
        where: { id: commitment.id, userId: user.id, status: "ACCEPTED", evaluatedTradeId: null },
        data: {
          status: "COMPLETED",
          evaluatedTradeId: id,
          verdict: assessment.verdict,
          verdictReason: assessment.reason,
          evaluatedAt: new Date(),
        },
      });
    } else {
      const commitment = view.followUp;
      if (!commitment || commitment.userId !== user.id || commitment.evaluatedTradeId !== id) {
        return NextResponse.json({ ok: false, error: "No evaluated action for this trade." }, { status: 409 });
      }
      await prisma.tradeCoachCommitment.update({
        where: { id: commitment.id },
        data: { reflection: parsed.data.reflection || null },
      });
    }

    return NextResponse.json(payload(await loadTradeCoachContext(user.id, id)));
  } catch (error) {
    return errorResponse(error);
  }
}
