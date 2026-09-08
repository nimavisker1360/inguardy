import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const account = await prisma.tradingAccount.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        tradeLockerConnection: {
          select: {
            id: true,
            tradeLockerAccountId: true,
            accNum: true,
            accountName: true,
            accountStatus: true,
            environment: true,
            server: true,
            status: true,
            enabled: true,
            lastAttemptAt: true,
            lastConnectedAt: true,
            lastSyncAt: true,
            lastError: true,
            importedOrderCount: true,
            importedExecutionCount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!account) return NextResponse.json({ success: false, message: "Trading account not found." }, { status: 404 });
    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    return authErrorResponse(error) || NextResponse.json({ success: false, message: "Failed to load TradeLocker status." }, { status: 500 });
  }
}
