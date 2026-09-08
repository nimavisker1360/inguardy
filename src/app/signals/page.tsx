"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Calculator,
  Copy,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignalCard } from "@/components/ui/signal-card";
import { MotionDiv } from "@/components/ui/motion-content";
import { useLanguage } from "@/lib/language-context";
import { fetchWebsiteSignals } from "@/lib/fetch-signals";
import {
  formatSignalDateGroupLabel,
  formatSignalDateTime,
  getSignalDateKey,
} from "@/lib/signal-time";
import { cn } from "@/lib/utils";
import type {
  DailySignalSummary,
  DisplaySignal,
  SignalDateFilter,
  SignalDirectionFilter,
  SignalListResponse,
  SignalStatusFilter,
  SignalSummary,
} from "@/lib/signal-types";

const PAGE_SIZE = 12;
const LIVE_REFRESH_INTERVAL = 5000;

type SignalFilters = {
  status: SignalStatusFilter;
  symbol: string;
  direction: SignalDirectionFilter;
  date: SignalDateFilter;
};

type SelectOption<T extends string> = {
  label: string;
  value: T;
};

const DEFAULT_FILTERS: SignalFilters = {
  status: "all",
  symbol: "all",
  direction: "all",
  date: "all",
};

const EMPTY_SUMMARY: SignalSummary = {
  today: 0,
  open: 0,
  tpHit: 0,
  slHit: 0,
};

function formatNumber(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: 5,
  });
}

function getSignalStatus(signal: DisplaySignal) {
  if (signal.isOpen) {
    return "Open";
  }

  return "Closed";
}

function getSignalResult(signal: DisplaySignal) {
  if (signal.isOpen) {
    return "Running";
  }

  if (signal.closeReason === "TP") {
    return "TP Hit";
  }

  if (signal.closeReason === "SL") {
    return "SL Hit";
  }

  return "Closed";
}

function getSignalStatusKey(signal: DisplaySignal) {
  return signal.isOpen ? "open" : "closed";
}

function getSignalResultKey(signal: DisplaySignal) {
  if (signal.isOpen) {
    return "running";
  }

  if (signal.closeReason === "TP") {
    return "tpHit";
  }

  if (signal.closeReason === "SL") {
    return "slHit";
  }

  return "closed";
}

function getStatusClass(signal: DisplaySignal) {
  if (signal.isOpen) {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300";
  }

  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-300";
}

function getResultClass(signal: DisplaySignal) {
  if (signal.isOpen) {
    return "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200";
  }

  if (signal.closeReason === "TP") {
    return "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300";
  }

  if (signal.closeReason === "SL") {
    return "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
  }

  return "border-slate-300 bg-slate-100 text-slate-700 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-300";
}

function getResultIcon(signal: DisplaySignal) {
  if (signal.isOpen) {
    return <Activity className="h-3.5 w-3.5" />;
  }

  if (signal.closeReason === "SL") {
    return <XCircle className="h-3.5 w-3.5" />;
  }

  return <CheckCircle2 className="h-3.5 w-3.5" />;
}

function getDirectionClass(type: DisplaySignal["type"]) {
  return type === "buy"
    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300"
    : "border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300";
}

function getDateGroup(signal: DisplaySignal) {
  if (!signal.createdAt) {
    return {
      key: "unknown",
      label: "Unknown date",
    };
  }

  const createdAt = new Date(signal.createdAt);

  if (Number.isNaN(createdAt.getTime())) {
    return {
      key: "unknown",
      label: "Unknown date",
    };
  }

  return {
    key: getSignalDateKey(createdAt),
    label: formatSignalDateGroupLabel(createdAt),
  };
}

function groupSignalsByDate(signals: DisplaySignal[]) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      signals: DisplaySignal[];
    }
  >();

  signals.forEach((signal) => {
    const group = getDateGroup(signal);
    const currentGroup = groups.get(group.key);

    if (currentGroup) {
      currentGroup.signals.push(signal);
      return;
    }

    groups.set(group.key, {
      ...group,
      signals: [signal],
    });
  });

  return Array.from(groups.values());
}

function getClosedSignalPips(signal: DisplaySignal) {
  if (signal.isOpen) {
    return undefined;
  }

  const exitPrice =
    signal.closePrice ??
    (signal.closeReason === "TP" ? signal.takeProfit[0] : undefined) ??
    (signal.closeReason === "SL" ? signal.stopLoss : undefined);
  const pipSize = getPipSize(signal.pair);

  if (exitPrice === undefined || !pipSize) {
    return undefined;
  }

  const rawMove =
    signal.type === "buy"
      ? exitPrice - signal.price
      : signal.price - exitPrice;

  return rawMove / pipSize;
}

