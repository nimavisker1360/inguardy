import { CtraderDirectConnectionStatus } from "@prisma/client";
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
      select: { ctraderConnection: { select: { id: true } } },
    });
    if (!account?.ctraderConnection) {
      return NextResponse.json(
        { success: false, message: "Direct cTrader connection not found" },
        { status: 404 }
      );
    }
    await prisma.ctraderDirectConnection.update({
      where: { id: account.ctraderConnection.id },
      data: {
        status: CtraderDirectConnectionStatus.DISCONNECTED,
        enabled: false,
        leaseOwner: null,
        leaseUntil: null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return (
      authErrorResponse(error) ||
      NextResponse.json(
        { success: false, message: "Failed to disconnect cTrader" },
        { status: 500 }
      )
    );
  }
}

