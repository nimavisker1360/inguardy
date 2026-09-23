import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { ownedRiskAccount } from "@/server/risk-guardian/service";

export async function PATCH(_request: Request, { params }: { params: Promise<{ accountId: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { accountId } = await params;
  if (!await ownedRiskAccount(userId, accountId)) return NextResponse.json({ error: "Account not found" }, { status: 404 });
  const result = await prisma.riskNotification.updateMany({ where: { userId, accountId, channel: "IN_APP", readAt: null }, data: { readAt: new Date() } });
  return NextResponse.json({ markedRead: result.count });
}