function buildDailySummaryFallback(
  key: string,
  label: string,
  signals: DisplaySignal[]
): DailySignalSummary {
  return signals.reduce<DailySignalSummary>(
    (summary, signal) => {
      const pips = getClosedSignalPips(signal);

      summary.signalCount += 1;
      summary.open += signal.isOpen ? 1 : 0;
      summary.tpHit += signal.closeReason === "TP" ? 1 : 0;
      summary.slHit += signal.closeReason === "SL" ? 1 : 0;

      if (pips !== undefined && Number.isFinite(pips)) {
        summary.netPips += pips;

        if (pips >= 0) {
          summary.profitPips += pips;
        } else {
          summary.lossPips += Math.abs(pips);
        }
      }

      return summary;
    },
    {
      dateKey: key,
      label,
      signalCount: 0,
      open: 0,
      tpHit: 0,
      slHit: 0,
      profitPips: 0,
      lossPips: 0,
      netPips: 0,
    }
  );
}

function mergeSignals(current: DisplaySignal[], next: DisplaySignal[]) {
  const seenIds = new Set(current.map((signal) => signal.id));
  const uniqueNext = next.filter((signal) => !seenIds.has(signal.id));

  return [...current, ...uniqueNext];
}

function formatDetailsDate(value: string | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return formatSignalDateTime(date);
}

function formatLiveTime(date: Date | null) {
  if (!date) {
    return "-";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPipsValue(value: number, options: { signed?: boolean } = {}) {
  const normalized = Number.isFinite(value) ? value : 0;
  const prefix = options.signed && normalized > 0 ? "+" : "";

  return `${prefix}${normalized.toFixed(1)}`;
}

function getRiskReward(signal: DisplaySignal) {
  const reward = Math.abs((signal.takeProfit[0] || 0) - signal.price);
  const risk = Math.abs(signal.price - signal.stopLoss);

  if (!risk || !reward) {
    return "-";
  }

  return `1:${(reward / risk).toFixed(2)}`;
}

function getPipSize(pair: string) {
  if (pair.includes("JPY")) {
    return 0.01;
  }

  if (pair.includes("XAU")) {
    return 0.1;
  }

  return 0.0001;
}

function getSignalPips(
  signal: DisplaySignal,
  translate: (key: string, fallback: string) => string
) {
  const pipSize = getPipSize(signal.pair);
  const referencePrice =
    signal.isOpen === false && signal.closePrice !== undefined
      ? signal.closePrice
      : signal.takeProfit[0];

  if (!referencePrice || !pipSize) {
    return "-";
  }

  const rawMove =
    signal.type === "buy"
      ? referencePrice - signal.price
      : signal.price - referencePrice;
  const pips = rawMove / pipSize;
  const prefix = signal.isOpen === false && pips > 0 ? "+" : "";

  return `${prefix}${pips.toFixed(1)} ${translate("pips", "pips")}`;
}

function getAnalysisReason(
  signal: DisplaySignal,
  translate: (key: string, fallback: string) => string
) {
  return translate(
    "analysisReasonTemplate",
    "{symbol} {direction} setup with entry at {entry}, stop loss at {stopLoss}, and first target at {takeProfit}. The setup is published with predefined invalidation and target levels so risk can be reviewed before execution."
  )
    .replace("{symbol}", signal.pair)
    .replace(
      "{direction}",
      signal.type === "buy" ? translate("buy", "Buy") : translate("sell", "Sell")
    )
    .replace("{entry}", formatNumber(signal.price))
    .replace("{stopLoss}", formatNumber(signal.stopLoss))
    .replace("{takeProfit}", formatNumber(signal.takeProfit[0]));
}

function getCopyText(
  signal: DisplaySignal,
  translate: (key: string, fallback: string) => string
) {
  return [
    `${signal.pair} ${signal.type.toUpperCase()}`,
    `${translate("entry", "Entry")}: ${formatNumber(signal.price)}`,
    `${translate("stopLoss", "Stop Loss")}: ${formatNumber(signal.stopLoss)}`,
    `${translate("takeProfit1", "Take Profit 1")}: ${formatNumber(signal.takeProfit[0])}`,
    `${translate("status", "Status")}: ${translate(getSignalStatusKey(signal), getSignalStatus(signal))}`,
    `${translate("result", "Result")}: ${translate(getSignalResultKey(signal), getSignalResult(signal))}`,
    `${translate("riskReward", "Risk/Reward")}: ${getRiskReward(signal)}`,
  ].join("\n");
}

function getResultSourceLabel(
  signal: DisplaySignal,
  translate: (key: string, fallback: string) => string
) {
  if (signal.resultSource === "derived") {
    return translate("derivedResult", "Derived from later prices");
  }

  if (signal.resultSource === "python") {
    return translate("pythonMt5Result", "Python MT5 ticks");
  }

  if (signal.resultSource === "stored") {
    return translate("storedResult", "Confirmed by close event");
  }

  return "-";
}

function SelectFilter<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-xs font-medium uppercase text-slate-500 dark:text-gray-500">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition-colors focus:border-blue-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <tr key={index} className="animate-pulse border-t border-slate-200 dark:border-gray-900">
          {Array.from({ length: 9 }).map((__, cellIndex) => (
            <td key={cellIndex} className="px-4 py-3">
              <div className="h-4 rounded bg-slate-200 dark:bg-gray-800" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-3 md:hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[124px] animate-pulse rounded-lg border border-slate-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-950/80"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-24 rounded bg-slate-200 dark:bg-gray-800" />
            <div className="h-7 w-32 rounded bg-slate-200 dark:bg-gray-800" />
          </div>
          <div className="mt-3 h-11 rounded bg-slate-100 dark:bg-gray-900" />
          <div className="mt-3 h-6 rounded bg-slate-200 dark:bg-gray-800" />
        </div>
      ))}
    </div>
  );
}

