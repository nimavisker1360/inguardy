import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import {
  getHistoricalCandles,
  MarketDataProviderError,
  normalizeMarketSymbol,
  normalizeMarketTimeframe,
  normalizeProviderCandles,
} from "@/server/market/market-data-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REPLAY_WARMUP_CANDLES = 200;
const FALLBACK_VISIBLE_CANDLES = 80;

const querySchema = z.object({
  symbol: z.string().trim().min(1).max(48).regex(/^[A-Za-z0-9:._\/-]+$/),
  timeframe: z.string().trim().min(1).max(12),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T23:59:59Z`))),
  limit: z.coerce.number().int().min(120).max(1000).default(500),
});

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(request: Request) {
  try {
    await requireUser();

    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      symbol: url.searchParams.get("symbol"),
      timeframe: url.searchParams.get("timeframe"),
      endDate: url.searchParams.get("endDate"),
      limit: url.searchParams.get("limit") || undefined,
    });

    if (!parsed.success) {
      return errorResponse("Invalid symbol, timeframe, date, or history size.", 400);
    }

    const symbol = normalizeMarketSymbol(parsed.data.symbol);
    const timeframe = normalizeMarketTimeframe(parsed.data.timeframe);

    if (!timeframe) {
      return errorResponse("Unsupported timeframe.", 400);
    }

    const requestedReplayCandles = parsed.data.limit;
    const candles = normalizeProviderCandles(
      await getHistoricalCandles({
        symbol,
        timeframe,
        endDate: `${parsed.data.endDate}T23:59:59`,
        limit: requestedReplayCandles + REPLAY_WARMUP_CANDLES,
      })
    );

    if (candles.length < 40) {
      return errorResponse("Not enough historical candles are available for this replay.", 422);
    }

    const availableWarmupCandles = candles.length - requestedReplayCandles;
    const replayStartIndex = availableWarmupCandles > 0
      ? availableWarmupCandles
      : Math.min(FALLBACK_VISIBLE_CANDLES, candles.length - 1);

    return NextResponse.json(
      {
        ok: true,
        symbol,
        timeframe,
        endDate: parsed.data.endDate,
        candles,
        replayStartIndex,
        replayCandleCount: candles.length - replayStartIndex,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300",
        },
      }
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    if (error instanceof MarketDataProviderError) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse("Failed to load historical market data.", 500);
  }
}
