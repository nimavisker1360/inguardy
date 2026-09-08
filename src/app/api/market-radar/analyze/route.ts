import { NextResponse } from "next/server";
import { z } from "zod";
import { claimMarketRadarAnalysis } from "@/lib/market-radar-access";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { subscriptionAccessResponse } from "@/lib/subscription";
import { GeminiClientError } from "@/server/ai/gemini-client";
import { analyzeMarketWithGemini } from "@/server/ai/market-radar-service";
import { MarketDataProviderError } from "@/server/market/market-data-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.object({
  symbol: z.string().trim().min(1).max(48),
  timeframe: z.string().trim().min(1).max(12),
});

function jsonError(error: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error, ...extra }, { status });
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const body = requestSchema.safeParse(await request.json().catch(() => null));

    if (!body.success) {
      return jsonError("Invalid symbol or timeframe", 400);
    }

    const analysisAccess = await claimMarketRadarAnalysis(user.id);
    const result = await analyzeMarketWithGemini(body.data);

    return NextResponse.json({
      ok: true,
      symbol: result.symbol,
      timeframe: result.timeframe,
      indicators: result.indicators,
      analysis: result.analysis,
      analysisAccess,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }

    if (error instanceof MarketDataProviderError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof GeminiClientError) {
      const status = error.message.includes("GEMINI_API_KEY") ? 500 : 502;
      return jsonError(error.message, status);
    }

    if (error instanceof Error && error.message === "Insufficient candle data for analysis") {
      return jsonError("Market data is not available for this symbol yet.", 400);
    }

    if (error instanceof Error && error.message === "Unsupported timeframe") {
      return jsonError("Unsupported timeframe", 400);
    }


    return jsonError("AI analysis failed. Please try again.", 500);
  }
}