export default function SignalsPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<SignalFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [signals, setSignals] = useState<DisplaySignal[]>([]);
  const [summary, setSummary] = useState<SignalSummary>(EMPTY_SUMMARY);
  const [dailySummaries, setDailySummaries] = useState<
    SignalListResponse["dailySummaries"]
  >([]);
  const [pagination, setPagination] = useState<
    SignalListResponse["pagination"]
  >({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<DisplaySignal | null>(
    null
  );
  const [copiedSignalId, setCopiedSignalId] = useState<string | null>(null);
  const [expandedDateGroups, setExpandedDateGroups] = useState<Set<string>>(
    () => new Set()
  );

  const translate = useCallback(
    (key: string, fallback: string) => {
      const value = t(key);
      return value === key ? fallback : value;
    },
    [t]
  );

  const statusOptions = useMemo<SelectOption<SignalStatusFilter>[]>(
    () => [
      { value: "all", label: translate("all", "All") },
      { value: "open", label: translate("open", "Open") },
      { value: "closed", label: translate("closed", "Closed") },
      { value: "tp", label: translate("tpHit", "TP Hit") },
      { value: "sl", label: translate("slHit", "SL Hit") },
    ],
    [translate]
  );

  const symbolOptions = useMemo<SelectOption<string>[]>(
    () => [
      { value: "all", label: translate("all", "All") },
      { value: "XAUUSD", label: "XAUUSD" },
      { value: "EURUSD", label: "EURUSD" },
      { value: "GBPUSD", label: "GBPUSD" },
      { value: "USDJPY", label: "USDJPY" },
    ],
    [translate]
  );

  const directionOptions = useMemo<SelectOption<SignalDirectionFilter>[]>(
    () => [
      { value: "all", label: translate("all", "All") },
      { value: "BUY", label: translate("buy", "Buy") },
      { value: "SELL", label: translate("sell", "Sell") },
    ],
    [translate]
  );

  const dateOptions = useMemo<SelectOption<SignalDateFilter>[]>(
    () => [
      { value: "all", label: translate("all", "All") },
      { value: "today", label: translate("today", "Today") },
      { value: "yesterday", label: translate("yesterday", "Yesterday") },
      { value: "week", label: translate("thisWeek", "This Week") },
    ],
    [translate]
  );

  const queryOptions = useMemo(
    () => ({
      limit: PAGE_SIZE,
      page,
      status: filters.status,
      symbol: filters.symbol,
      direction: filters.direction,
      date: filters.date,
    }),
    [filters.date, filters.direction, filters.status, filters.symbol, page]
  );

  const groupedSignals = useMemo(() => groupSignalsByDate(signals), [signals]);
  const dailySummaryMap = useMemo(
    () =>
      new Map(
        dailySummaries
          .filter((dailySummary) => dailySummary.dateKey)
          .map((dailySummary) => [dailySummary.dateKey, dailySummary])
      ),
    [dailySummaries]
  );
  const isInitialLoading = isLoading && page === 1 && signals.length === 0;
  const isLoadingMore = isLoading && page > 1;

  const applySignalResponse = useCallback(
    (
      data: SignalListResponse,
      optionsPage: number,
      mode: "page" | "replace"
    ) => {
      const totalPages = Math.max(Math.ceil(data.pagination.total / PAGE_SIZE), 1);
      const loadedCount =
        mode === "replace" ? data.signals.length : optionsPage * PAGE_SIZE;

      setSummary(data.summary);
      setDailySummaries(data.dailySummaries);
      setPagination({
        page: mode === "replace" ? page : optionsPage,
        limit: PAGE_SIZE,
        total: data.pagination.total,
        totalPages,
        hasMore:
          mode === "replace"
            ? loadedCount < data.pagination.total
            : optionsPage < totalPages,
      });
      setSignals((current) => {
        if (mode === "replace" || optionsPage === 1) {
          return data.signals;
        }

        return mergeSignals(current, data.signals);
      });
      setLastUpdatedAt(new Date());
    },
    [page]
  );

  const updateFilter = useCallback(
    <K extends keyof SignalFilters,>(key: K, value: SignalFilters[K]) => {
      setFilters((current) => ({ ...current, [key]: value }));
      setPage(1);
      setSignals([]);
      setDailySummaries([]);
      setSelectedSignal(null);
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    setSignals([]);
    setDailySummaries([]);
    setSelectedSignal(null);
  }, []);

  const openSignalDetails = useCallback((signal: DisplaySignal) => {
    setSelectedSignal(signal);
    setCopiedSignalId(null);
  }, []);

  const closeSignalDetails = useCallback(() => {
    setSelectedSignal(null);
  }, []);

  const toggleDateGroup = useCallback((key: string) => {
    setExpandedDateGroups((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  }, []);

  const loadMore = useCallback(() => {
    if (!pagination.hasMore || isLoading) {
      return;
    }

    setPage((current) => current + 1);
  }, [isLoading, pagination.hasMore]);

  const copySignal = useCallback(async (signal: DisplaySignal) => {
    try {
      await navigator.clipboard.writeText(getCopyText(signal, translate));
      setCopiedSignalId(signal.id);
      window.setTimeout(() => setCopiedSignalId(null), 1800);
    } catch {
      // Clipboard access can fail when the browser blocks it.
    }
  }, [translate]);

  const refreshVisibleSignals = useCallback(async () => {
    const visibleLimit = Math.min(PAGE_SIZE * page, 50);

    setIsRefreshing(true);

    try {
      const data = await fetchWebsiteSignals({
        ...queryOptions,
        page: 1,
        limit: visibleLimit,
      });

      applySignalResponse(data, 1, "replace");
      setError(null);
    } catch {
      setError(translate("signalsLoadError", "Failed to load signals"));
    } finally {
      setIsRefreshing(false);
    }
  }, [applySignalResponse, page, queryOptions, translate]);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setError(null);

    fetchWebsiteSignals(queryOptions, controller.signal)
      .then((data) => {
        applySignalResponse(data, queryOptions.page, "page");
      })
      .catch((fetchError) => {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === "AbortError"
        ) {
          return;
        }

        setError(translate("signalsLoadError", "Failed to load signals"));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [applySignalResponse, queryOptions, translate]);

  useEffect(() => {
    setExpandedDateGroups((current) => {
      const availableKeys = new Set(groupedSignals.map((group) => group.key));
      const next = new Set(
        Array.from(current).filter((key) => availableKeys.has(key))
      );

      if (next.size === 0 && groupedSignals[0]) {
        next.add(groupedSignals[0].key);
      }

      if (
        next.size === current.size &&
        Array.from(next).every((key) => current.has(key))
      ) {
        return current;
      }

      return next;
    });
  }, [groupedSignals]);

  useEffect(() => {
    let isRequestRunning = false;

    const intervalId = window.setInterval(() => {
      if (isRequestRunning) {
        return;
      }

      const controller = new AbortController();
      const visibleLimit = Math.min(PAGE_SIZE * page, 50);
      const refreshOptions = {
        ...queryOptions,
        page: 1,
        limit: visibleLimit,
      };

      isRequestRunning = true;
      setIsRefreshing(true);

      fetchWebsiteSignals(refreshOptions, controller.signal)
        .then((data) => {
          applySignalResponse(data, 1, "replace");
          setError(null);
        })
        .catch((fetchError) => {
          if (
            fetchError instanceof DOMException &&
            fetchError.name === "AbortError"
          ) {
            return;
          }

        })
        .finally(() => {
          isRequestRunning = false;
          setIsRefreshing(false);
        });
    }, LIVE_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [applySignalResponse, page, queryOptions]);

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-950 dark:bg-black dark:text-white">
      <div
        className="absolute inset-0 z-0 bg-[url('/images/back.jpg')] bg-cover bg-center opacity-5 dark:opacity-15"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-screen-xl px-4 py-12 md:py-16">
        <MotionDiv className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl">
              {translate("forexSignals", "Forex Signals")}
            </h1>
            <div className="mt-2 text-sm text-slate-600 dark:text-gray-400">
              {translate("showingSignals", "Showing")} {signals.length} /{" "}
              {pagination.total}
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-500/25 dark:bg-blue-500/10 dark:text-blue-200">
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              <span>{translate("liveUpdates", "Live updates")}</span>
              <span className="text-blue-600/80 dark:text-blue-200/70">
                {translate("updatedAt", "Updated")}{" "}
                {formatLiveTime(lastUpdatedAt)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            onClick={refreshVisibleSignals}
            disabled={isRefreshing}
            className="w-full bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-gray-800 md:w-auto"
          >
            {isRefreshing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {translate("refresh", "Refresh")}
          </Button>
        </MotionDiv>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard
            label={translate("todaySignals", "Today Signals")}
            value={summary.today}
            icon={<Activity className="h-4 w-4" />}
            colorClass="border-blue-300 text-blue-600 dark:border-blue-500/30 dark:text-blue-200"
          />
          <SummaryCard
            label={translate("openSignals", "Open Signals")}
            value={summary.open}
            icon={<ArrowUpCircle className="h-4 w-4" />}
            colorClass="border-emerald-300 text-emerald-600 dark:border-green-500/30 dark:text-green-300"
          />
          <SummaryCard
            label={translate("tpHit", "TP Hit")}
            value={summary.tpHit}
            icon={<CheckCircle2 className="h-4 w-4" />}
            colorClass="border-emerald-300 text-emerald-600 dark:border-green-500/30 dark:text-green-300"
          />
          <SummaryCard
            label={translate("slHit", "SL Hit")}
            value={summary.slHit}
            icon={<XCircle className="h-4 w-4" />}
            colorClass="border-red-300 text-red-600 dark:border-red-500/30 dark:text-red-300"
          />
        </div>

        <div className="mb-6 rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/85">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-gray-200">
              <Filter className="h-4 w-4 text-blue-500 dark:text-blue-300" />
              {translate("filters", "Filters")}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              {translate("resetFilters", "Reset")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectFilter
              label={translate("status", "Status")}
              value={filters.status}
              options={statusOptions}
              onChange={(value) => updateFilter("status", value)}
            />
            <SelectFilter
              label={translate("symbol", "Symbol")}
              value={filters.symbol}
              options={symbolOptions}
              onChange={(value) => updateFilter("symbol", value)}
            />
            <SelectFilter
              label={translate("directionLabel", "Direction")}
              value={filters.direction}
              options={directionOptions}
              onChange={(value) => updateFilter("direction", value)}
            />
            <SelectFilter
              label={translate("date", "Date")}
              value={filters.date}
              options={dateOptions}
              onChange={(value) => updateFilter("date", value)}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}

        {isInitialLoading && <CardSkeleton />}

        <div className="md:hidden">
          {!isInitialLoading &&
            groupedSignals.map((group) => {
              const groupSummary =
                dailySummaryMap.get(group.key) ??
                buildDailySummaryFallback(
                  group.key,
                  group.label,
                  group.signals
                );

              return (
                <div key={group.key} className="mb-3">
                  <DateGroupHeading
                    label={group.label}
                    count={groupSummary.signalCount || group.signals.length}
                    summary={groupSummary}
                    isOpen={expandedDateGroups.has(group.key)}
                    onToggle={() => toggleDateGroup(group.key)}
                    translate={translate}
                  />
                  {expandedDateGroups.has(group.key) && (
                    <div className="mt-3 space-y-3">
                      {group.signals.map((signal) => (
                        <SignalCard
                          key={signal.id}
                          {...signal}
                          onDetails={() => openSignalDetails(signal)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>

        <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/85 md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 dark:bg-black/40 dark:text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">
                    {translate("symbol", "Symbol")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("directionLabel", "Direction")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("entry", "Entry")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("stopLoss", "Stop Loss")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("takeProfit1", "Take Profit 1")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("status", "Status")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("result", "Result")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("time", "Time")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {translate("details", "Details")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isInitialLoading ? (
                  <TableSkeleton />
                ) : (
                  groupedSignals.map((group) => {
                    const groupSummary =
                      dailySummaryMap.get(group.key) ??
                      buildDailySummaryFallback(
                        group.key,
                        group.label,
                        group.signals
                      );

                    return (
                      <Fragment key={group.key}>
                        <tr>
                          <td
                            colSpan={9}
                            className="border-t border-slate-200 bg-slate-50 px-4 py-0 dark:border-gray-800 dark:bg-black/35"
                          >
                            <button
                              type="button"
                              onClick={() => toggleDateGroup(group.key)}
                              className="flex w-full flex-col gap-2 py-3 text-left text-sm font-semibold text-blue-700 transition-colors hover:text-blue-900 dark:text-blue-100 dark:hover:text-white lg:flex-row lg:items-center lg:justify-between"
                              aria-expanded={expandedDateGroups.has(group.key)}
                            >
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                                <span>{group.label}</span>
                              </span>
                              <span className="inline-flex items-center gap-3">
                                <DailySummaryStats
                                  summary={groupSummary}
                                  count={
                                    groupSummary.signalCount ||
                                    group.signals.length
                                  }
                                  translate={translate}
                                />
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 shrink-0 text-blue-500 transition-transform dark:text-blue-300",
                                    expandedDateGroups.has(group.key)
                                      ? "rotate-180"
                                      : "rotate-0"
                                  )}
                                />
                              </span>
                            </button>
                          </td>
                        </tr>
                        {expandedDateGroups.has(group.key) &&
                          group.signals.map((signal) => (
                            <SignalTableRows
                              key={signal.id}
                              signal={signal}
                              onDetails={() => openSignalDetails(signal)}
                              translate={translate}
                            />
                          ))}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!isInitialLoading && signals.length === 0 && (
          <div className="mt-6 flex min-h-[180px] items-center justify-center rounded-lg border border-slate-200 bg-white/90 p-8 text-center text-slate-600 shadow-sm dark:border-gray-800 dark:bg-gray-950/85 dark:text-gray-400">
            <div>
              <Filter className="mx-auto mb-3 h-10 w-10 text-slate-400 dark:text-gray-600" />
              <p className="text-base">{translate("noSignalsFound", "No signals found")}</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-500">
                {translate("tryDifferentPair", "Try different filters")}
              </p>
            </div>
          </div>
        )}

        {signals.length > 0 && (
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={loadMore}
              disabled={!pagination.hasMore || isLoadingMore}
              className="min-w-[150px] bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-gray-800"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {translate("loadingSignals", "Loading")}
                </>
              ) : pagination.hasMore ? (
                translate("loadMore", "Load More")
              ) : (
                translate("noMoreSignals", "No More Signals")
              )}
            </Button>
          </div>
        )}

        <RiskCalculator translate={translate} />
      </div>

      {selectedSignal && (
        <SignalDetailsModal
          signal={selectedSignal}
          copiedSignalId={copiedSignalId}
          onClose={closeSignalDetails}
          onCopy={() => copySignal(selectedSignal)}
          translate={translate}
        />
      )}
    </div>
  );
}

function SignalTableRows({
  signal,
  onDetails,
  translate,
}: {
  signal: DisplaySignal;
  onDetails: () => void;
  translate: (key: string, fallback: string) => string;
}) {
  return (
      <tr className="border-t border-slate-200 transition-colors hover:bg-slate-50 dark:border-gray-900 dark:hover:bg-gray-900/70">
        <td className="px-4 py-3 font-semibold text-slate-950 dark:text-white">{signal.pair}</td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
              getDirectionClass(signal.type)
            )}
          >
            {signal.type === "buy" ? (
              <ArrowUpCircle className="h-3.5 w-3.5" />
            ) : (
              <ArrowDownCircle className="h-3.5 w-3.5" />
            )}
            {signal.type === "buy"
              ? translate("buy", "Buy")
              : translate("sell", "Sell")}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-700 dark:text-gray-200">
          {formatNumber(signal.price)}
        </td>
        <td className="px-4 py-3 text-red-600 dark:text-red-300">
          {formatNumber(signal.stopLoss)}
        </td>
        <td className="px-4 py-3 text-emerald-600 dark:text-green-300">
          {formatNumber(signal.takeProfit[0])}
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
              getStatusClass(signal)
            )}
          >
            {translate(getSignalStatusKey(signal), getSignalStatus(signal))}
          </span>
        </td>
        <td className="px-4 py-3">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold",
              getResultClass(signal)
            )}
          >
            {getResultIcon(signal)}
            {translate(getSignalResultKey(signal), getSignalResult(signal))}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{signal.timestamp}</td>
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-200 dark:hover:bg-blue-500/20"
          >
            <Info className="h-3.5 w-3.5" />
            {translate("details", "Details")}
          </button>
        </td>
      </tr>
  );
}

function SignalDetailsModal({
  signal,
  copiedSignalId,
  onClose,
  onCopy,
  translate,
}: {
  signal: DisplaySignal;
  copiedSignalId: string | null;
  onClose: () => void;
  onCopy: () => void;
  translate: (key: string, fallback: string) => string;
}) {
  const timeline = [
    {
      label: translate("timelinePublished", "Published"),
      active: Boolean(signal.createdAt || signal.timestamp),
    },
    { label: translate("timelineEntryActivated", "Entry Activated"), active: true },
    { label: translate("timelineTpHit", "TP Hit"), active: signal.closeReason === "TP" },
    { label: translate("timelineSlHit", "SL Hit"), active: signal.closeReason === "SL" },
    { label: translate("timelineClosed", "Closed"), active: signal.isOpen === false },
    {
      label: translate("timelineExpired", "Expired"),
      active: signal.isOpen === false && !signal.closeReason,
    },
  ];

  const scrollToRiskTool = () => {
    onClose();
    window.setTimeout(() => {
      document
        .getElementById("risk-tool")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm dark:bg-black/75 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={translate("signalDetails", "Signal details")}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-slate-200 bg-white text-slate-950 shadow-2xl dark:border-gray-800 dark:bg-gray-950 dark:text-white md:max-w-3xl md:rounded-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-4 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold">{signal.pair}</h2>
              <span
                className={cn(
                  "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
                  getDirectionClass(signal.type)
                )}
              >
                {signal.type === "buy"
                  ? translate("buy", "Buy")
                  : translate("sell", "Sell")}
              </span>
              <span
                className={cn(
                  "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                  getStatusClass(signal)
                )}
              >
                {translate(getSignalStatusKey(signal), getSignalStatus(signal))}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              {formatDetailsDate(signal.createdAt)} / {signal.timestamp}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-white"
            aria-label={translate("closeSignalDetails", "Close signal details")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-4 md:p-6">
          <div
            className={cn(
              "rounded-lg border p-4",
              getResultClass(signal)
            )}
          >
            <div className="text-xs uppercase opacity-75">
              {translate("result", "Result")}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-semibold">
              {getResultIcon(signal)}
              {translate(getSignalResultKey(signal), getSignalResult(signal))}
              {!signal.isOpen && signal.closePrice !== undefined && (
                <span className="text-xs font-medium opacity-80">
                  {translate("closePrice", "Close Price")}:{" "}
                  {formatNumber(signal.closePrice)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <DetailValue
              label={translate("symbol", "Symbol")}
              value={signal.pair}
            />
            <DetailValue
              label={translate("directionLabel", "Direction")}
              value={
                signal.type === "buy"
                  ? translate("buy", "Buy")
                  : translate("sell", "Sell")
              }
            />
            <DetailValue
              label={translate("entryPrice", "Entry")}
              value={formatNumber(signal.price)}
            />
            <DetailValue
              label={translate("stopLoss", "Stop Loss")}
              value={formatNumber(signal.stopLoss)}
              valueClassName="text-red-600 dark:text-red-300"
            />
            <DetailValue
              label={translate("takeProfit1", "Take Profit 1")}
              value={formatNumber(signal.takeProfit[0])}
              valueClassName="text-emerald-600 dark:text-green-300"
            />
            <DetailValue
              label={translate("riskReward", "Risk/Reward")}
              value={getRiskReward(signal)}
            />
            <DetailValue
              label={translate("pipsLabel", "Pips")}
              value={getSignalPips(signal, translate)}
            />
            <DetailValue
              label={translate("time", "Time")}
              value={signal.timestamp}
            />
            <DetailValue
              label={translate("source", "Source")}
              value={signal.source || "-"}
            />
            <DetailValue
              label={translate("resultSource", "Result Source")}
              value={getResultSourceLabel(signal, translate)}
            />
            <DetailValue
              label={translate("closedAt", "Closed At")}
              value={formatDetailsDate(signal.closedAt)}
            />
            <DetailValue
              label={translate("ticket", "Ticket")}
              value={signal.ticket || "-"}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-black/25">
            <h3 className="mb-2 text-sm font-semibold text-slate-950 dark:text-white">
              {translate("analysisReason", "Analysis reason")}
            </h3>
            <p className="text-sm leading-6 text-slate-600 dark:text-gray-400">
              {getAnalysisReason(signal, translate)}
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-black/25">
            <h3 className="mb-4 text-sm font-semibold text-slate-950 dark:text-white">
              {translate("signalTimeline", "Signal timeline")}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {timeline.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "rounded-md border px-3 py-2 text-xs font-semibold",
                    item.active
                      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-500/35 dark:bg-blue-500/10 dark:text-blue-200"
                      : "border-slate-200 bg-white text-slate-500 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500"
                  )}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={onCopy}
              className="bg-blue-600 text-white hover:bg-blue-500"
            >
              <Copy className="mr-2 h-4 w-4" />
              {copiedSignalId === signal.id
                ? translate("copied", "Copied")
                : translate("copySignal", "Copy Signal")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={scrollToRiskTool}
              className="border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-900 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-100 dark:hover:bg-blue-500/20 dark:hover:text-white"
            >
              <Calculator className="mr-2 h-4 w-4" />
              {translate("openRiskCalculator", "Open Risk Calculator")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskCalculator({
  translate,
}: {
  translate: (key: string, fallback: string) => string;
}) {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [stopLossPips, setStopLossPips] = useState(30);
  const riskAmount = accountBalance * (riskPercent / 100);
  const lotSize =
    stopLossPips > 0 ? riskAmount / (stopLossPips * 10) : 0;

  return (
    <section
      id="risk-tool"
      className="mt-10 rounded-lg border border-blue-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-blue-500/20 dark:bg-gray-950/85 md:p-6"
    >
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
            {translate("riskCalculator", "Risk Calculator")}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
            {translate(
              "riskCalculatorDescription",
              "Estimate lot size using account balance, risk percentage, and stop loss distance. Assumes $10 per pip for one standard lot."
            )}
          </p>
        </div>
        <Calculator className="h-8 w-8 text-blue-500 dark:text-blue-300" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <CalculatorField
          label={translate("accountBalance", "Account balance")}
          value={accountBalance}
          min={0}
          step={100}
          onChange={setAccountBalance}
        />
        <CalculatorField
          label={translate("riskPercent", "Risk %")}
          value={riskPercent}
          min={0}
          step={0.1}
          onChange={setRiskPercent}
        />
        <CalculatorField
          label={translate("stopLossPips", "Stop loss pips")}
          value={stopLossPips}
          min={0}
          step={1}
          onChange={setStopLossPips}
        />
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
          <div className="text-xs font-medium uppercase text-blue-600 dark:text-blue-200">
            {translate("recommendedLotSize", "Recommended lot size")}
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {Number.isFinite(lotSize) ? lotSize.toFixed(2) : "0.00"}
          </div>
          <div className="mt-1 text-xs text-blue-600/80 dark:text-blue-100/80">
            {translate("riskAmount", "Risk amount")}: ${riskAmount.toFixed(2)}
          </div>
        </div>
      </div>
    </section>
  );
}

function CalculatorField({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium uppercase text-slate-500 dark:text-gray-500">
      {label}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition-colors focus:border-blue-500 dark:border-gray-800 dark:bg-black dark:text-white"
      />
    </label>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  colorClass: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-950/85">
      <div className={cn("mb-3 inline-flex rounded-md border p-2", colorClass)}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-slate-950 dark:text-white">{value}</div>
      <div className="mt-1 text-xs font-medium uppercase text-slate-500 dark:text-gray-500">
        {label}
      </div>
    </div>
  );
}

function DailySummaryStats({
  summary,
  count,
  translate,
}: {
  summary: DailySignalSummary;
  count: number;
  translate: (key: string, fallback: string) => string;
}) {
  const netClass =
    summary.netPips > 0
      ? "text-emerald-600 dark:text-green-300"
      : summary.netPips < 0
        ? "text-red-600 dark:text-red-300"
        : "text-slate-600 dark:text-gray-300";

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
      <span>
        {count} {translate("signals", "Signals")}
      </span>
      <span className="text-emerald-600 dark:text-green-300">
        {translate("tpHit", "TP Hit")}: {summary.tpHit}
      </span>
      <span className="text-red-600 dark:text-red-300">
        {translate("slHit", "SL Hit")}: {summary.slHit}
      </span>
      <span className="text-emerald-600 dark:text-green-300">
        {translate("dailyProfit", "Profit")}: +
        {formatPipsValue(summary.profitPips)} {translate("pips", "pips")}
      </span>
      <span className="text-red-600 dark:text-red-300">
        {translate("dailyLoss", "Loss")}: -
        {formatPipsValue(summary.lossPips)} {translate("pips", "pips")}
      </span>
      <span className={netClass}>
        {translate("dailyNet", "Net")}:{" "}
        {formatPipsValue(summary.netPips, { signed: true })}{" "}
        {translate("pips", "pips")}
      </span>
    </span>
  );
}

function DateGroupHeading({
  label,
  count,
  summary,
  isOpen,
  onToggle,
  translate,
}: {
  label: string;
  count: number;
  summary: DailySignalSummary;
  isOpen: boolean;
  onToggle: () => void;
  translate: (key: string, fallback: string) => string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full flex-col gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-3 text-left text-sm font-semibold text-blue-700 shadow-sm dark:border-gray-800 dark:bg-gray-950/85 dark:text-blue-100"
      aria-expanded={isOpen}
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-blue-500 dark:text-blue-300" />
          <span>{label}</span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-blue-500 transition-transform dark:text-blue-300",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
      </span>
      <DailySummaryStats
        summary={summary}
        count={count}
        translate={translate}
      />
    </button>
  );
}

function DetailValue({
  label,
  value,
  valueClassName,
  title,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  title?: string;
}) {
  return (
    <div className="min-w-0">
      <div className="text-slate-500 dark:text-gray-500">{label}</div>
      <div
        className={cn("mt-1 font-semibold text-slate-800 dark:text-gray-200", valueClassName)}
        title={title}
      >
        {value}
      </div>
    </div>
  );
}
