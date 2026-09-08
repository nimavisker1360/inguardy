"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SmartChartCandle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type SmartChartZone = {
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

export type SmartChartStructure = {
  bias: "bullish" | "bearish" | "neutral";
  lastBOS?: number;
  lastCHoCH?: number;
  invalidation?: number;
};

type OverlayZone = {
  id: string;
  left: number;
  right: number;
  top: number;
  height: number;
  className: string;
  label: string;
};

type SmartAIChartProps = {
  symbol: string;
  timeframe: string;
  candles?: SmartChartCandle[];
  zones?: SmartChartZone[];
  currentPrice?: number;
  structure?: SmartChartStructure;
  invalidation?: number;
};

function toChartTime(time: number): UTCTimestamp {
  return Math.floor(time > 10_000_000_000 ? time / 1000 : time) as UTCTimestamp;
}

function isDarkDashboard() {
  if (typeof document === "undefined") {
    return true;
  }

  const theme = document.documentElement.dataset.dashboardTheme;
  if (theme === "dark") {
    return true;
  }
  if (theme === "light") {
    return false;
  }

  return document.documentElement.classList.contains("dark");
}

function zoneClass(type: SmartChartZone["type"]) {
  if (type === "resistance" || type === "supply") {
    return "border-red-500/40 bg-red-500/15 text-red-700 dark:text-red-100";
  }
  if (type === "support" || type === "demand") {
    return "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-100";
  }

  return "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-100";
}

function zoneLabel(zone: SmartChartZone, nearestResistanceId?: string, nearestSupportId?: string) {
  if (zone.id === nearestResistanceId) {
    return "نزدیک‌ترین مقاومت";
  }
  if (zone.id === nearestSupportId) {
    return "نزدیک‌ترین حمایت";
  }
  if (zone.type === "supply") {
    return "Supply Zone";
  }
  if (zone.type === "demand") {
    return "Demand Zone";
  }
  if (zone.type === "order_block") {
    return "Order Block";
  }
  if (zone.type === "resistance") {
    return "Resistance";
  }

  return "Support";
}

function findNearestResistance(zones: SmartChartZone[], currentPrice?: number) {
  if (!Number.isFinite(currentPrice)) {
    return undefined;
  }

  return zones
    .filter((zone) => ["resistance", "supply"].includes(zone.type) && zone.from >= currentPrice!)
    .sort((a, b) => a.from - b.from || b.strength - a.strength)[0];
}

function findNearestSupport(zones: SmartChartZone[], currentPrice?: number) {
  if (!Number.isFinite(currentPrice)) {
    return undefined;
  }

  return zones
    .filter((zone) => ["support", "demand"].includes(zone.type) && zone.to <= currentPrice!)
    .sort((a, b) => b.to - a.to || b.strength - a.strength)[0];
}

