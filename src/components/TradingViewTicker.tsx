"use client";

import React, { useEffect, useRef } from "react";

export function TradingViewTicker() {
  const containerRef = useRef<HTMLDivElement>(null);
  const styleElementRef = useRef<HTMLStyleElement | null>(null);

  // This effect runs after the component mounts to create the widget
  useEffect(() => {
    // Skip if the container is not available or script has already been loaded
    if (
      !containerRef.current ||
      containerRef.current.querySelector(
        ".tradingview-widget-container__widget"
      )
    ) {
      return;
    }

    // Create widget container
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    containerRef.current.appendChild(widgetContainer);

    // Add the script element to the container
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.innerHTML = JSON.stringify({
      symbols: [
        {
          proName: "BINANCE:BTCUSDT",
          title: "BTCUSD",
        },
        {
          proName: "BINANCE:ETHUSDT",
          title: "ETHUSD",
        },
        {
          proName: "FOREXCOM:NSXUSD",
          title: "US100",
        },
        {
          proName: "OANDA:XAUUSD",
          title: "XAUUSD",
        },
        {
          proName: "FOREXCOM:SPXUSD",
          title: "S&P 500",
        },
      ],
      showSymbolLogo: true,
      isTransparent: false,
      displayMode: "adaptive",
      colorTheme: "light",
      locale: "en",
    });
    containerRef.current.appendChild(script);

    // Add CSS to hide the "Track all markets on TradingView" link
    const style = document.createElement("style");
    style.textContent = `
      .tradingview-widget-copyright {
        display: none !important;
        visibility: hidden !important;
      }
      .forex-ticker-wrapper .tradingview-widget-container__widget + div {
        display: none !important;
        visibility: hidden !important;
      }
      /* Mobile responsive styles */
      @media (max-width: 768px) {
        .tradingview-widget-container__widget {
          height: auto !important;
          overflow: visible !important;
          z-index: 50 !important;
        }
      }
    `;
    document.head.appendChild(style);
    styleElementRef.current = style;

    // Cleanup function to remove the script and style when component unmounts
    return () => {
      if (containerRef.current) {
        const scriptElement = containerRef.current.querySelector("script");
        if (scriptElement) {
          scriptElement.remove();
        }
      }

      if (styleElementRef.current) {
        styleElementRef.current.remove();
      }
    };
  }, []);

  return (
    <div
      className="tradingview-widget-container forex-ticker-wrapper relative z-50 h-[54px] w-full overflow-hidden"
      ref={containerRef}
    ></div>
  );
}
