import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { assertUserCanUseJournal, JournalSubscriptionError } from "@/server/mt5/subscription-service";
import { acquireTradeLockerConnectionLease, releaseTradeLockerConnectionLease, synchronizeTradeLockerConnection } from "@/server/tradelocker/sync-service";

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
      select: { tradeLockerConnection: { select: { id: true } } },
    });
    if (!account?.tradeLockerConnection) {
      return NextResponse.json({ success: false, message: "TradeLocker connection not found." }, { status: 404 });
    }
    const owner = `manual:${user.id}:${crypto.randomUUID()}`;
    if (!await acquireTradeLockerConnectionLease(account.tradeLockerConnection.id, owner)) {
      return NextResponse.json({ success: false, message: "Synchronization is already running." }, { status: 409 });
    }
    try {
      const result = await synchronizeTradeLockerConnection(account.tradeLockerConnection.id);
      return NextResponse.json({
        success: true,
        data: {
          status: result.connection.status,
          createdOrders: result.createdOrders,
          createdExecutions: result.createdExecutions,
          projectedTrades: result.projectedTrades,
          lastSyncAt: result.connection.lastSyncAt,
        },
      });
    } finally {
      await releaseTradeLockerConnectionLease(account.tradeLockerConnection.id, owner);
    }
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json({ success: false, message: "TradeLocker synchronization failed." }, { status: 422 });
  }
}
