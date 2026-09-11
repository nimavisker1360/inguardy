import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  backtestSessionInclude,
  serializeBacktestSession,
  updateBacktestSessionSchema,
} from "@/lib/backtest-sessions";
import { positionRiskReward } from "@/lib/backtest-simulation";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const session = await prisma.backtestSession.findFirst({
      where: { id, userId: user.id },
      include: {
        ...backtestSessionInclude,
        account: { select: { id: true, name: true, currency: true } },
        playbook: { select: { id: true, name: true } },
      },
    });
    if (!session) return errorResponse("Backtest session not found.", 404);

    return NextResponse.json({
      ok: true,
      session: {
        ...serializeBacktestSession(session),
        account: session.account,
        playbook: session.playbook,
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return errorResponse("Failed to load the backtest session.", 500);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const parsed = updateBacktestSessionSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse("Invalid backtest session update.", 400);

    const existing = await prisma.backtestSession.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) return errorResponse("Backtest session not found.", 404);

    const input = parsed.data;
    const [account, playbook] = await Promise.all([
      input.accountId
        ? prisma.tradingAccount.findFirst({ where: { id: input.accountId, userId: user.id }, select: { id: true } })
        : Promise.resolve(null),
      input.playbookId
        ? prisma.playbookStrategy.findFirst({ where: { id: input.playbookId, userId: user.id }, select: { id: true } })
        : Promise.resolve(null),
    ]);
    if ((input.accountId && !account) || (input.playbookId && !playbook)) {
      return errorResponse("The selected account or playbook is not available.", 400);
    }

    const session = await prisma.$transaction(async (tx) => {
      const data: Prisma.BacktestSessionUncheckedUpdateInput = {};
      if (input.accountId !== undefined) data.accountId = input.accountId || null;
      if (input.playbookId !== undefined) data.playbookId = input.playbookId || null;
      if (input.symbol !== undefined) data.symbol = input.symbol.toUpperCase();
      if (input.timeframe !== undefined) data.timeframe = input.timeframe;
      if (input.endDate !== undefined) data.endDate = new Date(`${input.endDate}T23:59:59.000Z`);
      if (input.historySize !== undefined) data.historySize = input.historySize;
      if (input.speed !== undefined) data.speed = input.speed;
      if (input.currentCandleTime !== undefined) {
        data.currentCandleTime = input.currentCandleTime ? new Date(input.currentCandleTime) : null;
      }
      if (input.activePosition !== undefined) {
        data.activePosition = input.activePosition === null
          ? Prisma.JsonNull
          : input.activePosition as Prisma.InputJsonValue;
      }

      await tx.backtestSession.update({ where: { id }, data });

      if (input.trade) {
        const trade = input.trade;
        const tradeData = {
          direction: trade.direction,
          status: trade.status,
          entry: trade.entry,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          exitPrice: trade.exitPrice ?? null,
          volume: trade.volume ?? null,
          riskAmount: trade.riskAmount,
          riskReward: trade.riskReward || positionRiskReward(trade),
          resultR: trade.resultR ?? null,
          profitLoss: trade.profitLoss ?? null,
          placedAtIndex: trade.placedAtIndex,
          lastEvaluatedIndex: trade.lastEvaluatedIndex,
          openedAtIndex: trade.openedAtIndex ?? null,
          closedAtIndex: trade.closedAtIndex ?? null,
          openedAt: trade.openedAt ? new Date(trade.openedAt) : null,
          closedAt: trade.closedAt ? new Date(trade.closedAt) : null,
          closeReason: trade.status === "WON" ? "TAKE_PROFIT" : trade.status === "LOST" ? "STOP_LOSS" : null,
        };

        await tx.backtestTrade.upsert({
          where: { sessionId_clientPositionId: { sessionId: id, clientPositionId: trade.id } },
          create: { sessionId: id, clientPositionId: trade.id, ...tradeData },
          update: tradeData,
        });
      }

      return tx.backtestSession.findUniqueOrThrow({
        where: { id },
        include: backtestSessionInclude,
      });
    });

    return NextResponse.json({ ok: true, session: serializeBacktestSession(session) });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return errorResponse("Failed to save the backtest session.", 500);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const deleted = await prisma.backtestSession.deleteMany({ where: { id, userId: user.id } });
    if (!deleted.count) return errorResponse("Backtest session not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    return errorResponse("Failed to delete the backtest session.", 500);
  }
}
