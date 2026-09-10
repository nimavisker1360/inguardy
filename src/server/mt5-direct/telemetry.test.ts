import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { persistMt5AccountTelemetry } from "./telemetry";

test("persistent bridge symbol data creates a valid account symbol specification", async () => {
  const upserts: Array<Record<string, unknown>> = [];
  const tx = {
    accountEquitySnapshot: { upsert: async () => ({}) },
    symbolSpecification: {
      upsert: async (input: Record<string, unknown>) => { upserts.push(input); return {}; },
    },
    cashTransaction: { createMany: async () => ({ count: 0 }) },
  } as unknown as Prisma.TransactionClient;
  const result = await persistMt5AccountTelemetry(tx, {
    accountId: "account",
    currency: "USD",
    capturedAt: new Date("2026-09-05T12:00:00.000Z"),
    account: { login: "1", balance: 10_000, equity: 10_000 },
    deals: [],
    symbols: [{
      name: "XAUUSD", trade_contract_size: 100, trade_tick_size: 0.01,
      trade_tick_value: 1, volume_min: 0.01, volume_max: 50, volume_step: 0.01,
      digits: 2, currency_base: "XAU", currency_profit: "USD",
    }],
  });
  assert.equal(result.symbolSpecificationsPersisted, 1);
  assert.equal(upserts.length, 1);
  assert.deepEqual(upserts[0].where, { accountId_symbol: { accountId: "account", symbol: "XAUUSD" } });
  const create = upserts[0].create as Record<string, unknown>;
  assert.equal(create.tickSize, 0.01);
  assert.equal(create.tickValue, 1);
  assert.equal(create.contractSize, 100);
  assert.equal(create.volumeMin, 0.01);
  assert.equal(create.volumeMax, 50);
  assert.equal(create.volumeStep, 0.01);
  assert.equal(create.digits, 2);
});
