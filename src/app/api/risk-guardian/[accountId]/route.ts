import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { PRESETS, simulateLoss } from "@/lib/risk-guardian/engine";
import { normalizeStoredRiskAlert } from "@/lib/risk-guardian/history";
import { evaluateStoredAccountSafely, ownedRiskAccount, readRisk } from "@/server/risk-guardian/service";

export const dynamic = "force-dynamic";
const threshold = z.number().finite().positive().max(100_000);
const settingsSchema = z.object({
  enabled: z.boolean(), riskMode: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE", "CUSTOM"]),
  warningMarginLevel: threshold, highRiskMarginLevel: threshold, criticalMarginLevel: threshold,
  marginCallLevel: threshold.nullable(), stopOutLevel: threshold.nullable(),
  maxDailyDrawdown: threshold.max(100), maxTotalDrawdown: threshold.max(100),
  maxOpenPositions: z.number().int().positive().max(1000), maxTotalLots: threshold.max(100_000),
  maxExposurePercent: threshold.max(1000), lossVelocityThreshold: threshold.max(100),
  emailAlerts: z.boolean(), inAppAlerts: z.boolean(), pushAlerts: z.boolean(), telegramAlerts: z.boolean(),
  notificationCooldownMinutes: z.number().int().min(1).max(1440),
});
type Context = { params: Promise<{ accountId: string }> };
async function authorize(context: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { accountId } = await context.params;
  const account = await ownedRiskAccount(userId, accountId);
  if (!account) return { error: NextResponse.json({ error: "Account not found" }, { status: 404 }) };
  return { userId, accountId, account };
}

export async function GET(_request: Request, context: Context) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  const [state, history, notifications] = await Promise.all([
    readRisk(auth.accountId!),
    prisma.riskEvent.findMany({ where: { accountId: auth.accountId, userId: auth.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.riskNotification.findMany({ where: { accountId: auth.accountId, userId: auth.userId, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 20,
      select: { id: true, riskEventId: true, sentAt: true, readAt: true, event: { select: { riskLevel: true, riskScore: true, reasons: true } } } }),
  ]);
  return NextResponse.json({
    ...state,
    history: history.map(normalizeStoredRiskAlert),
    notifications: notifications.map(notification => ({
      ...notification,
      event: normalizeStoredRiskAlert(notification.event),
    })),
  });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid risk settings", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  if (input.pushAlerts || input.telegramAlerts) return NextResponse.json({ error: "Push and Telegram delivery are not available yet" }, { status: 400 });
  const values = input.riskMode === "CUSTOM" ? input : { ...input, ...PRESETS[input.riskMode] };
  if (!(values.warningMarginLevel > values.highRiskMarginLevel && values.highRiskMarginLevel > values.criticalMarginLevel))
    return NextResponse.json({ error: "Margin thresholds must descend from warning to critical" }, { status: 400 });
  if (values.stopOutLevel !== null && values.marginCallLevel !== null && values.stopOutLevel >= values.marginCallLevel)
    return NextResponse.json({ error: "Stop-out must be below margin call" }, { status: 400 });
  const settings = await prisma.riskSettings.upsert({ where: { accountId: auth.accountId! },
    create: { ...values, userId: auth.userId!, accountId: auth.accountId! },
    update: { ...values, lastSnapshotAt: null } });
  await evaluateStoredAccountSafely(auth.accountId!);
  return NextResponse.json({ settings });
}

export async function POST(request: Request, context: Context) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = z.object({ additionalLoss: z.number().finite().min(0).max(1_000_000_000) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid simulation amount" }, { status: 400 });
  const state = await readRisk(auth.accountId!);
  if (!state?.evaluation || state.stale) return NextResponse.json({ error: "Current account data is unavailable or stale" }, { status: 409 });
  return NextResponse.json(simulateLoss(state.evaluation, state.settings, parsed.data.additionalLoss));
}
