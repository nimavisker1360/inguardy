import { redirect } from "next/navigation";
import { DayView, type DayViewDay } from "@/components/journal/DayView";
import { getAccountsPageData } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type CalendarPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
  return Number.isInteger(parsed) && parsed >= 1970 && parsed <= 3000 ? parsed : fallback;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function number(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function snapshotNumber(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function JournalCalendarPage({ searchParams }: CalendarPageProps) {
  const userId = await getCurrentUserId();

  if (!userId) redirect("/login");

  const params = (await searchParams) || {};
  const now = new Date();
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  const month = clampMonth(first(params.month), currentMonth);
  const year = parseYear(first(params.year), currentYear);
  const requestedAccountId = first(params.accountId) || "";
  const requestedDate = first(params.selectedDate);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const accounts = await getAccountsPageData(userId);
  const accountId = requestedAccountId && accounts.some((account) => account.id === requestedAccountId)
    ? requestedAccountId
    : "";
  const activeAccount = accounts.find((account) => account.id === accountId);
  const selectedDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : year === currentYear && month === currentMonth
      ? dateKey(now)
      : dateKey(monthStart);
  const parsedAnchor = new Date(`${selectedDate}T00:00:00.000Z`);
  const anchorDate = Number.isNaN(parsedAnchor.getTime()) ? monthStart : parsedAnchor;
  const weekStart = addUtcDays(anchorDate, -anchorDate.getUTCDay());
  const weekEnd = addUtcDays(weekStart, 6);

  // Include adjacent-month cells so the compact calendar stays informative.
  const gridStart = addUtcDays(monthStart, -monthStart.getUTCDay());
  const finalMonthDay = addUtcDays(monthEnd, -1);
  const gridEnd = addUtcDays(finalMonthDay, 6 - finalMonthDay.getUTCDay());

  const [trades, tradeLockerSnapshots] = await Promise.all([
    prisma.trade.findMany({
    where: {
      userId,
      openedAt: { gte: gridStart, lt: addUtcDays(gridEnd, 1) },
      ...(accountId ? { accountId } : {}),
    },
    select: {
      id: true,
      accountId: true,
      symbol: true,
      openedAt: true,
      createdAt: true,
      status: true,
      direction: true,
      entryPrice: true,
      exitPrice: true,
      profitLoss: true,
      grossProfit: true,
      commission: true,
      swap: true,
      lotSize: true,
    },
    orderBy: [{ openedAt: "asc" }, { createdAt: "asc" }],
    }),
    accountId
      ? prisma.$queryRaw<Array<{ day: Date; accountId: string; rawPayload: unknown }>>`
          SELECT DISTINCT ON (DATE("capturedAt" AT TIME ZONE 'UTC'))
            DATE("capturedAt" AT TIME ZONE 'UTC') AS "day",
            "accountId",
            "rawPayload"
          FROM "TradeLockerAccountSnapshot"
          WHERE "accountId" = ${accountId}
            AND "capturedAt" >= ${gridStart}
            AND "capturedAt" < ${addUtcDays(gridEnd, 1)}
          ORDER BY DATE("capturedAt" AT TIME ZONE 'UTC'), "capturedAt" DESC
        `
      : prisma.$queryRaw<Array<{ day: Date; accountId: string; rawPayload: unknown }>>`
          SELECT DISTINCT ON (snapshot."accountId", DATE(snapshot."capturedAt" AT TIME ZONE 'UTC'))
            DATE(snapshot."capturedAt" AT TIME ZONE 'UTC') AS "day",
            snapshot."accountId",
            snapshot."rawPayload"
          FROM "TradeLockerAccountSnapshot" snapshot
          INNER JOIN "TradingAccount" account ON account."id" = snapshot."accountId"
          WHERE account."userId" = ${userId}
            AND snapshot."capturedAt" >= ${gridStart}
            AND snapshot."capturedAt" < ${addUtcDays(gridEnd, 1)}
          ORDER BY snapshot."accountId", DATE(snapshot."capturedAt" AT TIME ZONE 'UTC'), snapshot."capturedAt" DESC
        `,
  ]);
  const snapshotByAccountDay = new Map(
    tradeLockerSnapshots.map((snapshot) => [`${snapshot.accountId}:${dateKey(new Date(snapshot.day))}`, snapshot.rawPayload])
  );
  const accountById = new Map(accounts.map((account) => [account.id, account]));

  const grouped = new Map<string, typeof trades>();
  for (const trade of trades) {
    if (!trade.openedAt) continue;
    const key = dateKey(trade.openedAt);
    grouped.set(key, [...(grouped.get(key) || []), trade]);
  }

  const days: DayViewDay[] = Array.from(grouped.entries()).map(([date, dayTrades]) => {
    let cumulativeNet = 0;
    const chartPoints = [0];
    let winners = 0;
    let losers = 0;
    let breakEvens = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    let hasMissingPnl = false;
    for (const trade of dayTrades) {
      const net = trade.profitLoss === null ? null : number(trade.profitLoss);
      if (net !== null) {
        cumulativeNet += net;
        chartPoints.push(round(cumulativeNet));
      } else {
        hasMissingPnl = true;
      }

      if (trade.status !== "CLOSED") continue;
      const priceMovement = trade.entryPrice !== null && trade.exitPrice !== null
        ? (trade.direction === "BUY" ? 1 : -1) * (number(trade.exitPrice) - number(trade.entryPrice))
        : null;
      const outcome = net ?? priceMovement;
      if (outcome === null) continue;
      if (outcome > 0) {
        winners += 1;
        if (net !== null) grossProfit += net;
      } else if (outcome < 0) {
        losers += 1;
        if (net !== null) grossLoss += Math.abs(net);
      } else {
        breakEvens += 1;
      }
    }

    const closedTrades = winners + losers + breakEvens;
    const perAccountTotals = Array.from(new Set(dayTrades.map((trade) => trade.accountId))).map((dayAccountId) => {
      const accountTrades = dayTrades.filter((trade) => trade.accountId === dayAccountId);
      const accountHasMissingPnl = accountTrades.some((trade) => trade.profitLoss === null);
      const snapshot = snapshotByAccountDay.get(`${dayAccountId}:${date}`);
      const netValues = accountTrades
        .map((trade) => trade.profitLoss === null ? null : number(trade.profitLoss))
        .filter((value): value is number => value !== null);
      const grossValues = accountTrades
        .map((trade) => {
          if (trade.grossProfit !== null) return number(trade.grossProfit);
          if (trade.profitLoss === null) return null;
          return number(trade.profitLoss) - number(trade.commission) - number(trade.swap);
        })
        .filter((value): value is number => value !== null);
      const commissionValues = accountTrades
        .map((trade) => trade.commission === null ? null : Math.abs(number(trade.commission)))
        .filter((value): value is number => value !== null);

      return {
        net: accountHasMissingPnl
          ? snapshotNumber(snapshot, "todayNet")
          : netValues.length > 0 ? round(netValues.reduce((sum, value) => sum + value, 0)) : null,
        gross: accountHasMissingPnl
          ? snapshotNumber(snapshot, "todayGross")
          : grossValues.length > 0 ? round(grossValues.reduce((sum, value) => sum + value, 0)) : null,
        commissions: accountHasMissingPnl
          ? snapshotNumber(snapshot, "todayFees")
          : commissionValues.length > 0 ? round(commissionValues.reduce((sum, value) => sum + value, 0)) : null,
      };
    });
    const netPnl = perAccountTotals.every((total) => total.net !== null)
      ? round(perAccountTotals.reduce((sum, total) => sum + number(total.net), 0))
      : null;
    const grossPnl = perAccountTotals.every((total) => total.gross !== null)
      ? round(perAccountTotals.reduce((sum, total) => sum + number(total.gross), 0))
      : null;
    const commissions = perAccountTotals.every((total) => total.commissions !== null)
      ? round(perAccountTotals.reduce((sum, total) => sum + Math.abs(number(total.commissions)), 0))
      : null;

    return {
      date,
      totalTrades: dayTrades.length,
      winners,
      losers,
      netPnl,
      grossPnl,
      commissions,
      volume: round(dayTrades.reduce((sum, trade) => sum + Math.abs(number(trade.lotSize)), 0), 2),
      winRate: closedTrades > 0 ? round((winners / closedTrades) * 100, 2) : null,
      profitFactor: !hasMissingPnl && grossLoss > 0 ? round(grossProfit / grossLoss, 2) : null,
      chartPoints: hasMissingPnl && netPnl !== null ? [0, netPnl] : chartPoints,
      firstTradeId: dayTrades[0]?.id || null,
      trades: dayTrades.map((trade) => {
        const tradeAccount = accountById.get(trade.accountId);
        return {
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          status: trade.status,
          openedAt: (trade.openedAt || trade.createdAt).toISOString(),
          profitLoss: trade.profitLoss === null ? null : round(number(trade.profitLoss)),
          lotSize: round(Math.abs(number(trade.lotSize)), 2),
          accountName: tradeAccount?.name || "Trading account",
          currency: tradeAccount?.currency || "USD",
        };
      }),
    };
  });

  return (
    <DayView
      month={month}
      year={year}
      selectedDate={dateKey(anchorDate)}
      weekStart={dateKey(weekStart)}
      weekEnd={dateKey(weekEnd)}
      currency={activeAccount?.currency || "USD"}
      accountId={accountId}
      accounts={accounts.map((account) => ({
        id: account.id,
        name: account.name,
        currency: account.currency,
        broker: account.broker,
        platform: account.platform,
      }))}
      days={days}
    />
  );
}
