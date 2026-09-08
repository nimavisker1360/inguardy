"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Loader2, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type DateFilter = "today" | "tomorrow" | "week";
type CurrencyFilter = "All" | "USD" | "EUR" | "GBP" | "JPY" | "CAD" | "AUD" | "NZD" | "CHF";
type ImpactFilter = "All" | "High" | "Medium" | "Low";

type EconomicEventDto = {
  id: string;
  name: string;
  currency: string;
  impact: string;
  category: string | null;
  eventTime: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  outcome: string | null;
  strength: string | null;
  quality: string | null;
  source: string;
};

const currencies: CurrencyFilter[] = ["All", "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "NZD", "CHF"];
const impacts: ImpactFilter[] = ["All", "High", "Medium", "Low"];
const text = {
  en: {
    title: "Economic Calendar",
    subtitle: "Track upcoming high-impact forex events before trading.",
    refresh: "Refresh",
    nextHighImpactEvent: "Next High Impact Event",
    noHighImpact: "No high-impact events coming soon.",
    highImpactAlert: (currency: string, time: string, name: string) =>
      `High impact ${currency} event ${time}: ${name}`,
    date: "Date",
    today: "Today",
    tomorrow: "Tomorrow",
    thisWeek: "This Week",
    currency: "Currency",
    impact: "Impact",
    all: "All",
    high: "High",
    medium: "Medium",
    low: "Low",
    none: "None",
    eventsTitle: "Forex Factory Style Events",
    eventsCount: (count: number) => `${count} events`,
    loading: "Loading economic events...",
    loadFailed: "Failed to load economic calendar",
    tryAgain: "Try again",
    emptyTitle: "No economic events found.",
    emptyHint: "Run the calendar import endpoint or widen the filters.",
    columns: {
      time: "Time",
      country: "Country",
      currency: "Currency",
      impact: "Impact",
      event: "Event",
      actual: "Actual",
      forecast: "Forecast",
      previous: "Previous",
      status: "Status",
    },
    status: {
      upcoming: "Upcoming",
      soon: "Soon",
      released: "Released",
    },
  },
  fa: {
    title: "تقویم اقتصادی",
    subtitle: "رویدادهای مهم فارکس را قبل از معامله بررسی کنید.",
    refresh: "بروزرسانی",
    nextHighImpactEvent: "رویداد مهم بعدی",
    noHighImpact: "رویداد پراثر نزدیک وجود ندارد.",
    highImpactAlert: (currency: string, time: string, name: string) =>
      `رویداد پراثر ${currency} ${time}: ${name}`,
    date: "تاریخ",
    today: "امروز",
    tomorrow: "فردا",
    thisWeek: "این هفته",
    currency: "ارز",
    impact: "اثر",
    all: "همه",
    high: "زیاد",
    medium: "متوسط",
    low: "کم",
    none: "نامشخص",
    eventsTitle: "رویدادهای سبک Forex Factory",
    eventsCount: (count: number) => `${count} رویداد`,
    loading: "در حال بارگذاری رویدادهای اقتصادی...",
    loadFailed: "بارگذاری تقویم اقتصادی ناموفق بود",
    tryAgain: "تلاش دوباره",
    emptyTitle: "رویداد اقتصادی پیدا نشد.",
    emptyHint: "ایمپورت تقویم را اجرا کنید یا فیلترها را گسترده‌تر کنید.",
    columns: {
      time: "زمان",
      country: "کشور",
      currency: "ارز",
      impact: "اثر",
      event: "رویداد",
      actual: "واقعی",
      forecast: "پیش‌بینی",
      previous: "قبلی",
      status: "وضعیت",
    },
    status: {
      upcoming: "در پیش",
      soon: "به‌زودی",
      released: "منتشر شده",
    },
  },
};

function dateRange(filter: DateFilter) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  if (filter === "today") {
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  } else if (filter === "tomorrow") {
    from.setDate(from.getDate() + 1);
    const to = new Date(from);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  } else {
    const to = new Date(from);
    to.setDate(to.getDate() + 7);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
}

function formatEventTime(value: string, language: "en" | "fa") {
  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const countryByCurrency: Record<string, { name: Record<"en" | "fa", string>; flagCode: string }> = {
  USD: { name: { en: "United States", fa: "آمریکا" }, flagCode: "us" },
  EUR: { name: { en: "Euro Area", fa: "منطقه یورو" }, flagCode: "eu" },
  GBP: { name: { en: "United Kingdom", fa: "بریتانیا" }, flagCode: "gb" },
  JPY: { name: { en: "Japan", fa: "ژاپن" }, flagCode: "jp" },
  CAD: { name: { en: "Canada", fa: "کانادا" }, flagCode: "ca" },
  AUD: { name: { en: "Australia", fa: "استرالیا" }, flagCode: "au" },
  NZD: { name: { en: "New Zealand", fa: "نیوزیلند" }, flagCode: "nz" },
  CHF: { name: { en: "Switzerland", fa: "سوئیس" }, flagCode: "ch" },
  CNY: { name: { en: "China", fa: "چین" }, flagCode: "cn" },
};

function countryForCurrency(currency: string, language: "en" | "fa") {
  const country = countryByCurrency[currency.toUpperCase()];
  return country ? { name: country.name[language], flagCode: country.flagCode } : { name: currency.toUpperCase(), flagCode: "" };
}

function minutesUntil(value: string) {
  return Math.round((new Date(value).getTime() - Date.now()) / 60000);
}

function relativeTime(value: string, language: "en" | "fa") {
  const minutes = minutesUntil(value);
  const absoluteMinutes = Math.abs(minutes);

  if (minutes < 0) {
    return language === "fa" ? "منتشر شده" : "released";
  }

  if (absoluteMinutes < 60) {
    return language === "fa" ? `تا ${absoluteMinutes} دقیقه دیگر` : `in ${absoluteMinutes} minutes`;
  }

  const hours = Math.round(absoluteMinutes / 60);
  return language === "fa" ? `تا ${hours} ساعت دیگر` : `in ${hours} ${hours === 1 ? "hour" : "hours"}`;
}

function statusFor(eventTime: string, labels: typeof text.en) {
  const minutes = minutesUntil(eventTime);

  if (minutes < 0) {
    return labels.status.released;
  }

  if (minutes <= 60) {
    return labels.status.soon;
  }

  return labels.status.upcoming;
}

function displayImpact(impact: string, labels: typeof text.en) {
  const normalized = impact.toLowerCase();
  if (normalized === "high") return labels.high;
  if (normalized === "medium") return labels.medium;
  if (normalized === "low") return labels.low;
  return labels.none;
}

function impactBadgeClass(impact: string) {
  const normalized = impact.toLowerCase();

  if (normalized === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-300";
  }

  if (normalized === "medium") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }

  if (normalized === "low") {
    return "border-slate-600 bg-slate-800 text-slate-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

export default function EconomicCalendarPage() {
  const { language } = useLanguage();
  const labels = text[language];
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [currency, setCurrency] = useState<CurrencyFilter>("All");
  const [impact, setImpact] = useState<ImpactFilter>("All");
  const [events, setEvents] = useState<EconomicEventDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const range = dateRange(dateFilter);
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });

    if (currency !== "All") {
      params.set("currency", currency);
    }

    if (impact !== "All") {
      params.set("impact", impact);
    }

    return params.toString();
  }, [currency, dateFilter, impact]);

  const loadEvents = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/economic-calendar?${query}`, {
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(labels.loadFailed);
      }

      const payload = (await response.json()) as {
        success: boolean;
        data?: EconomicEventDto[];
        message?: string;
      };

      if (!payload.success) {
        throw new Error(payload.message || labels.loadFailed);
      }

      setEvents(payload.data || []);
    } catch (loadError) {
      if (!(loadError instanceof DOMException && loadError.name === "AbortError")) {
        setError(loadError instanceof Error ? loadError.message : labels.loadFailed);
      }
    } finally {
      setIsLoading(false);
    }
  }, [labels.loadFailed, query]);

  useEffect(() => {
    const controller = new AbortController();
    void loadEvents(controller.signal);

    return () => controller.abort();
  }, [loadEvents]);

  const nextHighImpactEvent = events.find(
    (event) => event.impact.toLowerCase() === "high" && new Date(event.eventTime).getTime() > Date.now()
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">{labels.title}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {labels.subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadEvents()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200 dark:hover:bg-slate-800"
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          {labels.refresh}
        </button>
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-500/20 dark:bg-red-500/10">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-200 bg-white text-red-500 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-red-900 dark:text-red-100">{labels.nextHighImpactEvent}</div>
            <p className="mt-1 text-sm text-red-800 dark:text-red-100/80">
              {nextHighImpactEvent
                ? labels.highImpactAlert(
                    nextHighImpactEvent.currency,
                    relativeTime(nextHighImpactEvent.eventTime, language),
                    nextHighImpactEvent.name
                  )
                : labels.noHighImpact}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A] md:grid-cols-3">
        <div>
          <label className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{labels.date}</label>
          <div className="mt-2 grid grid-cols-3 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-[#111827]">
            {[
              ["today", labels.today],
              ["tomorrow", labels.tomorrow],
              ["week", labels.thisWeek],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setDateFilter(value as DateFilter)}
                className={cn(
                  "rounded-lg px-2 py-2 text-xs font-semibold transition",
                  dateFilter === value
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{labels.currency}</span>
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value as CurrencyFilter)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-[#111827] dark:text-white"
          >
            {currencies.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? labels.all : item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{labels.impact}</span>
          <select
            value={impact}
            onChange={(event) => setImpact(event.target.value as ImpactFilter)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-[#111827] dark:text-white"
          >
            {impacts.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? labels.all : displayImpact(item, labels)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white">
            <CalendarDays className="h-4 w-4 text-blue-400" />
            {labels.eventsTitle}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{labels.eventsCount(events.length)}</div>
        </div>

        {isLoading ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500 dark:text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
            {labels.loading}
          </div>
        ) : error ? (
          <div className="min-h-64 p-8 text-center">
            <div className="text-sm font-semibold text-red-300">{error}</div>
            <button
              type="button"
              onClick={() => void loadEvents()}
              className="mt-4 inline-flex h-10 items-center rounded-xl border border-slate-800 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800"
            >
              {labels.tryAgain}
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="min-h-64 p-8 text-center">
            <div className="text-sm font-semibold text-slate-950 dark:text-white">{labels.emptyTitle}</div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {labels.emptyHint}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={cn("w-full min-w-[1020px] text-sm", language === "fa" ? "text-right" : "text-left")}>
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111827] dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">{labels.columns.time}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.country}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.currency}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.impact}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.event}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.actual}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.forecast}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.previous}</th>
                  <th className="px-4 py-3 font-semibold">{labels.columns.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {events.map((event) => {
                  const country = countryForCurrency(event.currency, language);

                  return (
                    <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-300">
                        {formatEventTime(event.eventTime, language)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {country.flagCode ? (
                            <img
                              src={`https://flagcdn.com/24x18/${country.flagCode}.png`}
                              srcSet={`https://flagcdn.com/48x36/${country.flagCode}.png 2x`}
                              width={24}
                              height={18}
                              alt=""
                              className="h-[18px] w-6 rounded-[2px] border border-slate-200 object-cover shadow-sm dark:border-slate-700"
                            />
                          ) : null}
                          {country.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-lg border border-blue-600/70 bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 shadow-sm dark:border-blue-400/60 dark:bg-blue-500/20 dark:text-blue-100">
                          {event.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-lg border px-2 py-1 text-xs font-semibold", impactBadgeClass(event.impact))}>
                          {displayImpact(event.impact, labels)}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3 font-medium text-slate-950 dark:text-white">
                        {event.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.actual || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.forecast || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{event.previous || "-"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{statusFor(event.eventTime, labels)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
