import { TradeLockerConnectionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const account = await prisma.tradingAccount.findFirst({
      where: { id, userId: user.id },
      select: { tradeLockerConnection: { select: { id: true } } },
    });
    if (!account?.tradeLockerConnection) {
      return NextResponse.json({ success: false, message: "TradeLocker connection not found." }, { status: 404 });
    }
    await prisma.tradeLockerConnection.update({
      where: { id: account.tradeLockerConnection.id },
      data: {
        status: TradeLockerConnectionStatus.DISCONNECTED,
        enabled: false,
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        tokenRefreshOwner: null,
        tokenRefreshUntil: null,
        leaseOwner: null,
        leaseUntil: null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error) || NextResponse.json({ success: false, message: "Failed to disconnect TradeLocker." }, { status: 500 });
  }
}
