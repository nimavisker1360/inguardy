"use client";

import {
  Activity,
  AlertCircle,
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Copy,
  FileQuestion,
  Gauge,
  Layers3,
  LineChart,
  Loader2,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TradingViewAdvancedChart } from "@/components/dashboard/TradingViewAdvancedChart";
import { SmartAIChart } from "@/components/market-radar/SmartAIChart";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type SymbolOption = {
  value: string;
  label: string;
};

type TimeframeOption = {
  value: string;
  label: string;
};

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type MarketZone = {
  id: string;
  type: "support" | "resistance" | "supply" | "demand" | "order_block";
  from: number;
  to: number;
  originTime?: number;
  label: string;
  strength: number;
  touches: number;
  reason: string;
};

type MarketStructure = {
  bias: "bullish" | "bearish" | "neutral";
  lastBOS?: number;
  lastCHoCH?: number;
  invalidation?: number;
};

type ZonesResponse = {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  candles: Candle[];
  zones: MarketZone[];
  supportLevels: number[];
  resistanceLevels: number[];
  structure: MarketStructure;
  aiSummary: string;
  disclaimer: string;
  dataWarning?: string;
  marketDataProviderConfigured?: boolean;
};

type ZonesApiResponse =
  | (ZonesResponse & {
      ok: true;
      analysisAccess?: {
        aiAnalysisEnabled: boolean;
        hasUsedFreeAnalysis: boolean;
        canAnalyze: boolean;
      };
    })
  | {
      ok: false;
      error?: string;
      message?: string;
    };

type CopilotActionKey = "full" | "sr" | "zones" | "risk" | "bullish" | "bearish" | "journal";
type ResultTab = "summary" | "zones" | "scenarios" | "journal";
type ChartTab = "tradingview" | "smart";
type ActionLabel =
  | "analyze"
  | "supportResistance"
  | "supplyDemand"
  | "entryRisk"
  | "bullishScenario"
  | "bearishScenario"
  | "journalQuestion";

type StoredMarketRadarState = {
  selectedSymbol: string;
  selectedTimeframe: string;
  zonesResult: ZonesResponse | null;
  activeAction: CopilotActionKey;
};

const MARKET_RADAR_STORAGE_KEY = "tradivix:ai-chart-copilot";

const SYMBOL_OPTIONS: SymbolOption[] = [
  { value: "OANDA:XAUUSD", label: "XAUUSD / Gold" },
  { value: "OANDA:EURUSD", label: "EURUSD" },
  { value: "OANDA:GBPUSD", label: "GBPUSD" },
  { value: "OANDA:USDJPY", label: "USDJPY" },
  { value: "OANDA:AUDUSD", label: "AUDUSD" },
  { value: "OANDA:USDCAD", label: "USDCAD" },
  { value: "OANDA:EURJPY", label: "EURJPY" },
  { value: "OANDA:GBPJPY", label: "GBPJPY" },
  { value: "BINANCE:BTCUSDT", label: "BTCUSD / Bitcoin" },
  { value: "BINANCE:ETHUSDT", label: "ETHUSD / Ethereum" },
  { value: "CAPITALCOM:US100", label: "NAS100" },
  { value: "CAPITALCOM:US30", label: "US30" },
  { value: "TVC:DXY", label: "DXY" },
];

const TIMEFRAME_OPTIONS: TimeframeOption[] = [
  { label: "M5", value: "5" },
  { label: "M15", value: "15" },
  { label: "H1", value: "60" },
  { label: "H4", value: "240" },
  { label: "D1", value: "D" },
];

