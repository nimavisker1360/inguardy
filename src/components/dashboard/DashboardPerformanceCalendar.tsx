"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type CalendarDay = {
  date: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
};

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: Math.abs(value) >= 10000 ? "compact" : "standard",
      maximumFractionDigits: Math.abs(value) >= 1000 ? 1 : 0,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value)} ${currency}`;
  }
}

export function DashboardPerformanceCalendar({ accountId, currency }: { accountId: string; currency: string }) {
  const { language } = useLanguage();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return { month: now.getUTCMonth() + 1, year: now.getUTCFullYear() };
  });
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const isFa = language === "fa";

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ month: String(visibleMonth.month), year: String(visibleMonth.year) });
    if (accountId) params.set("accountId", accountId);
    setLoading(true);
    setFailed(false);
    fetch(`/api/journal/calendar?${params}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("calendar request failed");
        return response.json() as Promise<{ success: boolean; days: CalendarDay[] }>;
      })
      .then((result) => {
        if (!result.success) throw new Error("calendar request failed");
        setDays(result.days);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setFailed(true);
        setDays([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [accountId, visibleMonth]);

  const { weeks, monthLabel } = useMemo(() => {
    const first = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1, 1));
    const count = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 0)).getUTCDate();
    const offset = first.getUTCDay();
    const cells = Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
      const day = index - offset + 1;
      return day > 0 && day <= count
        ? { day, date: `${visibleMonth.year}-${String(visibleMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}` }
        : null;
    });
    return {
      cells,
      weeks: Array.from({ length: cells.length / 7 }, (_, index) => cells.slice(index * 7, index * 7 + 7)),
      monthLabel: new Intl.DateTimeFormat(isFa ? "fa-IR-u-ca-gregory" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(first),
    };
  }, [isFa, visibleMonth]);
  const byDate = new Map(days.map((day) => [day.date, day]));
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(isFa ? "fa-IR" : "en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 8, 6 + index)))
  );

  function shiftMonth(amount: number) {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month - 1 + amount, 1));
    setVisibleMonth({ month: next.getUTCMonth() + 1, year: next.getUTCFullYear() });
  }

  const calendarParams = new URLSearchParams({ month: String(visibleMonth.month), year: String(visibleMonth.year) });
  if (accountId) calendarParams.set("accountId", accountId);

  return (
    <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{isFa ? "تقویم عملکرد" : "Performance calendar"}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">{loading ? (isFa ? "در حال بارگذاری..." : "Loading...") : monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label={isFa ? "ماه قبل" : "Previous month"} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label={isFa ? "ماه بعد" : "Next month"} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700"><ChevronRight className="h-4 w-4" /></button>
          <Link href={`/journal/calendar?${calendarParams}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">{isFa ? "نمای روزانه" : "Day view"}</Link>
        </div>
      </div>
      {failed ? <p className="mb-3 text-sm text-red-500">{isFa ? "دریافت تقویم ممکن نشد." : "Could not load the calendar."}</p> : null}
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
            {weekdays.map((day, index) => <span key={index} className="py-2">{day}</span>)}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-1">
              {week.map((cell, index) => {
                if (!cell) return <div key={index} className="min-h-20 rounded-md bg-slate-50 dark:bg-slate-900/40" />;
                const day = byDate.get(cell.date);
                const pnl = day?.totalPnL || 0;
                const params = new URLSearchParams({ month: String(visibleMonth.month), year: String(visibleMonth.year), selectedDate: cell.date });
                if (accountId) params.set("accountId", accountId);
                return (
                  <Link key={cell.date} href={`/journal/calendar?${params}`} aria-label={`${cell.date}: ${money(pnl, currency)}`} className={cn("min-h-20 rounded-md border p-2 transition hover:ring-2 hover:ring-blue-400", pnl > 0 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50" : pnl < 0 ? "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/50" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40") }>
                    <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">{cell.day}</span>
                    {day ? <><strong className={cn("mt-1 block text-sm", pnl > 0 ? "text-emerald-700 dark:text-emerald-300" : pnl < 0 ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-300")}>{money(pnl, currency)}</strong><span className="block text-[10px] text-slate-500 dark:text-slate-400">{day.totalTrades} {isFa ? "معامله" : "trades"}</span></> : null}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
