import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { normalizeStoredRiskAlert } from "@/lib/risk-guardian/history";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = { userId, channel: "IN_APP", status: "SENT" };
  const [rows, unreadCount] = await Promise.all([
    prisma.riskNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true, accountId: true, createdAt: true, readAt: true,
        account: { select: { name: true } },
        event: { select: { riskLevel: true, riskScore: true, reasons: true, marginLevel: true } },
      },
    }),
    prisma.riskNotification.count({ where: { ...where, readAt: null } }),
  ]);

  return NextResponse.json({ notifications: rows.map(row => {
    const event = normalizeStoredRiskAlert(row.event);
    return {
    id: row.id, accountId: row.accountId, accountName: row.account.name,
    createdAt: row.createdAt, readAt: row.readAt,
    riskLevel: event.riskLevel, riskScore: event.riskScore,
    reasons: event.reasons, marginLevel: event.marginLevel,
  }; }), unreadCount }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { id?: unknown; all?: unknown } | null;
  if (!body || (typeof body.id !== "string" && body.all !== true)) {
    return NextResponse.json({ error: "Notification id or all=true required" }, { status: 400 });
  }
  const result = await prisma.riskNotification.updateMany({
    where: { userId, channel: "IN_APP", status: "SENT", readAt: null,
      ...(body.all === true ? {} : { id: body.id as string }) },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ markedRead: result.count });
}
