import { Mt5DirectConnectionStatus } from "@prisma/client";
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
      select: { directConnection: { select: { id: true } } },
    });

    if (!account?.directConnection) {
      return NextResponse.json(
        { success: false, message: "Direct MT5 connection not found" },
        { status: 404 }
      );
    }

    await prisma.mt5DirectConnection.update({
      where: { id: account.directConnection.id },
      data: {
        status: Mt5DirectConnectionStatus.DISCONNECTED,
        enabled: false,
        credentialEncrypted: null,
        leaseOwner: null,
        leaseUntil: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return (
      authErrorResponse(error) ||
      NextResponse.json(
        { success: false, message: "Failed to disconnect MT5" },
        { status: 500 }
      )
    );
  }
}
