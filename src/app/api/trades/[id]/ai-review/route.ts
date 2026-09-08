import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  requireFeatureAccess,
  subscriptionAccessResponse,
} from "@/lib/subscription";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import {
  loadTradeRequirements,
  requirementFailureResponse,
  type ReviewRequirementCode,
} from "@/lib/journal/review-requirements";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { GeminiClientError } from "@/server/ai/gemini-client";
import {
  generateTradeAIReview,
  saveTradeAIReview,
  serializeTradeAIReview,
  tradeAIReviewInclude,
} from "@/server/ai/trade-review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ ok: false, error }, { status });
}

function requirementsError(missingRequirements: ReviewRequirementCode[]) {
  return NextResponse.json(
    {
      ok: false,
      ...requirementFailureResponse(missingRequirements),
    },
    { status: 422 }
  );
}

async function loadSerializedTrade(userId: string, id: string) {
  const trade = await prisma.trade.findFirst({
    where: { id, userId },
    include: journalTradeInclude,
  });

  return trade ? serializeJournalTrade(trade) : null;
}

function aiGenerationErrorResponse(error: unknown) {
  if (error instanceof GeminiClientError) {
    const status = error.message.includes("GEMINI_API_KEY") ? 500 : 502;
    return jsonError(error.message, status);
  }

  if (error instanceof Error) {
    return jsonError(error.message || "AI review failed", 500);
  }

  return jsonError("AI review failed", 500);
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const regenerate = searchParams.get("regenerate") === "true";

    const trade = await prisma.trade.findFirst({
      where: { id, userId: user.id },
      include: tradeAIReviewInclude,
    });

    if (!trade) {
      return jsonError("Trade not found", 404);
    }

    const loadedRequirements = await loadTradeRequirements(prisma, user.id, id);

    if (
      !loadedRequirements ||
      !loadedRequirements.requirements.readyForAIReview
    ) {
      return requirementsError(
        loadedRequirements?.requirements.missingRequirements || []
      );
    }

    const existingReview = await prisma.tradeAIReview.findFirst({
      where: { tradeId: id, userId: user.id },
    });

    if (existingReview && !regenerate) {
      return NextResponse.json({
        ok: true,
        review: serializeTradeAIReview(existingReview),
        trade: await loadSerializedTrade(user.id, id),
      });
    }

    await requireFeatureAccess(user.id, "aiAnalysis");

    try {
      const generated = await generateTradeAIReview(trade);
      const saved = await saveTradeAIReview({
        tradeId: trade.id,
        userId: user.id,
        review: generated,
      });

      return NextResponse.json({
        ok: true,
        review: serializeTradeAIReview(saved),
        trade: await loadSerializedTrade(user.id, id),
      });
    } catch (error) {

      await prisma.trade.updateMany({
        where: { id, userId: user.id },
        data: {
          aiReviewStatus: "FAILED",
          aiReviewScore: null,
        },
      });

      return aiGenerationErrorResponse(error);
    }
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    return error instanceof Error
      ? jsonError(error.message || "AI review failed", 500)
      : jsonError("AI review failed", 500);
  }
}
