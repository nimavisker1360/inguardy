import { TradeStatus, type CtraderDirectConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadJournalScreenshot } from "@/lib/journal/screenshot-service";
import { renderCtraderChart } from "@/server/ctrader/chart-renderer";
import {
  fetchCtraderTrendbars,
  type CtraderEnvironment,
  type CtraderTrendbarPeriod,
} from "@/server/ctrader/open-api-client";
import { upsertTradeScreenshot } from "@/server/mt5/pending-screenshots";

const DEFAULT_TIMEFRAME: CtraderTrendbarPeriod = "M5";
const DEFAULT_BARS = 90;
const MAX_SCREENSHOTS_PER_SYNC = 4;
const PERIOD_MINUTES: Record<CtraderTrendbarPeriod, number> = {
  M1: 1, M2: 2, M3: 3, M4: 4, M5: 5, M10: 10, M15: 15,
  M30: 30, H1: 60, H4: 240, H12: 720, D1: 1440, W1: 10080, MN1: 43200,
};

function decimalNumber(value: { toString(): string } | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function screenshotConfig() {
  const candidate = process.env.JOURNAL_SCREENSHOT_TIMEFRAME?.trim().toUpperCase();
  const timeframe = candidate && candidate in PERIOD_MINUTES
    ? candidate as CtraderTrendbarPeriod
    : DEFAULT_TIMEFRAME;
  const parsedBars = Number(process.env.JOURNAL_SCREENSHOT_BARS || DEFAULT_BARS);
  return {
    timeframe,
    bars: Number.isFinite(parsedBars) && parsedBars > 0 ? Math.floor(parsedBars) : DEFAULT_BARS,
  };
}

export async function captureCtraderTradeScreenshots(
  connection: CtraderDirectConnection,
  accessToken: string,
  options: { force?: boolean } = {}
) {
  const trades = await prisma.trade.findMany({
    where: {
      accountId: connection.accountId,
      source: "CTRADER_DIRECT",
      mt5Ticket: { not: null },
      openedAt: { gte: connection.createdAt },
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
    if (!trade.mt5Ticket || !trade.openedAt) continue;
    const brokerDeal = await prisma.ctraderBrokerDeal.findFirst({
      where: { accountId: connection.accountId, externalPositionId: trade.mt5Ticket },
      select: { symbolId: true },
      orderBy: { executedAt: "asc" },
    });
    if (!brokerDeal) continue;

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
        const intervalMs = PERIOD_MINUTES[config.timeframe] * 60_000;
        const lookbackMs = Math.max(intervalMs * config.bars * 4, 7 * 24 * 60 * 60 * 1000);
        const chartBars = await fetchCtraderTrendbars({
          environment: connection.environment as CtraderEnvironment,
          ctidTraderAccountId: connection.ctidTraderAccountId,
          accessToken,
          symbolId: brokerDeal.symbolId,
          period: config.timeframe,
          from: new Date(stage.capturedAt.getTime() - lookbackMs),
          to: stage.capturedAt,
          count: config.bars,
        });
        if (chartBars.length < 10) throw new Error("cTrader returned fewer than 10 chart bars");
        const imageBase64 = await renderCtraderChart({
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
          accountNumber: connection.traderLogin || connection.ctidTraderAccountId,
          broker: connection.brokerName || "cTrader",
          serverName: "cTrader",
          positionId: trade.mt5Ticket,
          dealTicket: trade.mt5Ticket,
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
        errors.push(`${trade.mt5Ticket}:${stage.type}:${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
  }
  return { captured, errors };
}
