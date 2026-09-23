import { Prisma, type RiskEvent, type RiskSettings } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getConfiguredSiteUrl } from "@/lib/deployment-url";
import { sendTransactionalEmail } from "@/lib/mail-core";
import { DEFAULT_SETTINGS, evaluateRisk, marginCallTransition, shouldNotify, type RiskReason, type RiskSettingsValues } from "@/lib/risk-guardian/engine";

const STALE_MINUTES = 15;
const n = (value: Prisma.Decimal | number | null | undefined) => value == null ? null : Number(value);
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);

export async function ownedRiskAccount(userId: string, accountId: string) {
  return prisma.tradingAccount.findFirst({ where: { id: accountId, userId },
    select: { id: true, userId: true, name: true, broker: true, currency: true, ingestionMode: true, lastSyncAt: true } });
}

export function settingValues(settings: RiskSettings | null): RiskSettingsValues {
  if (!settings) return DEFAULT_SETTINGS;
  return {
    enabled: settings.enabled, riskMode: settings.riskMode,
    warningMarginLevel: settings.warningMarginLevel, highRiskMarginLevel: settings.highRiskMarginLevel,
    criticalMarginLevel: settings.criticalMarginLevel, marginCallLevel: settings.marginCallLevel,
    stopOutLevel: settings.stopOutLevel, maxDailyDrawdown: settings.maxDailyDrawdown,
    maxTotalDrawdown: settings.maxTotalDrawdown, maxOpenPositions: settings.maxOpenPositions,
    maxTotalLots: settings.maxTotalLots, maxExposurePercent: settings.maxExposurePercent,
    lossVelocityThreshold: settings.lossVelocityThreshold, emailAlerts: settings.emailAlerts,
    inAppAlerts: settings.inAppAlerts, pushAlerts: settings.pushAlerts,
    telegramAlerts: settings.telegramAlerts, notificationCooldownMinutes: settings.notificationCooldownMinutes,
  };
}

