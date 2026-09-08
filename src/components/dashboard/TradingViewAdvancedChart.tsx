"use client";

import { useEffect, useRef, useState } from "react";

type TradingViewTheme = "light" | "dark";

type TradingViewAdvancedChartProps = {
  symbol: string;
  interval: string;
};

function getDashboardTheme(): TradingViewTheme {
  if (typeof document === "undefined") {
    return "dark";
  }

  const theme = document.documentElement.dataset.dashboardTheme;
  if (theme === "light" || theme === "dark") {
    return theme;
  }

  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function TradingViewAdvancedChart({ symbol, interval }: TradingViewAdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<TradingViewTheme>("dark");

  useEffect(() => {
    setTheme(getDashboardTheme());

    const observer = new MutationObserver(() => {
      setTheme(getDashboardTheme());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-dashboard-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.replaceChildren();

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget h-full w-full";
    container.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme,
      style: "1",
      locale: "en",
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      container.replaceChildren();
    };
  }, [interval, symbol, theme]);

  return (
    <div className="h-[500px] min-h-[420px] w-full overflow-hidden rounded-lg bg-white dark:bg-[#0F172A] lg:h-[620px]">
      <div ref={containerRef} className="tradingview-widget-container h-full w-full" />
    </div>
  );
}
