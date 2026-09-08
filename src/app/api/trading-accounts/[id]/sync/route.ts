import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";
import {
  acquireMt5ConnectionLease,
  releaseMt5ConnectionLease,
  synchronizeMt5Connection,
} from "@/server/mt5-direct/sync-service";

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
      select: { directConnection: { select: { id: true } } },
    });

    if (!account?.directConnection) {
      return NextResponse.json(
        { success: false, message: "Direct MT5 connection not found" },
        { status: 404 }
      );
    }

    const leaseOwner = `manual:${user.id}:${crypto.randomUUID()}`;
    const acquired = await acquireMt5ConnectionLease(account.directConnection.id, leaseOwner);
    if (!acquired) {
      return NextResponse.json(
        { success: false, message: "Synchronization is already running" },
        { status: 409 }
      );
    }

    try {
      const result = await synchronizeMt5Connection(account.directConnection.id);
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
      await releaseMt5ConnectionLease(account.directConnection.id, leaseOwner);
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
        message: error instanceof Error ? error.message : "MT5 synchronization failed",
      },
      { status: 422 }
    );
  }
}