const COPY = {
  en: {
    title: "Market Scanner",
    subtitle: "Scan key market zones and get a compact AI explanation.",
    symbol: "Symbol",
    timeframe: "Timeframe",
    chartTitle: "Live Market Chart",
    tradingViewTab: "TradingView",
    smartChartTab: "Smart AI Chart",
    readerTitle: "Market Scanner",
    readerSubtitle: "Scan support, resistance, supply, demand, and order blocks without changing the chart.",
    analysisContext: "Market zone map",
    keyZones: "Key Market Zones",
    analyze: "Full Analysis",
    supportResistance: "Support & Resistance",
    supplyDemand: "Supply & Demand Zones",
    entryRisk: "Entry Risk",
    bullishScenario: "Bullish Scenario",
    bearishScenario: "Bearish Scenario",
    journalQuestion: "Journal Question",
    currentPrice: "Current Price",
    bias: "Bias",
    nearestResistance: "Nearest Resistance",
    nearestSupport: "Nearest Support",
    invalidationZone: "Invalidation Area",
    resistanceSupply: "Resistance / Supply",
    supportDemand: "Support / Demand",
    orderBlocks: "Order Blocks",
    aiSummary: "AI Summary",
    ready: "Ready to scan",
    loading: "Analyzing market data...",
    copyJournal: "Copy for Journal",
    copied: "Copied",
    showMore: "Show more zones",
    showLess: "Show fewer zones",
    noItems: "No strong zones returned.",
    strong: "Strong",
    medium: "Medium",
    weak: "Weak",
    upgrade: "Free users can run 1 analysis. Pro users can run unlimited analysis.",
    freeAnalysisAvailable: "You can run 1 free AI analysis. Upgrade to Pro for unlimited analysis.",
    freeAnalysisUsed: "Your free AI analysis is finished. Upgrade to Pro for unlimited Market Scanner analysis.",
    educational: "Educational only. Not financial advice or a buy/sell signal. TradingView is unchanged and not scraped.",
    tabs: {
      summary: "Summary",
      zones: "Zones",
      scenarios: "Scenarios",
      journal: "Journal",
    },
  },
  fa: {
    title: "اسکن بازار",
    subtitle: "نواحی الگوریتمی بازار با خلاصه کوتاه و قابل استفاده.",
    symbol: "نماد",
    timeframe: "تایم فریم",
    chartTitle: "چارت زنده بازار",
    tradingViewTab: "TradingView",
    smartChartTab: "Smart AI Chart",
    readerTitle: "اسکن بازار",
    readerSubtitle: "اسکن حمایت، مقاومت، عرضه، تقاضا و اوردر بلاک بدون تغییر چارت.",
    analysisContext: "نقشه نواحی بازار",
    keyZones: "نواحی کلیدی بازار",
    analyze: "تحلیل کامل",
    supportResistance: "حمایت و مقاومت",
    supplyDemand: "زون های عرضه و تقاضا",
    entryRisk: "ریسک ورود",
    bullishScenario: "سناریوی صعودی",
    bearishScenario: "سناریوی نزولی",
    journalQuestion: "سوال برای ژورنال",
    currentPrice: "قیمت فعلی",
    bias: "بایاس",
    nearestResistance: "نزدیک ترین مقاومت",
    nearestSupport: "نزدیک ترین حمایت",
    invalidationZone: "ناحیه ابطال",
    resistanceSupply: "مقاومت / عرضه",
    supportDemand: "حمایت / تقاضا",
    orderBlocks: "اوردر بلاک ها",
    aiSummary: "خلاصه هوش مصنوعی",
    ready: "آماده تحلیل",
    loading: "در حال تحلیل بازار...",
    copyJournal: "کپی برای ژورنال",
    copied: "کپی شد",
    showMore: "نمایش زون های بیشتر",
    showLess: "نمایش زون های کمتر",
    noItems: "زون قدرتمندی برگردانده نشد.",
    strong: "قوی",
    medium: "متوسط",
    weak: "ضعیف",
    upgrade: "کاربران رایگان فقط ۱ تحلیل دارند. کاربران Pro تحلیل نامحدود دارند.",
    freeAnalysisAvailable: "شما ۱ تحلیل رایگان دارید. برای تحلیل نامحدود، پلن Pro را فعال کنید.",
    freeAnalysisUsed: "تحلیل رایگان شما تمام شده است. برای فعال شدن دوباره دکمه، پلن Pro را ارتقا دهید.",
    educational: "این تحلیل آموزشی است و توصیه مالی یا سیگنال خرید و فروش نیست. چارت TradingView تغییر نمی کند و از آن داده خوانده نمی شود.",
    tabs: {
      summary: "خلاصه",
      zones: "زون ها",
      scenarios: "سناریوها",
      journal: "ژورنال",
    },
  },
};

