import { TradeStatus, type TradeLockerConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadJournalScreenshot } from "@/lib/journal/screenshot-service";
import { renderTradingChart } from "@/server/ctrader/chart-renderer";
import { getTradeLockerPriceHistory } from "@/server/tradelocker/client";
import type { TradeLockerEnvironment, TradeLockerResolution } from "@/server/tradelocker/schemas";
import { upsertTradeScreenshot } from "@/server/mt5/pending-screenshots";

const DEFAULT_TIMEFRAME = "M5";
const DEFAULT_BARS = 90;
const MAX_SCREENSHOTS_PER_SYNC = 4;
const TIMEFRAMES: Record<string, { resolution: TradeLockerResolution; minutes: number }> = {
  M1: { resolution: "1m", minutes: 1 },
  M5: { resolution: "5m", minutes: 5 },
  M15: { resolution: "15m", minutes: 15 },
  M30: { resolution: "30m", minutes: 30 },
  H1: { resolution: "1H", minutes: 60 },
  H4: { resolution: "4H", minutes: 240 },
  D1: { resolution: "1D", minutes: 1_440 },
  W1: { resolution: "1W", minutes: 10_080 },
  MN1: { resolution: "1M", minutes: 43_200 },
};

function decimalNumber(value: { toString(): string } | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function screenshotConfig() {
  const candidate = process.env.JOURNAL_SCREENSHOT_TIMEFRAME?.trim().toUpperCase() || DEFAULT_TIMEFRAME;
  const timeframe = TIMEFRAMES[candidate] ? candidate : DEFAULT_TIMEFRAME;
  const parsedBars = Number(process.env.JOURNAL_SCREENSHOT_BARS || DEFAULT_BARS);
  const parsedDelay = Number(process.env.TRADELOCKER_SYNC_REQUEST_DELAY_MS || 1_100);
  return {
    timeframe,
    resolution: TIMEFRAMES[timeframe].resolution,
    minutes: TIMEFRAMES[timeframe].minutes,
    bars: Number.isFinite(parsedBars) && parsedBars > 0 ? Math.min(Math.floor(parsedBars), 500) : DEFAULT_BARS,
    requestDelayMs: Number.isFinite(parsedDelay) && parsedDelay > 0 ? parsedDelay : 1_100,
  };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function tradeLockerInfoRouteId(rawPayload: unknown) {
  const payload = objectValue(rawPayload);
  if (!payload || !Array.isArray(payload.routes)) return null;
  for (const routeValue of payload.routes) {
    const route = objectValue(routeValue);
    if (!route || String(route.type || "").toUpperCase() !== "INFO") continue;
    const id = route.id === null || route.id === undefined ? "" : String(route.id);
    if (id) return id;
  }
  return null;
}

async function tradableInstrumentForPosition(connectionId: string, externalPositionId: string) {
  const [position, execution, order] = await Promise.all([
    prisma.tradeLockerPosition.findUnique({
      where: { connectionId_externalPositionId: { connectionId, externalPositionId } },
      select: { tradableInstrumentId: true },
    }),
    prisma.tradeLockerExecution.findFirst({
      where: { connectionId, externalPositionId },
      orderBy: { executedAt: "asc" },
      select: { tradableInstrumentId: true },
    }),
    prisma.tradeLockerOrder.findFirst({
      where: { connectionId, externalPositionId },
      orderBy: [{ createdAtProvider: "asc" }, { createdAt: "asc" }],
      select: { tradableInstrumentId: true },
    }),
  ]);
  return position?.tradableInstrumentId || order?.tradableInstrumentId || execution?.tradableInstrumentId || null;
}

export async function captureTradeLockerTradeScreenshots(
  connection: TradeLockerConnection,
  accessToken: string,
  options: { force?: boolean } = {}
) {
  const trades = await prisma.trade.findMany({
    where: {
      accountId: connection.accountId,
      source: "TRADELOCKER_DIRECT",
      tradeLockerPositionId: { not: null },
    },
    include: { screenshots: { select: { type: true } } },
    orderBy: { openedAt: "desc" },
    take: 30,
  });
  const config = screenshotConfig();
  let captured = 0;
  const errors: string[] = [];

  for (const trade of trades) {
    if (captured >= MAX_SCREENSHOTS_PER_SYNC) break;
    if (!trade.tradeLockerPositionId || !trade.openedAt) continue;
    const tradableInstrumentId = await tradableInstrumentForPosition(connection.id, trade.tradeLockerPositionId);
    if (!tradableInstrumentId) continue;
    const instrument = await prisma.tradeLockerInstrument.findUnique({
      where: { connectionId_tradableInstrumentId: { connectionId: connection.id, tradableInstrumentId } },
      select: { rawPayload: true },
    });
    const routeId = tradeLockerInfoRouteId(instrument?.rawPayload);
    if (!routeId) {
      errors.push(`${trade.tradeLockerPositionId}:INFO route is unavailable`);
      continue;
    }

    const existingTypes = new Set(trade.screenshots.map((item) => item.type.toUpperCase()));
    const stages: Array<{ type: "ENTRY" | "EXIT"; capturedAt: Date }> = [];
    if (options.force || !existingTypes.has("ENTRY")) {
      stages.push({ type: "ENTRY", capturedAt: trade.openedAt });
    }
    if (trade.status === TradeStatus.CLOSED && trade.closedAt &&
        (options.force || !existingTypes.has("EXIT"))) {
      stages.push({ type: "EXIT", capturedAt: trade.closedAt });
    }

    for (const stage of stages) {
      if (captured >= MAX_SCREENSHOTS_PER_SYNC) break;
      try {
        await new Promise((resolve) => setTimeout(resolve, config.requestDelayMs));
        const intervalMs = config.minutes * 60_000;
        const lookbackMs = Math.max(intervalMs * config.bars * 4, 7 * 24 * 60 * 60 * 1_000);
        const chartBars = (await getTradeLockerPriceHistory({
          environment: connection.environment as TradeLockerEnvironment,
          accessToken,
          accNum: connection.accNum,
          tradableInstrumentId,
          routeId,
          resolution: config.resolution,
          from: new Date(stage.capturedAt.getTime() - lookbackMs),
          to: stage.capturedAt,
        })).slice(-config.bars);
        if (chartBars.length < 10) throw new Error("TradeLocker returned fewer than 10 chart bars");
        const imageBase64 = await renderTradingChart({
          bars: chartBars,
          symbol: trade.symbol,
          capturedAt: stage.capturedAt,
          timeframe: config.timeframe,
          stage: stage.type.toLowerCase() as "entry" | "exit",
          direction: trade.direction,
          entryPrice: decimalNumber(trade.entryPrice),
          exitPrice: decimalNumber(trade.exitPrice),
          stopLoss: decimalNumber(trade.initialStopLoss || trade.stopLoss),
          takeProfit: decimalNumber(trade.initialTakeProfit || trade.takeProfit),
        });
        const upload = await uploadJournalScreenshot({
          accountNumber: connection.tradeLockerAccountId,
          broker: connection.server,
          serverName: "TradeLocker",
          positionId: trade.tradeLockerPositionId,
          dealTicket: trade.tradeLockerPositionId,
          type: stage.type.toLowerCase() as "entry" | "exit",
          capturedAt: stage.capturedAt,
          status: trade.status.toLowerCase(),
          imageBase64,
        });
        await upsertTradeScreenshot(prisma as any, {
          tradeId: trade.id,
          userId: trade.userId,
          type: stage.type,
          url: upload.imageUrl,
        });
        captured += 1;
      } catch (error) {
        errors.push(`${trade.tradeLockerPositionId}:${stage.type}:${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }
  return { captured, errors };
}
