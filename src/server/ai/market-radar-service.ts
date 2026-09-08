import { z } from "zod";
import { generateGeminiJson } from "@/server/ai/gemini-client";
import {
  buildMarketRadarPrompt,
  MARKET_RADAR_SYSTEM_INSTRUCTION,
} from "@/server/ai/market-radar-prompt";
import {
  getLatestCandles,
  normalizeMarketSymbol,
  normalizeMarketTimeframe,
  normalizeProviderCandles,
} from "@/server/market/market-data-service";
import { calculateMarketIndicators } from "@/server/market/market-indicators";

const boundedText = z.string().trim().min(1).max(4000);
const shortLabel = z.string().trim().min(1).max(64);
const levelSchema = z.union([
  z.coerce.number(),
  z.object({
    level: z.coerce.number(),
    note: z.string().trim().max(160).optional(),
  }),
]);

export const marketRadarAnalysisSchema = z.object({
  overallBias: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]),
  confidence: z.coerce.number().min(0).max(1),
  summary: boundedText,
  marketStructure: boundedText,
  trendAnalysis: boundedText,
  momentumAnalysis: boundedText,
  volatilityAnalysis: boundedText,
  keySupportLevels: z.array(levelSchema).max(10).default([]),
  keyResistanceLevels: z.array(levelSchema).max(10).default([]),
  bullishScenario: boundedText,
  bearishScenario: boundedText,
  neutralScenario: boundedText,
  riskNotes: z.array(boundedText).max(10).default([]),
  invalidationPoints: z.array(boundedText).max(10).default([]),
  whatToWatchNext: z.array(boundedText).max(10).default([]),
  journalQuestions: z.array(boundedText).max(10).default([]),
  tags: z.array(shortLabel).max(12).default([]),
});

export type MarketRadarAnalysis = z.infer<typeof marketRadarAnalysisSchema>;

function extractJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  return start === -1 || end === -1 || end <= start ? null : cleaned.slice(start, end + 1);
}

export function parseMarketRadarJson(text: string) {
  try {
    return marketRadarAnalysisSchema.parse(JSON.parse(text));
  } catch {
    const repaired = extractJsonObject(text);

    if (!repaired) {
      throw new Error("AI response was not valid JSON");
    }

    return marketRadarAnalysisSchema.parse(JSON.parse(repaired));
  }
}

export async function analyzeMarketWithGemini({
  symbol,
  timeframe,
}: {
  symbol: string;
  timeframe: string;
}) {
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const normalizedTimeframe = normalizeMarketTimeframe(timeframe);

  if (!normalizedTimeframe) {
    throw new Error("Unsupported timeframe");
  }

  const candles = normalizeProviderCandles(
    await getLatestCandles({
      symbol: normalizedSymbol,
      timeframe: normalizedTimeframe,
      limit: 200,
    })
  );

  if (candles.length < 50) {
    throw new Error("Insufficient candle data for analysis");
  }

  const indicators = calculateMarketIndicators(candles);
  const prompt = buildMarketRadarPrompt({
    symbol: normalizedSymbol,
    timeframe: normalizedTimeframe,
    indicators,
    candles,
  });
  const responseText = await generateGeminiJson(prompt, {
    systemInstruction: MARKET_RADAR_SYSTEM_INSTRUCTION,
    timeoutMs: 30_000,
  });

  return {
    symbol: normalizedSymbol,
    timeframe: normalizedTimeframe,
    indicators,
    analysis: parseMarketRadarJson(responseText),
  };
}