const ACTIONS: Array<{ key: CopilotActionKey; icon: typeof Sparkles; label: ActionLabel }> = [
  { key: "full", icon: Sparkles, label: "analyze" },
  { key: "sr", icon: Layers3, label: "supportResistance" },
  { key: "zones", icon: Activity, label: "supplyDemand" },
  { key: "risk", icon: ShieldAlert, label: "entryRisk" },
  { key: "bullish", icon: TrendingUp, label: "bullishScenario" },
  { key: "bearish", icon: TrendingDown, label: "bearishScenario" },
  { key: "journal", icon: FileQuestion, label: "journalQuestion" },
];

const RESULT_TABS: ResultTab[] = ["summary", "zones", "scenarios", "journal"];

function isResistanceSupply(zone: MarketZone) {
  return zone.type === "resistance" || zone.type === "supply";
}

function isSupportDemand(zone: MarketZone) {
  return zone.type === "support" || zone.type === "demand";
}

function zoneCenter(zone: Pick<MarketZone, "from" | "to">) {
  return (zone.from + zone.to) / 2;
}

function formatPrice(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return String(value);
}

function zoneRange(zone: MarketZone) {
  return `${formatPrice(zone.from)} - ${formatPrice(zone.to)}`;
}

function strengthLabel(strength: number, language: "fa" | "en") {
  const copy = COPY[language];

  if (strength >= 78) {
    return copy.strong;
  }

  if (strength >= 58) {
    return copy.medium;
  }

  return copy.weak;
}

function zoneTypeLabel(type: MarketZone["type"], language: "fa" | "en") {
  const fa: Record<MarketZone["type"], string> = {
    support: "حمایت",
    resistance: "مقاومت",
    supply: "عرضه",
    demand: "تقاضا",
    order_block: "اوردر بلاک",
  };
  const en: Record<MarketZone["type"], string> = {
    support: "Support",
    resistance: "Resistance",
    supply: "Supply",
    demand: "Demand",
    order_block: "Order block",
  };

  return language === "fa" ? fa[type] : en[type];
}

function zoneToneClass(type: MarketZone["type"], highlighted = false) {
  if (type === "resistance" || type === "supply") {
    return cn(
      "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-100",
      highlighted && "ring-1 ring-red-400/50"
    );
  }

  if (type === "support" || type === "demand") {
    return cn(
      "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-100",
      highlighted && "ring-1 ring-emerald-400/50"
    );
  }

  return cn("border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-100", highlighted && "ring-1 ring-amber-400/50");
}

function biasClass(bias: MarketStructure["bias"]) {
  if (bias === "bullish") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-100";
  }

  if (bias === "bearish") {
    return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-100";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-100";
}

function sortByStrengthThenDistance(zones: MarketZone[], currentPrice: number) {
  return [...zones].sort(
    (a, b) => b.strength - a.strength || Math.abs(zoneCenter(a) - currentPrice) - Math.abs(zoneCenter(b) - currentPrice)
  );
}

function findNearestResistance(result: ZonesResponse) {
  return result.zones
    .filter((zone) => isResistanceSupply(zone) && zone.from >= result.currentPrice)
    .sort((a, b) => a.from - b.from || b.strength - a.strength)[0];
}

function findNearestSupport(result: ZonesResponse) {
  return result.zones
    .filter((zone) => isSupportDemand(zone) && zone.to <= result.currentPrice)
    .sort((a, b) => b.to - a.to || b.strength - a.strength)[0];
}

