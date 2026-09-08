import {
  Prisma,
  TradeDirection,
  TradeReviewStatus,
  TradeStatus,
  type Mt5DirectConnection,
} from "@prisma/client";
import { getTradingSessionLabel } from "@/lib/journal/trading-session";
import { calculateInitialRiskAmount } from "@/server/mt5-direct/risk-calculation";
import type { Mt5BridgeDeal, Mt5BridgeOrder, Mt5BridgePosition } from "@/server/mt5-direct/python-bridge";

const BUY_DEAL_TYPE = 0;
const SELL_DEAL_TYPE = 1;
const ENTRY_IN = 0;
const ENTRY_OUT = 1;
const ENTRY_INOUT = 2;
const ENTRY_OUT_BY = 3;
const BUY_ORDER_TYPES = new Set([0, 2, 4, 6]);
const SELL_ORDER_TYPES = new Set([1, 3, 5, 7]);

function numberValue(value: number | null | undefined) {
  return Number.isFinite(value) ? Number(value) : 0;
}

function positiveNumber(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) > 0 ? Number(value) : null;
}

function decimalOrNull(value: number | null | undefined) {
  const normalized = positiveNumber(value);
  return normalized === null ? null : new Prisma.Decimal(normalized);
}

function executedAt(deal: Mt5BridgeDeal) {
  return new Date(deal.time_msc || deal.time * 1000);
}

function weightedPrice<T>(items: T[], volume: (item: T) => number, price: (item: T) => number) {
  const totalVolume = items.reduce((total, item) => total + volume(item), 0);
  if (totalVolume <= 0) return null;
  return items.reduce((total, item) => total + volume(item) * price(item), 0) / totalVolume;
}

function positionIdentity(position: Mt5BridgePosition) {
  return String(position.identifier || position.ticket || "");
}

function positionOpenedAt(position: Mt5BridgePosition) {
  const milliseconds = position.time_msc || (position.time ? position.time * 1000 : 0);
  return milliseconds > 0 ? new Date(milliseconds) : new Date();
}

function orderTimestamp(order: Mt5BridgeOrder) {
  return order.time_setup_msc || (order.time_setup ? order.time_setup * 1000 : 0) ||
    order.time_done_msc || (order.time_done ? order.time_done * 1000 : 0);
}

function orderMatchesDirection(order: Mt5BridgeOrder, direction: TradeDirection) {
  return direction === TradeDirection.BUY ? BUY_ORDER_TYPES.has(order.type) : SELL_ORDER_TYPES.has(order.type);
}

export function findPositionOrders(historyOrders: Mt5BridgeOrder[], positionId: string, entryOrderIds: string[] = []) {
  const linkedOrderIds = new Set(entryOrderIds.filter(Boolean));
  return historyOrders
    .filter((order) =>
      linkedOrderIds.has(String(order.ticket)) ||
      [order.position_id, order.position_by_id].some((value) => String(value || "") === positionId)
    )
    .sort((left, right) => orderTimestamp(left) - orderTimestamp(right));
}

export function findOpeningOrder(orders: Mt5BridgeOrder[], entryOrderIds: string[], direction: TradeDirection) {
  const entryIds = new Set(entryOrderIds.filter(Boolean));
  const linked = orders.filter((order) => entryIds.has(String(order.ticket)));
  if (linked.length > 0) return linked.sort((left, right) => orderTimestamp(left) - orderTimestamp(right))[0];
  return orders.find((order) => orderMatchesDirection(order, direction)) ?? null;
}

export function extractInitialProtection(order: Mt5BridgeOrder | null | undefined) {
  return { stopLoss: positiveNumber(order?.sl), takeProfit: positiveNumber(order?.tp) };
}

