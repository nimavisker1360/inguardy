"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Crosshair,
  Database,
  Loader2,
  LockKeyhole,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  StepForward,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ReplayChart, type ReplayCandle } from "@/components/backtest/ReplayChart";
import {
  currentPositionR,
  evaluatePositionOnCandle,
  positionLevelsAreValid,
  positionRiskReward,
  type BacktestDirection,
  type BacktestPriceLevel,
  type SimulatedPosition,
} from "@/lib/backtest-simulation";
import { useLanguage } from "@/lib/language-context";
import { calculatePositionSize } from "@/lib/position-sizing";
import { cn } from "@/lib/utils";

type PlaybookOption = {
  id: string;
  name: string;
};

export type BacktestAccountOption = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
  accountType: string | null;
  currency: string;
  balance: number | null;
  equity: number | null;
  margin: number | null;
  freeMargin: number | null;
  marginLevel: number | null;
  snapshotAt: string | null;
  symbols: Array<{
    symbol: string;
    tickSize: number | null;
    tickValue: number | null;
    volumeMin: number | null;
    volumeMax: number | null;
    volumeStep: number | null;
  }>;
};

type ReplayResponse = {
  ok?: boolean;
  message?: string;
  symbol?: string;
  timeframe?: string;
  endDate?: string;
  candles?: ReplayCandle[];
  replayStartIndex?: number;
  replayCandleCount?: number;
};

type BacktestSummary = {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netR: number;
  netProfitLoss: number;
};

type StoredBacktestSession = {
  id: string;
  accountId: string | null;
  playbookId: string | null;
  symbol: string;
  timeframe: string;
  endDate: string;
  historySize: number;
  speed: number;
  currentCandleTime: string | null;
  activePosition: SimulatedPosition | null;
  summary: BacktestSummary;
};

type BacktestSessionResponse = {
  ok?: boolean;
  message?: string;
  session?: StoredBacktestSession | null;
};

const EMPTY_BACKTEST_SUMMARY: BacktestSummary = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  winRate: 0,
  netR: 0,
  netProfitLoss: 0,
};

const SYMBOLS = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NAS100", "US30", "BTCUSD", "ETHUSD"];
const TIMEFRAMES = ["M5", "M15", "H1", "H4", "D1"];
const INITIAL_VISIBLE_MINIMUM = 80;
const HIDDEN_REPLAY_CANDLES: Record<string, number> = {
  M5: 72,
  M15: 40,
  H1: 16,
  H4: 8,
  D1: 10,
};

