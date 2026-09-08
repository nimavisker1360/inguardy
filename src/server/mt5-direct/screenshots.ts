import { TradeStatus, type Mt5DirectConnection } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { uploadJournalScreenshot } from "@/lib/journal/screenshot-service";
import { runMt5Bridge } from "@/server/mt5-direct/python-bridge";
import { upsertTradeScreenshot } from "@/server/mt5/pending-screenshots";

const DEFAULT_TIMEFRAME = "M5";
const DEFAULT_BARS = 90;
const MAX_SCREENSHOTS_PER_SYNC = 4;

function decimalNumber(value: { toString(): string } | null | undefined) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function screenshotConfig() {
  const parsedBars = Number(process.env.JOURNAL_SCREENSHOT_BARS || DEFAULT_BARS);
  return {
    timeframe: process.env.JOURNAL_SCREENSHOT_TIMEFRAME?.trim().toUpperCase() || DEFAULT_TIMEFRAME,
    bars: Number.isFinite(parsedBars) && parsedBars > 0 ? Math.floor(parsedBars) : DEFAULT_BARS,
  };
}

export async function captureMt5TradeScreenshots(
  connection: Mt5DirectConnection,
  password: string,
  options: { force?: boolean } = {}
) {
  const trades = await prisma.trade.findMany({
    where: {
      accountId: connection.accountId,
      source: "MT5_DIRECT",
      mt5Ticket: { not: null },
      openedAt: { gte: connection.createdAt },
    },
    include: {
      screenshots: { select: { type: true } },
    },
    orderBy: { openedAt: "desc" },
    take: 30,
  });
  const config = screenshotConfig();
  let captured = 0;
  const errors: string[] = [];

  for (const trade of trades) {
    if (captured >= MAX_SCREENSHOTS_PER_SYNC) break;
    if (!trade.mt5Ticket || !trade.openedAt) continue;

    const existingTypes = new Set(trade.screenshots.map((item) => item.type.toUpperCase()));
    const stages: Array<{ type: "ENTRY" | "EXIT"; capturedAt: Date }> = [];
    if (options.force || !existingTypes.has("ENTRY")) {
      stages.push({ type: "ENTRY", capturedAt: trade.openedAt });
    }
    if (
      trade.status === TradeStatus.CLOSED &&
      trade.closedAt &&
      (options.force || !existingTypes.has("EXIT"))
    ) {
      stages.push({ type: "EXIT", capturedAt: trade.closedAt });
    }

    for (const stage of stages) {
      if (captured >= MAX_SCREENSHOTS_PER_SYNC) break;
      try {
        const snapshot = await runMt5Bridge({
          operation: "chart",
          server: connection.server,
          login: connection.login,
          password,
          symbol: trade.symbol,
          capturedAt: stage.capturedAt,
          timeframe: config.timeframe,
          bars: config.bars,
          stage: stage.type.toLowerCase() as "entry" | "exit",
          direction: trade.direction,
          entryPrice: decimalNumber(trade.entryPrice),
          exitPrice: decimalNumber(trade.exitPrice),
          stopLoss: decimalNumber(trade.initialStopLoss || trade.stopLoss),
          takeProfit: decimalNumber(trade.initialTakeProfit || trade.takeProfit),
          timeoutMs: 120_000,
        });
        if (!snapshot.chart?.imageBase64) {
          throw new Error("MT5 chart response did not contain an image");
        }
        const upload = await uploadJournalScreenshot({
          accountNumber: connection.login,
          broker: connection.server,
          serverName: "MT5",
          positionId: trade.mt5Ticket,
          dealTicket: trade.mt5Ticket,
          type: stage.type.toLowerCase() as "entry" | "exit",
          capturedAt: stage.capturedAt,
          status: trade.status.toLowerCase(),
          imageBase64: snapshot.chart.imageBase64,
        });
        await upsertTradeScreenshot(prisma as any, {
          tradeId: trade.id,
          userId: trade.userId,
          type: stage.type,
          url: upload.imageUrl,
        });
        captured += 1;
      } catch (error) {
        errors.push(
          `${trade.mt5Ticket}:${stage.type}:${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  return { captured, errors };
}
