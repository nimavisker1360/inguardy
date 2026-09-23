"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts";
import {
  Activity,
  AlertCircle,
  AlignLeft,
  BarChart3,
  Bold,
  CalendarDays,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Crosshair,
  EyeOff,
  Grid2X2,
  Info,
  Link as LinkIcon,
  Loader2,
  Lock,
  Magnet,
  Maximize2,
  Mic,
  MousePointer2,
  PaintBucket,
  Plus,
  Pencil,
  Percent,
  Pilcrow,
  RefreshCw,
  Redo2,
  Ruler,
  Settings2,
  ShieldAlert,
  Smile,
  Strikethrough,
  Target,
  TextCursorInput,
  Type,
  Trash2,
  TrendingUp,
  Undo2,
  ZoomIn,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TradeDirection = "BUY" | "SELL";
type TradeStatus = "OPEN" | "CLOSED" | "CANCELLED";
type Timeframe = "M5" | "M15" | "H1" | "H4" | "D1";

type MarketCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type CandleResponse = {
  ok: boolean;
  candles?: MarketCandle[];
  message?: string;
};

type DrawingTool = "cursor" | "trend" | "horizontal" | "vertical" | "fib" | "brush" | "text" | "emoji" | "ruler";

type ChartDrawing = {
  id: string;
  type: Exclude<DrawingTool, "cursor">;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type DrawingDrag = {
  id: string;
  handle: "start" | "end" | "move";
  originX: number;
  originY: number;
  drawing: ChartDrawing;
};

type TradeOverlayGeometry = {
  entryY: number;
  stopY: number | null;
  targetY: number | null;
};

type TradeExecutionChartProps = {
  tradeId: string;
  symbol: string;
  direction: TradeDirection;
  status: TradeStatus;
  entryPrice: string | number | null;
  exitPrice: string | number | null;
  stopLoss: string | number | null;
  takeProfit: string | number | null;
  profitLoss: string | number | null;
  riskReward: string | number | null;
  openedAt: string | null;
  closedAt: string | null;
  language: "fa" | "en";
  notes?: string | null;
  commission?: string | number | null;
  swap?: string | number | null;
  onNotesSaved?: (notes: string) => void;
};

type NoteMode = "trade" | "daily";

type NoteTemplate = {
  id: string;
  name: string;
  content: string;
};

type DailyJournalRecord = Record<string, unknown> & {
  endOfDayNotes?: string | null;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const TIMEFRAMES: Timeframe[] = ["M5", "M15", "H1", "H4", "D1"];

const copy = {
  en: {
    title: "What happened in this trade?",
    subtitle: "A simple explanation from entry to result",
    openTitle: "This trade is still open",
    profitTitle: "This trade closed in profit",
    lossTitle: "This trade closed in loss",
    breakevenTitle: "This trade closed near breakeven",
    cancelledTitle: "This trade was cancelled",
    buy: "Buy",
    sell: "Sell",
    side: "Direction",
    result: "Result",
    priceMove: "Price movement",
    inYourFavor: "in your favor",
    againstYou: "against your position",
    unchanged: "almost unchanged",
    movementUnavailable: "Waiting for an exit price",
    accountResult: "Recorded account result",
    plannedLevels: "Your planned levels",
    duration: "Trade duration",
    riskReward: "R:R",
    showChart: "Show advanced chart",
    hideChart: "Hide advanced chart",
    chartTitle: "Advanced market chart",
    chartSubtitle: "Candles, exact price levels, zoom and multiple timeframes",
    loading: "Loading market candles...",
    unavailable: "Market candles are not available for this trade right now.",
    retry: "Retry",
    entry: "Entry",
    exit: "Exit",
    stop: "Stop loss (SL)",
    target: "Take profit (TP)",
    notRecorded: "Not recorded",
    plannedRisk: "Planned risk",
    plannedReward: "Planned reward",
    riskZone: "RISK ZONE",
    rewardZone: "REWARD ZONE",
    live: "Live market data",
    historical: "Historical trade view",
    hint: "Drag in any direction to pan. Click auto to reset the price scale.",
    notes: "Notes",
    runningPnl: "Running P&L",
    indicators: "Indicators",
    autosaved: "Autosaved",
    noNotes: "No notes have been added to this trade yet.",
    netResult: "Net result",
    commission: "Commission",
    swap: "Swap",
  },
  fa: {
    title: "در این معامله چه اتفاقی افتاد؟",
    subtitle: "روایت ساده‌ی معامله، از ورود تا نتیجه",
    openTitle: "این معامله هنوز باز است",
    profitTitle: "این معامله با سود بسته شد",
    lossTitle: "این معامله با زیان بسته شد",
    breakevenTitle: "این معامله تقریبا سربه‌سر بسته شد",
    cancelledTitle: "این معامله لغو شده است",
    buy: "خرید",
    sell: "فروش",
    side: "جهت معامله",
    result: "نتیجه",
    priceMove: "حرکت قیمت",
    inYourFavor: "به نفع معامله",
    againstYou: "خلاف جهت معامله",
    unchanged: "تقریبا بدون تغییر",
    movementUnavailable: "هنوز قیمت خروج ثبت نشده است",
    accountResult: "نتیجه ثبت‌شده در حساب",
    plannedLevels: "سطوحی که برنامه‌ریزی کرده بودید",
    duration: "مدت معامله",
    riskReward: "ریسک به ریوارد",
    showChart: "نمایش چارت پیشرفته",
    hideChart: "بستن چارت پیشرفته",
    chartTitle: "چارت پیشرفته بازار",
    chartSubtitle: "کندل‌ها، قیمت‌های دقیق، زوم و تایم‌فریم‌های مختلف",
    loading: "در حال دریافت کندل‌های بازار...",
    unavailable: "در حال حاضر داده‌ی کندلی این معامله در دسترس نیست.",
    retry: "تلاش دوباره",
    entry: "ورود",
    exit: "خروج",
    stop: "حد ضرر (SL)",
    target: "حد سود (TP)",
    notRecorded: "ثبت نشده",
    plannedRisk: "ریسک برنامه",
    plannedReward: "سود هدف",
    riskZone: "ناحیه ریسک",
    rewardZone: "ناحیه سود",
    live: "داده زنده بازار",
    historical: "نمای تاریخی معامله",
    hint: "چارت را به هر جهت بکشید. با دکمهٔ auto مقیاس قیمت را به حالت خودکار برگردانید.",
    notes: "یادداشت‌ها",
    runningPnl: "سود و زیان جاری",
    indicators: "اندیکاتورها",
    autosaved: "ذخیره خودکار",
    noNotes: "هنوز یادداشتی برای این معامله ثبت نشده است.",
    netResult: "نتیجه خالص",
    commission: "کمیسیون",
    swap: "سواپ",
  },
} as const;

const noteCopy = {
  en: {
    tradeNote: "Trade note",
    dailyJournal: "Daily Journal",
    recentlyUsed: "Recently used templates",
    addTemplate: "Add template",
    templateName: "Template name",
    templateContent: "Template content",
    createTemplate: "Create template",
    cancel: "Cancel",
    save: "Save note",
    saving: "Saving...",
    saved: "Saved",
    loadError: "Daily journal could not be loaded.",
    saveError: "Note could not be saved.",
    placeholder: "Why did you take this trade?\nDid you follow your rules?\nNote any emotions, chart patterns, or trade management lessons learned.",
    voiceUnavailable: "Voice typing is not supported by this browser.",
  },
  fa: {
    tradeNote: "یادداشت معامله",
    dailyJournal: "ژورنال روزانه",
    recentlyUsed: "قالب‌های اخیراً استفاده‌شده",
    addTemplate: "افزودن قالب",
    templateName: "نام قالب",
    templateContent: "متن قالب",
    createTemplate: "ساخت قالب",
    cancel: "انصراف",
    save: "ذخیره یادداشت",
    saving: "در حال ذخیره...",
    saved: "ذخیره شد",
    loadError: "ژورنال روزانه بارگذاری نشد.",
    saveError: "یادداشت ذخیره نشد.",
    placeholder: "چرا وارد این معامله شدید؟\nآیا قوانین خود را رعایت کردید؟\nاحساسات، الگوی چارت یا نکات مدیریت معامله را بنویسید.",
    voiceUnavailable: "تایپ صوتی در این مرورگر پشتیبانی نمی‌شود.",
  },
} as const;

function isDarkDashboard() {
  if (typeof document === "undefined") return false;
  const theme = document.documentElement.dataset.dashboardTheme;
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return document.documentElement.classList.contains("dark");
}

function numeric(value: string | number | null) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function timestamp(value: string | null) {
  if (!value) return null;
  const milliseconds = new Date(value).getTime();
  return Number.isFinite(milliseconds) ? Math.floor(milliseconds / 1000) : null;
}

function utcDate(value: string | null) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toISOString().slice(0, 10);
}

function displayNumber(value: string | number | null, digits = 5) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  return parsed.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function displaySignedNumber(value: string | number | null) {
  const parsed = numeric(value);
  if (parsed === null) return "—";
  if (Math.abs(parsed) < 0.005) return "0";
  const prefix = parsed > 0 ? "+" : "";
  return `${prefix}${parsed.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function formatDuration(openedAt: string | null, closedAt: string | null, language: "fa" | "en") {
  const opened = timestamp(openedAt);
  const closed = timestamp(closedAt);
  if (opened === null || closed === null || closed < opened) return "—";

  const totalMinutes = Math.max(1, Math.round((closed - opened) / 60));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];

  if (days) parts.push(language === "fa" ? `${days} روز` : `${days}d`);
  if (hours) parts.push(language === "fa" ? `${hours} ساعت` : `${hours}h`);
  if (!days && minutes) parts.push(language === "fa" ? `${minutes} دقیقه` : `${minutes}m`);
  return parts.join(" و ");
}

function defaultTimeframe(openedAt: string | null, closedAt: string | null): Timeframe {
  const opened = timestamp(openedAt);
  const closed = timestamp(closedAt) ?? Math.floor(Date.now() / 1000);
  if (!opened) return "H1";
  const durationHours = Math.max(0, (closed - opened) / 3600);
  if (durationHours <= 8) return "M5";
  if (durationHours <= 36) return "M15";
  if (durationHours <= 24 * 10) return "H1";
  if (durationHours <= 24 * 45) return "H4";
  return "D1";
}

function nearestCandleIndex(candles: MarketCandle[], target: number | null) {
  if (!candles.length || target === null) return -1;
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  candles.forEach((candle, index) => {
    const distance = Math.abs(Math.floor(new Date(candle.time).getTime() / 1000) - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function TradeExecutionChart({
  tradeId,
  symbol,
  direction,
  status,
  entryPrice,
  exitPrice,
  stopLoss,
  takeProfit,
  profitLoss,
  riskReward,
  openedAt,
  closedAt,
  language,
  notes,
  commission,
  swap,
  onNotesSaved,
}: TradeExecutionChartProps) {
  const shellRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const drawingDragRef = useRef<DrawingDrag | null>(null);
  const noteEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>(() => defaultTimeframe(openedAt, closedAt));
  const [candles, setCandles] = useState<MarketCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const showAdvanced = true;
  const drawingToolsEnabled = false;
  const [chartTab, setChartTab] = useState<"chart" | "notes" | "pnl">("chart");
  const [noteMode, setNoteMode] = useState<NoteMode>("trade");
  const [tradeNote, setTradeNote] = useState(notes?.trim() === "-" ? "" : notes || "");
  const [dailyNote, setDailyNote] = useState("");
  const [dailyJournal, setDailyJournal] = useState<DailyJournalRecord | null>(null);
  const [dailyNoteLoaded, setDailyNoteLoaded] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [noteFont, setNoteFont] = useState("Arial");
  const [noteFontSize, setNoteFontSize] = useState(14);
  const [noteAlign, setNoteAlign] = useState<"left" | "center" | "right">("left");
  const [noteColor, setNoteColor] = useState("#334155");
  const [noteHighlight, setNoteHighlight] = useState("#ffffff");
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([]);
  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [drawings, setDrawings] = useState<ChartDrawing[]>([]);
  const [redoDrawings, setRedoDrawings] = useState<ChartDrawing[]>([]);
  const [drawingStart, setDrawingStart] = useState<{ x: number; y: number } | null>(null);
  const [showSma, setShowSma] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [drawingsVisible, setDrawingsVisible] = useState(true);
  const [drawingsLocked, setDrawingsLocked] = useState(false);
  const [magnetActive, setMagnetActive] = useState(false);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [drawingsHydrated, setDrawingsHydrated] = useState(false);
  const [tradeOverlay, setTradeOverlay] = useState<TradeOverlayGeometry | null>(null);
  const labels = copy[language];
  const noteLabels = noteCopy[language];
  const isLive = status === "OPEN" || utcDate(closedAt) === utcDate(null);
  const pnl = numeric(profitLoss);
  const entryValue = numeric(entryPrice);
  const stopValue = numeric(stopLoss);
  const targetValue = numeric(takeProfit);
  const plannedRiskDistance = entryValue !== null && stopValue !== null
    ? Math.abs(entryValue - stopValue)
    : null;
  const plannedRewardDistance = entryValue !== null && targetValue !== null
    ? Math.abs(targetValue - entryValue)
    : null;
  const calculatedRiskReward = plannedRiskDistance && plannedRewardDistance !== null
    ? plannedRewardDistance / plannedRiskDistance
    : numeric(riskReward);
  const noteDate = useMemo(() => {
    const date = openedAt ? new Date(openedAt) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  }, [openedAt]);
  const activeNote = noteMode === "trade" ? tradeNote : dailyNote;
  void formatDuration;

  useEffect(() => {
    setTradeNote(notes?.trim() === "-" ? "" : notes || "");
  }, [notes]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("inguardy:note-templates");
      const parsed = stored ? JSON.parse(stored) : [];
      setNoteTemplates(Array.isArray(parsed) ? parsed : []);
    } catch {
      setNoteTemplates([]);
    }
  }, []);

  useEffect(() => {
    setDailyNoteLoaded(false);
    setDailyJournal(null);
  }, [noteDate, tradeId]);

  useEffect(() => {
    if (chartTab !== "notes" || noteMode !== "daily" || dailyNoteLoaded) return;
    let cancelled = false;

    async function loadDailyNote() {
      setNoteError("");
      try {
        const response = await fetch(`/api/daily-journal?date=${encodeURIComponent(noteDate)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || noteLabels.loadError);
        if (!cancelled) {
          const journal = (data.journal || null) as DailyJournalRecord | null;
          setDailyJournal(journal);
          setDailyNote(typeof journal?.endOfDayNotes === "string" ? journal.endOfDayNotes : "");
        }
      } catch {
        if (!cancelled) setNoteError(noteLabels.loadError);
      } finally {
        if (!cancelled) setDailyNoteLoaded(true);
      }
    }

    void loadDailyNote();
    return () => {
      cancelled = true;
    };
  }, [chartTab, dailyNoteLoaded, noteDate, noteLabels.loadError, noteMode]);

  useEffect(() => {
    setDrawingsHydrated(false);
    setSelectedDrawingId(null);
    try {
      const stored = window.localStorage.getItem(`inguardy:chart-drawings:${symbol}:${timeframe}`);
      const parsed = stored ? JSON.parse(stored) : [];
      setDrawings(Array.isArray(parsed) ? parsed : []);
    } catch {
      setDrawings([]);
    } finally {
      setDrawingsHydrated(true);
    }
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!drawingsHydrated) return;
    window.localStorage.setItem(`inguardy:chart-drawings:${symbol}:${timeframe}`, JSON.stringify(drawings));
  }, [drawings, drawingsHydrated, symbol, timeframe]);

  useEffect(() => {
    function moveDrawing(event: PointerEvent) {
      const drag = drawingDragRef.current;
      if (!drag) return;
      let dx = event.clientX - drag.originX;
      let dy = event.clientY - drag.originY;
      if (magnetActive) {
        dx = Math.round(dx / 8) * 8;
        dy = Math.round(dy / 8) * 8;
      }
      setDrawings((current) => current.map((drawing) => {
        if (drawing.id !== drag.id) return drawing;
        if (drag.handle === "move") {
          return { ...drawing, x1: drag.drawing.x1 + dx, y1: drag.drawing.y1 + dy, x2: drag.drawing.x2 + dx, y2: drag.drawing.y2 + dy };
        }
        if (drag.handle === "start") {
          if (drawing.type === "horizontal") return { ...drawing, y1: drag.drawing.y1 + dy, y2: drag.drawing.y2 + dy };
          if (drawing.type === "vertical") return { ...drawing, x1: drag.drawing.x1 + dx, x2: drag.drawing.x2 + dx };
          return { ...drawing, x1: drag.drawing.x1 + dx, y1: drag.drawing.y1 + dy };
        }
        return { ...drawing, x2: drag.drawing.x2 + dx, y2: drag.drawing.y2 + dy };
      }));
    }

    function stopDrawingMove() {
      drawingDragRef.current = null;
    }

    window.addEventListener("pointermove", moveDrawing);
    window.addEventListener("pointerup", stopDrawingMove);
    return () => {
      window.removeEventListener("pointermove", moveDrawing);
      window.removeEventListener("pointerup", stopDrawingMove);
    };
  }, [magnetActive]);

  useEffect(() => {
    function deleteWithKeyboard(event: KeyboardEvent) {
      if (!selectedDrawingId || (event.key !== "Delete" && event.key !== "Backspace")) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
      setSelectedDrawingId(null);
    }
    window.addEventListener("keydown", deleteWithKeyboard);
    return () => window.removeEventListener("keydown", deleteWithKeyboard);
  }, [selectedDrawingId]);

  const loadCandles = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const endDate = utcDate(closedAt);
      const query = new URLSearchParams({ symbol, timeframe, endDate, limit: "700" });
      const response = await fetch(`/api/backtest/candles?${query.toString()}`, {
        signal,
        cache: "no-store",
      });
      const data = (await response.json()) as CandleResponse;
      if (!response.ok || !data.ok || !data.candles?.length) {
        throw new Error(data.message || labels.unavailable);
      }
      setCandles(data.candles);
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setCandles([]);
      setError(loadError instanceof Error ? loadError.message : labels.unavailable);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [closedAt, labels.unavailable, symbol, timeframe]);

  useEffect(() => {
    if (!showAdvanced) return;
    const controller = new AbortController();
    void loadCandles(controller.signal);
    return () => controller.abort();
  }, [loadCandles, reloadKey, showAdvanced]);

  useEffect(() => {
    if (!isLive || !showAdvanced) return;
    const interval = window.setInterval(() => void loadCandles(), 60_000);
    return () => window.clearInterval(interval);
  }, [isLive, loadCandles, showAdvanced]);

  useEffect(() => {
    setIsDark(isDarkDashboard());
    const observer = new MutationObserver(() => setIsDark(isDarkDashboard()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-dashboard-theme"],
    });
    return () => observer.disconnect();
  }, []);

  const chartCandles = useMemo<CandlestickData<UTCTimestamp>[]>(() =>
    candles.map((candle) => ({
      time: Math.floor(new Date(candle.time).getTime() / 1000) as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    })), [candles]);

  const fitTradeLevels = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series || !candles.length) return;

    const logicalRange = chart.timeScale().getVisibleLogicalRange();
    const from = Math.max(0, Math.floor(logicalRange?.from ?? 0));
    const to = Math.min(candles.length, Math.ceil(logicalRange?.to ?? candles.length));
    const visiblePrices = candles.slice(from, to).flatMap((candle) => [candle.low, candle.high]);
    const tradePrices = [entryValue, numeric(exitPrice), stopValue, targetValue]
      .filter((value): value is number => value !== null);
    const allPrices = [...visiblePrices, ...tradePrices];
    if (!allPrices.length) return;

    const low = Math.min(...allPrices);
    const high = Math.max(...allPrices);
    const padding = Math.max((high - low) * 0.1, Math.abs(high || 1) * 0.0005);
    series.priceScale().setAutoScale(false);
    series.priceScale().setVisibleRange({ from: low - padding, to: high + padding });
    window.requestAnimationFrame(() => {
      if (entryValue === null) return setTradeOverlay(null);
      const entryY = series.priceToCoordinate(entryValue);
      if (entryY === null) return setTradeOverlay(null);
      setTradeOverlay({
        entryY,
        stopY: stopValue === null ? null : series.priceToCoordinate(stopValue),
        targetY: targetValue === null ? null : series.priceToCoordinate(targetValue),
      });
    });
  }, [candles, entryValue, exitPrice, stopValue, targetValue]);

  useEffect(() => {
    const container = containerRef.current;
    if (!showAdvanced || !container || !chartCandles.length) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#0b1220" : "#ffffff" },
        textColor: isDark ? "#cbd5e1" : "#475569",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: gridVisible ? (isDark ? "rgba(148,163,184,.10)" : "rgba(148,163,184,.20)") : "transparent" },
        horzLines: { color: gridVisible ? (isDark ? "rgba(148,163,184,.10)" : "rgba(148,163,184,.20)") : "transparent" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: isDark ? "rgba(148,163,184,.25)" : "rgba(148,163,184,.40)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(148,163,184,.25)" : "rgba(148,163,184,.40)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 3,
        minBarSpacing: 1,
      },
      handleScroll: true,
      handleScale: true,
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#059669",
      wickDownColor: "#dc2626",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    series.setData(chartCandles);

    const syncTradeOverlay = () => {
      const entry = numeric(entryPrice);
      if (entry === null) {
        setTradeOverlay(null);
        return;
      }
      const entryY = series.priceToCoordinate(entry);
      const stop = numeric(stopLoss);
      const target = numeric(takeProfit);
      if (entryY === null) {
        setTradeOverlay(null);
        return;
      }
      setTradeOverlay({
        entryY,
        stopY: stop === null ? null : series.priceToCoordinate(stop),
        targetY: target === null ? null : series.priceToCoordinate(target),
      });
    };
    const scheduleOverlaySync = () => window.requestAnimationFrame(syncTradeOverlay);

    type PriceRange = { from: number; to: number };
    let priceDrag: { pointerId: number; startY: number; range: PriceRange; plotHeight: number } | null = null;
    const priceScale = series.priceScale();
    const onChartPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || priceDrag) return;
      const bounds = container.getBoundingClientRect();
      const plotHeight = bounds.height - chart.timeScale().height();
      if (plotHeight <= 0 || event.clientX >= bounds.right - priceScale.width() || event.clientY >= bounds.top + plotHeight) return;
      const visible = priceScale.getVisibleRange();
      const topPrice = series.coordinateToPrice(0);
      const bottomPrice = series.coordinateToPrice(plotHeight);
      const range = visible ?? (topPrice != null && bottomPrice != null
        ? { from: Math.min(topPrice, bottomPrice), to: Math.max(topPrice, bottomPrice) }
        : null);
      if (!range || range.to <= range.from) return;
      priceDrag = { pointerId: event.pointerId, startY: event.clientY, range, plotHeight };
    };
    const onChartPointerMove = (event: PointerEvent) => {
      if (!priceDrag || event.pointerId !== priceDrag.pointerId) return;
      const deltaY = event.clientY - priceDrag.startY;
      if (Math.abs(deltaY) < 2) return;
      const shift = deltaY / priceDrag.plotHeight * (priceDrag.range.to - priceDrag.range.from);
      priceScale.setAutoScale(false);
      priceScale.setVisibleRange({ from: priceDrag.range.from + shift, to: priceDrag.range.to + shift });
      scheduleOverlaySync();
    };
    const onChartPointerUp = (event: PointerEvent) => {
      if (priceDrag?.pointerId === event.pointerId) priceDrag = null;
    };
    container.addEventListener("pointerdown", onChartPointerDown, true);
    window.addEventListener("pointermove", onChartPointerMove);
    window.addEventListener("pointerup", onChartPointerUp);
    window.addEventListener("pointercancel", onChartPointerUp);
    if (showSma) {
      const smaSeries = chart.addSeries(LineSeries, {
        color: "#8b5cf6",
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      smaSeries.setData(chartCandles.slice(19).map((candle, index) => ({
        time: candle.time,
        value: chartCandles.slice(index, index + 20).reduce((sum, item) => sum + item.close, 0) / 20,
      })));
    }
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: "#94a3b8",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });
    volumeSeries.setData(candles.map((candle) => ({
      time: Math.floor(new Date(candle.time).getTime() / 1000) as UTCTimestamp,
      value: candle.volume || 0,
      color: candle.close >= candle.open
        ? (isDark ? "rgba(45,212,191,.38)" : "rgba(20,184,166,.35)")
        : (isDark ? "rgba(251,113,133,.38)" : "rgba(244,63,94,.32)"),
    })));

    const levels = [
      { value: numeric(entryPrice), color: "#2563eb", title: labels.entry, style: LineStyle.Solid, width: 2 as const },
      { value: numeric(exitPrice), color: "#f59e0b", title: labels.exit, style: LineStyle.Dashed, width: 2 as const },
      { value: numeric(stopLoss), color: "#ef4444", title: labels.stop, style: LineStyle.Solid, width: 2 as const },
      { value: numeric(takeProfit), color: "#10b981", title: labels.target, style: LineStyle.Solid, width: 2 as const },
    ];
    levels.forEach((level) => {
      if (level.value === null) return;
      series.createPriceLine({
        price: level.value,
        color: level.color,
        lineWidth: level.width,
        lineStyle: level.style,
        axisLabelVisible: true,
        title: level.title,
      });
    });

    const entryIndex = nearestCandleIndex(candles, timestamp(openedAt));
    const exitIndex = nearestCandleIndex(candles, timestamp(closedAt));
    const markers: SeriesMarker<UTCTimestamp>[] = [];
    if (entryIndex >= 0) {
      markers.push({
        id: "trade-entry",
        time: chartCandles[entryIndex].time,
        position: direction === "BUY" ? "belowBar" : "aboveBar",
        shape: direction === "BUY" ? "arrowUp" : "arrowDown",
        color: "#2563eb",
        size: 2.5,
        text: `${labels.entry} ${numeric(entryPrice)?.toLocaleString("en-US", { maximumFractionDigits: 5 }) ?? ""}`,
      });
    }
    if (exitIndex >= 0 && numeric(exitPrice) !== null) {
      markers.push({
        id: "trade-exit",
        time: chartCandles[exitIndex].time,
        position: direction === "BUY" ? "aboveBar" : "belowBar",
        shape: direction === "BUY" ? "arrowDown" : "arrowUp",
        color: "#f59e0b",
        size: 2.5,
        text: `${labels.exit} ${numeric(exitPrice)?.toLocaleString("en-US", { maximumFractionDigits: 5 }) ?? ""}`,
      });
    }
    createSeriesMarkers(series, markers.sort((a, b) => Number(a.time) - Number(b.time)));

    const focusIndexes = [entryIndex, exitIndex].filter((index) => index >= 0);
    if (focusIndexes.length) {
      const first = Math.min(...focusIndexes);
      const last = Math.max(...focusIndexes);
      const tradeSpan = Math.max(last - first, 12);
      const visibleBars = Math.min(
        chartCandles.length + 12,
        Math.max(72, Math.ceil(tradeSpan * 2.2))
      );
      const center = (first + last) / 2;
      const maxTo = chartCandles.length + 12;
      let from = Math.max(0, center - visibleBars / 2);
      const to = Math.min(maxTo, from + visibleBars);
      from = Math.max(0, to - visibleBars);
      chart.timeScale().setVisibleLogicalRange({
        from,
        to,
      });

      const visibleCandles = candles.slice(Math.max(0, Math.floor(from)), Math.min(candles.length, Math.ceil(to)));
      const visiblePrices = visibleCandles.flatMap((candle) => [candle.low, candle.high]);
      const tradePrices = [numeric(entryPrice), numeric(exitPrice), numeric(stopLoss), numeric(takeProfit)]
        .filter((value): value is number => value !== null);
      const allVisiblePrices = [...visiblePrices, ...tradePrices];
      if (allVisiblePrices.length) {
        const low = Math.min(...allVisiblePrices);
        const high = Math.max(...allVisiblePrices);
        const padding = Math.max((high - low) * 0.1, Math.abs(high || 1) * 0.0005);
        priceScale.setAutoScale(false);
        priceScale.setVisibleRange({ from: low - padding, to: high + padding });
      }
    } else {
      chart.timeScale().fitContent();
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(scheduleOverlaySync);
    const resizeObserver = new ResizeObserver(scheduleOverlaySync);
    resizeObserver.observe(container);
    scheduleOverlaySync();

    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      container.removeEventListener("pointerdown", onChartPointerDown, true);
      window.removeEventListener("pointermove", onChartPointerMove);
      window.removeEventListener("pointerup", onChartPointerUp);
      window.removeEventListener("pointercancel", onChartPointerUp);
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(scheduleOverlaySync);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setTradeOverlay(null);
    };
  }, [candles, chartCandles, closedAt, direction, entryPrice, exitPrice, gridVisible, isDark, labels, openedAt, showAdvanced, showSma, stopLoss, takeProfit]);

  const lastCandle = candles.at(-1);
  const riskZone = tradeOverlay?.stopY !== null && tradeOverlay?.stopY !== undefined
    ? {
        top: Math.min(tradeOverlay.entryY, tradeOverlay.stopY),
        height: Math.max(2, Math.abs(tradeOverlay.entryY - tradeOverlay.stopY)),
      }
    : null;
  const rewardZone = tradeOverlay?.targetY !== null && tradeOverlay?.targetY !== undefined
    ? {
        top: Math.min(tradeOverlay.entryY, tradeOverlay.targetY),
        height: Math.max(2, Math.abs(tradeOverlay.entryY - tradeOverlay.targetY)),
      }
    : null;
  const chartTools: Array<{ id: DrawingTool; label: string; icon: typeof MousePointer2 }> = [
    { id: "cursor", label: "Cursor / select", icon: CircleDot },
    { id: "trend", label: "Trend line", icon: TrendingUp },
    { id: "horizontal", label: "Horizontal line", icon: Crosshair },
    { id: "vertical", label: "Vertical line", icon: BarChart3 },
    { id: "fib", label: "Fibonacci", icon: Grid2X2 },
    { id: "brush", label: "Brush", icon: Pencil },
    { id: "text", label: "Text", icon: TextCursorInput },
    { id: "emoji", label: "Emoji", icon: Smile },
    { id: "ruler", label: "Measure", icon: Ruler },
  ];

  function chartPoint(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return magnetActive
      ? { x: Math.round(x / 8) * 8, y: Math.round(y / 8) * 8 }
      : { x, y };
  }

  function addDrawing(event: React.MouseEvent<HTMLDivElement>) {
    if (activeTool === "cursor" || drawingsLocked) return;
    const point = chartPoint(event);
    const immediate = activeTool === "horizontal" || activeTool === "vertical" || activeTool === "text" || activeTool === "emoji";
    const start = immediate ? point : drawingStart;

    if (!start) {
      setDrawingStart(point);
      return;
    }

    const next: ChartDrawing = {
      id: `${Date.now()}-${drawings.length}`,
      type: activeTool,
      x1: start.x,
      y1: start.y,
      x2: point.x,
      y2: point.y,
    };
    setDrawings((current) => [...current, next]);
    setSelectedDrawingId(next.id);
    setRedoDrawings([]);
    setDrawingStart(null);
  }

  function startDrawingDrag(
    event: React.PointerEvent<SVGElement>,
    drawing: ChartDrawing,
    handle: DrawingDrag["handle"]
  ) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedDrawingId(drawing.id);
    setActiveTool("cursor");
    if (drawingsLocked) return;
    drawingDragRef.current = {
      id: drawing.id,
      handle,
      originX: event.clientX,
      originY: event.clientY,
      drawing: { ...drawing },
    };
  }

  function undoDrawing() {
    setDrawings((current) => {
      const last = current.at(-1);
      if (!last) return current;
      setRedoDrawings((redo) => [...redo, last]);
      return current.slice(0, -1);
    });
  }

  function redoDrawing() {
    setRedoDrawings((current) => {
      const last = current.at(-1);
      if (!last) return current;
      setDrawings((items) => [...items, last]);
      return current.slice(0, -1);
    });
  }

  function deleteSelectedDrawing() {
    if (!selectedDrawingId) return;
    setDrawings((current) => current.filter((drawing) => drawing.id !== selectedDrawingId));
    setSelectedDrawingId(null);
  }

  function clearDrawings() {
    if (!drawings.length) return;
    setRedoDrawings(drawings);
    setDrawings([]);
    setSelectedDrawingId(null);
  }

  function zoomChart() {
    chartRef.current?.timeScale().applyOptions({ barSpacing: 12 });
  }

  async function toggleFullscreen() {
    if (!shellRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await shellRef.current.requestFullscreen();
  }

  function downloadSnapshot() {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `${symbol}-${timeframe}-chart.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function updateActiveNote(value: string) {
    if (noteMode === "trade") setTradeNote(value);
    else setDailyNote(value);
    setNoteSaved(false);
    setNoteError("");
  }

  function replaceNoteSelection(before: string, after = before, fallback = "text") {
    const editor = noteEditorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = activeNote.slice(start, end) || fallback;
    const next = `${activeNote.slice(0, start)}${before}${selected}${after}${activeNote.slice(end)}`;
    updateActiveNote(next);
    window.requestAnimationFrame(() => {
      editor.focus();
      editor.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  }

  function insertNoteText(value: string) {
    const editor = noteEditorRef.current;
    if (!editor) return;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const prefix = start > 0 && !activeNote.slice(0, start).endsWith("\n") ? "\n" : "";
    const next = `${activeNote.slice(0, start)}${prefix}${value}${activeNote.slice(end)}`;
    updateActiveNote(next);
    window.requestAnimationFrame(() => {
      const cursor = start + prefix.length + value.length;
      editor.focus();
      editor.setSelectionRange(cursor, cursor);
    });
  }

  function addNoteLink() {
    const url = window.prompt(language === "fa" ? "آدرس لینک را وارد کنید" : "Enter link URL");
    if (!url) return;
    const editor = noteEditorRef.current;
    const selected = editor ? activeNote.slice(editor.selectionStart, editor.selectionEnd) : "";
    replaceNoteSelection("[", `](${url})`, selected || (language === "fa" ? "عنوان لینک" : "link title"));
  }

  function saveTemplate() {
    const name = templateName.trim();
    const content = templateContent.trim();
    if (!name || !content) return;
    const next = [{ id: `${Date.now()}`, name, content }, ...noteTemplates].slice(0, 8);
    setNoteTemplates(next);
    window.localStorage.setItem("inguardy:note-templates", JSON.stringify(next));
    setTemplateName("");
    setTemplateContent("");
    setShowTemplateForm(false);
  }

  async function saveActiveNote() {
    setNoteSaving(true);
    setNoteSaved(false);
    setNoteError("");
    try {
      if (noteMode === "trade") {
        const response = await fetch(`/api/journal/trades/${tradeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: tradeNote }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || noteLabels.saveError);
        onNotesSaved?.(tradeNote);
      } else {
        const response = await fetch("/api/daily-journal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(dailyJournal || {}), date: noteDate, endOfDayNotes: dailyNote }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || noteLabels.saveError);
        setDailyJournal((data.journal || null) as DailyJournalRecord | null);
        const syncPayload = { date: noteDate, endOfDayNotes: dailyNote, savedAt: Date.now() };
        window.localStorage.setItem("inguardy:daily-journal-sync", JSON.stringify(syncPayload));
        if ("BroadcastChannel" in window) {
          const channel = new BroadcastChannel("inguardy:daily-journal-sync");
          channel.postMessage(syncPayload);
          channel.close();
        }
      }
      setNoteSaved(true);
      toast.success(noteLabels.saved);
      window.setTimeout(() => setNoteSaved(false), 2200);
    } catch {
      setNoteError(noteLabels.saveError);
      toast.error(noteLabels.saveError);
    } finally {
      setNoteSaving(false);
    }
  }

  function startVoiceTyping() {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert(noteLabels.voiceUnavailable);
      return;
    }
    const recognition = new Recognition();
    recognition.lang = language === "fa" ? "fa-IR" : "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) insertNoteText(transcript);
    };
    recognition.onerror = () => setNoteError(noteLabels.voiceUnavailable);
    recognition.start();
  }

  function renderDrawing(drawing: ChartDrawing) {
    const selected = selectedDrawingId === drawing.id;
    const color = selected ? "#2962ff" : (isDark ? "#a78bfa" : "#7c3aed");
    const move = (event: React.PointerEvent<SVGElement>) => startDrawingDrag(event, drawing, "move");
    const start = (event: React.PointerEvent<SVGElement>) => startDrawingDrag(event, drawing, "start");
    const end = (event: React.PointerEvent<SVGElement>) => startDrawingDrag(event, drawing, "end");
    let shape: React.ReactNode;

    if (drawing.type === "horizontal") {
      shape = (
        <>
          <line x1="0" y1={drawing.y1} x2="100%" y2={drawing.y1} stroke={color} strokeWidth="1.5" strokeDasharray="6 4" />
          <line x1="0" y1={drawing.y1} x2="100%" y2={drawing.y1} stroke="transparent" strokeWidth="14" pointerEvents="stroke" className="cursor-move" onPointerDown={move} />
        </>
      );
    } else if (drawing.type === "vertical") {
      shape = (
        <>
          <line x1={drawing.x1} y1="0" x2={drawing.x1} y2="100%" stroke={color} strokeWidth="1.5" strokeDasharray="6 4" />
          <line x1={drawing.x1} y1="0" x2={drawing.x1} y2="100%" stroke="transparent" strokeWidth="14" pointerEvents="stroke" className="cursor-move" onPointerDown={move} />
        </>
      );
    } else if (drawing.type === "text") {
      shape = <text x={drawing.x1} y={drawing.y1} fill={color} fontSize="13" fontWeight="600" pointerEvents="all" className="cursor-move select-none" onPointerDown={move}>Note</text>;
    } else if (drawing.type === "emoji") {
      shape = <text x={drawing.x1} y={drawing.y1} fontSize="22" pointerEvents="all" className="cursor-move select-none" onPointerDown={move}>☺</text>;
    } else if (drawing.type === "fib") {
      const left = Math.min(drawing.x1, drawing.x2);
      const right = Math.max(drawing.x1, drawing.x2);
      const top = Math.min(drawing.y1, drawing.y2);
      const height = Math.max(12, Math.abs(drawing.y2 - drawing.y1));
      shape = (
        <>
          {[0, .236, .382, .5, .618, 1].map((ratio) => {
            const y = drawing.y1 + (drawing.y2 - drawing.y1) * ratio;
            return <g key={ratio}><line x1={left} y1={y} x2={right} y2={y} stroke={color} strokeWidth="1" opacity=".85" /><text x={left + 4} y={y - 3} fill={color} fontSize="9">{ratio}</text></g>;
          })}
          <rect x={left} y={top} width={Math.max(12, right - left)} height={height} fill="transparent" pointerEvents="all" className="cursor-move" onPointerDown={move} />
        </>
      );
    } else {
      shape = (
        <>
          <line x1={drawing.x1} y1={drawing.y1} x2={drawing.x2} y2={drawing.y2} stroke={color} strokeWidth={drawing.type === "brush" ? 3 : 1.7} strokeDasharray={drawing.type === "ruler" ? "4 3" : undefined} />
          <line x1={drawing.x1} y1={drawing.y1} x2={drawing.x2} y2={drawing.y2} stroke="transparent" strokeWidth="14" pointerEvents="stroke" className="cursor-move" onPointerDown={move} />
        </>
      );
    }

    return (
      <g key={drawing.id}>
        {shape}
        {selected ? (
          <>
            <circle cx={drawing.type === "horizontal" ? 22 : drawing.x1} cy={drawing.type === "vertical" ? 22 : drawing.y1} r="5" fill="#fff" stroke="#2962ff" strokeWidth="2" pointerEvents="all" className="cursor-grab" onPointerDown={start} />
            {!(["horizontal", "vertical", "text", "emoji"] as ChartDrawing["type"][]).includes(drawing.type) ? (
              <circle cx={drawing.x2} cy={drawing.y2} r="5" fill="#fff" stroke="#2962ff" strokeWidth="2" pointerEvents="all" className="cursor-grab" onPointerDown={end} />
            ) : null}
          </>
        ) : null}
      </g>
    );
  }

  return (
    <section ref={shellRef} id="execution-chart" dir="ltr" className="flex h-full min-h-[620px] scroll-mt-24 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
      <div className="flex min-h-11 items-end justify-between border-b border-slate-200 px-2 dark:border-slate-800">
        <div className="flex h-full items-end">
          {([
            ["chart", "Chart"],
            ["notes", labels.notes],
            ["pnl", labels.runningPnl],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setChartTab(id)} className={cn("h-11 border-x border-t px-5 text-sm font-semibold transition first:rounded-tl-lg last:rounded-tr-lg", chartTab === id ? "border-slate-200 bg-violet-50 text-violet-800 dark:border-slate-700 dark:bg-violet-500/10 dark:text-violet-200" : "border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800")}>
              {label}
            </button>
          ))}
        </div>
        <div className="hidden items-center gap-2 pb-2 text-[11px] font-medium text-slate-500 sm:flex dark:text-slate-400">
          <span className={cn("h-1.5 w-1.5 rounded-full", isLive ? "bg-emerald-500" : "bg-slate-400")} />
          {labels.autosaved}
          <ChevronDown className="h-3.5 w-3.5" />
        </div>
      </div>

      {chartTab === "chart" ? (
        <>
          <div className="flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center border-e border-slate-200 pe-2 dark:border-slate-700">
                {TIMEFRAMES.map((item) => (
                  <button key={item} type="button" onClick={() => setTimeframe(item)} className={cn("h-8 rounded px-2 text-xs font-bold", timeframe === item ? "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800")}>
                    {item === "M5" ? "5m" : item === "M15" ? "15m" : item === "H1" ? "1h" : item === "H4" ? "4h" : "1d"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setShowSma((value) => !value)} className={cn("hidden h-8 items-center gap-2 rounded px-2 text-sm font-semibold hover:bg-slate-100 sm:flex dark:hover:bg-slate-800", showSma ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200" : "text-slate-700 dark:text-slate-200")}>
                <Activity className="h-4 w-4" /> {labels.indicators}
              </button>
              <button type="button" className="hidden h-8 w-8 items-center justify-center rounded text-slate-600 hover:bg-slate-100 sm:flex dark:text-slate-300 dark:hover:bg-slate-800" title="Chart layout"><Grid2X2 className="h-4 w-4" /></button>
              {drawingToolsEnabled ? (
                <>
                  <button type="button" onClick={undoDrawing} disabled={!drawings.length} className="grid h-8 w-8 place-items-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800" title="Undo"><Undo2 className="h-4 w-4" /></button>
                  <button type="button" onClick={redoDrawing} disabled={!redoDrawings.length} className="grid h-8 w-8 place-items-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800" title="Redo"><Redo2 className="h-4 w-4" /></button>
                </>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setReloadKey((value) => value + 1)} disabled={loading} className="grid h-8 w-8 place-items-center rounded text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800" title={labels.retry}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></button>
              <button type="button" onClick={() => setGridVisible((value) => !value)} className={cn("grid h-8 w-8 place-items-center rounded hover:bg-slate-100 dark:hover:bg-slate-800", gridVisible ? "text-violet-600" : "text-slate-400")} title="Toggle grid"><Settings2 className="h-4 w-4" /></button>
              <button type="button" onClick={() => void toggleFullscreen()} className="grid h-8 w-8 place-items-center rounded text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Fullscreen"><Maximize2 className="h-4 w-4" /></button>
              <button type="button" onClick={downloadSnapshot} className="grid h-8 w-8 place-items-center rounded text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" title="Snapshot"><Camera className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/45 lg:grid-cols-4">
            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-blue-200 bg-white px-3 py-2 shadow-sm dark:border-blue-500/30 dark:bg-slate-900">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"><CircleDot className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-300">{labels.entry}</div>
                <div className="truncate text-sm font-black tabular-nums text-slate-950 dark:text-white" dir="ltr">{entryValue === null ? labels.notRecorded : displayNumber(entryValue)}</div>
              </div>
              <span className={cn("ms-auto rounded px-2 py-1 text-[10px] font-black", direction === "BUY" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300")}>{direction === "BUY" ? labels.buy : labels.sell}</span>
            </div>

            <div className={cn("flex min-w-0 items-center gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm dark:bg-slate-900", targetValue === null ? "border-dashed border-slate-300 dark:border-slate-700" : "border-emerald-200 dark:border-emerald-500/30")}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Target className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-300">{labels.target}</div>
                <div className={cn("truncate text-sm font-black tabular-nums", targetValue === null ? "text-slate-400" : "text-slate-950 dark:text-white")} dir="ltr">{targetValue === null ? labels.notRecorded : displayNumber(targetValue)}</div>
                {plannedRewardDistance !== null ? <div className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">{labels.plannedReward}: +{displayNumber(plannedRewardDistance)}</div> : null}
              </div>
            </div>

            <div className={cn("flex min-w-0 items-center gap-3 rounded-lg border bg-white px-3 py-2 shadow-sm dark:bg-slate-900", stopValue === null ? "border-dashed border-slate-300 dark:border-slate-700" : "border-rose-200 dark:border-rose-500/30")}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"><ShieldAlert className="h-4 w-4" /></span>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">{labels.stop}</div>
                <div className={cn("truncate text-sm font-black tabular-nums", stopValue === null ? "text-slate-400" : "text-slate-950 dark:text-white")} dir="ltr">{stopValue === null ? labels.notRecorded : displayNumber(stopValue)}</div>
                {plannedRiskDistance !== null ? <div className="text-[10px] font-medium text-rose-600 dark:text-rose-400">{labels.plannedRisk}: −{displayNumber(plannedRiskDistance)}</div> : null}
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3 rounded-lg border border-violet-200 bg-white px-3 py-2 shadow-sm dark:border-violet-500/30 dark:bg-slate-900">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300"><Ruler className="h-4 w-4" /></span>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">{labels.riskReward}</div>
                <div className="text-sm font-black tabular-nums text-slate-950 dark:text-white" dir="ltr">{calculatedRiskReward === null ? "—" : `1 : ${calculatedRiskReward.toFixed(2)}`}</div>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {drawingToolsEnabled ? <aside className="flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-e border-slate-200 bg-white py-2 dark:border-slate-800 dark:bg-[#0F172A]">
              {chartTools.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => { setActiveTool(id); setDrawingStart(null); }} aria-pressed={activeTool === id} title={label} className={cn("relative grid h-9 w-9 shrink-0 place-items-center rounded-md transition", activeTool === id ? "bg-slate-200 text-slate-950 dark:bg-slate-700 dark:text-white" : "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800")}>
                  <Icon className="h-[18px] w-[18px]" />
                  {!["cursor", "text", "emoji"].includes(id) ? <ChevronRight className="absolute end-0 h-2.5 w-2.5 text-slate-400" /> : null}
                </button>
              ))}
              <span className="my-1 h-px w-7 bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={zoomChart} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" title="Zoom in"><ZoomIn className="h-[18px] w-[18px]" /></button>
              <span className="my-1 h-px w-7 bg-slate-200 dark:bg-slate-700" />
              <button type="button" onClick={() => setMagnetActive((value) => !value)} className={cn("relative grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800", magnetActive ? "bg-slate-200 text-violet-700 dark:bg-slate-700 dark:text-violet-300" : "text-slate-800 dark:text-slate-200")} title="Magnet mode"><Magnet className="h-[18px] w-[18px]" /><ChevronRight className="absolute end-0 h-2.5 w-2.5 text-slate-400" /></button>
              <button type="button" onClick={() => setDrawingsLocked((value) => !value)} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800", drawingsLocked ? "bg-slate-200 text-violet-700 dark:bg-slate-700 dark:text-violet-300" : "text-slate-800 dark:text-slate-200")} title="Lock drawings"><Lock className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={() => { setActiveTool("cursor"); setDrawingsLocked(false); }} className="relative grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800" title="Edit drawings"><Pencil className="h-[18px] w-[18px]" /><span className="absolute bottom-1 end-1 h-1.5 w-1.5 rounded-full bg-violet-500" /></button>
              <button type="button" onClick={() => setDrawingsVisible((value) => !value)} className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-800", drawingsVisible ? "text-slate-800 dark:text-slate-200" : "bg-slate-200 text-violet-700 dark:bg-slate-700 dark:text-violet-300")} title="Hide drawings"><EyeOff className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={deleteSelectedDrawing} disabled={!selectedDrawingId} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-800 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-slate-200 dark:hover:bg-red-500/10" title="Delete selected drawing"><Trash2 className="h-[18px] w-[18px]" /></button>
              <button type="button" onClick={clearDrawings} disabled={!drawings.length} className="mb-1 shrink-0 rounded px-1.5 py-1 text-[9px] font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:text-slate-400" title="Remove all drawings">CLEAR</button>
            </aside> : null}

            <div className="relative min-h-[500px] flex-1 bg-white dark:bg-[#0b1220]">
              <div className="pointer-events-none absolute start-3 top-3 z-10 rounded-md bg-white/85 px-2 py-1.5 text-xs shadow-sm backdrop-blur dark:bg-[#0b1220]/80">
                <div className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
                  {symbol} · {timeframe}
                  <span className="h-2 w-2 rounded-full bg-teal-500" />
                  {lastCandle ? <span className="hidden font-normal text-teal-600 md:inline">O {displayNumber(lastCandle.open)} H {displayNumber(lastCandle.high)} L {displayNumber(lastCandle.low)} C {displayNumber(lastCandle.close)}</span> : null}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Volume</div>
              </div>
              <div ref={containerRef} className="absolute inset-0" />
              {tradeOverlay ? (
                <div className="pointer-events-none absolute inset-y-0 start-0 end-[64px] z-[7] overflow-hidden">
                  {rewardZone ? (
                    <div className="absolute inset-x-0 border-y border-emerald-500/35 bg-gradient-to-b from-emerald-400/12 to-emerald-500/5 dark:from-emerald-400/10 dark:to-emerald-500/5" style={{ top: rewardZone.top, height: rewardZone.height }}>
                      {rewardZone.height > 36 ? <span className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-emerald-600/85 px-2 py-1 text-[9px] font-black tracking-widest text-white shadow-sm">{labels.rewardZone}</span> : null}
                    </div>
                  ) : null}
                  {riskZone ? (
                    <div className="absolute inset-x-0 border-y border-rose-500/35 bg-gradient-to-b from-rose-400/10 to-rose-500/16 dark:from-rose-400/6 dark:to-rose-500/12" style={{ top: riskZone.top, height: riskZone.height }}>
                      {riskZone.height > 36 ? <span className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-rose-600/85 px-2 py-1 text-[9px] font-black tracking-widest text-white shadow-sm">{labels.riskZone}</span> : null}
                    </div>
                  ) : null}
                  {tradeOverlay.targetY !== null ? <div className="absolute end-3 -translate-y-1/2 rounded-md border border-emerald-300 bg-emerald-600 px-2.5 py-1 text-[10px] font-black text-white shadow-lg" style={{ top: tradeOverlay.targetY }} dir="ltr">TP&nbsp; {displayNumber(targetValue)}</div> : null}
                  <div className="absolute start-3 -translate-y-1/2 rounded-md border border-blue-300 bg-blue-600 px-2.5 py-1 text-[10px] font-black text-white shadow-lg" style={{ top: tradeOverlay.entryY }} dir="ltr">ENTRY&nbsp; {displayNumber(entryValue)}</div>
                  {tradeOverlay.stopY !== null ? <div className="absolute end-3 -translate-y-1/2 rounded-md border border-rose-300 bg-rose-600 px-2.5 py-1 text-[10px] font-black text-white shadow-lg" style={{ top: tradeOverlay.stopY }} dir="ltr">SL&nbsp; {displayNumber(stopValue)}</div> : null}
                </div>
              ) : null}
              {drawingToolsEnabled ? (
                <>
                  <svg className="pointer-events-none absolute inset-0 z-[12] h-full w-full overflow-visible">
                    {drawingsVisible ? drawings.map(renderDrawing) : null}
                  </svg>
                  {selectedDrawingId && drawingsVisible ? (
                    <div className="absolute end-3 top-14 z-[14] flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 p-1.5 text-[11px] font-semibold text-slate-700 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
                      <Pencil className="h-3.5 w-3.5 text-[#2962ff]" />
                      <span>Drag the blue handles to edit</span>
                      <button type="button" onClick={deleteSelectedDrawing} className="grid h-7 w-7 place-items-center rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10" title="Delete selected"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : null}
                  {activeTool !== "cursor" && !drawingsLocked ? <div onClick={addDrawing} className="absolute inset-0 z-[13] cursor-crosshair" title={drawingStart ? "Click to finish drawing" : "Click to start drawing"} /> : null}
                </>
              ) : null}
              {loading ? <div className="absolute inset-0 z-20 grid place-items-center bg-white/70 backdrop-blur-sm dark:bg-[#0b1220]/70"><div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-300"><RefreshCw className="h-4 w-4 animate-spin text-violet-500" />{labels.loading}</div></div> : null}
              {!loading && error ? <div className="absolute inset-0 z-20 grid place-items-center p-6"><div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-500/30 dark:bg-amber-500/10"><AlertCircle className="mx-auto h-6 w-6 text-amber-500" /><p className="mt-2 text-sm font-semibold text-amber-800 dark:text-amber-200">{labels.unavailable}</p><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-amber-500 px-3 text-xs font-bold text-white"><RefreshCw className="h-3.5 w-3.5" />{labels.retry}</button></div></div> : null}
            </div>
          </div>

          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 dark:border-slate-800">
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>5y</span><span>1y</span><span>3m</span><span>1m</span><span>5d</span><span>1d</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">{new Date().toLocaleTimeString("en-GB", { hour12: false })}</span>
              <Percent className="h-3.5 w-3.5" /><span>log</span><button type="button" onClick={fitTradeLevels} className="rounded bg-slate-100 px-2 py-1 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700" title={language === "fa" ? "نمایش همه سطوح معامله" : "Fit all trade levels"}>fit</button>
            </div>
          </div>
        </>
      ) : chartTab === "notes" ? (
        <div className="flex min-h-[580px] flex-col bg-white dark:bg-[#0b1220]">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-slate-950 dark:text-white">{labels.notes}</h3>
              <Info className="h-4 w-4 text-slate-400" />
            </div>
            <button type="button" onClick={() => void saveActiveNote()} disabled={noteSaving || (noteMode === "daily" && !dailyNoteLoaded)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50">
              {noteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : noteSaved ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {noteSaving ? noteLabels.saving : noteSaved ? noteLabels.saved : noteLabels.save}
            </button>
          </div>

          <div className="px-5 pt-2">
            <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setNoteMode("trade")} className={cn("inline-flex h-9 items-center gap-2 px-4 text-xs font-semibold", noteMode === "trade" ? "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200" : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
                <BarChart3 className="h-3.5 w-3.5" />{noteLabels.tradeNote}
              </button>
              <button type="button" onClick={() => setNoteMode("daily")} className={cn("inline-flex h-9 items-center gap-2 border-s border-slate-200 px-4 text-xs font-semibold dark:border-slate-700", noteMode === "daily" ? "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200" : "bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
                <CalendarDays className="h-3.5 w-3.5" />{noteLabels.dailyJournal}
              </button>
            </div>
          </div>

          <div className="mt-3 border-y border-slate-200 px-5 py-3 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="me-1 text-sm text-slate-500 dark:text-slate-400">{noteLabels.recentlyUsed}</span>
              {noteTemplates.map((template) => (
                <button key={template.id} type="button" onClick={() => insertNoteText(template.content)} className="h-8 max-w-40 truncate rounded-full border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 hover:bg-violet-100 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">{template.name}</button>
              ))}
              <button type="button" onClick={() => setShowTemplateForm((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-200 px-3 text-sm font-medium text-violet-700 hover:bg-violet-50 dark:border-slate-700 dark:text-violet-300 dark:hover:bg-violet-500/10">
                <Plus className="h-4 w-4" />{noteLabels.addTemplate}
              </button>
            </div>
            {showTemplateForm ? (
              <div className="mt-3 grid gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-3 dark:border-violet-500/25 dark:bg-violet-500/10 sm:grid-cols-[160px_1fr_auto]">
                <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder={noteLabels.templateName} className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900" />
                <input value={templateContent} onChange={(event) => setTemplateContent(event.target.value)} placeholder={noteLabels.templateContent} className="h-9 min-w-0 rounded-md border border-slate-200 bg-white px-3 text-xs outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-900" />
                <div className="flex gap-2">
                  <button type="button" onClick={saveTemplate} className="h-9 rounded-md bg-violet-600 px-3 text-xs font-semibold text-white">{noteLabels.createTemplate}</button>
                  <button type="button" onClick={() => setShowTemplateForm(false)} className="h-9 rounded-md border border-slate-200 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">{noteLabels.cancel}</button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-12 items-center gap-1 overflow-x-auto border-b border-slate-200 px-5 py-2 dark:border-slate-800">
            <button type="button" onClick={startVoiceTyping} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-violet-600 dark:hover:bg-slate-800" title="Voice typing"><Mic className="h-4 w-4" /></button>
            <span className="mx-1 h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
            <select aria-label="Text style" defaultValue="normal" onChange={(event) => { if (event.target.value === "heading") insertNoteText("## "); else if (event.target.value === "quote") insertNoteText("> "); }} className="h-9 shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <option value="normal">Aa</option><option value="heading">Heading</option><option value="quote">Quote</option>
            </select>
            <label className="relative shrink-0"><Type className="pointer-events-none absolute start-2 top-2.5 h-4 w-4 text-slate-500" /><select value={noteFont} onChange={(event) => setNoteFont(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-slate-50 ps-7 pe-2 text-xs text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"><option>Arial</option><option>Inter</option><option>Georgia</option><option>Tahoma</option><option>Courier New</option></select></label>
            <button type="button" onClick={() => setNoteFontSize((value) => Math.max(10, value - 1))} className="grid h-9 w-8 shrink-0 place-items-center text-slate-500">−</button>
            <div className="grid h-9 w-10 shrink-0 place-items-center rounded-md border border-slate-200 text-xs font-semibold dark:border-slate-700">{noteFontSize}</div>
            <button type="button" onClick={() => setNoteFontSize((value) => Math.min(28, value + 1))} className="grid h-9 w-8 shrink-0 place-items-center text-slate-500"><Plus className="h-4 w-4" /></button>
            <span className="mx-1 h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
            <button type="button" onClick={() => replaceNoteSelection("**")} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-700 hover:bg-violet-100 hover:text-violet-700 dark:bg-slate-800 dark:text-slate-200" title="Bold"><Bold className="h-4 w-4" /></button>
            <button type="button" onClick={addNoteLink} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Link"><LinkIcon className="h-4 w-4" /></button>
            <button type="button" onClick={() => replaceNoteSelection("~~")} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Strikethrough"><Strikethrough className="h-4 w-4" /></button>
            <span className="mx-1 h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
            <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Text color"><Pilcrow className="h-4 w-4" style={{ color: noteColor }} /><input type="color" value={noteColor} onChange={(event) => setNoteColor(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
            <label className="relative grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Highlight"><PaintBucket className="h-4 w-4" /><input type="color" value={noteHighlight} onChange={(event) => setNoteHighlight(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" /></label>
            <button type="button" onClick={() => setNoteAlign((value) => value === "left" ? "center" : value === "center" ? "right" : "left")} className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600 hover:bg-violet-100 dark:bg-slate-800" title="Alignment"><AlignLeft className={cn("h-4 w-4", noteAlign === "center" && "rotate-90", noteAlign === "right" && "rotate-180")} /></button>
            <button type="button" onClick={() => insertNoteText("- ")} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Add list"><Plus className="h-4 w-4" /></button>
            <span className="ms-auto h-7 w-px shrink-0 bg-slate-200 dark:bg-slate-700" />
            <button type="button" onClick={() => { noteEditorRef.current?.focus(); document.execCommand("undo"); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Undo"><Undo2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => { noteEditorRef.current?.focus(); document.execCommand("redo"); }} className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" title="Redo"><Redo2 className="h-4 w-4" /></button>
          </div>

          <div className="relative min-h-0 flex-1">
            <textarea ref={noteEditorRef} value={activeNote} onChange={(event) => updateActiveNote(event.target.value)} placeholder={noteLabels.placeholder} dir={language === "fa" ? "rtl" : "ltr"} className="absolute inset-0 h-full min-h-[300px] w-full resize-none border-0 bg-transparent px-12 py-7 leading-7 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" style={{ fontFamily: noteFont, fontSize: noteFontSize, textAlign: noteAlign, color: noteColor, backgroundColor: noteHighlight === "#ffffff" ? undefined : noteHighlight }} />
            {noteMode === "daily" && !dailyNoteLoaded ? <div className="absolute inset-0 grid place-items-center bg-white/75 dark:bg-[#0b1220]/75"><Loader2 className="h-5 w-5 animate-spin text-violet-500" /></div> : null}
          </div>
          {noteError ? <div className="border-t border-red-200 bg-red-50 px-5 py-2 text-xs font-semibold text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{noteError}</div> : null}
        </div>
      ) : (
        <div className="grid min-h-[580px] place-items-center p-8"><div className="w-full max-w-3xl"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><div className="text-xs text-slate-500">{labels.netResult}</div><div className={cn("mt-2 text-2xl font-bold", (pnl || 0) >= 0 ? "text-emerald-600" : "text-red-500")}>{displaySignedNumber(profitLoss)}</div></div><div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><div className="text-xs text-slate-500">{labels.commission}</div><div className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{displayNumber(commission ?? null, 2)}</div></div><div className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"><div className="text-xs text-slate-500">{labels.swap}</div><div className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{displayNumber(swap ?? null, 2)}</div></div></div><div className="mt-6 h-44 rounded-xl border border-slate-200 bg-gradient-to-b from-violet-100/80 to-transparent p-5 dark:border-slate-800 dark:from-violet-500/10"><div className="flex h-full items-end"><div className="h-px w-full bg-gradient-to-r from-transparent via-violet-500 to-transparent" /></div></div></div></div>
      )}
    </section>
  );
}
