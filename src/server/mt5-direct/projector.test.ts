import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, TradeDirection, TradeReviewStatus, type Mt5DirectConnection } from "@prisma/client";
import { extractInitialProtection, findOpeningOrder, findPositionOrders, projectMt5Positions } from "./projector";
import type { Mt5BridgeOrder } from "./python-bridge";

function order(overrides: Partial<Mt5BridgeOrder>): Mt5BridgeOrder {
  return { ticket: "1", position_id: "42", symbol: "XAUUSD", type: 0, ...overrides };
}

test("historical opening order is matched through the entry deal order id", () => {
  const closing = order({ ticket: "close", type: 1, time_setup_msc: 1000, sl: 0 });
  const opening = order({ ticket: "open", time_setup_msc: 2000, sl: 4473.81, tp: 4550 });
  const matched = findOpeningOrder(findPositionOrders([closing, opening], "42"), ["open"], TradeDirection.BUY);
  assert.equal(matched?.ticket, "open");
  assert.deepEqual(extractInitialProtection(matched), { stopLoss: 4473.81, takeProfit: 4550 });
});

test("position_by_id is recognized but no missing protection is invented", () => {
  const matched = findPositionOrders([order({ position_id: "0", position_by_id: "42", sl: 0, tp: 0 })], "42");
  assert.equal(matched.length, 1);
  assert.deepEqual(extractInitialProtection(matched[0]), { stopLoss: null, takeProfit: null });
});

test("pending opening order types preserve initial protection", () => {
  const pendingBuyLimit = order({ ticket: "limit", type: 2, sl: 4400, tp: 4600 });
  const matched = findOpeningOrder([pendingBuyLimit], [], TradeDirection.BUY);
  assert.equal(matched?.ticket, "limit");
});

test("entry deal linkage recovers an opening order even when MT5 omits its position id", () => {
  const opening = order({ ticket: "linked", position_id: "0", position_by_id: "0", sl: 4400 });
  const matched = findOpeningOrder(findPositionOrders([opening], "42", ["linked"]), ["linked"], TradeDirection.BUY);
  assert.equal(extractInitialProtection(matched).stopLoss, 4400);
});

test("closed trade projection is idempotent and preserves repaired protection and journal data", async () => {
  const openedAt = new Date("2026-09-01T10:00:00.000Z");
  const closedAt = new Date("2026-09-01T11:00:00.000Z");
  const deals = [
    { dealType: 0, entryType: 0, externalOrderId: "open", externalDealId: "d1", executedAt: openedAt, volume: new Prisma.Decimal(1), price: new Prisma.Decimal(4500), commission: new Prisma.Decimal(-1), swap: new Prisma.Decimal(0), fee: new Prisma.Decimal(0), profit: new Prisma.Decimal(0), symbol: "XAUUSD", magic: "7", reason: null },
    { dealType: 1, entryType: 1, externalOrderId: "close", externalDealId: "d2", executedAt: closedAt, volume: new Prisma.Decimal(1), price: new Prisma.Decimal(4510), commission: new Prisma.Decimal(-1), swap: new Prisma.Decimal(0), fee: new Prisma.Decimal(0), profit: new Prisma.Decimal(10), symbol: "XAUUSD", magic: "7", reason: 0 },
  ];
  let stored: Record<string, unknown> | null = null;
  let creates = 0;
  const tx = {
    mt5BrokerDeal: { findMany: async () => deals },
    accountEquitySnapshot: { findFirst: async () => ({ balance: new Prisma.Decimal(10_000), equity: new Prisma.Decimal(10_010) }) },
    symbolSpecification: { findUnique: async () => ({ tickSize: new Prisma.Decimal(0.01), tickValue: new Prisma.Decimal(1) }) },
    trade: {
      findUnique: async () => stored,
      create: async ({ data }: { data: Record<string, unknown> }) => { creates += 1; stored = { id: "trade", ...data }; return stored; },
      update: async ({ data }: { data: Record<string, unknown> }) => { stored = { ...stored, ...data }; return stored; },
    },
  } as unknown as Prisma.TransactionClient;
  const connection = { id: "connection", accountId: "account", userId: "user" } as Mt5DirectConnection;
  const historyOrders = [order({ ticket: "open", sl: 4473.81, tp: 4550, time_setup_msc: openedAt.getTime() })];

  await projectMt5Positions(tx, connection, ["42"], [], historyOrders);
  const firstStored = stored as Record<string, unknown> | null;
  assert.ok(firstStored);
  assert.equal(Number(firstStored.initialStopLoss), 4473.81);
  assert.equal(Number(firstStored.balanceAtOpen), 10_000);
  assert.ok(Number(firstStored.riskAmount) > 0);

  stored = { ...firstStored, notes: "manual journal note", reviewStatus: TradeReviewStatus.REVIEWED };
  await projectMt5Positions(tx, connection, ["42"], [], []);
  const secondStored = stored as Record<string, unknown> | null;
  assert.ok(secondStored);
  assert.equal(creates, 1);
  assert.equal(Number(secondStored.initialStopLoss), 4473.81);
  assert.equal(secondStored.notes, "manual journal note");
  assert.equal(secondStored.reviewStatus, TradeReviewStatus.REVIEWED);
});