export async function persistMt5Deals(
  tx: Prisma.TransactionClient,
  connection: Mt5DirectConnection,
  deals: Mt5BridgeDeal[]
) {
  const normalized = deals.filter((deal) =>
    (deal.type === BUY_DEAL_TYPE || deal.type === SELL_DEAL_TYPE) &&
    deal.position_id && deal.position_id !== "0" && deal.symbol
  );
  if (normalized.length === 0) return { created: 0, positionIds: [] as string[] };

  const result = await tx.mt5BrokerDeal.createMany({
    data: normalized.map((deal) => ({
      connectionId: connection.id,
      accountId: connection.accountId,
      externalDealId: String(deal.ticket),
      externalOrderId: deal.order ? String(deal.order) : null,
      externalPositionId: String(deal.position_id),
      symbol: deal.symbol,
      dealType: deal.type,
      entryType: deal.entry,
      reason: deal.reason ?? null,
      magic: deal.magic ? String(deal.magic) : null,
      volume: String(numberValue(deal.volume)),
      price: String(numberValue(deal.price)),
      commission: String(numberValue(deal.commission)),
      swap: String(numberValue(deal.swap)),
      fee: String(numberValue(deal.fee)),
      profit: String(numberValue(deal.profit)),
      executedAt: executedAt(deal),
      executedAtMsc: deal.time_msc ? BigInt(Math.trunc(deal.time_msc)) : null,
      rawPayload: deal as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
  return { created: result.count, positionIds: [...new Set(normalized.map((deal) => String(deal.position_id)))] };
}

type ExistingTrade = {
  id: string;
  reviewStatus: TradeReviewStatus;
  entryPrice: Prisma.Decimal | null;
  lotSize: Prisma.Decimal | null;
  initialStopLoss: Prisma.Decimal | null;
  initialTakeProfit: Prisma.Decimal | null;
  balanceAtOpen: Prisma.Decimal | null;
  equityAtOpen: Prisma.Decimal | null;
  riskAmount: Prisma.Decimal | null;
};

async function tradeEnrichment(
  tx: Prisma.TransactionClient,
  accountId: string,
  input: {
    existing: ExistingTrade | null;
    symbol: string;
    openedAt: Date;
    entryPrice: number | null;
    lotSize: number | null;
    initialStopLoss: number | null;
  }
) {
  const needsSnapshot = !input.existing?.balanceAtOpen || !input.existing?.equityAtOpen;
  const needsRisk = !input.existing?.riskAmount;
  const [snapshot, specification] = await Promise.all([
    needsSnapshot
      ? tx.accountEquitySnapshot.findFirst({
          where: { accountId, timestamp: { lte: input.openedAt } },
          orderBy: { timestamp: "desc" },
          select: { balance: true, equity: true },
        })
      : null,
    needsRisk
      ? tx.symbolSpecification.findUnique({
          where: { accountId_symbol: { accountId, symbol: input.symbol } },
          select: { tickSize: true, tickValue: true },
        })
      : null,
  ]);
  const risk = needsRisk ? calculateInitialRiskAmount({
    entryPrice: input.entryPrice,
    initialStopLoss: input.initialStopLoss,
    lotSize: input.lotSize,
    tickSize: specification?.tickSize ? Number(specification.tickSize) : null,
    tickValue: specification?.tickValue ? Number(specification.tickValue) : null,
  }) : null;
  return {
    balanceAtOpen: input.existing?.balanceAtOpen ?? snapshot?.balance ?? undefined,
    equityAtOpen: input.existing?.equityAtOpen ?? snapshot?.equity ?? undefined,
    riskAmount: input.existing?.riskAmount ?? (risk === null ? undefined : new Prisma.Decimal(risk)),
  };
}

export async function projectMt5Positions(
  tx: Prisma.TransactionClient,
  connection: Mt5DirectConnection,
  positionIds: string[],
  openPositions: Mt5BridgePosition[],
  historyOrders: Mt5BridgeOrder[]
) {
  const openPositionMap = new Map(openPositions.map((position) => [positionIdentity(position), position]));
  const allPositionIds = [...new Set([...positionIds, ...openPositionMap.keys()].filter(Boolean))];
  let projected = 0;

  for (const positionId of allPositionIds) {
    const deals = await tx.mt5BrokerDeal.findMany({
      where: { accountId: connection.accountId, externalPositionId: positionId },
      orderBy: [{ executedAt: "asc" }, { externalDealId: "asc" }],
    });
    const marketDeals = deals.filter((deal) => deal.dealType === BUY_DEAL_TYPE || deal.dealType === SELL_DEAL_TYPE);
    const entryDeals = marketDeals.filter((deal) => deal.entryType === ENTRY_IN || deal.entryType === ENTRY_INOUT);
    const exitDeals = marketDeals.filter((deal) =>
      deal.entryType === ENTRY_OUT || deal.entryType === ENTRY_OUT_BY || deal.entryType === ENTRY_INOUT
    );
    const openPosition = openPositionMap.get(positionId);
    if (entryDeals.length === 0 && !openPosition) continue;

    const firstEntry = entryDeals[0];
    const direction = firstEntry
      ? (firstEntry.dealType === BUY_DEAL_TYPE ? TradeDirection.BUY : TradeDirection.SELL)
      : (openPosition!.type === BUY_DEAL_TYPE ? TradeDirection.BUY : TradeDirection.SELL);
    const openedAt = firstEntry?.executedAt ?? positionOpenedAt(openPosition!);
    const symbol = firstEntry?.symbol ?? openPosition!.symbol;
    const entryVolume = entryDeals.reduce((sum, deal) => sum + Number(deal.volume), 0);
    const entryPrice = openPosition?.price_open || weightedPrice(entryDeals, (deal) => Number(deal.volume), (deal) => Number(deal.price));
    const lotSize = openPosition?.volume || entryVolume;
    const exitPrice = weightedPrice(exitDeals, (deal) => Number(deal.volume), (deal) => Number(deal.price));
    const entryOrderIds = entryDeals.map((deal) => String(deal.externalOrderId || ""));
    const positionOrders = findPositionOrders(historyOrders, positionId, entryOrderIds);
    const openingOrder = findOpeningOrder(positionOrders, entryOrderIds, direction);
    const recoveredProtection = extractInitialProtection(openingOrder);
    const currentStopLoss = positiveNumber(openPosition?.sl);
    const currentTakeProfit = positiveNumber(openPosition?.tp);
    const existing = await tx.trade.findUnique({
      where: { accountId_mt5Ticket: { accountId: connection.accountId, mt5Ticket: positionId } },
      select: {
        id: true, reviewStatus: true, entryPrice: true, lotSize: true,
        initialStopLoss: true, initialTakeProfit: true,
        balanceAtOpen: true, equityAtOpen: true, riskAmount: true,
      },
    });
    const initialStopLoss = existing?.initialStopLoss ? Number(existing.initialStopLoss) : recoveredProtection.stopLoss ?? currentStopLoss;
    const initialTakeProfit = existing?.initialTakeProfit ? Number(existing.initialTakeProfit) : recoveredProtection.takeProfit ?? currentTakeProfit;
    const resolvedEntryPrice = entryPrice ?? (existing?.entryPrice ? Number(existing.entryPrice) : null);
    const resolvedLotSize = lotSize || (existing?.lotSize ? Number(existing.lotSize) : null);
    const enrichment = await tradeEnrichment(tx, connection.accountId, {
      existing, symbol, openedAt, entryPrice: resolvedEntryPrice, lotSize: resolvedLotSize, initialStopLoss,
    });
    const commission = marketDeals.reduce((sum, deal) => sum + Number(deal.commission), 0);
    const swap = marketDeals.reduce((sum, deal) => sum + Number(deal.swap), 0);
    const realizedPnl = marketDeals.reduce(
      (sum, deal) => sum + Number(deal.profit) + Number(deal.commission) + Number(deal.swap) + Number(deal.fee), 0
    );
    const netPnl = openPosition ? numberValue(openPosition.profit) + numberValue(openPosition.swap) + commission : realizedPnl;
    const closedAt = !openPosition && exitDeals.length > 0 ? exitDeals[exitDeals.length - 1].executedAt : null;
    const brokerData = {
      symbol,
      direction,
      status: openPosition ? TradeStatus.OPEN : TradeStatus.CLOSED,
      entryPrice: resolvedEntryPrice === null ? undefined : new Prisma.Decimal(resolvedEntryPrice),
      exitPrice: exitPrice === null ? undefined : new Prisma.Decimal(exitPrice),
      stopLoss: openPosition ? decimalOrNull(currentStopLoss) : (recoveredProtection.stopLoss === null ? undefined : new Prisma.Decimal(recoveredProtection.stopLoss)),
      takeProfit: openPosition ? decimalOrNull(currentTakeProfit) : (recoveredProtection.takeProfit === null ? undefined : new Prisma.Decimal(recoveredProtection.takeProfit)),
      initialStopLoss: initialStopLoss === null ? undefined : new Prisma.Decimal(initialStopLoss),
      initialTakeProfit: initialTakeProfit === null ? undefined : new Prisma.Decimal(initialTakeProfit),
      currentStopLoss: openPosition ? decimalOrNull(currentStopLoss) : undefined,
      currentTakeProfit: openPosition ? decimalOrNull(currentTakeProfit) : undefined,
      lotSize: resolvedLotSize === null ? undefined : new Prisma.Decimal(resolvedLotSize),
      profitLoss: new Prisma.Decimal(netPnl),
      commission: new Prisma.Decimal(commission),
      swap: new Prisma.Decimal(swap),
      grossProfit: new Prisma.Decimal(marketDeals.reduce((sum, deal) => sum + Number(deal.profit), 0)),
      magicNumber: firstEntry?.magic ?? openPosition?.magic,
      closeReason: exitDeals.length ? String(exitDeals[exitDeals.length - 1].reason ?? "") || null : null,
      openedAt,
      closedAt,
      session: getTradingSessionLabel(openedAt),
      source: "MT5_DIRECT",
      reviewStatus: existing?.reviewStatus === TradeReviewStatus.REVIEWED ? TradeReviewStatus.REVIEWED : TradeReviewStatus.NEEDS_REVIEW,
      ...enrichment,
    };

    if (existing) {
      await tx.trade.update({ where: { id: existing.id }, data: brokerData });
    } else {
      await tx.trade.create({
        data: {
          ...brokerData,
          userId: connection.userId,
          accountId: connection.accountId,
          mt5Ticket: positionId,
          entryPrice: resolvedEntryPrice === null ? null : new Prisma.Decimal(resolvedEntryPrice),
          exitPrice: exitPrice === null ? null : new Prisma.Decimal(exitPrice),
          stopLoss: openPosition ? decimalOrNull(currentStopLoss) : decimalOrNull(initialStopLoss),
          takeProfit: openPosition ? decimalOrNull(currentTakeProfit) : decimalOrNull(initialTakeProfit),
          initialStopLoss: decimalOrNull(initialStopLoss),
          initialTakeProfit: decimalOrNull(initialTakeProfit),
          currentStopLoss: openPosition ? decimalOrNull(currentStopLoss) : null,
          currentTakeProfit: openPosition ? decimalOrNull(currentTakeProfit) : null,
          lotSize: resolvedLotSize === null ? null : new Prisma.Decimal(resolvedLotSize),
          setup: "MT5 Direct Sync",
          notes: "Imported through direct MT5 synchronization",
          reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
        },
      });
    }
    projected += 1;
  }
  return projected;
}
