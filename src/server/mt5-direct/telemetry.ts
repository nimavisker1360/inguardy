import { Prisma } from "@prisma/client";
import type { Mt5BridgeAccount, Mt5BridgeDeal, Mt5BridgeSymbol } from "@/server/mt5-direct/python-bridge";

const CASH_DEAL_TYPE = 2;
const CREDIT_DEAL_TYPE = 3;

function finite(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function finiteOrUndefined(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function positiveFiniteOrUndefined(value: unknown) {
  const parsed = finiteOrUndefined(value);
  return parsed !== undefined && parsed > 0 ? parsed : undefined;
}

function snapshotTimestamp(at: Date) {
  const configured = Number(process.env.MT5_SNAPSHOT_INTERVAL_MINUTES || 1);
  const minutes = Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 1;
  const bucket = minutes * 60_000;
  return new Date(Math.floor(at.getTime() / bucket) * bucket);
}

export async function persistMt5AccountTelemetry(
  tx: Prisma.TransactionClient,
  input: { accountId: string; currency: string; capturedAt: Date; account: Mt5BridgeAccount; deals: Mt5BridgeDeal[]; symbols: Mt5BridgeSymbol[] }
) {
  const balance = finite(input.account.balance);
  const equity = input.account.equity === undefined ? balance : finite(input.account.equity);
  const timestamp = snapshotTimestamp(input.capturedAt);
  await tx.accountEquitySnapshot.upsert({
    where: { accountId_timestamp: { accountId: input.accountId, timestamp } },
    create: {
      accountId: input.accountId, timestamp, balance, equity,
      floatingPnl: input.account.profit === undefined ? equity - balance : finite(input.account.profit),
      margin: input.account.margin === undefined ? null : finite(input.account.margin),
      freeMargin: input.account.margin_free === undefined ? null : finite(input.account.margin_free),
      marginLevel: input.account.margin_level === undefined ? null : finite(input.account.margin_level),
    },
    update: {
      balance, equity, floatingPnl: input.account.profit === undefined ? equity - balance : finite(input.account.profit),
      margin: input.account.margin === undefined ? null : finite(input.account.margin),
      freeMargin: input.account.margin_free === undefined ? null : finite(input.account.margin_free),
      marginLevel: input.account.margin_level === undefined ? null : finite(input.account.margin_level),
    },
  });

  let symbolSpecificationsPersisted = 0;
  for (const symbol of input.symbols ?? []) {
    const name = String(symbol.name || "").trim();
    if (!name) continue;
    const contractSize = positiveFiniteOrUndefined(symbol.trade_contract_size);
    const tickSize = positiveFiniteOrUndefined(symbol.trade_tick_size);
    const tickValue = positiveFiniteOrUndefined(symbol.trade_tick_value);
    const digitsValue = finiteOrUndefined(symbol.digits);
    const digits = digitsValue !== undefined && Number.isInteger(digitsValue) && digitsValue >= 0 ? digitsValue : undefined;
    await tx.symbolSpecification.upsert({
      where: { accountId_symbol: { accountId: input.accountId, symbol: name } },
      create: {
        accountId: input.accountId, symbol: name, contractSize, tickSize, tickValue, digits,
        baseCurrency: symbol.currency_base || null, quoteCurrency: symbol.currency_profit || null,
      },
      update: {
        contractSize, tickSize, tickValue, digits,
        baseCurrency: symbol.currency_base || null, quoteCurrency: symbol.currency_profit || null,
      },
    });
    symbolSpecificationsPersisted += 1;
  }

  const cashDeals = input.deals.filter((deal) => deal.type === CASH_DEAL_TYPE || deal.type === CREDIT_DEAL_TYPE);
  if (cashDeals.length) {
    await tx.cashTransaction.createMany({
      data: cashDeals.map((deal) => {
        const amount = finite(deal.profit);
        const comment = String(deal.comment || "").toLowerCase();
        const type = deal.type === CREDIT_DEAL_TYPE ? "BONUS" : comment.includes("transfer") ? "TRANSFER" : amount < 0 ? "WITHDRAWAL" : "DEPOSIT";
        return {
          accountId: input.accountId, type, amount, currency: input.currency,
          occurredAt: new Date(deal.time_msc || deal.time * 1000), sourceRef: String(deal.ticket),
          rawPayload: deal as unknown as Prisma.InputJsonValue,
        };
      }),
      skipDuplicates: true,
    });
  }
  return { symbolSpecificationsPersisted };
}
