"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignalCard } from "@/components/ui/signal-card";
import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  MotionDiv,
  MotionHeading,
} from "@/components/ui/motion-content";
import { useLanguage } from "@/lib/language-context";
import { fetchWebsiteSignals } from "@/lib/fetch-signals";
import type { DisplaySignal } from "@/lib/signal-types";

const RECENT_SIGNALS_REFRESH_INTERVAL = 5000;

export function RecentSignals({ variant = "landing" }: { variant?: "landing" | "dashboard" }) {
  const { t } = useLanguage();
  const [recentSignals, setRecentSignals] = useState<DisplaySignal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isDashboard = variant === "dashboard";

  const loadSignals = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await fetchWebsiteSignals({ limit: 3, page: 1 }, signal);

      setRecentSignals(data.signals);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadSignals(controller.signal);

    const intervalId = window.setInterval(() => {
      loadSignals();
    }, RECENT_SIGNALS_REFRESH_INTERVAL);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [loadSignals]);

  return (
    <section className={isDashboard ? "relative overflow-hidden rounded-lg" : "relative overflow-hidden bg-[#fbfbff] py-14"}>
      {!isDashboard && (
        <>
          <div className="absolute inset-0 bg-[linear-gradient(110deg,#ffffff_0%,#f7f9ff_38%,#f3efff_70%,#ffeaf7_100%)]" />
          <div className="absolute inset-x-0 top-0 h-20 bg-white/75 blur-2xl" />
        </>
      )}
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col items-center justify-center mb-8 border-b border-slate-200/80 pb-6 dark:border-slate-800">
          <MotionHeading className="text-3xl md:text-4xl font-bold text-[#10132f] mb-5 text-center dark:text-white">
            {t("latestSignals")}
          </MotionHeading>
          <Button
            variant="outline"
            asChild
            className="mx-auto h-10 rounded-lg border border-blue-300 bg-white px-5 py-2 text-sm font-bold text-blue-700 shadow-[0_10px_24px_rgba(37,99,235,0.12)] transition-colors hover:border-blue-600 hover:bg-blue-600 hover:text-white dark:border-blue-500/30 dark:bg-slate-900 dark:text-blue-100 dark:hover:bg-blue-600"
          >
            <Link href="/signals" className="flex items-center justify-center">
              {t("viewAllSignals") === "viewAllSignals"
                ? "View All Signals"
                : t("viewAllSignals")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {isLoading &&
            recentSignals.length === 0 &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[124px] animate-pulse rounded-lg border border-slate-200 bg-white/75 p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-7 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="mt-3 h-11 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="mt-3 h-6 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}

          {recentSignals.length > 0 ? (
            recentSignals.map((signal, index) => (
              <MotionDiv
                key={signal.id}
                className="rounded-lg overflow-hidden"
                delay={index * 0.1}
              >
                <SignalCard {...signal} detailsHref="/signals" />
              </MotionDiv>
            ))
          ) : !isLoading ? (
            <div className="md:col-span-3 min-h-[120px] flex items-center justify-center text-center p-6 text-slate-500 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              {t("noSignalsFound")}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
