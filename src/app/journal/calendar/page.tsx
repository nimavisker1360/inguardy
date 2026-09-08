import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BookOpenCheck,
  CalendarDays,
  CircleDot,
  RotateCcw,
} from "lucide-react";
import {
  mapPrismaTradeToJournalTrade,
} from "@/app/journal/_lib/journal-api";
import { DashboardMonthText, DashboardText } from "@/components/dashboard/DashboardText";
import { getAccountsPageData, serializeTrade, tradeListInclude } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const WEEKDAYS = [
  "journal.calendar.weekdays.sun",
  "journal.calendar.weekdays.mon",
  "journal.calendar.weekdays.tue",
  "journal.calendar.weekdays.wed",
  "journal.calendar.weekdays.thu",
  "journal.calendar.weekdays.fri",
  "journal.calendar.weekdays.sat",
];

type CalendarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type CalendarDay = {
  date: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  dailyJournalWritten: boolean;
  checklistCompletionRate: number;
  overtradingWarning: boolean;
};

type CalendarResponse = {
  success: boolean;
  month: number;
  year: number;
  days: CalendarDay[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clampMonth(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

function parseYear(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1970 && parsed <= 3000
    ? parsed
    : fallback;
}

function formatMoney(value: number | null | undefined) {
  const parsed = Number(value || 0);

  return parsed.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  const parsed = Number(value || 0);

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addParam(params: URLSearchParams, key: string, value: string | undefined) {
  if (value) {
    params.set(key, value);
  }
}

function monthHref(month: number, year: number, accountId?: string) {
  const params = new URLSearchParams();
  params.set("month", String(month));
  params.set("year", String(year));
  addParam(params, "accountId", accountId);
  return `/journal/calendar?${params.toString()}`;
}

function selectedDateHref(
  month: number,
  year: number,
  date: string,
  accountId?: string
) {
  const params = new URLSearchParams();
  params.set("month", String(month));
  params.set("year", String(year));
  params.set("selectedDate", date);
  addParam(params, "accountId", accountId);
  return `/journal/calendar?${params.toString()}`;
}

function dailyJournalHref(date: string, accountId?: string) {
  const params = new URLSearchParams();
  params.set("date", date);
  addParam(params, "accountId", accountId);
  return `/dashboard/daily-journal?${params.toString()}`;
}

function tradesByDateHref(date: string, accountId?: string) {
  const params = new URLSearchParams();
  params.set("dateFrom", date);
  params.set("dateTo", date);
  addParam(params, "accountId", accountId);
  return `/journal?${params.toString()}`;
}

function adjacentMonth(month: number, year: number, direction: -1 | 1) {
  const date = new Date(Date.UTC(year, month - 1 + direction, 1));
  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function buildCalendarCells(month: number, year: number) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlankDays = firstDay.getUTCDay();
  const cells: Array<{ day: number | null; date: string | null }> = [];

  for (let index = 0; index < leadingBlankDays; index += 1) {
    cells.push({ day: null, date: null });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      day,
      date: dateKey(new Date(Date.UTC(year, month - 1, day))),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, date: null });
  }

  return cells;
}

function nextDateString(date: string) {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

async function getCalendarData(userId: string, month: number, year: number, accountId: string) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const where = {
    userId,
    openedAt: {
      gte: start,
      lt: end,
    },
    ...(accountId ? { accountId } : {}),
  };
  const [trades, dailyJournals] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: {
        checklists: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.dailyJournal.findMany({
      where: {
        userId,
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        date: true,
      },
    }),
  ]);
  const journalDates = new Set(dailyJournals.map((journal) => dateKey(journal.date)));
  const grouped = new Map<string, typeof trades>();

  for (const trade of trades) {
    if (!trade.openedAt) {
      continue;
    }

    const key = dateKey(trade.openedAt);
    grouped.set(key, [...(grouped.get(key) || []), trade]);
  }

  return {
    success: true,
    month,
    year,
    days: Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayTrades]) => {
        const closedTrades = dayTrades.filter((trade) => trade.status === "CLOSED");
        const winningTrades = closedTrades.filter((trade) => toNumber(trade.profitLoss) > 0);
        const losingTrades = closedTrades.filter((trade) => toNumber(trade.profitLoss) < 0);
        const breakEvenTrades = closedTrades.filter((trade) => toNumber(trade.profitLoss) === 0);
        const totalPnL = dayTrades.reduce(
          (total, trade) => total + toNumber(trade.profitLoss),
          0
        );
        const grossProfit = winningTrades.reduce(
          (total, trade) => total + toNumber(trade.profitLoss),
          0
        );
        const grossLoss = losingTrades.reduce(
          (total, trade) => total + Math.abs(toNumber(trade.profitLoss)),
          0
        );
        const pnlValues = dayTrades.map((trade) => toNumber(trade.profitLoss));
        const tradesWithChecklist = dayTrades.filter((trade) => trade.checklists.length > 0);

        return {
          date,
          totalTrades: dayTrades.length,
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length,
          breakEvenTrades: breakEvenTrades.length,
          totalPnL: round(totalPnL),
          winRate:
            closedTrades.length > 0
              ? round((winningTrades.length / closedTrades.length) * 100, 1)
              : 0,
          profitFactor:
            grossLoss > 0
              ? round(grossProfit / grossLoss, 2)
              : grossProfit > 0
                ? round(grossProfit, 2)
                : 0,
          bestTrade: pnlValues.length > 0 ? round(Math.max(...pnlValues)) : 0,
          worstTrade: pnlValues.length > 0 ? round(Math.min(...pnlValues)) : 0,
          dailyJournalWritten: journalDates.has(date),
          checklistCompletionRate:
            dayTrades.length > 0 ? round((tradesWithChecklist.length / dayTrades.length) * 100, 1) : 0,
          overtradingWarning: dayTrades.length >= 5,
        };
      }),
  } satisfies CalendarResponse;
}