function pickCompactZones(zones: MarketZone[], currentPrice: number, limit: number, nearest?: MarketZone) {
  const sorted = sortByStrengthThenDistance(zones, currentPrice);
  const picked: MarketZone[] = [];

  if (nearest) {
    picked.push(nearest);
  }

  for (const zone of sorted) {
    if (picked.length >= limit) {
      break;
    }

    if (!picked.some((item) => item.id === zone.id)) {
      picked.push(zone);
    }
  }

  return picked;
}

function readStoredMarketRadarState(): StoredMarketRadarState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawState = window.sessionStorage.getItem(MARKET_RADAR_STORAGE_KEY);
    if (!rawState) {
      return null;
    }

    const parsed = JSON.parse(rawState) as Partial<StoredMarketRadarState>;
    const selectedSymbol =
      typeof parsed.selectedSymbol === "string" && SYMBOL_OPTIONS.some((option) => option.value === parsed.selectedSymbol)
        ? parsed.selectedSymbol
        : "OANDA:XAUUSD";
    const selectedTimeframe =
      typeof parsed.selectedTimeframe === "string" && TIMEFRAME_OPTIONS.some((option) => option.value === parsed.selectedTimeframe)
        ? parsed.selectedTimeframe
        : "60";

    return {
      selectedSymbol,
      selectedTimeframe,
      zonesResult: parsed.zonesResult && typeof parsed.zonesResult === "object" ? (parsed.zonesResult as ZonesResponse) : null,
      activeAction: parsed.activeAction ?? "full",
    };
  } catch {
    return null;
  }
}

function writeStoredMarketRadarState(state: StoredMarketRadarState) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(MARKET_RADAR_STORAGE_KEY, JSON.stringify(state));
}

function ZoneCard({
  zone,
  language,
  highlighted = false,
  badge,
}: {
  zone: MarketZone;
  language: "fa" | "en";
  highlighted?: boolean;
  badge?: string;
}) {
  return (
    <div className={cn("rounded-lg border px-3 py-2.5", zoneToneClass(zone.type, highlighted))}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
            <span>{badge || zoneTypeLabel(zone.type, language)}</span>
            <span className="rounded border border-current/20 px-1.5 py-0.5 text-[10px]">{strengthLabel(zone.strength, language)}</span>
          </div>
          <div className="mt-1 break-words text-sm font-black" dir="ltr">
            {zoneRange(zone)}
          </div>
        </div>
        <div className="shrink-0 text-[10px] font-bold opacity-70">{zone.strength}%</div>
      </div>
      <div className="mt-1 text-[11px] font-semibold opacity-75">
        {language === "fa" ? "برخورد" : "Touches"}: {zone.touches}
      </div>
      <p className="mt-1 line-clamp-2 break-words text-[11px] leading-5 opacity-85">{zone.reason}</p>
    </div>
  );
}

