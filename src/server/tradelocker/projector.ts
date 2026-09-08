import { Prisma, TradeDirection, TradeReviewStatus, TradeStatus, type TradeLockerConnection } from "@prisma/client";
import { getTradingSessionLabel } from "@/lib/journal/trading-session";

function numberValue(value: Prisma.Decimal | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

function weightedPrice<T>(items: T[], quantity: (item: T) => number, price: (item: T) => number) {
  const volume = items.reduce((sum, item) => sum + quantity(item), 0);
  if (volume <= 0) return null;
  return items.reduce((sum, item) => sum + quantity(item) * price(item), 0) / volume;
}

export async function projectTradeLockerPositions(
  tx: Prisma.TransactionClient,
  connection: TradeLockerConnection,
  changedPositionIds: string[]
) {
  const openPositions = await tx.tradeLockerPosition.findMany({
    where: { connectionId: connection.id, isOpen: true },
  });
  const ids = [...new Set([...changedPositionIds, ...openPositions.map((item) => item.externalPositionId)].filter(Boolean))];
  const names = new Map(
    (await tx.tradeLockerInstrument.findMany({ where: { connectionId: connection.id } }))
      .map((instrument) => [instrument.tradableInstrumentId, instrument.name])
  );
  let projected = 0;

  for (const externalPositionId of ids) {
    const [orders, executions, existing] = await Promise.all([
      tx.tradeLockerOrder.findMany({
        where: { connectionId: connection.id, externalPositionId, dataKind: "HISTORY", status: { equals: "Filled", mode: "insensitive" } },
        orderBy: [{ modifiedAtProvider: "asc" }, { createdAtProvider: "asc" }],
      }),
      tx.tradeLockerExecution.findMany({
        where: { connectionId: connection.id, externalPositionId },
        orderBy: [{ executedAt: "asc" }, { externalExecutionId: "asc" }],
      }),
      tx.trade.findUnique({
        where: { accountId_tradeLockerPositionId: { accountId: connection.accountId, tradeLockerPositionId: externalPositionId } },
      }),
    ]);
    const openPosition = openPositions.find((item) => item.externalPositionId === externalPositionId);
    const first = executions[0] || orders[0];
    if (!first && !openPosition && !existing) continue;

    const firstSide = (first?.side || openPosition?.side || "buy").toLowerCase();
    const direction = firstSide === "sell" ? TradeDirection.SELL : TradeDirection.BUY;
    const entries = executions.length
      ? executions.filter((item) => (item.side || "").toLowerCase() === firstSide)
      : orders.filter((item) => (item.side || "").toLowerCase() === firstSide);
    const exits = executions.length
      ? executions.filter((item) => (item.side || "").toLowerCase() !== firstSide)
      : orders.filter((item) => (item.side || "").toLowerCase() !== firstSide);
    const eventQuantity = (item: { quantity: Prisma.Decimal | null; filledQuantity?: Prisma.Decimal | null }) =>
      numberValue(item.filledQuantity) ?? numberValue(item.quantity) ?? 0;
    const eventPrice = (item: { quantity: Prisma.Decimal | null; filledQuantity?: Prisma.Decimal | null; price?: Prisma.Decimal | null; averagePrice?: Prisma.Decimal | null }) =>
      numberValue(item.price) ?? numberValue(item.averagePrice) ?? 0;
    const entryPrice = openPosition?.averagePrice
      ? Number(openPosition.averagePrice)
      : weightedPrice(entries, eventQuantity, eventPrice);
    const exitPrice = weightedPrice(exits, eventQuantity, eventPrice);
    const openedAt = executions[0]?.executedAt || orders[0]?.createdAtProvider || openPosition?.openedAt || existing?.openedAt || new Date();
    const closedAt = openPosition
      ? null
      : executions.at(-1)?.executedAt || orders.at(-1)?.modifiedAtProvider || existing?.closedAt || null;
    const instrumentId = first?.tradableInstrumentId || openPosition?.tradableInstrumentId || "";
    const symbol = names.get(instrumentId) || existing?.symbol || instrumentId || "Unknown";
    const totalEntryQuantity = entries.reduce((sum, item) => sum + eventQuantity(item), 0);
    const openQuantity = numberValue(openPosition?.quantity);
    const status = openPosition ? TradeStatus.OPEN : TradeStatus.CLOSED;
    const reviewStatus = existing?.reviewStatus === TradeReviewStatus.REVIEWED
      ? TradeReviewStatus.REVIEWED
      : TradeReviewStatus.NEEDS_REVIEW;
    const data: Prisma.TradeUncheckedUpdateInput = {
      symbol,
      direction,
      status,
      entryPrice: entryPrice === null ? null : new Prisma.Decimal(entryPrice),
      exitPrice: exitPrice === null ? null : new Prisma.Decimal(exitPrice),
      lotSize: new Prisma.Decimal(openQuantity ?? totalEntryQuantity),
      profitLoss: openPosition?.unrealizedPnl ?? null,
      openedAt,
      closedAt,
      session: getTradingSessionLabel(openedAt),
      source: "TRADELOCKER_DIRECT",
      reviewStatus,
    };

    if (existing) {
      // Only provider-owned fields are updated; journal notes, tags, psychology,
      // screenshots and manual classifications remain untouched.
      await tx.trade.update({ where: { id: existing.id }, data });
    } else {
      await tx.trade.create({
        data: {
          userId: connection.userId,
          accountId: connection.accountId,
          tradeLockerPositionId: externalPositionId,
          symbol,
          direction,
          status,
          entryPrice: entryPrice === null ? null : new Prisma.Decimal(entryPrice),
          exitPrice: exitPrice === null ? null : new Prisma.Decimal(exitPrice),
          lotSize: new Prisma.Decimal(openQuantity ?? totalEntryQuantity),
          profitLoss: openPosition?.unrealizedPnl ?? null,
          setup: "TradeLocker Direct Sync",
          notes: "Imported through direct TradeLocker synchronization",
          openedAt,
          closedAt,
          session: getTradingSessionLabel(openedAt),
          source: "TRADELOCKER_DIRECT",
          reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
        },
      });
    }
    projected += 1;
  }
  return projected;
}