const copy = {
  en: {
    eyebrow: "Backtest workspace",
    title: "Market Replay",
    description: "Practice a playbook candle by candle without seeing future price action.",
    protected: "Future candles stay hidden",
    setup: "Replay setup",
    account: "Trading account",
    noAccount: "No dashboard account",
    accountType: "Account type",
    balance: "Balance",
    equity: "Equity",
    margin: "Used margin",
    freeMargin: "Free margin",
    marginLevel: "Margin level",
    simulatedEquity: "Replay equity",
    symbol: "Symbol",
    timeframe: "Timeframe",
    endDate: "Replay ending date",
    playbook: "Playbook",
    noPlaybook: "No playbook selected",
    history: "History size",
    load: "Load replay",
    loading: "Loading historical candles...",
    loadError: "Historical data could not be loaded.",
    chartLoading: "Preparing replay chart...",
    empty: "Choose the replay settings and load historical candles to begin.",
    play: "Play",
    pause: "Pause",
    next: "Next candle",
    reset: "Restart",
    speed: "Speed",
    candle: "Candle",
    of: "of",
    hidden: "candles still hidden",
    finished: "Replay finished",
    ready: "Replay ready",
    currentCandle: "Current candle",
    noData: "No replay loaded",
    positionTools: "Position tools",
    positionHint: "Create a long or short setup, then drag Entry, SL, and TP directly on the chart.",
    longPosition: "Long position",
    shortPosition: "Short position",
    clearPosition: "Clear",
    entry: "Entry",
    stopLoss: "Stop loss",
    takeProfit: "Take profit",
    riskAmount: "Risk amount",
    riskReward: "Risk / reward",
    liveResult: "Live result",
    placeOrder: "Place simulated order",
    draft: "Fix the Entry, Stop Loss, and Take Profit order to activate the position.",
    pending: "Pending — waiting for price to touch Entry.",
    open: "Position open — reveal the next candle to continue.",
    won: "Take profit reached",
    lost: "Stop loss reached",
    trades: "Trades",
    winRate: "Win rate",
    netPnl: "Net P/L",
    totalR: "Total R",
    sessionSaved: "Session saved automatically",
    sessionSaving: "Saving session...",
    sessionRestoring: "Restoring last session...",
    sessionSaveError: "Session could not be saved",
    invalidLevels: "For Long use SL < Entry < TP; for Short use TP < Entry < SL.",
    noRealOrder: "Simulation only — no real order is sent",
    phaseNote: "This replay session, its positions, and its results are saved automatically.",
  },
  fa: {
    account: "حساب معاملاتی",
    noAccount: "حسابی در داشبورد وجود ندارد",
    accountType: "نوع حساب",
    balance: "بالانس",
    equity: "اکویتی",
    margin: "مارجین مصرف‌شده",
    freeMargin: "مارجین آزاد",
    marginLevel: "سطح مارجین",
    simulatedEquity: "اکویتی بک‌تست",
    eyebrow: "فضای بک‌تست",
    title: "بازپخش بازار",
    description: "استراتژی و پلی‌بوک خود را کندل‌به‌کندل و بدون دیدن آینده بازار تمرین کنید.",
    protected: "کندل‌های آینده مخفی می‌مانند",
    setup: "تنظیمات بازپخش",
    symbol: "نماد",
    timeframe: "تایم‌فریم",
    endDate: "تاریخ پایان بازپخش",
    playbook: "پلی‌بوک",
    noPlaybook: "بدون پلی‌بوک",
    history: "تعداد کندل تاریخی",
    load: "بارگذاری بازپخش",
    loading: "در حال دریافت کندل‌های تاریخی...",
    loadError: "داده تاریخی بازار دریافت نشد.",
    chartLoading: "در حال آماده‌سازی چارت بازپخش...",
    empty: "تنظیمات را انتخاب و داده تاریخی را بارگذاری کنید.",
    play: "پخش",
    pause: "توقف",
    next: "کندل بعدی",
    reset: "شروع مجدد",
    speed: "سرعت",
    candle: "کندل",
    of: "از",
    hidden: "کندل آینده هنوز مخفی است",
    finished: "بازپخش تمام شد",
    ready: "آماده بازپخش",
    currentCandle: "کندل فعلی",
    noData: "هنوز بازپخش بارگذاری نشده",
    positionTools: "ابزار پوزیشن",
    positionHint: "یک پوزیشن خرید یا فروش بسازید و خطوط Entry، SL و TP را مستقیم روی چارت جابه‌جا کنید.",
    longPosition: "پوزیشن خرید",
    shortPosition: "پوزیشن فروش",
    clearPosition: "پاک کردن",
    entry: "ورود",
    stopLoss: "حد ضرر",
    takeProfit: "حد سود",
    riskAmount: "مبلغ ریسک",
    riskReward: "ریسک به ریوارد",
    liveResult: "نتیجه لحظه‌ای",
    placeOrder: "ثبت معامله آزمایشی",
    draft: "ترتیب ورود، حد ضرر و حد سود را اصلاح کنید تا پوزیشن فعال شود.",
    pending: "در انتظار رسیدن قیمت به Entry",
    open: "پوزیشن باز است؛ برای ادامه کندل بعدی را نمایش دهید.",
    won: "حد سود لمس شد",
    lost: "حد ضرر لمس شد",
    trades: "معامله‌ها",
    winRate: "نرخ برد",
    netPnl: "سود/زیان خالص",
    totalR: "مجموع R",
    sessionSaved: "جلسه به‌صورت خودکار ذخیره شد",
    sessionSaving: "در حال ذخیره جلسه...",
    sessionRestoring: "در حال بازیابی آخرین جلسه...",
    sessionSaveError: "ذخیره جلسه انجام نشد",
    invalidLevels: "برای خرید SL < Entry < TP و برای فروش TP < Entry < SL باشد.",
    noRealOrder: "فقط شبیه‌سازی — هیچ سفارش واقعی ارسال نمی‌شود",
    phaseNote: "جلسه بک‌تست، پوزیشن‌ها و نتایج آن به‌صورت خودکار ذخیره می‌شوند.",
  },
} as const;

