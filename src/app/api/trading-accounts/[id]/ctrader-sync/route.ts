import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";
import {
  acquireCtraderConnectionLease,
  releaseCtraderConnectionLease,
  synchronizeCtraderConnection,
} from "@/server/ctrader/sync-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    await assertUserCanUseJournal(user.id);
    const { id } = await context.params;
    const account = await prisma.tradingAccount.findFirst({
      where: { id, userId: user.id },
      select: { ctraderConnection: { select: { id: true } } },
    });
    if (!account?.ctraderConnection) {
      return NextResponse.json(
        { success: false, message: "Direct cTrader connection not found" },
        { status: 404 }
      );
    }

    const owner = `manual:${user.id}:${crypto.randomUUID()}`;
    const acquired = await acquireCtraderConnectionLease(account.ctraderConnection.id, owner);
    if (!acquired) {
      return NextResponse.json(
        { success: false, message: "Synchronization is already running" },
        { status: 409 }
      );
    }
    try {
      const result = await synchronizeCtraderConnection(account.ctraderConnection.id);
      return NextResponse.json({
        success: true,
        data: {
          status: result.connection.status,
          createdDeals: result.createdDeals,
          projectedTrades: result.projectedTrades,
          lastSyncAt: result.connection.lastSyncAt,
        },
      });
    } finally {
      await releaseCtraderConnectionLease(account.ctraderConnection.id, owner);
    }
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "cTrader synchronization failed",
      },
      { status: 422 }
    );
  }
}

