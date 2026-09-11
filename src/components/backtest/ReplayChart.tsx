"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type UTCTimestamp,
} from "lightweight-charts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BacktestPriceLevel, SimulatedPosition } from "@/lib/backtest-simulation";
import { calculateEma } from "@/lib/chart-indicators";
import { cn } from "@/lib/utils";

export type ReplayCandle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type ReplayChartProps = {
  symbol: string;
  timeframe: string;
  candles: ReplayCandle[];
  emptyMessage: string;
  loadingMessage: string;
  position?: SimulatedPosition | null;
  onPositionChange?: (level: BacktestPriceLevel, price: number) => void;
  entryLocked?: boolean;
  className?: string;
};

type PositionOverlay = {
  left: number;
  width: number;
  entryY: number;
  stopY: number;
  targetY: number;
};

const EMA_CONFIG = [
  { period: 20, color: "#f97316" },
  { period: 50, color: "#2563eb" },
  { period: 100, color: "#10b981" },
  { period: 200, color: "#a855f7" },
] as const;

function isDarkDashboard() {
  if (typeof document === "undefined") return false;
  const theme = document.documentElement.dataset.dashboardTheme;
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return document.documentElement.classList.contains("dark");
}

function candleTime(value: string): UTCTimestamp {
  return Math.floor(new Date(value).getTime() / 1000) as UTCTimestamp;
}

function priceLabel(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 5 });
}