export function SmartAIChart({
  symbol,
  timeframe,
  candles = [],
  zones = [],
  currentPrice,
  structure,
  invalidation,
}: SmartAIChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [overlays, setOverlays] = useState<OverlayZone[]>([]);
  const [isReady, setIsReady] = useState(false);

  const chartCandles = useMemo<CandlestickData<UTCTimestamp>[]>(() => {
    return candles
      .filter(
        (candle) =>
          Number.isFinite(candle.time) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close)
      )
      .sort((a, b) => a.time - b.time)
      .map((candle) => ({
        time: toChartTime(candle.time),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));
  }, [candles]);

  const nearestResistance = useMemo(() => findNearestResistance(zones, currentPrice), [currentPrice, zones]);
  const nearestSupport = useMemo(() => findNearestSupport(zones, currentPrice), [currentPrice, zones]);

  const syncOverlays = useCallback(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    const container = containerRef.current;

    if (!chart || !series || !container || !zones.length) {
      setOverlays([]);
      return;
    }

    const nextOverlays = zones
      .map((zone) => {
        const yTop = series.priceToCoordinate(Math.max(zone.from, zone.to));
        const yBottom = series.priceToCoordinate(Math.min(zone.from, zone.to));
        const originTime = zone.originTime ?? candles[0]?.time;
        const xOrigin = originTime ? chart.timeScale().timeToCoordinate(toChartTime(originTime)) : null;

        if (yTop === null || yBottom === null || xOrigin === null) {
          return null;
        }

        const labelGutter = 72;
        const left = Math.max(0, Math.min(xOrigin, container.clientWidth - labelGutter - 8));
        const right = labelGutter;
        const top = Math.min(yTop, yBottom);
        const height = Math.max(5, Math.abs(yBottom - yTop));

        return {
          id: zone.id,
          left,
          right,
          top,
          height,
          className: zoneClass(zone.type),
          label: zoneLabel(zone, nearestResistance?.id, nearestSupport?.id),
        };
      })
      .filter((item): item is OverlayZone => Boolean(item))
      .filter((item) => item.top < container.clientHeight && item.top + item.height > 0)
      .sort((a, b) => a.top - b.top);

    setOverlays(nextOverlays);
  }, [candles, nearestResistance?.id, nearestSupport?.id, zones]);

  useEffect(() => {
    setIsDark(isDarkDashboard());

    const observer = new MutationObserver(() => {
      setIsDark(isDarkDashboard());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-dashboard-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !chartCandles.length) {
      return;
    }

    setIsReady(false);
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#0F172A" : "#FFFFFF" },
        textColor: isDark ? "#CBD5E1" : "#334155",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.22)" },
        horzLines: { color: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(148, 163, 184, 0.22)" },
      },
      rightPriceScale: {
        borderColor: isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.45)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(148, 163, 184, 0.25)" : "rgba(148, 163, 184, 0.45)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10B981",
      downColor: "#EF4444",
      borderUpColor: "#10B981",
      borderDownColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
      priceLineVisible: false,
    });

    series.setData(chartCandles);

    if (Number.isFinite(currentPrice)) {
      series.createPriceLine({
        price: currentPrice!,
        color: "#2563EB",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: "Current",
      });
    }

    if (Number.isFinite(invalidation)) {
      series.createPriceLine({
        price: invalidation!,
        color: "#F59E0B",
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "Invalidation",
      });
    }

    chart.timeScale().fitContent();

    chartRef.current = chart;
    seriesRef.current = series;

    const onRangeChange = () => syncOverlays();
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);

    resizeObserverRef.current = new ResizeObserver(() => {
      syncOverlays();
    });
    resizeObserverRef.current.observe(container);

    window.setTimeout(() => {
      setIsReady(true);
      syncOverlays();
    }, 120);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [chartCandles, currentPrice, invalidation, isDark, syncOverlays]);

  useEffect(() => {
    syncOverlays();
  }, [syncOverlays]);

  if (!chartCandles.length) {
    return (
      <div className="flex h-[420px] min-h-[360px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400">
        داده کندلی برای نمایش چارت هوشمند موجود نیست.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative h-[500px] min-h-[380px] overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0F172A] lg:h-[620px]">
        {!isReady ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 text-sm font-semibold text-slate-500 backdrop-blur-sm dark:bg-[#0F172A]/70 dark:text-slate-300">
            در حال آماده سازی چارت هوشمند...
          </div>
        ) : null}

        <div ref={containerRef} className="absolute inset-0" />

        {zones.length ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            {overlays.map((overlay) => (
              <div
                key={overlay.id}
                className={cn("absolute border-y", overlay.className)}
                style={{ left: overlay.left, right: overlay.right, top: overlay.top, height: overlay.height }}
              >
                <div className="absolute right-[-68px] top-1/2 max-w-[130px] -translate-y-1/2 rounded border border-current/20 bg-white/90 px-2 py-1 text-[10px] font-black shadow-sm dark:bg-slate-950/90">
                  {overlay.label}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-400">
            هنوز ناحیه‌ای برای نمایش روی چارت شناسایی نشده است.
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200">
          <span dir="ltr">{symbol}</span>
          <span className="mx-1 text-slate-400">/</span>
          <span>{timeframe}</span>
          {structure?.bias ? <span className="mr-2 text-blue-600 dark:text-blue-300">{structure.bias}</span> : null}
        </div>
      </div>

      <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-100">
        این چارت بر اساس داده‌های دریافتی سیستم Tradivix ساخته شده و ممکن است با چارت TradingView اختلاف جزئی داشته باشد.
      </p>
    </div>
  );
}