function CompactMetric({
  title,
  value,
  className,
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-[#111827]", className)}>
      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{title}</div>
      <div className="mt-1 break-words text-sm font-black text-slate-950 dark:text-white" dir="ltr">
        {value}
      </div>
    </div>
  );
}

function formatCopilotJournal({
  result,
  symbolLabel,
  timeframeLabel,
  language,
}: {
  result: ZonesResponse;
  symbolLabel: string;
  timeframeLabel: string;
  language: "fa" | "en";
}) {
  const nearestResistance = findNearestResistance(result);
  const nearestSupport = findNearestSupport(result);
  const invalidation = formatPrice(result.structure.invalidation);

  if (language === "fa") {
    return [
      `اسکن بازار: ${symbolLabel} / ${timeframeLabel}`,
      `قیمت فعلی: ${result.currentPrice}`,
      `بایاس: ${result.structure.bias}`,
      `نزدیک ترین حمایت: ${nearestSupport ? zoneRange(nearestSupport) : "-"}`,
      `نزدیک ترین مقاومت: ${nearestResistance ? zoneRange(nearestResistance) : "-"}`,
      `ناحیه ابطال: ${invalidation}`,
      "یادداشت ریسک: این تحلیل آموزشی است و سیگنال خرید یا فروش نیست؛ اندازه ریسک و سناریوی ابطال باید قبل از تصمیم مشخص باشد.",
    ].join("\n");
  }

  return [
    `Market Scanner: ${symbolLabel} / ${timeframeLabel}`,
    `Current price: ${result.currentPrice}`,
    `Bias: ${result.structure.bias}`,
    `Nearest support: ${nearestSupport ? zoneRange(nearestSupport) : "-"}`,
    `Nearest resistance: ${nearestResistance ? zoneRange(nearestResistance) : "-"}`,
    `Invalidation: ${invalidation}`,
    "Risk note: Educational only, not a buy/sell signal. Define risk and invalidation before any decision.",
  ].join("\n");
}

export function AIMarketRadar({
  aiAnalysisEnabled,
  hasUsedFreeAnalysis: initialHasUsedFreeAnalysis,
}: {
  aiAnalysisEnabled: boolean;
  hasUsedFreeAnalysis: boolean;
}) {
  const { language } = useLanguage();
  const copy = COPY[language];
  const [selectedSymbol, setSelectedSymbol] = useState("OANDA:XAUUSD");
  const [selectedTimeframe, setSelectedTimeframe] = useState("60");
  const [zonesResult, setZonesResult] = useState<ZonesResponse | null>(null);
  const [activeAction, setActiveAction] = useState<CopilotActionKey>("full");
  const [resultTab, setResultTab] = useState<ResultTab>("summary");
  const [chartTab, setChartTab] = useState<ChartTab>("tradingview");
  const [showMoreZones, setShowMoreZones] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [hasUsedFreeAnalysis, setHasUsedFreeAnalysis] = useState(initialHasUsedFreeAnalysis);
  const [hasHydratedStoredState, setHasHydratedStoredState] = useState(false);
  const canRequestAnalysis = aiAnalysisEnabled || !hasUsedFreeAnalysis;
  const direction = language === "fa" ? "rtl" : "ltr";

  useEffect(() => {
    const storedState = readStoredMarketRadarState();
    if (storedState) {
      setSelectedSymbol(storedState.selectedSymbol);
      setSelectedTimeframe(storedState.selectedTimeframe);
      setZonesResult(storedState.zonesResult);
      setActiveAction(storedState.activeAction);
    }
    setHasHydratedStoredState(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedStoredState) {
      return;
    }

    writeStoredMarketRadarState({
      selectedSymbol,
      selectedTimeframe,
      zonesResult,
      activeAction,
    });
  }, [activeAction, hasHydratedStoredState, selectedSymbol, selectedTimeframe, zonesResult]);

  const selectedSymbolLabel = useMemo(
    () => SYMBOL_OPTIONS.find((option) => option.value === selectedSymbol)?.label ?? selectedSymbol,
    [selectedSymbol]
  );
  const selectedTimeframeLabel = useMemo(
    () => TIMEFRAME_OPTIONS.find((option) => option.value === selectedTimeframe)?.label ?? selectedTimeframe,
    [selectedTimeframe]
  );

  const nearestResistance = zonesResult ? findNearestResistance(zonesResult) : undefined;
  const nearestSupport = zonesResult ? findNearestSupport(zonesResult) : undefined;
  const resistanceSupplyZones = zonesResult?.zones.filter(isResistanceSupply) ?? [];
  const supportDemandZones = zonesResult?.zones.filter(isSupportDemand) ?? [];
  const orderBlockZones = zonesResult?.zones.filter((zone) => zone.type === "order_block") ?? [];
  const compactResistanceSupply = zonesResult
    ? pickCompactZones(resistanceSupplyZones, zonesResult.currentPrice, 2, nearestResistance)
    : [];
  const compactSupportDemand = zonesResult ? pickCompactZones(supportDemandZones, zonesResult.currentPrice, 2, nearestSupport) : [];
  const compactOrderBlocks = zonesResult ? sortByStrengthThenDistance(orderBlockZones, zonesResult.currentPrice).slice(0, 2) : [];
  const visibleResistanceSupply = showMoreZones ? sortByStrengthThenDistance(resistanceSupplyZones, zonesResult?.currentPrice ?? 0) : compactResistanceSupply;
  const visibleSupportDemand = showMoreZones ? sortByStrengthThenDistance(supportDemandZones, zonesResult?.currentPrice ?? 0) : compactSupportDemand;
  const visibleOrderBlocks = showMoreZones ? sortByStrengthThenDistance(orderBlockZones, zonesResult?.currentPrice ?? 0) : compactOrderBlocks;
  const hasMoreZones =
    resistanceSupplyZones.length > compactResistanceSupply.length ||
    supportDemandZones.length > compactSupportDemand.length ||
    orderBlockZones.length > compactOrderBlocks.length;

  async function requestZones(action: CopilotActionKey) {
    setActiveAction(action);

    if (!canRequestAnalysis) {
      setStatus("error");
      setMessage(copy.freeAnalysisUsed);
      return;
    }

    setStatus("loading");
    setMessage("");
    setCopied(false);
    setShowMoreZones(false);

    try {
      const response = await fetch("/api/market-radar/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol,
          timeframe: selectedTimeframe,
          language,
        }),
      });
      const data = (await response.json()) as ZonesApiResponse;

      if (!response.ok) {
        const errorData = data as Extract<ZonesApiResponse, { ok: false }>;
        throw new Error(errorData.message || errorData.error || "AI zones analysis failed. Please try again.");
      }

      if (!data.ok) {
        throw new Error(data.message || data.error || "AI zones analysis failed. Please try again.");
      }

      setZonesResult({
        symbol: data.symbol,
        timeframe: data.timeframe,
        currentPrice: data.currentPrice,
        candles: data.candles,
        zones: data.zones,
        supportLevels: data.supportLevels,
        resistanceLevels: data.resistanceLevels,
        structure: data.structure,
        aiSummary: data.aiSummary,
        disclaimer: data.disclaimer,
        dataWarning: data.dataWarning,
        marketDataProviderConfigured: data.marketDataProviderConfigured,
      });
      setResultTab(action === "journal" ? "journal" : action === "zones" || action === "sr" ? "zones" : action === "bullish" || action === "bearish" ? "scenarios" : "summary");

      if (data.analysisAccess) {
        setHasUsedFreeAnalysis(data.analysisAccess.hasUsedFreeAnalysis);
      } else if (!aiAnalysisEnabled) {
        setHasUsedFreeAnalysis(true);
      }
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "AI zones analysis failed. Please try again.");
    }
  }

  async function copyToJournal() {
    if (!zonesResult) {
      return;
    }

    await navigator.clipboard.writeText(
      formatCopilotJournal({
        result: zonesResult,
        symbolLabel: selectedSymbolLabel,
        timeframeLabel: selectedTimeframeLabel,
        language,
      })
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function clearResultForSelectionChange() {
    setZonesResult(null);
    setStatus("idle");
    setMessage("");
    setCopied(false);
    setShowMoreZones(false);
    setResultTab("summary");
  }

  function renderZoneList(title: string, zones: MarketZone[], emptyText = copy.noItems) {
    return (
      <div>
        <div className="mb-2 text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">{title}</div>
        <div className="grid gap-2">
          {zones.length ? (
            zones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                language={language}
                highlighted={zone.id === nearestResistance?.id || zone.id === nearestSupport?.id}
              />
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400">
              {emptyText}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={direction}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className={language === "fa" ? "text-right" : "text-left"}>
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
          <Activity className="h-4 w-4" />
          <span dir="ltr">
            {selectedSymbolLabel} - {selectedTimeframeLabel}
          </span>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A] md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{copy.symbol}</span>
          <select
            value={selectedSymbol}
            onChange={(event) => {
              setSelectedSymbol(event.target.value);
              clearResultForSelectionChange();
            }}
            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-[#111827] dark:text-white"
          >
            {SYMBOL_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{copy.timeframe}</div>
          <div className="mt-2 grid grid-cols-5 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#111827]">
            {TIMEFRAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSelectedTimeframe(option.value);
                  clearResultForSelectionChange();
                }}
                className={cn(
                  "h-9 rounded-md px-2 text-xs font-semibold transition",
                  selectedTimeframe === option.value
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px] xl:items-start">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
              <LineChart className="h-4 w-4 text-blue-500 dark:text-blue-300" />
              {copy.chartTitle}
            </div>
            <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#111827] sm:w-[260px]">
              <button
                type="button"
                onClick={() => setChartTab("tradingview")}
                className={cn(
                  "h-8 rounded-md px-2 text-xs font-black transition",
                  chartTab === "tradingview"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {copy.tradingViewTab}
              </button>
              <button
                type="button"
                onClick={() => setChartTab("smart")}
                className={cn(
                  "h-8 rounded-md px-2 text-xs font-black transition",
                  chartTab === "smart"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {copy.smartChartTab}
              </button>
            </div>
          </div>
          {chartTab === "tradingview" ? (
            <TradingViewAdvancedChart symbol={selectedSymbol} interval={selectedTimeframe} />
          ) : (
            <SmartAIChart
              symbol={selectedSymbolLabel}
              timeframe={selectedTimeframeLabel}
              candles={zonesResult?.candles ?? []}
              zones={zonesResult?.zones ?? []}
              currentPrice={zonesResult?.currentPrice}
              structure={zonesResult?.structure}
              invalidation={zonesResult?.structure.invalidation}
            />
          )}
        </div>

        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A] xl:sticky xl:top-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white">{copy.readerTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {zonesResult ? copy.analysisContext : copy.readerSubtitle}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <CompactMetric title={copy.symbol} value={selectedSymbolLabel} />
            <CompactMetric title={copy.timeframe} value={selectedTimeframeLabel} />
          </div>

          <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-100">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{aiAnalysisEnabled ? copy.upgrade : hasUsedFreeAnalysis ? copy.freeAnalysisUsed : copy.freeAnalysisAvailable}</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.key}
                  type="button"
                  variant={action.key === "full" ? "default" : "outline"}
                  onClick={() => requestZones(action.key)}
                  disabled={status === "loading" || !canRequestAnalysis}
                  className={cn(
                    "h-auto min-h-9 justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] font-bold leading-4",
                    activeAction === action.key && action.key !== "full"
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100"
                      : ""
                  )}
                >
                  {status === "loading" && activeAction === action.key ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="whitespace-normal">{copy[action.label]}</span>
                </Button>
              );
            })}
          </div>

          {status === "loading" ? (
            <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111827]">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                {copy.loading}
              </div>
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          ) : null}

          {status === "error" && message ? (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </div>
            </div>
          ) : null}

          {!zonesResult && status !== "loading" ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300">
              <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Gauge className="h-4 w-4 text-blue-500" />
                {copy.ready}
              </div>
              <p className="mt-2 text-xs leading-5">{copy.educational}</p>
            </div>
          ) : null}

          {zonesResult ? (
            <div className="mt-4">
              <div className="grid grid-cols-4 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#111827]">
                {RESULT_TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setResultTab(tab)}
                    className={cn(
                      "h-8 rounded-md px-1 text-[11px] font-black transition",
                      resultTab === tab
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                    )}
                  >
                    {copy.tabs[tab]}
                  </button>
                ))}
              </div>

              <div className="mt-3 max-h-[560px] overflow-y-auto pr-1">
                <div className="space-y-3">
                  {zonesResult.dataWarning ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-100">
                      <div className="flex items-start gap-2">
                        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{zonesResult.dataWarning}</span>
                      </div>
                    </div>
                  ) : null}

                  {resultTab === "summary" ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div className={cn("rounded-lg border px-3 py-2", biasClass(zonesResult.structure.bias))}>
                          <div className="text-[11px] font-bold opacity-80">{copy.bias}</div>
                          <div className="mt-1 text-base font-black capitalize">{zonesResult.structure.bias}</div>
                        </div>
                        <CompactMetric title={copy.currentPrice} value={String(zonesResult.currentPrice)} />
                      </div>

                      <div className="grid gap-2">
                        {nearestResistance ? (
                          <ZoneCard zone={nearestResistance} language={language} highlighted badge={copy.nearestResistance} />
                        ) : null}
                        {nearestSupport ? <ZoneCard zone={nearestSupport} language={language} highlighted badge={copy.nearestSupport} /> : null}
                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-100">
                          <div className="text-[11px] font-black opacity-80">{copy.invalidationZone}</div>
                          <div className="mt-1 text-sm font-black" dir="ltr">
                            {formatPrice(zonesResult.structure.invalidation)}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-blue-500/25 bg-blue-500/10 p-3 text-blue-900 dark:text-blue-100">
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase opacity-80">
                          <BrainCircuit className="h-4 w-4" />
                          {copy.aiSummary}
                        </div>
                        <p className="whitespace-pre-wrap text-xs leading-6">{zonesResult.aiSummary}</p>
                      </div>
                    </>
                  ) : null}

                  {resultTab === "zones" ? (
                    <>
                      {renderZoneList(copy.resistanceSupply, visibleResistanceSupply)}
                      {renderZoneList(copy.supportDemand, visibleSupportDemand)}
                      {renderZoneList(copy.orderBlocks, visibleOrderBlocks)}
                      {hasMoreZones ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowMoreZones((value) => !value)}
                          className="h-9 w-full rounded-lg text-xs font-black"
                        >
                          {showMoreZones ? copy.showLess : copy.showMore}
                        </Button>
                      ) : null}
                    </>
                  ) : null}

                  {resultTab === "scenarios" ? (
                    <div className="space-y-2">
                      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs leading-6 text-emerald-800 dark:text-emerald-100">
                        <div className="mb-1 font-black">{copy.bullishScenario}</div>
                        {language === "fa"
                          ? `اگر قیمت بالای نزدیک ترین حمایت حفظ شود و به سمت ${nearestResistance ? zoneRange(nearestResistance) : "مقاومت بعدی"} حرکت کند، واکنش قیمت به آن ناحیه مهم است.`
                          : `If price holds above nearest support and moves toward ${nearestResistance ? zoneRange(nearestResistance) : "next resistance"}, watch the reaction there.`}
                      </div>
                      <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-xs leading-6 text-red-800 dark:text-red-100">
                        <div className="mb-1 font-black">{copy.bearishScenario}</div>
                        {language === "fa"
                          ? `اگر نزدیک ترین حمایت از دست برود، ناحیه ابطال ${formatPrice(zonesResult.structure.invalidation)} معیار ریسک بعدی است.`
                          : `If nearest support fails, invalidation at ${formatPrice(zonesResult.structure.invalidation)} is the next risk reference.`}
                      </div>
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-6 text-amber-800 dark:text-amber-100">
                        <div className="mb-1 font-black">{copy.entryRisk}</div>
                        {zonesResult.disclaimer}
                      </div>
                    </div>
                  ) : null}

                  {resultTab === "journal" ? (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200">
                        <div className="font-black">{copy.journalQuestion}</div>
                        <p className="mt-1">
                          {language === "fa"
                            ? "آیا قیمت نزدیک ناحیه کلیدی است، سناریوی ابطال من کجاست، و قبل از تصمیم چه تاییدی لازم دارم؟"
                            : "Is price near a key zone, where is invalidation, and what confirmation do I need before a decision?"}
                        </p>
                      </div>
                      <Button type="button" variant="outline" onClick={copyToJournal} className="h-10 w-full gap-2 rounded-lg text-sm font-black">
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? copy.copied : copy.copyJournal}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
            <Clipboard className="mx-1 inline h-3.5 w-3.5 align-text-bottom" />
            {copy.educational}
          </p>
        </aside>
      </section>
    </div>
  );
}
