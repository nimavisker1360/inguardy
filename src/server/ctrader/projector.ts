import {
  Prisma,
  TradeDirection,
  TradeReviewStatus,
  TradeStatus,
  type CtraderDirectConnection,
} from "@prisma/client";
import { getTradingSessionLabel } from "@/lib/journal/trading-session";
import type {
  CtraderAccountSnapshot,
  CtraderPosition,
} from "@/server/ctrader/open-api-client";

const BUY = 1;

function numeric(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function enumValue(value: unknown, name: string, numericValue: number) {
  return Number(value) === numericValue || String(value).toUpperCase() === name;
}

function money(value: unknown, digits: unknown) {
  return numeric(value) / 10 ** (Number.isFinite(Number(digits)) ? Number(digits) : 2);
}

function positionId(position: CtraderPosition) {
  return String(position.positionId);
}

function weightedPrice<T>(items: T[], volume: (item: T) => number, price: (item: T) => number) {
  const total = items.reduce((sum, item) => sum + volume(item), 0);
  if (total <= 0) return null;
  return items.reduce((sum, item) => sum + volume(item) * price(item), 0) / total;
}

export async function persistCtraderDeals(
  tx: Prisma.TransactionClient,
  connection: CtraderDirectConnection,
  snapshot: CtraderAccountSnapshot
) {
  const names = new Map(
    snapshot.symbols.map((symbol) => [String(symbol.symbolId), symbol.symbolName || String(symbol.symbolId)])
  );
  const lotSizes = new Map(
    snapshot.fullSymbols.map((symbol) => [String(symbol.symbolId), numeric(symbol.lotSize)])
  );
  const normalized = snapshot.deals.filter(
    (deal) =>
      deal.positionId &&
      String(deal.positionId) !== "0" &&
      (enumValue(deal.dealStatus, "FILLED", 2) ||
        enumValue(deal.dealStatus, "PARTIALLY_FILLED", 3))
  );

  if (!normalized.length) return { created: 0, positionIds: [] as string[] };

  const result = await tx.ctraderBrokerDeal.createMany({
    data: normalized.map((deal) => {
      const symbolId = String(deal.symbolId);
      const close = deal.closePositionDetail;
      const digits = close?.moneyDigits ?? deal.moneyDigits;
      const rawVolume = numeric(deal.filledVolume || deal.volume);
      const lotSize = lotSizes.get(symbolId) || 10_000_000;
      return {
        connectionId: connection.id,
        accountId: connection.accountId,
        externalDealId: String(deal.dealId),
        externalOrderId: deal.orderId ? String(deal.orderId) : null,
        externalPositionId: String(deal.positionId),
        symbolId,
        symbol: names.get(symbolId) || symbolId,
        tradeSide: enumValue(deal.tradeSide, "BUY", BUY) ? BUY : 2,
        isClosing: Boolean(close),
        volume: String(rawVolume / lotSize),
        price: String(numeric(deal.executionPrice)),
        commission: String(close ? money(close.commission, digits) : money(deal.commission, digits)),
        swap: String(close ? money(close.swap, digits) : 0),
        profit: String(close ? money(close.grossProfit, digits) : 0),
        fee: String(close ? money(close.pnlConversionFee, digits) : 0),
        executedAt: new Date(numeric(deal.executionTimestamp)),
        rawPayload: deal as unknown as Prisma.InputJsonValue,
      };
    }),
    skipDuplicates: true,
  });

  return {
    created: result.count,
    positionIds: [...new Set(normalized.map((deal) => String(deal.positionId)))],
  };
}

export async function projectCtraderPositions(
  tx: Prisma.TransactionClient,
  connection: CtraderDirectConnection,
  snapshot: CtraderAccountSnapshot,
  changedPositionIds: string[]
) {
  const openPositions = new Map(snapshot.positions.map((position) => [positionId(position), position]));
  const pnlByPosition = new Map(
    snapshot.positionPnls.map((item) => [String(item.positionId), numeric(item.netUnrealizedPnL)])
  );
  const symbolNames = new Map(
    snapshot.symbols.map((symbol) => [String(symbol.symbolId), symbol.symbolName || String(symbol.symbolId)])
  );
  const lotSizes = new Map(
    snapshot.fullSymbols.map((symbol) => [String(symbol.symbolId), numeric(symbol.lotSize)])
  );
  const ids = [...new Set([...changedPositionIds, ...openPositions.keys()].filter(Boolean))];
  let projected = 0;

  for (const externalPositionId of ids) {
    const [deals, existing] = await Promise.all([
      tx.ctraderBrokerDeal.findMany({
        where: { accountId: connection.accountId, externalPositionId },
        orderBy: [{ executedAt: "asc" }, { externalDealId: "asc" }],
      }),
      tx.trade.findUnique({
        where: {
          accountId_mt5Ticket: {
            accountId: connection.accountId,
            mt5Ticket: externalPositionId,
          },
        },
      }),
    ]);
    const openPosition = openPositions.get(externalPositionId);
    const entries = deals.filter((deal) => !deal.isClosing);
    const exits = deals.filter((deal) => deal.isClosing);
    const firstEntry = entries[0];

    if (!firstEntry && !openPosition && !existing) continue;

    const symbolId = firstEntry?.symbolId || String(openPosition?.tradeData.symbolId || "");
    const symbol = firstEntry?.symbol || symbolNames.get(symbolId) || existing?.symbol || symbolId;
    const directionValue = firstEntry?.tradeSide || openPosition?.tradeData.tradeSide;
    const direction = directionValue === undefined && existing
      ? existing.direction
      : enumValue(directionValue, "BUY", BUY)
        ? TradeDirection.BUY
        : TradeDirection.SELL;
    const openedAt = firstEntry?.executedAt ||
      (openPosition?.tradeData.openTimestamp
        ? new Date(numeric(openPosition.tradeData.openTimestamp))
        : existing?.openedAt || new Date());
    const entryPrice = openPosition?.price ||
      weightedPrice(entries, (deal) => Number(deal.volume), (deal) => Number(deal.price)) ||
      (existing?.entryPrice ? Number(existing.entryPrice) : null);
    const exitPrice = weightedPrice(
      exits,
      (deal) => Number(deal.volume),
      (deal) => Number(deal.price)
    );
    const closed = !openPosition && exits.length > 0;
    const closedAt = closed ? exits[exits.length - 1].executedAt : null;
    const commission = exits.length
      ? exits.reduce((sum, deal) => sum + Number(deal.commission), 0)
      : deals.reduce((sum, deal) => sum + Number(deal.commission), 0);
    const swap = exits.reduce((sum, deal) => sum + Number(deal.swap), 0);
    const realizedPnl = exits.reduce(
      (sum, deal) =>
        sum + Number(deal.profit) + Number(deal.commission) + Number(deal.swap) + Number(deal.fee),
      0
    );
    const moneyDigits = snapshot.positionPnlMoneyDigits;
    const floatingPnl = openPosition
      ? money(pnlByPosition.get(externalPositionId), moneyDigits) ||
        money(openPosition.swap, openPosition.moneyDigits ?? snapshot.trader.moneyDigits) +
          money(openPosition.commission, openPosition.moneyDigits ?? snapshot.trader.moneyDigits)
      : realizedPnl;
    const netPnl = openPosition ? realizedPnl + floatingPnl : realizedPnl;
    const lotSize = lotSizes.get(symbolId) || 10_000_000;
    const openLots = openPosition ? numeric(openPosition.tradeData.volume) / lotSize : null;
    const entryLots = entries.reduce((sum, deal) => sum + Number(deal.volume), 0);
    const stopLoss = openPosition?.stopLoss ?? (existing?.stopLoss ? Number(existing.stopLoss) : null);
    const takeProfit = openPosition?.takeProfit ?? (existing?.takeProfit ? Number(existing.takeProfit) : null);
    const reviewStatus =
      existing?.reviewStatus === TradeReviewStatus.REVIEWED
        ? TradeReviewStatus.REVIEWED
        : TradeReviewStatus.NEEDS_REVIEW;
    const data: Prisma.TradeUncheckedUpdateInput = {
      symbol,
      direction,
      status: closed ? TradeStatus.CLOSED : TradeStatus.OPEN,
      entryPrice: entryPrice === null ? undefined : new Prisma.Decimal(entryPrice),
      exitPrice: exitPrice === null ? undefined : new Prisma.Decimal(exitPrice),
      stopLoss: stopLoss === null ? undefined : new Prisma.Decimal(stopLoss),
      takeProfit: takeProfit === null ? undefined : new Prisma.Decimal(takeProfit),
      currentStopLoss: stopLoss === null ? undefined : new Prisma.Decimal(stopLoss),
      currentTakeProfit: takeProfit === null ? undefined : new Prisma.Decimal(takeProfit),
      lotSize: new Prisma.Decimal(openLots ?? entryLots ?? 0),
      profitLoss: new Prisma.Decimal(netPnl),
      commission: new Prisma.Decimal(commission),
      swap: new Prisma.Decimal(swap),
      openedAt,
      closedAt,
      session: getTradingSessionLabel(openedAt),
      source: "CTRADER_DIRECT",
      reviewStatus,
    };

    if (existing) {
      await tx.trade.update({ where: { id: existing.id }, data });
    } else {
      await tx.trade.create({
        data: {
          userId: connection.userId,
          accountId: connection.accountId,
          mt5Ticket: externalPositionId,
          symbol,
          direction,
          status: closed ? TradeStatus.CLOSED : TradeStatus.OPEN,
          entryPrice: entryPrice === null ? null : new Prisma.Decimal(entryPrice),
          exitPrice: exitPrice === null ? null : new Prisma.Decimal(exitPrice),
          stopLoss: stopLoss === null ? null : new Prisma.Decimal(stopLoss),
          takeProfit: takeProfit === null ? null : new Prisma.Decimal(takeProfit),
          initialStopLoss: stopLoss === null ? null : new Prisma.Decimal(stopLoss),
          initialTakeProfit: takeProfit === null ? null : new Prisma.Decimal(takeProfit),
          currentStopLoss: stopLoss === null ? null : new Prisma.Decimal(stopLoss),
          currentTakeProfit: takeProfit === null ? null : new Prisma.Decimal(takeProfit),
          lotSize: new Prisma.Decimal(openLots ?? entryLots ?? 0),
          profitLoss: new Prisma.Decimal(netPnl),
          commission: new Prisma.Decimal(commission),
          swap: new Prisma.Decimal(swap),
          setup: "cTrader Direct Sync",
          session: getTradingSessionLabel(openedAt),
          notes: "Imported through direct cTrader synchronization",
          openedAt,
          closedAt,
          source: "CTRADER_DIRECT",
          reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
        },
      });
    }
    projected += 1;
  }

  return projected;
}
