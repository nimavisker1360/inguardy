import { z } from "zod";
import { generateGeminiJson } from "@/server/ai/gemini-client";
import {
  getLatestCandles,
  normalizeMarketSymbol,
  normalizeMarketTimeframe,
  normalizeProviderCandles,
  type Candle as ProviderCandle,
} from "@/server/market/market-data-service";
import {
  createMockCandles,
  detectMarketZones,
  type Candle,
  type ZonesResponse,
} from "@/server/market/market-zones";

export const MARKET_ZONES_DATA_WARNING_FA =
  "دیتای واقعی بازار هنوز متصل نشده است. این تحلیل فقط برای تست رابط کاربری است.";
export const MARKET_ZONES_DATA_WARNING_EN =
  "Real market data is not connected yet. This analysis is only for testing the UI.";

export const MARKET_ZONES_SYSTEM_INSTRUCTION = [
  "You are a Persian educational trading chart copilot.",
  "Explain only the structured market zones, levels, current price, timeframe, and bias provided by the server.",
  "Never invent, add, modify, or infer new price levels.",
  "Do not read charts, screenshots, TradingView, iframes, news, or hidden data.",
  "Do not provide buy or sell signals, direct entry instructions, guaranteed targets, or financial advice.",
  "Keep the Persian tone short, clear, trader-friendly, and educational.",
  "Include a concise risk warning.",
  "Return only valid JSON.",
].join(" ");

const aiSummarySchema = z.object({
  aiSummary: z.string().trim().min(1).max(800),
});

function parseAiSummary(text: string) {
  try {
    return aiSummarySchema.parse(JSON.parse(text)).aiSummary;
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start === -1 || end === -1 || end <= start) {
      throw new Error("AI response was not valid JSON");
    }

    return aiSummarySchema.parse(JSON.parse(text.slice(start, end + 1))).aiSummary;
  }
}

function toNumericCandle(candle: ProviderCandle): Candle {
  return {
    time: Date.parse(candle.time),
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  };
}

type ZonesResultForPrompt = Omit<ZonesResponse, "symbol" | "timeframe" | "aiSummary">;

function buildFallbackSummary(result: ZonesResultForPrompt, language: "fa" | "en") {
  const nearestSupport = findNearestSupport(result);
  const nearestResistance = findNearestResistance(result);
  const closestSupports = nearestSupport ? `${nearestSupport.from} تا ${nearestSupport.to}` : "ثبت نشده";
  const closestResistances = nearestResistance ? `${nearestResistance.from} تا ${nearestResistance.to}` : "ثبت نشده";
  const invalidation = result.structure.invalidation ? String(result.structure.invalidation) : "نامشخص";

  if (language === "en") {
    return [
      `- Bias: ${result.structure.bias}.`,
      `- Nearest resistance/supply: ${closestResistances}.`,
      `- Nearest support/demand: ${closestSupports}.`,
      `- Invalidation: ${invalidation}.`,
      "- Educational only, not a buy or sell signal; manage risk before any decision.",
    ].join("\n");
  }

  return [
    `- بایاس الگوریتمی بازار: ${result.structure.bias}.`,
    `- نزدیک ترین مقاومت/عرضه: ${closestResistances}.`,
    `- نزدیک ترین حمایت/تقاضا: ${closestSupports}.`,
    `- ناحیه ابطال: ${invalidation}.`,
    "- این تحلیل آموزشی است و سیگنال خرید یا فروش نیست؛ مدیریت ریسک الزامی است.",
  ].join("\n");
}

function findNearestResistance(result: ZonesResultForPrompt) {
  return result.zones
    .filter((zone) => ["resistance", "supply"].includes(zone.type) && zone.from >= result.currentPrice)
    .sort((a, b) => a.from - b.from || b.strength - a.strength)[0];
}

function findNearestSupport(result: ZonesResultForPrompt) {
  return result.zones
    .filter((zone) => ["support", "demand"].includes(zone.type) && zone.to <= result.currentPrice)
    .sort((a, b) => b.to - a.to || b.strength - a.strength)[0];
}

function buildZonesPrompt({
  symbol,
  timeframe,
  result,
}: {
  symbol: string;
  timeframe: string;
  result: ZonesResultForPrompt;
}) {
  return [
    "Explain this algorithmic zone analysis in Persian.",
    "Rules:",
    "- Use only the provided currentPrice, nearestSupport, nearestResistance, invalidation, structure, and timeframe.",
    "- Do not create any new number or price level.",
    "- Do not say buy, sell, entry, or signal.",
    "- Do not repeat every zone line by line.",
    "- Return maximum 5 short Persian bullet points.",
    "- Cover only market bias, nearest resistance/supply, nearest support/demand, invalidation, and risk warning.",
    "- Clearly say this is educational analysis only.",
    "",
    "Return this JSON shape only:",
    JSON.stringify({ aiSummary: "" }),
    "",
    "Structured data:",
    JSON.stringify(
      {
        symbol,
        timeframe,
        currentPrice: result.currentPrice,
        structure: result.structure,
        invalidation: result.structure.invalidation,
        nearestSupport: findNearestSupport(result),
        nearestResistance: findNearestResistance(result),
        visibleZoneCount: Math.min(result.zones.length, 6),
      },
      null,
      2
    ),
  ].join("\n");
}

export async function explainMarketZonesWithGemini({
  symbol,
  timeframe,
  result,
}: {
  symbol: string;
  timeframe: string;
  result: ZonesResultForPrompt;
}) {
  const prompt = buildZonesPrompt({ symbol, timeframe, result });
  const responseText = await generateGeminiJson(prompt, {
    systemInstruction: MARKET_ZONES_SYSTEM_INSTRUCTION,
    timeoutMs: 25_000,
  });

  return parseAiSummary(responseText);
}

export async function analyzeMarketZones({
  symbol,
  timeframe,
  language,
}: {
  symbol: string;
  timeframe: string;
  language: "fa" | "en";
}): Promise<ZonesResponse & { dataWarning?: string; marketDataProviderConfigured: boolean }> {
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  const normalizedTimeframe = normalizeMarketTimeframe(timeframe);

  if (!normalizedTimeframe) {
    throw new Error("Unsupported timeframe");
  }

  const marketDataProviderConfigured = Boolean(process.env.TWELVE_DATA_API_KEY);
  const candles = marketDataProviderConfigured
    ? normalizeProviderCandles(
        await getLatestCandles({
          symbol: normalizedSymbol,
          timeframe: normalizedTimeframe,
          limit: 220,
        })
      ).map(toNumericCandle)
    : createMockCandles(normalizedSymbol, normalizedTimeframe, 220);

  const algorithmicResult = detectMarketZones(candles, { language, maxZones: 14 });
  const resultBase = {
    ...algorithmicResult,
    candles: candles.slice(-180),
    disclaimer: algorithmicResult.disclaimer,
  };
  const aiSummary = await explainMarketZonesWithGemini({
    symbol: normalizedSymbol,
    timeframe: normalizedTimeframe,
    result: resultBase,
  }).catch(() => buildFallbackSummary(resultBase, language));

  return {
    symbol: normalizedSymbol,
    timeframe: normalizedTimeframe,
    ...resultBase,
    aiSummary,
    marketDataProviderConfigured,
    dataWarning: marketDataProviderConfigured
      ? undefined
      : language === "fa"
        ? MARKET_ZONES_DATA_WARNING_FA
        : MARKET_ZONES_DATA_WARNING_EN,
  };
}