export default async function JournalCalendarPage({ searchParams }: CalendarPageProps) {
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect("/login");
  }

  const params = (await searchParams) || {};
  const today = new Date();
  const currentMonth = today.getUTCMonth() + 1;
  const currentYear = today.getUTCFullYear();
  const month = clampMonth(first(params.month), currentMonth);
  const year = parseYear(first(params.year), currentYear);
  const accountId = first(params.accountId) || "";
  const requestedSelectedDate = first(params.selectedDate);
  const previous = adjacentMonth(month, year, -1);
  const next = adjacentMonth(month, year, 1);

  const [calendarData, accounts] = await Promise.all([
    getCalendarData(userId, month, year, accountId),
    getAccountsPageData(userId),
  ]);
  const selectedDate =
    requestedSelectedDate ||
    calendarData.days[0]?.date ||
    dateKey(new Date(Date.UTC(year, month - 1, 1)));
  const dayMap = new Map(calendarData.days.map((day) => [day.date, day]));
  const cells = buildCalendarCells(month, year);
  const selectedTradesData = await prisma.trade.findMany({
    where: {
      userId,
      openedAt: {
        gte: new Date(`${selectedDate}T00:00:00.000Z`),
        lt: new Date(nextDateString(selectedDate)),
      },
      ...(accountId ? { accountId } : {}),
    },
    include: tradeListInclude,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const selectedTrades = selectedTradesData
    .map(serializeTrade)
    .map(mapPrismaTradeToJournalTrade)
    .filter((trade) => trade.openTime && dateKey(new Date(trade.openTime)) === selectedDate);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">
            <DashboardText k="journal.calendar.title" />
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            <DashboardText k="journal.calendar.subtitle" />
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={monthHref(previous.month, previous.year, accountId)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-800 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <DashboardText k="journal.calendar.previous" />
          </Link>
          <Link
            href={monthHref(currentMonth, currentYear, accountId)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-800 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
            <DashboardText k="journal.calendar.current" />
          </Link>
          <Link
            href={monthHref(next.month, next.year, accountId)}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-800 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <DashboardText k="journal.calendar.next" />
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-[#111827] text-blue-300">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">
                <DashboardMonthText month={month} year={year} />
              </h2>
              <p className="text-xs text-slate-400">
                {calendarData.days.length > 0
                  ? <DashboardText k="journal.calendar.activeDays" values={{ count: String(calendarData.days.length) }} />
                  : <DashboardText k="journal.calendar.noTradesPeriod" />}
              </p>
            </div>
          </div>

          {accounts.length > 0 && (
            <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="year" value={year} />
              <select
                name="accountId"
                defaultValue={accountId}
                className="h-10 rounded-xl border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-blue-600"
              >
                <option value="">
                  <DashboardText k="journal.calendar.allAccounts" />
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="h-10 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <DashboardText k="journal.common.apply" />
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#0F172A] shadow-sm">
          <div className="grid grid-cols-7 border-b border-slate-800 bg-[#111827] text-center text-xs font-semibold uppercase text-slate-400">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday} className="px-2 py-3">
                <DashboardText k={weekday} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((cell, index) => {
              const day = cell.date ? dayMap.get(cell.date) : null;
              const totalPnL = day?.totalPnL || 0;
              const isProfit = totalPnL > 0;
              const isLoss = totalPnL < 0;
              const isToday = cell.date === dateKey(today);
              const isSelected = cell.date === selectedDate;

              if (!cell.day || !cell.date) {
                return (
                  <div
                    key={`blank-${index}`}
                    className="min-h-[126px] border-b border-r border-slate-800 bg-[#08111F]/60"
                  />
                );
              }

              return (
                <Link
                  key={cell.date}
                  href={selectedDateHref(month, year, cell.date, accountId)}
                  className={cn(
                    "group min-h-[126px] border-b border-r border-slate-800 bg-[#0B1220] p-3 transition hover:bg-slate-800/70",
                    isProfit && "bg-emerald-950/20",
                    isLoss && "bg-red-950/20",
                    isToday && "ring-1 ring-inset ring-blue-500",
                    isSelected && "outline outline-1 outline-blue-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{cell.day}</span>
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-800 text-slate-500",
                        isProfit && "border-emerald-500/40 text-[#10B981]",
                        isLoss && "border-red-500/40 text-[#EF4444]"
                      )}
                    >
                      {isProfit ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : isLoss ? (
                        <ArrowDown className="h-3.5 w-3.5" />
                      ) : (
                        <CircleDot className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>

                  <div className="mt-7 space-y-1">
                    <div
                      className={cn(
                        "text-sm font-semibold text-slate-300",
                        isProfit && "text-[#10B981]",
                        isLoss && "text-[#EF4444]"
                      )}
                    >
                      {formatMoney(totalPnL)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {day ? <DashboardText k="journal.calendar.tradesCount" values={{ count: String(day.totalTrades) }} /> : <DashboardText k="journal.calendar.noTrades" />}
                    </div>
                    {day && (
                      <div className="text-xs text-slate-400">
                        <DashboardText k="journal.calendar.winRateValue" values={{ value: formatNumber(day.winRate, 1) }} />
                      </div>
                    )}
                    {day ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                            day.dailyJournalWritten
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                          )}
                        >
                          {day.dailyJournalWritten ? "Journal" : "Missing journal"}
                        </span>
                        <span className="rounded-md border border-slate-700 bg-[#111827] px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                          CL {formatNumber(day.checklistCompletionRate, 0)}%
                        </span>
                        {day.overtradingWarning ? (
                          <span className="rounded-md border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-200">
                            Overtrading
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <aside className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">{selectedDate}</h2>
              <p className="mt-1 text-xs text-slate-400">
                {selectedTrades.length > 0
                  ? <DashboardText k="journal.calendar.tradesOpened" values={{ count: String(selectedTrades.length) }} />
                  : <DashboardText k="journal.calendar.noTradesPeriod" />}
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border border-slate-800 bg-[#111827] px-3 py-2 text-sm font-semibold text-slate-300",
                (dayMap.get(selectedDate)?.totalPnL || 0) > 0 && "text-[#10B981]",
                (dayMap.get(selectedDate)?.totalPnL || 0) < 0 && "text-[#EF4444]"
              )}
            >
              {formatMoney(dayMap.get(selectedDate)?.totalPnL || 0)}
            </div>
          </div>

          <Link
            href={dailyJournalHref(selectedDate, accountId)}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
          >
            <BookOpenCheck className="h-4 w-4" />
            <DashboardText k="journal.calendar.openDailyJournal" />
          </Link>

          {dayMap.get(selectedDate) ? (
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-slate-800 bg-[#111827] p-3 text-slate-300">
                <div className="text-slate-500">Daily Journal</div>
                <div className={cn("mt-1 font-semibold", dayMap.get(selectedDate)?.dailyJournalWritten ? "text-emerald-300" : "text-amber-200")}>
                  {dayMap.get(selectedDate)?.dailyJournalWritten ? "Written" : "Missing"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-800 bg-[#111827] p-3 text-slate-300">
                <div className="text-slate-500">Checklist Rate</div>
                <div className="mt-1 font-semibold text-blue-200">
                  {formatNumber(dayMap.get(selectedDate)?.checklistCompletionRate, 1)}%
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {selectedTrades.slice(0, 5).map((trade) => (
              <article
                key={trade._id}
                className="rounded-xl border border-slate-800 bg-[#111827] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/journal/${trade._id}`} className="font-semibold text-white hover:text-blue-200">
                      {trade.symbol}
                    </Link>
                    <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                      {trade.tradeType} / {trade.status}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold text-slate-300",
                      Number(trade.profit || 0) > 0 && "text-[#10B981]",
                      Number(trade.profit || 0) < 0 && "text-[#EF4444]"
                    )}
                  >
                    {formatMoney(Number(trade.profit || 0))}
                  </div>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/journal/${trade._id}`}
                    className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-500/30 px-3 text-xs font-semibold text-blue-200 hover:bg-blue-500/10"
                  >
                    <DashboardText k="journal.calendar.review" />
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div>
                    <span className="text-slate-500"><DashboardText k="dashboard.table.entry" /></span>
                    <div className="mt-1 text-slate-200">
                      {formatNumber(Number(trade.entryPrice || 0), 5)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500"><DashboardText k="dashboard.table.exit" /></span>
                    <div className="mt-1 text-slate-200">
                      {trade.closePrice === null
                        ? "-"
                        : formatNumber(Number(trade.closePrice || 0), 5)}
                    </div>
                  </div>
                </div>
              </article>
            ))}

            {selectedTrades.length > 5 ? (
              <Link
                href={tradesByDateHref(selectedDate, accountId)}
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
              >
                <DashboardText k="journal.calendar.viewAllTradesForDay" />
              </Link>
            ) : null}

            {selectedTrades.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-800 bg-[#111827] px-4 py-10 text-center">
                <div className="text-sm font-semibold text-white">
                  <DashboardText k="journal.calendar.noTradesPeriod" />
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  <DashboardText k="journal.calendar.emptyHint" />
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
