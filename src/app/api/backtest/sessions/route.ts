import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  backtestSessionInclude,
  createBacktestSessionSchema,
  serializeBacktestSession,
} from "@/lib/backtest-sessions";
import { buildBacktestPerformanceSeries, calculateBacktestPerformance } from "@/lib/backtest-report";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

const historyQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(50).default(12),
  accountId: z.string().trim().max(128).optional(),
  playbookId: z.string().trim().max(128).optional(),
  symbol: z.string().trim().max(48).optional(),
  timeframe: z.enum(["M5", "M15", "H1", "H4", "D1"]).optional(),
  status: z.enum(["ACTIVE", "COMPLETED"]).optional(),
});

async function referencesBelongToUser(userId: string, accountId?: string | null, playbookId?: string | null) {
  const [account, playbook] = await Promise.all([
    accountId
      ? prisma.tradingAccount.findFirst({ where: { id: accountId, userId }, select: { id: true } })
      : Promise.resolve(null),
    playbookId
      ? prisma.playbookStrategy.findFirst({ where: { id: playbookId, userId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  return (!accountId || Boolean(account)) && (!playbookId || Boolean(playbook));
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();

    const url = new URL(request.url);
    if (url.searchParams.get("view") === "history") {
      const parsed = historyQuerySchema.safeParse({
        page: url.searchParams.get("page") || undefined,
        limit: url.searchParams.get("limit") || undefined,
        accountId: url.searchParams.get("accountId") || undefined,
        playbookId: url.searchParams.get("playbookId") || undefined,
        symbol: url.searchParams.get("symbol") || undefined,
        timeframe: url.searchParams.get("timeframe") || undefined,
        status: url.searchParams.get("status") || undefined,
      });
      if (!parsed.success) return errorResponse("Invalid backtest history filters.", 400);

      const filters = parsed.data;
      const where: Prisma.BacktestSessionWhereInput = {
        userId: user.id,
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
        ...(filters.playbookId ? { playbookId: filters.playbookId } : {}),
        ...(filters.symbol ? { symbol: filters.symbol.toUpperCase() } : {}),
        ...(filters.timeframe ? { timeframe: filters.timeframe } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      };

      const [sessions, totalSessions, trades, accounts, playbooks, symbols] = await Promise.all([
        prisma.backtestSession.findMany({
          where,
          orderBy: { updatedAt: "desc" },
          skip: (filters.page - 1) * filters.limit,
          take: filters.limit,
          include: {
            ...backtestSessionInclude,
            account: { select: { id: true, name: true, currency: true } },
            playbook: { select: { id: true, name: true } },
          },
        }),
        prisma.backtestSession.count({ where }),
        prisma.backtestTrade.findMany({
          where: { session: where, status: { in: ["WON", "LOST"] } },
          orderBy: [{ closedAt: "asc" }, { createdAt: "asc" }],
          take: 5000,
          select: {
            status: true,
            resultR: true,
            profitLoss: true,
            closedAt: true,
            createdAt: true,
            session: {
              select: {
                timeframe: true,
                playbookId: true,
                playbook: { select: { name: true } },
              },
            },
          },
        }),
        prisma.tradingAccount.findMany({
          where: { userId: user.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true, currency: true },
        }),
        prisma.playbookStrategy.findMany({
          where: { userId: user.id },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        }),
        prisma.backtestSession.findMany({
          where: { userId: user.id },
          distinct: ["symbol"],
          orderBy: { symbol: "asc" },
          select: { symbol: true },
        }),
      ]);

      const series = buildBacktestPerformanceSeries(trades);
      const groups = new Map<string, typeof trades>();
      for (const trade of trades) {
        const keys = [
          `timeframe:${trade.session.timeframe}`,
          `playbook:${trade.session.playbookId || "none"}:${trade.session.playbook?.name || "No playbook"}`,
        ];
        for (const key of keys) groups.set(key, [...(groups.get(key) ?? []), trade]);
      }
      const breakdown = [...groups.entries()].map(([key, groupTrades]) => {
        const [type, value, ...labelParts] = key.split(":");
        return {
          type,
          id: value,
          label: type === "playbook" ? labelParts.join(":") : value,
          ...calculateBacktestPerformance(groupTrades),
        };
      });

      return NextResponse.json({
        ok: true,
        history: {
          sessions: sessions.map((session) => ({
            ...serializeBacktestSession(session),
            account: session.account,
            playbook: session.playbook,
          })),
          pagination: {
            page: filters.page,
            limit: filters.limit,
            total: totalSessions,
            totalPages: Math.max(Math.ceil(totalSessions / filters.limit), 1),
          },
          summary: {
            sessions: totalSessions,
            ...calculateBacktestPerformance(trades),
            maxDrawdown: series.reduce((maximum, point) => Math.max(maximum, point.drawdown), 0),
          },
          series,
          breakdown,
          filterOptions: {
            accounts,
            playbooks,
            symbols: symbols.map((item) => item.symbol),
          },
        },
      });
    }

    const session = await prisma.backtestSession.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { updatedAt: "desc" },
      include: backtestSessionInclude,
    });

    return NextResponse.json({
      ok: true,
      session: session ? serializeBacktestSession(session) : null,
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return errorResponse("Failed to load the active backtest session.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = createBacktestSessionSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse("Invalid backtest session settings.", 400);

    const input = parsed.data;
    if (!(await referencesBelongToUser(user.id, input.accountId, input.playbookId))) {
      return errorResponse("The selected account or playbook is not available.", 400);
    }

    const session = await prisma.$transaction(async (tx) => {
      await tx.backtestSession.updateMany({
        where: { userId: user.id, status: "ACTIVE" },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      return tx.backtestSession.create({
        data: {
          userId: user.id,
          accountId: input.accountId || null,
          playbookId: input.playbookId || null,
          symbol: input.symbol.toUpperCase(),
          timeframe: input.timeframe,
          endDate: new Date(`${input.endDate}T23:59:59.000Z`),
          historySize: input.historySize,
          speed: input.speed,
          currentCandleTime: input.currentCandleTime ? new Date(input.currentCandleTime) : null,
        },
        include: backtestSessionInclude,
      });
    });

    return NextResponse.json({ ok: true, session: serializeBacktestSession(session) }, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return errorResponse("Failed to create the backtest session.", 500);
  }
}
