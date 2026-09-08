import type { Candle } from "@/server/market/market-data-service";
import type { MarketIndicatorContext } from "@/server/market/market-indicators";

export const MARKET_RADAR_SYSTEM_INSTRUCTION = [
  "You are an educational trading market analyst and trading journal coach.",
  "Analyze the provided market data for educational purposes only.",
  "Do not provide financial advice, trade execution instructions, guaranteed predictions, or direct buy/sell signals.",
  "Do not use phrases like buy now, sell now, enter here, or guaranteed target.",
  "Focus on market structure, trend, momentum, volatility, support/resistance, risk conditions, and what a disciplined trader should watch.",
  "Never invent news, fundamentals, order flow, or unseen chart patterns.",
  "Return only valid JSON.",
].join(" ");

const responseShape = {
  overallBias: "NEUTRAL",
  confidence: 0,
  summary: "",
  marketStructure: "",
  trendAnalysis: "",
  momentumAnalysis: "",
  volatilityAnalysis: "",
  keySupportLevels: [],
  keyResistanceLevels: [],
  bullishScenario: "",
  bearishScenario: "",
  neutralScenario: "",
  riskNotes: [],
  invalidationPoints: [],
  whatToWatchNext: [],
  journalQuestions: [],
  tags: [],
};

export function buildMarketRadarPrompt({
  symbol,
  timeframe,
  indicators,
  candles,
}: {
  symbol: string;
  timeframe: string;
  indicators: MarketIndicatorContext;
  candles: Candle[];
}) {
  const lastCandles = candles.slice(-12);

  return [
    "Analyze this market context using only the structured OHLCV data and indicators below.",
    "Use scenario-based language: bullish scenario, bearish scenario, neutral/wait condition, key levels to watch, risk notes, and invalidation points.",
    "If the data is insufficient, clearly state that the analysis is limited.",
    "",
    "Validation rules:",
    "- overallBias must be BULLISH, BEARISH, or NEUTRAL",
    "- confidence must be 0-1",
    "- keySupportLevels and keyResistanceLevels should contain numbers or short objects",
    "- riskNotes must be practical and not exaggerated",
    "- journalQuestions should help reflection before any trade",
    "- tags should be short labels such as uptrend, downtrend, range, high-volatility, overextended, resistance-test, support-retest, momentum-strong, wait-for-confirmation",
    "",
    "Return this exact JSON shape with no markdown:",
    JSON.stringify(responseShape),
    "",
    "Market data:",
    JSON.stringify(
      {
        symbol,
        timeframe,
        ...indicators,
        candlesSummary: {
          lookback: candles.length,
          lastCandles,
        },
      },
      null,
      2
    ),
  ].join("\n");
}