export async function readRisk(accountId: string) {
  const [account, settings, latest, history, positions, baseline, tradesToday, lossBaseline, lossToday] = await Promise.all([
    prisma.tradingAccount.findUnique({ where: { id: accountId }, select: { id: true, userId: true, name: true, broker: true, currency: true, ingestionMode: true, lastSyncAt: true,
      directConnection: { select: { enabled: true, status: true } },
      ctraderConnection: { select: { enabled: true, status: true } },
      tradeLockerConnection: { select: { enabled: true, status: true } },
    } }),
    prisma.riskSettings.findUnique({ where: { accountId } }),
    prisma.accountEquitySnapshot.findFirst({ where: { accountId }, orderBy: { timestamp: "desc" } }),
    prisma.accountEquitySnapshot.findMany({ where: { accountId, timestamp: { gte: new Date(Date.now() - 36 * 60_000) } }, orderBy: { timestamp: "desc" }, take: 100 }),
    prisma.trade.findMany({ where: { accountId, status: "OPEN" }, select: { symbol: true, direction: true, lotSize: true, profitLoss: true, riskAmount: true } }),
    prisma.trade.aggregate({ where: { accountId, openedAt: { gte: new Date(Date.now() - 30 * 86_400_000) }, lotSize: { gt: 0 } }, _avg: { lotSize: true, riskAmount: true }, _count: { lotSize: true, riskAmount: true }, _min: { openedAt: true } }),
    prisma.trade.count({ where: { accountId, openedAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.trade.aggregate({ where: { accountId, status: "CLOSED", closedAt: { gte: new Date(Date.now() - 30 * 86_400_000) }, profitLoss: { lt: 0 } }, _sum: { profitLoss: true }, _count: { profitLoss: true }, _min: { closedAt: true } }),
    prisma.trade.aggregate({ where: { accountId, status: "CLOSED", closedAt: { gte: new Date(Date.now() - 86_400_000) }, profitLoss: { lt: 0 } }, _sum: { profitLoss: true } }),
  ]);
  if (!account) return null;
  const disconnected = account.ingestionMode === "DIRECT_MT5" ? !account.directConnection?.enabled || account.directConnection.status === "DISCONNECTED"
    : account.ingestionMode === "DIRECT_CTRADER" ? !account.ctraderConnection?.enabled || account.ctraderConnection.status === "DISCONNECTED"
    : account.ingestionMode === "DIRECT_TRADELOCKER" ? !account.tradeLockerConnection?.enabled : true;
  const stale = !latest || Date.now() - latest.timestamp.getTime() > STALE_MINUTES * 60_000 || disconnected;
  if (!latest) return { account, settings: settingValues(settings), storedSettings: settings, evaluation: null, stale: true, lastUpdatedAt: null, chart: [] };
  const dayStart = new Date(Date.UTC(latest.timestamp.getUTCFullYear(), latest.timestamp.getUTCMonth(), latest.timestamp.getUTCDate()));
  const [opening, peak] = await Promise.all([
    prisma.accountEquitySnapshot.findFirst({ where: { accountId, timestamp: { gte: dayStart, lte: latest.timestamp } }, orderBy: { timestamp: "asc" }, select: { balance: true, timestamp: true } }),
    settings?.peakEquity == null ? prisma.accountEquitySnapshot.aggregate({ where: { accountId }, _max: { equity: true } }) : Promise.resolve(null),
  ]);
  const snapshot = (row: typeof latest) => ({ timestamp: row.timestamp, balance: Number(row.balance), equity: Number(row.equity), margin: n(row.margin), freeMargin: n(row.freeMargin), marginLevel: n(row.marginLevel) });
  const evaluation = evaluateRisk({
    current: snapshot(latest), history: history.filter(row => row.timestamp < latest.timestamp).map(snapshot),
    positions: positions.map(row => ({ symbol: row.symbol, direction: row.direction, lots: n(row.lotSize) ?? 0, pnl: n(row.profitLoss), riskAmount: n(row.riskAmount) })),
    settings: settingValues(settings), dayOpeningBalance: opening && opening.timestamp.getTime() - dayStart.getTime() <= 15 * 60_000 ? Number(opening.balance) : null,
    peakEquity: settings?.peakEquity ?? n(peak?._max.equity),
    averageLotSize: baseline._count.lotSize >= 10 && baseline._min.openedAt && Date.now() - baseline._min.openedAt.getTime() >= 7 * 86_400_000 ? n(baseline._avg.lotSize) : null,
    averageTradesPerDay: baseline._count.lotSize >= 10 && baseline._min.openedAt && Date.now() - baseline._min.openedAt.getTime() >= 7 * 86_400_000 ? baseline._count.lotSize / Math.min(30, Math.max(1, (Date.now() - baseline._min.openedAt.getTime()) / 86_400_000)) : null,
    tradesToday,
    averageDailyLoss: lossBaseline._count.profitLoss >= 10 && lossBaseline._min.closedAt && Date.now() - lossBaseline._min.closedAt.getTime() >= 7 * 86_400_000 ? Math.abs(n(lossBaseline._sum.profitLoss) ?? 0) / Math.min(30, Math.max(1, (Date.now() - lossBaseline._min.closedAt.getTime()) / 86_400_000)) : null,
    lossToday: Math.abs(n(lossToday._sum.profitLoss) ?? 0),
    averageRiskPerTrade: baseline._count.riskAmount >= 10 && baseline._min.openedAt && Date.now() - baseline._min.openedAt.getTime() >= 7 * 86_400_000 ? n(baseline._avg.riskAmount) : null,
    brokerMarginCallLevel: n(latest.marginCallLevel), brokerStopOutLevel: n(latest.stopOutLevel),
  });
  return {
    account, settings: settingValues(settings), storedSettings: settings, evaluation, stale,
    lastUpdatedAt: latest.timestamp,
    historicalPeakEquity: n(peak?._max.equity),
    chart: history.slice().reverse().map(row => ({ timestamp: row.timestamp, equity: Number(row.equity), marginLevel: row.margin && Number(row.margin) > 0 ? Number(row.equity) / Number(row.margin) * 100 : null })),
  };
}

function notificationEmail(accountName: string, currency: string, event: RiskEvent) {
  const reasons = Array.isArray(event.reasons) ? event.reasons as { code?: string }[] : [];
  const rows = [
    ["Account", accountName], ["Risk level", event.riskLevel.replace("_", " ")], ["Risk score", `${event.riskScore} / 100`],
    ["Margin level", event.marginLevel == null ? "Insufficient data" : `${event.marginLevel.toFixed(1)}%`],
    ["Equity", event.equity == null ? "Insufficient data" : `${event.equity.toFixed(2)} ${currency}`],
    ["Free margin", event.freeMargin == null ? "Insufficient data" : `${event.freeMargin.toFixed(2)} ${currency}`],
    ["Daily drawdown", event.dailyDrawdown == null ? "Insufficient data" : `${event.dailyDrawdown.toFixed(1)}%`],
    ["Main reasons", reasons.slice(0, 3).map(r => (r.code ?? "Risk alert").replaceAll("_", " ")).join(", ")],
    ["Time", event.createdAt.toISOString()],
  ];
  const url = `${getConfiguredSiteUrl()}/dashboard/risk-guardian`;
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h1>Inguardy Risk Guardian</h1><p>Your trading account risk has changed.</p><table style="width:100%;border-collapse:collapse">${rows.map(([label, value]) => `<tr><td style="padding:9px;border-bottom:1px solid #e2e8f0">${escapeHtml(label)}</td><td style="padding:9px;border-bottom:1px solid #e2e8f0"><b>${escapeHtml(value)}</b></td></tr>`).join("")}</table><p><a href="${url}" style="display:inline-block;background:#6d5bd0;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">View Risk Guardian</a></p><p style="font-size:12px;color:#64748b">Informational monitoring only. Market conditions can change before the next account update.</p></div>`;
}

export async function evaluateStoredAccount(accountId: string) {
  const state = await readRisk(accountId);
  if (!state?.evaluation || state.stale || !state.settings.enabled || !state.lastUpdatedAt) return;
  const { account, evaluation, settings } = state;
  const at = state.lastUpdatedAt;
  await prisma.$transaction(async tx => {
    const existing = await tx.riskSettings.upsert({ where: { accountId }, create: { accountId, userId: account.userId }, update: {} });
    const claimed = await tx.riskSettings.updateMany({ where: { accountId, OR: [{ lastSnapshotAt: null }, { lastSnapshotAt: { lt: at } }] },
      data: { lastSnapshotAt: at, currentLevel: evaluation.level, currentScore: evaluation.score, peakEquity: Math.max(existing.peakEquity ?? 0, state.historicalPeakEquity ?? 0, evaluation.metrics.equity) } });
    if (!claimed.count) return null;
    const activeEvent = await tx.riskEvent.findFirst({ where: { accountId, resolvedAt: null }, orderBy: { createdAt: "desc" }, select: { reasons: true } });
    const previousReasons = Array.isArray(activeEvent?.reasons) ? activeEvent.reasons as RiskReason[] : [];
    const { changed: marginReasonChanged, newAlert: newMarginAlert } = marginCallTransition(previousReasons, evaluation.reasons);
    const materiallyWorse = existing.currentLevel === evaluation.level && evaluation.score >= existing.currentScore + 15;
    if (existing.currentLevel === evaluation.level && !materiallyWorse && !marginReasonChanged) return null;
    const notify = newMarginAlert || shouldNotify(existing.currentLevel, evaluation.level, existing.lastNotifiedAt, at, settings.notificationCooldownMinutes, materiallyWorse);
    if (existing.currentLevel === evaluation.level && !notify && !marginReasonChanged) return null;
    await tx.riskEvent.updateMany({ where: { accountId, resolvedAt: null }, data: { resolvedAt: at } });
    const event = await tx.riskEvent.create({ data: {
      userId: account.userId, accountId, riskLevel: evaluation.level, riskScore: evaluation.score,
      balance: evaluation.metrics.balance, equity: evaluation.metrics.equity,
      usedMargin: evaluation.metrics.usedMargin, freeMargin: evaluation.metrics.freeMargin,
      marginLevel: evaluation.metrics.marginLevel, dailyDrawdown: evaluation.metrics.dailyDrawdown,
      totalDrawdown: evaluation.metrics.totalDrawdown, totalLots: evaluation.metrics.totalLots,
      openPositions: evaluation.metrics.openPositions, reasons: evaluation.reasons as unknown as Prisma.InputJsonValue,
      resolvedAt: evaluation.level === "SAFE" ? at : null,
    } });
    if (notify) await tx.riskSettings.update({ where: { accountId }, data: { lastNotifiedAt: at } });
    if (notify && settings.inAppAlerts) await tx.riskNotification.create({ data: { riskEventId: event.id, userId: account.userId, accountId, channel: "IN_APP", status: "SENT", sentAt: at } });
    if (notify && settings.emailAlerts) await tx.riskNotification.create({ data: { riskEventId: event.id, userId: account.userId, accountId, channel: "EMAIL", status: "PENDING" } });
    return event.id;
  });
}

export async function evaluateStoredAccountSafely(accountId: string) {
  try { await evaluateStoredAccount(accountId); }
  catch (error) { console.error("Risk Guardian evaluation failed", { accountId, error }); }
}

export async function dispatchPendingRiskEmails() {
  const now = new Date();
  const candidates = await prisma.riskNotification.findMany({ where: {
    channel: "EMAIL", attempts: { lt: 5 }, status: { in: ["PENDING", "SENDING"] },
    OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
    AND: [{ OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] }],
  }, orderBy: { createdAt: "asc" }, take: 20,
    include: { event: true, account: { select: { name: true, currency: true } }, user: { select: { email: true } } } });
  for (const candidate of candidates) {
    const claimed = await prisma.riskNotification.updateMany({ where: { id: candidate.id, attempts: { lt: 5 }, status: { in: ["PENDING", "SENDING"] }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
      data: { status: "SENDING", attempts: { increment: 1 }, leaseUntil: new Date(Date.now() + 2 * 60_000) } });
    if (!claimed.count) continue;
    try {
      await sendTransactionalEmail({ to: candidate.user.email, subject: `Inguardy Risk Alert — ${candidate.event.riskLevel.replace("_", " ")}`,
        html: notificationEmail(candidate.account.name, candidate.account.currency, candidate.event) });
      await prisma.riskNotification.update({ where: { id: candidate.id }, data: { status: "SENT", sentAt: new Date(), leaseUntil: null, nextAttemptAt: null, failureReason: null } });
    } catch (error) {
      const attempts = candidate.attempts + 1;
      await prisma.riskNotification.update({ where: { id: candidate.id }, data: { status: attempts >= 5 ? "FAILED" : "PENDING",
        leaseUntil: null, nextAttemptAt: attempts >= 5 ? null : new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000),
        failureReason: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed" } });
    }
  }
}
