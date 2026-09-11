import { Prisma } from "@prisma/client";
import { z } from "zod";

export const backtestPositionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  direction: z.enum(["LONG", "SHORT"]),
  entry: z.number().finite().positive(),
  stopLoss: z.number().finite().positive(),
  takeProfit: z.number().finite().positive(),
  riskAmount: z.number().finite().positive().max(1_000_000_000),
  status: z.enum(["DRAFT", "PENDING", "OPEN", "WON", "LOST"]),
  placedAtIndex: z.number().int().nonnegative(),
  lastEvaluatedIndex: z.number().int().nonnegative(),
  openedAtIndex: z.number().int().nonnegative().optional(),
  closedAtIndex: z.number().int().nonnegative().optional(),
  exitPrice: z.number().finite().positive().optional(),
  resultR: z.number().finite().min(-1000).max(1000).optional(),
});

export const createBacktestSessionSchema = z.object({
  accountId: z.string().trim().min(1).max(128).nullable().optional(),
  playbookId: z.string().trim().min(1).max(128).nullable().optional(),
  symbol: z.string().trim().min(1).max(48).regex(/^[A-Za-z0-9:._\/-]+$/),
  timeframe: z.enum(["M5", "M15", "H1", "H4", "D1"]),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(`${value}T23:59:59.000Z`))),
  historySize: z.number().int().min(120).max(1000),
  speed: z.number().int().min(100).max(5000).default(700),
  currentCandleTime: z.string().datetime().nullable().optional(),
});

export const updateBacktestSessionSchema = createBacktestSessionSchema
  .partial()
  .extend({
    activePosition: backtestPositionSchema.nullable().optional(),
    trade: backtestPositionSchema.extend({
      riskReward: z.number().finite().nonnegative().max(1000),
      profitLoss: z.number().finite().min(-1_000_000_000).max(1_000_000_000).optional(),
      volume: z.number().finite().positive().max(1_000_000).nullable().optional(),
      openedAt: z.string().datetime().nullable().optional(),
      closedAt: z.string().datetime().nullable().optional(),
    }).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "No session changes were provided");

export const backtestSessionInclude = {
  trades: {
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BacktestSessionInclude;

export type BacktestSessionRecord = Prisma.BacktestSessionGetPayload<{
  include: typeof backtestSessionInclude;
}>;

function numberValue(value: Prisma.Decimal | null) {
  return value === null ? null : Number(value);
}

export function summarizeBacktestTrades(trades: BacktestSessionRecord["trades"]) {
  const closed = trades.filter((trade) => trade.status === "WON" || trade.status === "LOST");
  const wins = closed.filter((trade) => trade.status === "WON").length;
  const losses = closed.filter((trade) => trade.status === "LOST").length;
  const netR = closed.reduce((sum, trade) => sum + (numberValue(trade.resultR) ?? 0), 0);
  const netProfitLoss = closed.reduce((sum, trade) => sum + (numberValue(trade.profitLoss) ?? 0), 0);

  return {
    totalTrades: closed.length,
    wins,
    losses,
    winRate: closed.length ? (wins / closed.length) * 100 : 0,
    netR,
    netProfitLoss,
  };
}

export function serializeBacktestSession(session: BacktestSessionRecord) {
  return {
    id: session.id,
    accountId: session.accountId,
    playbookId: session.playbookId,
    symbol: session.symbol,
    timeframe: session.timeframe,
    endDate: session.endDate.toISOString().slice(0, 10),
    historySize: session.historySize,
    speed: session.speed,
    status: session.status,
    currentCandleTime: session.currentCandleTime?.toISOString() ?? null,
    activePosition: session.activePosition,
    completedAt: session.completedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    trades: session.trades.map((trade) => ({
      id: trade.id,
      clientPositionId: trade.clientPositionId,
      direction: trade.direction,
      status: trade.status,
      entry: numberValue(trade.entry),
      stopLoss: numberValue(trade.stopLoss),
      takeProfit: numberValue(trade.takeProfit),
      exitPrice: numberValue(trade.exitPrice),
      volume: numberValue(trade.volume),
      riskAmount: numberValue(trade.riskAmount),
      riskReward: numberValue(trade.riskReward),
      resultR: numberValue(trade.resultR),
      profitLoss: numberValue(trade.profitLoss),
      placedAtIndex: trade.placedAtIndex,
      lastEvaluatedIndex: trade.lastEvaluatedIndex,
      openedAtIndex: trade.openedAtIndex,
      closedAtIndex: trade.closedAtIndex,
      openedAt: trade.openedAt?.toISOString() ?? null,
      closedAt: trade.closedAt?.toISOString() ?? null,
      closeReason: trade.closeReason,
    })),
    summary: summarizeBacktestTrades(session.trades),
  };
}