function yesterdayUtc() {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function formatCandleTime(value: string | undefined, language: "en" | "fa") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function symbolDigits(symbol: string) {
  if (symbol.endsWith("JPY")) return 3;
  if (["XAUUSD", "BTCUSD", "ETHUSD"].includes(symbol)) return 2;
  if (["NAS100", "US30"].includes(symbol)) return 1;
  return 5;
}

function normalizeLevel(value: number, symbol: string) {
  return Number(value.toFixed(symbolDigits(symbol)));
}

function initialStopDistance(candles: ReplayCandle[]) {
  const current = candles.at(-1);
  if (!current) return 0;
  const recent = candles.slice(-14);
  const averageRange = recent.reduce((sum, candle) => sum + Math.abs(candle.high - candle.low), 0) / Math.max(recent.length, 1);
  return Math.max(averageRange * 1.5, current.close * 0.0005);
}

function resultLabel(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}R`;
}

function formatAccountNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits });
}

function initialVisibleCount(total: number, timeframe: string) {
  if (total <= INITIAL_VISIBLE_MINIMUM) return total;
  const hidden = HIDDEN_REPLAY_CANDLES[timeframe] ?? 40;
  return Math.max(INITIAL_VISIBLE_MINIMUM, total - Math.min(hidden, total - INITIAL_VISIBLE_MINIMUM));
}

function candleIndexAtOrBefore(candles: ReplayCandle[], time: string | undefined) {
  if (!time) return -1;
  const target = Date.parse(time);
  if (!Number.isFinite(target)) return -1;

  let match = -1;
  for (let index = 0; index < candles.length; index += 1) {
    if (Date.parse(candles[index].time) <= target) match = index;
    else break;
  }
  return match;
}

function remapPositionToTimeframe(
  position: SimulatedPosition,
  previousCandles: ReplayCandle[],
  nextCandles: ReplayCandle[],
  nextVisibleCount: number
) {
  const remapIndex = (index: number | undefined) => {
    if (index === undefined) return undefined;
    const mapped = candleIndexAtOrBefore(nextCandles, previousCandles[index]?.time);
    return mapped >= 0 ? mapped : 0;
  };
  const currentIndex = Math.max(nextVisibleCount - 1, 0);

  return {
    ...position,
    placedAtIndex: remapIndex(position.placedAtIndex) ?? currentIndex,
    lastEvaluatedIndex: ["OPEN", "PENDING"].includes(position.status)
      ? currentIndex
      : remapIndex(position.lastEvaluatedIndex) ?? currentIndex,
    openedAtIndex: remapIndex(position.openedAtIndex),
    closedAtIndex: remapIndex(position.closedAtIndex),
  };
}

const inputClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function BacktestReplayWorkspace({
  playbooks,
  accounts,
}: {
  playbooks: PlaybookOption[];
  accounts: BacktestAccountOption[];
}) {
  const { language } = useLanguage();
  const t = copy[language];
  const [symbol, setSymbol] = useState("XAUUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [endDate, setEndDate] = useState(yesterdayUtc);
  const [playbookId, setPlaybookId] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [historySize, setHistorySize] = useState("500");
  const [candles, setCandles] = useState<ReplayCandle[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const [replayStartIndex, setReplayStartIndex] = useState(0);
  const [speed, setSpeed] = useState(700);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSymbol, setActiveSymbol] = useState("XAUUSD");
  const [activeTimeframe, setActiveTimeframe] = useState("M15");
  const [position, setPosition] = useState<SimulatedPosition | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionSummary, setSessionSummary] = useState<BacktestSummary>(EMPTY_BACKTEST_SUMMARY);
  const [sessionState, setSessionState] = useState<"idle" | "restoring" | "saving" | "saved" | "error">("idle");
  const loadRequestIdRef = useRef(0);
  const restoreStartedRef = useRef(false);
  const activeSessionIdRef = useRef<string | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const latestSessionSaveRef = useRef<() => void>(() => undefined);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accountId, accounts]
  );
  const visibleCandles = useMemo(() => candles.slice(0, visibleCount), [candles, visibleCount]);
  const currentCandle = visibleCandles.at(-1);
  const replayFinished = Boolean(candles.length && visibleCount >= candles.length);
  const replayCandleCount = Math.max(candles.length - replayStartIndex, 0);
  const revealedReplayCount = Math.max(Math.min(visibleCount - replayStartIndex, replayCandleCount), 0);
  const hiddenCount = Math.max(replayCandleCount - revealedReplayCount, 0);
  const progress = replayCandleCount ? Math.min((revealedReplayCount / replayCandleCount) * 100, 100) : 0;
  const levelsValid = position ? positionLevelsAreValid(position) : false;
  const positionHasAdvanced = position ? position.lastEvaluatedIndex > position.placedAtIndex : false;
  const riskReward = position ? positionRiskReward(position) : 0;
  const liveR = position
    ? position.resultR ?? (position.status === "OPEN" && currentCandle ? currentPositionR(position, currentCandle.close) : 0)
    : 0;
  const liveAmount = position ? liveR * position.riskAmount : 0;
  const accountEquity = selectedAccount?.equity ?? selectedAccount?.balance ?? null;
  const replayEquity = accountEquity === null ? null : accountEquity + liveAmount;
  const replayFreeMargin = selectedAccount?.freeMargin === null || selectedAccount?.freeMargin === undefined
    ? null
    : selectedAccount.freeMargin + liveAmount;

  const sessionStatusText = sessionState === "restoring"
    ? t.sessionRestoring
    : sessionState === "saving"
      ? t.sessionSaving
      : sessionState === "error"
        ? t.sessionSaveError
        : sessionId
          ? t.sessionSaved
          : t.protected;

  function positionPersistencePayload(snapshot: SimulatedPosition) {
    const openedAt = snapshot.openedAtIndex === undefined ? null : candles[snapshot.openedAtIndex]?.time ?? null;
    const closedAt = snapshot.closedAtIndex === undefined ? null : candles[snapshot.closedAtIndex]?.time ?? null;
    const specification = selectedAccount?.symbols.find(
      (item) => item.symbol.toUpperCase() === activeSymbol.toUpperCase()
    );
    const sizing = specification?.tickSize && specification.tickValue && accountEquity
      ? calculatePositionSize({
          balance: accountEquity,
          riskMode: "AMOUNT",
          riskValue: snapshot.riskAmount,
          direction: snapshot.direction === "LONG" ? "BUY" : "SELL",
          entryPrice: snapshot.entry,
          stopLoss: snapshot.stopLoss,
          riskReward: positionRiskReward(snapshot),
          tickSize: specification.tickSize,
          tickValue: specification.tickValue,
          minVolume: specification.volumeMin,
          maxVolume: specification.volumeMax,
          volumeStep: specification.volumeStep,
        })
      : null;

    return {
      ...snapshot,
      riskReward: positionRiskReward(snapshot),
      profitLoss: snapshot.resultR === undefined ? undefined : snapshot.resultR * snapshot.riskAmount,
      volume: sizing?.valid && sizing.lotSize > 0 ? sizing.lotSize : null,
      openedAt,
      closedAt,
    };
  }

  function queueSessionSave(targetSessionId: string, snapshot: SimulatedPosition | null = position) {
    const isClosed = snapshot?.status === "WON" || snapshot?.status === "LOST";
    const payload = {
      accountId: accountId || null,
      playbookId: playbookId || null,
      symbol: activeSymbol,
      timeframe: activeTimeframe,
      endDate,
      historySize: Number(historySize),
      speed,
      currentCandleTime: currentCandle?.time ?? null,
      activePosition: snapshot && !isClosed ? snapshot : null,
      ...(snapshot ? { trade: positionPersistencePayload(snapshot) } : {}),
    };

    setSessionState("saving");
    const request = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const response = await fetch(`/api/backtest/sessions/${targetSessionId}`, {
          method: "PATCH",
          credentials: "include",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json().catch(() => null)) as BacktestSessionResponse | null;
        if (!response.ok || !data?.ok || !data.session) {
          throw new Error(data?.message || t.sessionSaveError);
        }

        if (activeSessionIdRef.current === targetSessionId) {
          setSessionSummary(data.session.summary);
          setSessionState("saved");
        }
      })
      .catch(() => {
        if (activeSessionIdRef.current === targetSessionId) setSessionState("error");
      });

    saveQueueRef.current = request;
    return request;
  }

  latestSessionSaveRef.current = () => {
    if (sessionId) void queueSessionSave(sessionId, position);
  };

  async function createStoredSession({
    nextSymbol,
    nextTimeframe,
    nextEndDate,
    nextHistorySize,
    nextSpeed,
    currentTime,
  }: {
    nextSymbol: string;
    nextTimeframe: string;
    nextEndDate: string;
    nextHistorySize: string;
    nextSpeed: number;
    currentTime: string | null;
  }) {
    setSessionState("saving");
    const response = await fetch("/api/backtest/sessions", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: accountId || null,
        playbookId: playbookId || null,
        symbol: nextSymbol,
        timeframe: nextTimeframe,
        endDate: nextEndDate,
        historySize: Number(nextHistorySize),
        speed: nextSpeed,
        currentCandleTime: currentTime,
      }),
    });
    const data = (await response.json().catch(() => null)) as BacktestSessionResponse | null;
    if (!response.ok || !data?.ok || !data.session) {
      setSessionState("error");
      throw new Error(data?.message || t.sessionSaveError);
    }

    activeSessionIdRef.current = data.session.id;
    setSessionId(data.session.id);
    setSessionSummary(data.session.summary);
    setSessionState("saved");
    return data.session;
  }

  useEffect(() => {
    if (!playing || replayFinished || !candles.length) return;
    const timer = window.setInterval(() => {
      setVisibleCount((count) => Math.min(count + 1, candles.length));
    }, speed);
    return () => window.clearInterval(timer);
  }, [candles.length, playing, replayFinished, speed]);

  useEffect(() => {
    if (replayFinished && playing) setPlaying(false);
  }, [playing, replayFinished]);

  useEffect(() => {
    if (!position || !["PENDING", "OPEN"].includes(position.status)) return;
    const candleIndex = visibleCount - 1;
    const candle = candles[candleIndex];
    if (!candle || candleIndex <= position.lastEvaluatedIndex) return;

    const next = evaluatePositionOnCandle(position, candle, candleIndex);
    if (next === position) return;
    setPosition(next);
    if (next.status === "WON" || next.status === "LOST") setPlaying(false);
  }, [candles, playing, position, visibleCount]);

  async function requestReplay({
    nextSymbol = symbol,
    nextTimeframe = timeframe,
    nextEndDate = endDate,
    nextHistorySize = historySize,
    preserveState = false,
    restoredSession = null,
    startNewSession = false,
  }: {
    nextSymbol?: string;
    nextTimeframe?: string;
    nextEndDate?: string;
    nextHistorySize?: string;
    preserveState?: boolean;
    restoredSession?: StoredBacktestSession | null;
    startNewSession?: boolean;
  } = {}) {
    const requestId = ++loadRequestIdRef.current;
    const previousTime = restoredSession?.currentCandleTime ?? (preserveState ? currentCandle?.time : undefined);
    const previousPosition = restoredSession?.activePosition ?? (preserveState ? position : null);
    const previousCandles = candles;
    const previousReplayCount = Math.max(candles.length - replayStartIndex, 0);
    const previousProgress = previousReplayCount
      ? Math.max(Math.min((visibleCount - replayStartIndex) / previousReplayCount, 1), 0)
      : 0;
    const resumePlaying = preserveState && playing;

    setPlaying(false);
    setLoading(true);
    setError("");
    if (startNewSession) {
      activeSessionIdRef.current = null;
      setSessionId(null);
      setSessionSummary(EMPTY_BACKTEST_SUMMARY);
    }

    try {
      const params = new URLSearchParams({
        symbol: nextSymbol,
        timeframe: nextTimeframe,
        endDate: nextEndDate,
        limit: nextHistorySize,
      });
      const response = await fetch(`/api/backtest/candles?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as ReplayResponse | null;

      if (!response.ok || !data?.ok || !data.candles?.length) {
        throw new Error(data?.message || t.loadError);
      }
      if (requestId !== loadRequestIdRef.current) return;

      const nextReplayStartIndex = Number.isInteger(data.replayStartIndex)
        ? Math.max(1, Math.min(data.replayStartIndex as number, data.candles.length))
        : initialVisibleCount(data.candles.length, data.timeframe || nextTimeframe);
      const nextReplayCount = Math.max(data.candles.length - nextReplayStartIndex, 0);
      let nextVisibleCount = nextReplayStartIndex;
      if (preserveState || restoredSession) {
        const matchingIndex = candleIndexAtOrBefore(data.candles, previousTime);
        nextVisibleCount = matchingIndex >= 0
          ? Math.max(nextReplayStartIndex, Math.min(matchingIndex + 1, data.candles.length))
          : Math.max(
              nextReplayStartIndex,
              Math.min(nextReplayStartIndex + Math.round(nextReplayCount * previousProgress), data.candles.length)
            );
      }

      setCandles(data.candles);
      setReplayStartIndex(nextReplayStartIndex);
      setVisibleCount(nextVisibleCount);
      setActiveSymbol(data.symbol || nextSymbol);
      setActiveTimeframe(data.timeframe || nextTimeframe);
      if (previousPosition) {
        const restoredPosition = restoredSession
          ? {
              ...previousPosition,
              placedAtIndex: Math.min(previousPosition.placedAtIndex, Math.max(nextVisibleCount - 1, 0)),
              lastEvaluatedIndex: Math.max(nextVisibleCount - 1, 0),
            }
          : remapPositionToTimeframe(previousPosition, previousCandles, data.candles, nextVisibleCount);
        setPosition(restoredPosition);
      } else {
        setPosition(null);
      }

      if (restoredSession) {
        activeSessionIdRef.current = restoredSession.id;
        setSessionId(restoredSession.id);
        setSessionSummary(restoredSession.summary);
        setSessionState("saved");
      } else if (startNewSession) {
        await createStoredSession({
          nextSymbol: data.symbol || nextSymbol,
          nextTimeframe: data.timeframe || nextTimeframe,
          nextEndDate,
          nextHistorySize,
          nextSpeed: speed,
          currentTime: data.candles[nextVisibleCount - 1]?.time ?? null,
        });
      }
      if (resumePlaying && nextVisibleCount < data.candles.length) setPlaying(true);
    } catch (loadError) {
      if (requestId !== loadRequestIdRef.current) return;
      if (!preserveState && !restoredSession) {
        setCandles([]);
        setReplayStartIndex(0);
        setVisibleCount(0);
        setPosition(null);
      } else if (resumePlaying) {
        setPlaying(true);
      }
      setError(loadError instanceof Error ? loadError.message : t.loadError);
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (restoreStartedRef.current) return;
    restoreStartedRef.current = true;
    setSessionState("restoring");

    void (async () => {
      try {
        const response = await fetch("/api/backtest/sessions", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await response.json().catch(() => null)) as BacktestSessionResponse | null;
        if (!response.ok || !data?.ok) throw new Error(data?.message || t.sessionSaveError);
        if (!data.session) {
          setSessionState("idle");
          return;
        }

        const restored = data.session;
        const restoredAccountId = accounts.some((account) => account.id === restored.accountId)
          ? restored.accountId || ""
          : "";
        const restoredPlaybookId = playbooks.some((playbook) => playbook.id === restored.playbookId)
          ? restored.playbookId || ""
          : "";

        setAccountId(restoredAccountId);
        setPlaybookId(restoredPlaybookId);
        setSymbol(restored.symbol);
        setTimeframe(restored.timeframe);
        setEndDate(restored.endDate);
        setHistorySize(String(restored.historySize));
        setSpeed(restored.speed);
        await requestReplay({
          nextSymbol: restored.symbol,
          nextTimeframe: restored.timeframe,
          nextEndDate: restored.endDate,
          nextHistorySize: String(restored.historySize),
          restoredSession: restored,
        });
      } catch {
        setSessionState("error");
      }
    })();
  }, []);

  useEffect(() => {
    if (!sessionId || !candles.length || sessionState === "restoring" || playing) return;
    const delay = position?.status === "WON" || position?.status === "LOST" ? 0 : 400;
    const timer = window.setTimeout(() => {
      void queueSessionSave(sessionId, position);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    accountId,
    activeSymbol,
    activeTimeframe,
    currentCandle?.time,
    endDate,
    historySize,
    playbookId,
    playing,
    position,
    sessionId,
    speed,
  ]);

  useEffect(() => {
    if (!playing || !sessionId || !candles.length) return;
    const timer = window.setInterval(() => latestSessionSaveRef.current(), 1500);
    return () => window.clearInterval(timer);
  }, [candles.length, playing, sessionId]);

  useEffect(() => {
    const saveBeforeLeaving = () => latestSessionSaveRef.current();
    window.addEventListener("pagehide", saveBeforeLeaving);
    return () => window.removeEventListener("pagehide", saveBeforeLeaving);
  }, []);

  function loadReplay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void requestReplay({ startNewSession: true });
  }

  function changeTimeframe(nextTimeframe: string) {
    setTimeframe(nextTimeframe);
    if (candles.length) void requestReplay({ nextTimeframe, preserveState: true });
  }

  function restartReplay() {
    const previousSessionId = sessionId;
    const previousPosition = position;
    const restartTime = candles[replayStartIndex - 1]?.time ?? null;
    setPlaying(false);
    setVisibleCount(replayStartIndex);
    setPosition(null);
    activeSessionIdRef.current = null;
    setSessionId(null);
    setSessionSummary(EMPTY_BACKTEST_SUMMARY);

    void (async () => {
      if (previousSessionId) await queueSessionSave(previousSessionId, previousPosition);
      try {
        await createStoredSession({
          nextSymbol: activeSymbol,
          nextTimeframe: activeTimeframe,
          nextEndDate: endDate,
          nextHistorySize: historySize,
          nextSpeed: speed,
          currentTime: restartTime,
        });
      } catch {
        // The save status already exposes the failure without blocking local replay.
      }
    })();
  }

  function nextCandle() {
    setPlaying(false);
    setVisibleCount((count) => Math.min(count + 1, candles.length));
  }

  function createPosition(direction: BacktestDirection) {
    if (!currentCandle) return;
    setPlaying(false);
    const entry = normalizeLevel(currentCandle.close, activeSymbol);
    const distance = initialStopDistance(visibleCandles);
    const stopLoss = normalizeLevel(direction === "LONG" ? entry - distance : entry + distance, activeSymbol);
    const takeProfit = normalizeLevel(direction === "LONG" ? entry + distance * 2 : entry - distance * 2, activeSymbol);
    const placedAtIndex = visibleCount - 1;

    setPosition({
      id: `${Date.now()}-${direction}`,
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskAmount: Math.max(Number(((accountEquity ?? 10_000) * 0.01).toFixed(2)), 0.01),
      status: "OPEN",
      placedAtIndex,
      lastEvaluatedIndex: placedAtIndex,
      openedAtIndex: placedAtIndex,
    });
  }

  function changePositionLevel(level: BacktestPriceLevel, price: number) {
    setPosition((current) => {
      if (!current || current.status === "WON" || current.status === "LOST") return current;
      const replayHasAdvanced = current.lastEvaluatedIndex > current.placedAtIndex;
      if (level === "entry" && current.status === "OPEN" && replayHasAdvanced) return current;

      const next = { ...current, [level]: normalizeLevel(price, activeSymbol) };
      if (replayHasAdvanced) {
        return positionLevelsAreValid(next) ? next : current;
      }

      if (!positionLevelsAreValid(next)) {
        return {
          ...next,
          status: "DRAFT",
          openedAtIndex: undefined,
        };
      }

      const marketPrice = currentCandle?.close ?? next.entry;
      const tolerance = Math.max(Math.abs(marketPrice) * 0.0000001, 0.0000001);
      const status = Math.abs(next.entry - marketPrice) <= tolerance ? "OPEN" : "PENDING";
      return {
        ...next,
        status,
        openedAtIndex: status === "OPEN" ? next.placedAtIndex : undefined,
      };
    });
  }

  function changePositionInput(level: BacktestPriceLevel, value: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    changePositionLevel(level, parsed);
  }

  function positionStatusText() {
    if (!position) return "";
    if (!levelsValid) return t.invalidLevels;
    if (position.status === "DRAFT") return t.draft;
    if (position.status === "PENDING") return t.pending;
    if (position.status === "OPEN") return t.open;
    if (position.status === "WON") return t.won;
    return t.lost;
  }

  return (
    <div className="flex flex-col gap-3 lg:h-full lg:min-h-0 lg:flex-1 lg:overflow-hidden" dir={language === "fa" ? "rtl" : "ltr"}>
      <header className="relative shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:hidden">
        <div className="pointer-events-none absolute -top-24 end-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 text-white shadow-md shadow-violet-600/20">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="hidden text-[10px] font-bold uppercase tracking-wide text-violet-600 dark:text-violet-300 xl:block">{t.eyebrow}</div>
              <h1 className="text-lg font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">{t.title}</h1>
              <p className="hidden max-w-3xl truncate text-xs text-slate-500 dark:text-slate-400 2xl:block">{t.description}</p>
            </div>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
            <ShieldCheck className="h-4 w-4" />
            {sessionStatusText}
          </div>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-[250px_minmax(0,1fr)]">
        <form onSubmit={loadReplay} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:min-h-0 lg:overflow-y-auto">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-800">
            <div className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300">
              <Database className="h-4 w-4" />
            </div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t.setup}</h2>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <label className="col-span-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.account}
              <select
                value={accountId}
                onChange={(event) => {
                  setAccountId(event.target.value);
                  setPosition(null);
                }}
                className={inputClass}
              >
                {!accounts.length ? <option value="">{t.noAccount}</option> : null}
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} · {account.accountType || account.platform || "Account"}
                  </option>
                ))}
              </select>
            </label>

            {selectedAccount ? (
              <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/80">
                <div className="flex items-center justify-between gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="truncate">{selectedAccount.broker || selectedAccount.platform || selectedAccount.name}</span>
                  <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                    {t.accountType}: {selectedAccount.accountType || selectedAccount.platform || "—"}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                  {([
                    [t.balance, selectedAccount.balance, selectedAccount.currency],
                    [t.equity, replayEquity, selectedAccount.currency],
                    [t.margin, selectedAccount.margin, selectedAccount.currency],
                    [t.freeMargin, replayFreeMargin, selectedAccount.currency],
                    [t.marginLevel, selectedAccount.marginLevel, "%"],
                  ] as const).map(([label, value, suffix]) => (
                    <div key={label} className="min-w-0 rounded-lg bg-white px-2 py-1.5 dark:bg-slate-800">
                      <div className="truncate text-slate-400">{label}</div>
                      <div className="mt-0.5 truncate font-bold tabular-nums text-slate-800 dark:text-slate-100" dir="ltr">
                        {formatAccountNumber(value)} {value === null ? "" : suffix}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.symbol}
              <select value={symbol} onChange={(event) => setSymbol(event.target.value)} className={inputClass} dir="ltr">
                {SYMBOLS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.timeframe}
              <select value={timeframe} onChange={(event) => changeTimeframe(event.target.value)} disabled={loading} className={inputClass} dir="ltr">
                {TIMEFRAMES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="col-span-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.endDate}
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute start-3 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="date" max={todayUtc()} value={endDate} onChange={(event) => setEndDate(event.target.value)} className={cn(inputClass, "ps-10")} required />
              </div>
            </label>

            <label className="col-span-2 block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.playbook}
              <select value={playbookId} onChange={(event) => setPlaybookId(event.target.value)} className={inputClass}>
                <option value="">{t.noPlaybook}</option>
                {playbooks.map((playbook) => <option key={playbook.id} value={playbook.id}>{playbook.name}</option>)}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.history}
              <select value={historySize} onChange={(event) => setHistorySize(event.target.value)} className={inputClass} dir="ltr">
                <option value="300">300</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
              </select>
            </label>
          </div>

          <button type="submit" disabled={loading || sessionState === "restoring"} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-md shadow-violet-600/20 transition hover:from-violet-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? t.loading : t.load}
          </button>

          {error ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</p> : null}
        </form>

        <section className={cn(
          "grid min-h-0 min-w-0 gap-2 lg:grid-rows-[auto_minmax(0,1fr)_auto]",
          position ? "lg:grid-cols-[minmax(0,1fr)_250px]" : "lg:grid-cols-1"
        )}>
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between lg:col-start-1 lg:row-start-1">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Crosshair className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white">{t.positionTools}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold" dir="ltr">
                  {([
                    ["EMA 20", "bg-orange-500"],
                    ["EMA 50", "bg-blue-600"],
                    ["EMA 100", "bg-emerald-500"],
                    ["EMA 200", "bg-purple-500"],
                  ] as const).map(([label, color]) => (
                    <span key={label} className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <span className={cn("h-1.5 w-3 rounded-full", color)} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => createPosition("LONG")} disabled={!currentCandle} className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
                <TrendingUp className="h-4 w-4" />
                {t.longPosition}
              </button>
              <button type="button" onClick={() => createPosition("SHORT")} disabled={!currentCandle} className="inline-flex h-9 items-center gap-2 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
                <TrendingDown className="h-4 w-4" />
                {t.shortPosition}
              </button>
              <button type="button" onClick={() => setPosition(null)} disabled={!position} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800">
                <Trash2 className="h-4 w-4" />
                {t.clearPosition}
              </button>
            </div>
          </div>

          <ReplayChart
            symbol={activeSymbol}
            timeframe={activeTimeframe}
            candles={visibleCandles}
            emptyMessage={t.empty}
            loadingMessage={t.chartLoading}
            position={position}
            onPositionChange={changePositionLevel}
            entryLocked={positionHasAdvanced}
            className="lg:col-start-1 lg:row-start-2"
          />

          {position ? (
            <div className={cn(
              "rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-950 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:min-h-0 lg:overflow-y-auto",
              levelsValid ? "border-slate-200 dark:border-slate-800" : "border-rose-300 dark:border-rose-500/40"
            )}>
              <div className="flex flex-col gap-3">
                <div className="grid flex-1 grid-cols-2 gap-2.5">
                  {([
                    ["entry", t.entry, position.entry],
                    ["stopLoss", t.stopLoss, position.stopLoss],
                    ["takeProfit", t.takeProfit, position.takeProfit],
                  ] as const).map(([level, label, value]) => (
                    <label key={level} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {label}
                      <input
                        type="number"
                        step="any"
                        value={value}
                        disabled={position.status === "WON" || position.status === "LOST" || (level === "entry" && position.status === "OPEN" && positionHasAdvanced)}
                        onChange={(event) => changePositionInput(level, event.target.value)}
                        className={cn(inputClass, "tabular-nums", level === "stopLoss" ? "text-rose-600 dark:text-rose-300" : level === "takeProfit" ? "text-emerald-600 dark:text-emerald-300" : "text-blue-600 dark:text-blue-300")}
                        dir="ltr"
                      />
                    </label>
                  ))}
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {t.riskAmount}
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={position.riskAmount}
                      disabled={position.status === "WON" || position.status === "LOST"}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        if (Number.isFinite(value) && value > 0) setPosition((current) => current ? { ...current, riskAmount: value } : current);
                      }}
                      className={cn(inputClass, "tabular-nums")}
                      dir="ltr"
                    />
                  </label>
                </div>

              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="col-span-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                  <div className="text-[11px] font-semibold text-slate-500">{t.riskReward}</div>
                  <div className="mt-1 text-base font-semibold tabular-nums text-slate-900 dark:text-white" dir="ltr">1:{riskReward.toFixed(2)}</div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                  <div className="text-[11px] font-semibold text-slate-500">{t.liveResult}</div>
                  <div className={cn("mt-1 text-base font-semibold tabular-nums", liveR > 0 ? "text-emerald-600 dark:text-emerald-300" : liveR < 0 ? "text-rose-600 dark:text-rose-300" : "text-slate-900 dark:text-white")} dir="ltr">
                    {resultLabel(liveR)} · {liveAmount > 0 ? "+" : ""}{liveAmount.toFixed(2)} USD
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
                  <div className="text-[11px] font-semibold text-slate-500">Status</div>
                  <div className={cn("mt-1 text-sm font-semibold", position.status === "WON" ? "text-emerald-600" : position.status === "LOST" || !levelsValid ? "text-rose-600" : position.status === "OPEN" ? "text-blue-600" : "text-amber-600")}>{positionStatusText()}</div>
                </div>
              </div>

              <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {t.noRealOrder}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950 lg:col-start-1 lg:row-start-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setPlaying((value) => !value)} disabled={!candles.length || replayFinished} className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {playing ? t.pause : t.play}
                </button>
                <button type="button" onClick={nextCandle} disabled={!candles.length || replayFinished} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <StepForward className="h-4 w-4" />
                  {t.next}
                </button>
                <button type="button" onClick={restartReplay} disabled={!candles.length} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                  <RotateCcw className="h-4 w-4" />
                  {t.reset}
                </button>
                <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                  {t.speed}
                  <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))} className="bg-transparent text-sm font-semibold outline-none" dir="ltr">
                    <option value="1200">0.5×</option>
                    <option value="700">1×</option>
                    <option value="350">2×</option>
                    <option value="150">4×</option>
                  </select>
                </label>
              </div>

              <div className="min-w-0 text-sm text-slate-600 dark:text-slate-300">
                <div className="font-semibold text-slate-900 dark:text-white">
                  {candles.length ? `${t.candle} ${revealedReplayCount} ${t.of} ${replayCandleCount}` : t.noData}
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {candles.length ? `${t.currentCandle}: ${formatCandleTime(currentCandle?.time, language)}` : t.ready}
                </div>
              </div>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole className="h-3.5 w-3.5 text-emerald-500" />
                {replayFinished ? t.finished : `${hiddenCount} ${t.hidden}`}
              </span>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-semibold tabular-nums" dir="ltr">
                <span>{t.trades}: {sessionSummary.totalTrades}</span>
                <span>{t.winRate}: {sessionSummary.winRate.toFixed(0)}%</span>
                <span className={sessionSummary.netProfitLoss > 0 ? "text-emerald-600" : sessionSummary.netProfitLoss < 0 ? "text-rose-600" : ""}>
                  {t.netPnl}: {sessionSummary.netProfitLoss > 0 ? "+" : ""}{sessionSummary.netProfitLoss.toFixed(2)} USD
                </span>
                <span className={sessionSummary.netR > 0 ? "text-emerald-600" : sessionSummary.netR < 0 ? "text-rose-600" : ""}>
                  {t.totalR}: {sessionSummary.netR > 0 ? "+" : ""}{sessionSummary.netR.toFixed(2)}R
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 lg:hidden">
            {t.phaseNote}
          </p>
        </section>
      </div>
    </div>
  );
}
