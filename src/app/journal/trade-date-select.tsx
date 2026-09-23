"use client";

import { useTransition } from "react";
import { CalendarDays, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

export function TradeDateSelect({
  currentDate,
  totalTrades,
  language,
}: {
  currentDate: string;
  totalTrades: number;
  language: "en" | "fa";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function updateDate(date: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (date) {
      // A selected calendar day is represented as an inclusive range.
      params.set("dateFrom", date);
      params.set("dateTo", date);
    } else {
      params.delete("dateFrom");
      params.delete("dateTo");
    }

    params.delete("page");
    const query = params.toString();
    startTransition(() => router.push(query ? `/journal?${query}` : "/journal"));
  }

  return (
    <div className="relative flex min-h-[66px] min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-500/10 dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
        <CalendarDays className="h-4 w-4" />
      </div>
      <label className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <span>{language === "fa" ? "تاریخ معامله" : "Trade date"}</span>
          {currentDate ? (
            <span className="shrink-0 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300">
              {totalTrades} {language === "fa" ? "معامله" : totalTrades === 1 ? "trade" : "trades"}
            </span>
          ) : null}
        </span>
        <input
          type="date"
          value={currentDate}
          onChange={(event) => updateDate(event.target.value)}
          disabled={isPending}
          aria-label={language === "fa" ? "انتخاب تاریخ معامله" : "Select trade date"}
          className="mt-0.5 block h-7 w-full min-w-24 cursor-pointer bg-transparent text-sm font-semibold text-slate-900 outline-none disabled:cursor-wait disabled:opacity-60 dark:[color-scheme:dark] dark:text-white"
        />
      </label>
      {currentDate ? (
        <button
          type="button"
          onClick={() => updateDate("")}
          disabled={isPending}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-wait dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={language === "fa" ? "حذف فیلتر تاریخ" : "Clear date filter"}
          title={language === "fa" ? "حذف فیلتر تاریخ" : "Clear date filter"}
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