export function ReplayChart({
  symbol,
  timeframe,
  candles,
  emptyMessage,
  loadingMessage,
  position,
  onPositionChange,
  entryLocked = false,
  className,
}: ReplayChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const emaSeriesRefs = useRef<Array<{ period: number; series: ISeriesApi<"Line"> }>>([]);
  const positionRef = useRef(position);
  const positionIdRef = useRef<string | null>(null);
  const toolAnchorRatioRef = useRef(0.48);
  const [isDark, setIsDark] = useState(false);
  const [ready, setReady] = useState(false);
  const [positionOverlay, setPositionOverlay] = useState<PositionOverlay | null>(null);
  const [dragging, setDragging] = useState<BacktestPriceLevel | null>(null);

  const chartCandles = useMemo<CandlestickData<UTCTimestamp>[]>(
    () =>
      candles.map((candle) => ({
        time: candleTime(candle.time),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [candles]
  );
  const emaData = useMemo(
    () => EMA_CONFIG.map(({ period }) => ({
      period,
      points: calculateEma(candles, period).map<LineData<UTCTimestamp>>((point) => ({
        time: candleTime(point.time),
        value: point.value,
      })),
    })),
    [candles]
  );
  const syncPositionOverlay = useCallback(() => {
    const container = containerRef.current;
    const series = seriesRef.current;
    const currentPosition = positionRef.current;
    if (!container || !series || !currentPosition) {
      setPositionOverlay(null);
      return;
    }

    const entryY = series.priceToCoordinate(currentPosition.entry);
    const stopY = series.priceToCoordinate(currentPosition.stopLoss);
    const targetY = series.priceToCoordinate(currentPosition.takeProfit);
    if (entryY === null || stopY === null || targetY === null) {
      setPositionOverlay(null);
      return;
    }

    const containerWidth = container.clientWidth;
    const left = Math.max(28, Math.min(containerWidth * toolAnchorRatioRef.current, containerWidth - 240));
    const width = Math.max(150, containerWidth - left - 76);
    setPositionOverlay({ left, width, entryY, stopY, targetY });
  }, []);

  useEffect(() => {
    setIsDark(isDarkDashboard());
    const observer = new MutationObserver(() => setIsDark(isDarkDashboard()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-dashboard-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setReady(false);
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? "#0b1220" : "#ffffff" },
        textColor: isDark ? "#cbd5e1" : "#475569",
        fontFamily: "inherit",
      },
      grid: {
        vertLines: { color: isDark ? "rgba(148,163,184,.10)" : "rgba(148,163,184,.18)" },
        horzLines: { color: isDark ? "rgba(148,163,184,.10)" : "rgba(148,163,184,.18)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: isDark ? "rgba(148,163,184,.22)" : "rgba(148,163,184,.35)",
      },
      timeScale: {
        borderColor: isDark ? "rgba(148,163,184,.22)" : "rgba(148,163,184,.35)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderUpColor: "#10b981",
      borderDownColor: "#f43f5e",
      wickUpColor: "#059669",
      wickDownColor: "#e11d48",
      priceLineVisible: true,
      lastValueVisible: true,
    });
    emaSeriesRefs.current = EMA_CONFIG.map(({ period, color }) => ({
      period,
      series: chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    }));

    chartRef.current = chart;
    seriesRef.current = series;
    const syncOverlay = () => window.requestAnimationFrame(syncPositionOverlay);
    chart.timeScale().subscribeVisibleLogicalRangeChange(syncOverlay);
    const resizeObserver = new ResizeObserver(syncOverlay);
    resizeObserver.observe(container);
    setReady(true);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(syncOverlay);
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      emaSeriesRefs.current = [];
    };
  }, [isDark, syncPositionOverlay]);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;
    if (!chart || !series) return;

    series.setData(chartCandles);
    for (const emaSeries of emaSeriesRefs.current) {
      const data = emaData.find((item) => item.period === emaSeries.period);
      emaSeries.series.setData(data?.points ?? []);
    }
    if (chartCandles.length) {
      chart.timeScale().setVisibleLogicalRange({
        from: Math.max(0, chartCandles.length - 90),
        to: chartCandles.length + 5,
      });
    }
    window.requestAnimationFrame(syncPositionOverlay);
  }, [chartCandles, emaData, isDark, syncPositionOverlay]);

  useEffect(() => {
    if (position?.id && position.id !== positionIdRef.current) {
      positionIdRef.current = position.id;
      toolAnchorRatioRef.current = 0.48;
    }
    if (!position) positionIdRef.current = null;
    positionRef.current = position;
    window.requestAnimationFrame(syncPositionOverlay);
  }, [position, syncPositionOverlay]);

  useEffect(() => {
    if (!dragging || !onPositionChange) return;

    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current;
      const series = seriesRef.current;
      if (!container || !series) return;
      const bounds = container.getBoundingClientRect();
      if (dragging === "entry") {
        const pointerX = Math.max(28, Math.min(event.clientX - bounds.left, bounds.width - 240));
        toolAnchorRatioRef.current = pointerX / Math.max(bounds.width, 1);
      }
      const coordinate = Math.max(0, Math.min(event.clientY - bounds.top, bounds.height));
      const price = series.coordinateToPrice(coordinate);
      if (price !== null && Number.isFinite(price)) {
        onPositionChange(dragging, price);
        window.requestAnimationFrame(syncPositionOverlay);
      }
    };
    const stopDragging = () => setDragging(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging, { once: true });
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [dragging, onPositionChange, syncPositionOverlay]);

  const rewardTop = positionOverlay ? Math.min(positionOverlay.entryY, positionOverlay.targetY) : 0;
  const rewardHeight = positionOverlay ? Math.abs(positionOverlay.targetY - positionOverlay.entryY) : 0;
  const riskTop = positionOverlay ? Math.min(positionOverlay.entryY, positionOverlay.stopY) : 0;
  const riskHeight = positionOverlay ? Math.abs(positionOverlay.stopY - positionOverlay.entryY) : 0;
  const positionLocked = position?.status === "WON" || position?.status === "LOST";
  const positionStatusColor = position?.status === "WON"
    ? "bg-emerald-600"
    : position?.status === "LOST"
      ? "bg-rose-600"
      : position?.status === "OPEN"
        ? "bg-blue-600"
        : position?.status === "PENDING"
          ? "bg-amber-500"
          : "bg-slate-700";

  function dragHandle(level: BacktestPriceLevel, y: number, colorClass: string, label: string, price: number) {
    return (
      <div className="absolute z-20" style={{ left: positionOverlay!.left, top: y - 1, width: positionOverlay!.width }}>
        <div className={cn("h-0.5 w-full", colorClass)} />
        <button
          type="button"
          disabled={positionLocked || (position?.status === "OPEN" && level === "entry" && entryLocked)}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setDragging(level);
          }}
          className={cn(
            "absolute -left-2.5 top-1/2 h-5 w-5 -translate-y-1/2 touch-none rounded-md border-2 border-white shadow-md ring-2 ring-slate-900/10 transition-transform hover:scale-110",
            colorClass,
            positionLocked ? "cursor-default" : level === "entry" ? "cursor-move" : "cursor-ns-resize"
          )}
          aria-label={level === "entry" ? "Drag Entry horizontally and vertically" : `Drag ${label}`}
          title={level === "entry" ? "Drag Entry in any direction" : `Drag ${label}`}
        />
        <div className={cn("absolute right-0 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[10px] font-semibold text-white shadow", colorClass)} dir="ltr">
          {label} {priceLabel(price)}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-[500px] min-h-[360px] overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0b1220] lg:h-full lg:min-h-0", className)}>
      <div ref={containerRef} className="absolute inset-0" />

      {position && positionOverlay && !positionLocked ? (
        <div className="pointer-events-none absolute inset-0 z-10">
          <div
            className="absolute border-x border-emerald-500/30 bg-emerald-500/20"
            style={{ left: positionOverlay.left, top: rewardTop, width: positionOverlay.width, height: Math.max(rewardHeight, 2) }}
          />
          <div
            className="absolute border-x border-rose-500/30 bg-rose-500/20"
            style={{ left: positionOverlay.left, top: riskTop, width: positionOverlay.width, height: Math.max(riskHeight, 2) }}
          />
          <div className="pointer-events-auto">
            {dragHandle("takeProfit", positionOverlay.targetY, "bg-emerald-500", "TP", position.takeProfit)}
            {dragHandle("entry", positionOverlay.entryY, "bg-blue-500", "ENTRY", position.entry)}
            {dragHandle("stopLoss", positionOverlay.stopY, "bg-rose-500", "SL", position.stopLoss)}
          </div>
          <div
            className={cn("absolute -translate-x-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-[11px] font-bold text-white shadow-lg", positionStatusColor)}
            style={{ left: positionOverlay.left + positionOverlay.width / 2, top: (positionOverlay.entryY + positionOverlay.stopY) / 2 }}
          >
            {position.direction} · {position.status}
          </div>
        </div>
      ) : null}

      {!ready ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/75 text-sm font-medium text-slate-500 backdrop-blur-sm dark:bg-slate-950/75 dark:text-slate-300">
          {loadingMessage}
        </div>
      ) : null}

      {ready && !candles.length ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center text-sm text-slate-500 dark:text-slate-400">
          {emptyMessage}
        </div>
      ) : null}

    </div>
  );
}
