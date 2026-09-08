import { MongoServerError, ObjectId } from "mongodb";
import type { Filter, MatchKeysAndValues, OptionalUnlessRequiredId } from "mongodb";
import { getJournalCollection } from "@/lib/journal/db";
import type {
  JournalEventInput,
  JournalQueryOptions,
  JournalTrade,
  JournalTradeInput,
  JournalTradeResult,
} from "@/lib/journal/types";
import {
  validateJournalEvent,
  validateJournalTradeInput,
} from "@/lib/journal/validators";

export type JournalAccountPayload = {
  accountNumber: string;
  broker: string;
  serverName: string;
  balance?: number;
  equity?: number;
  freeMargin?: number;
  currency?: string;
};

export type JournalEventPayload = {
  eventType:
    | "open"
    | "pending_activated"
    | "partial_close"
    | "close"
    | "sync_recovered";
  idempotencyKey: string;
  ticket?: string | null;
  positionId?: string | null;
  orderTicket?: string | null;
  dealTicket?: string | null;
  symbol?: string | null;
  tradeType?: "buy" | "sell" | null;
  lotSize?: number | null;
  entryPrice?: number | null;
  closePrice?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  profit?: number | null;
  commission?: number | null;
  swap?: number | null;
  magicNumber?: number | null;
  comment?: string | null;
  sourceType?: "manual" | "expert_advisor" | "bot" | "unknown" | null;
  entrySource?:
    | "market_order"
    | "pending_order_activation"
    | "manual_trade"
    | "expert_advisor"
    | "unknown"
    | null;
  timeframe?: string | null;
  spread?: number | null;
  atr?: number | null;
  rsi?: number | null;
  session?: string | null;
  entryScreenshotStatus?: string | null;
  exitScreenshotStatus?: string | null;
  eventTime: Date;
  openTime?: Date | null;
};

export type ProcessJournalEventInput = {
  account: JournalAccountPayload;
  event: JournalEventPayload;
};

export type ProcessJournalEventResult = {
  success: true;
  duplicate: boolean;
  tradeId: string;
};

function clampLimit(limit: number | undefined) {
  return Math.min(Math.max(limit ?? 50, 1), 200);
}

function getPagination(options: JournalQueryOptions) {
  const limit = clampLimit(options.limit);
  const page = Math.max(Math.floor(options.page ?? 1), 1);

  return { limit, page, skip: (page - 1) * limit };
}

function getJournalFilter(options: JournalQueryOptions): Filter<JournalTrade> {
  const filter: Filter<JournalTrade> = {};

  if (options.accountNumber) {
    filter.accountNumber = options.accountNumber;
  }

  if (options.broker) {
    filter.broker = options.broker;
  }

  if (options.serverName) {
    filter.serverName = options.serverName;
  }

  if (options.symbol) {
    filter.symbol = options.symbol.trim().toUpperCase();
  }

  if (options.status) {
    filter.status = options.status;
  }

  if (options.result) {
    filter.result = options.result;
  }

  if (options.tradeType) {
    filter.tradeType = options.tradeType;
  }

  if (options.from || options.to) {
    filter.openTime = {};

    if (options.from) {
      filter.openTime.$gte = options.from;
    }

    if (options.to) {
      filter.openTime.$lte = options.to;
    }
  }

  return filter;
}

function getTradeId(trade: Pick<JournalTrade, "_id"> | null) {
  return trade?._id?.toString() || "";
}

function getEventTradeFilter(
  account: JournalAccountPayload,
  event: JournalEventPayload
): Filter<JournalTrade> {
  const base = {
    accountNumber: account.accountNumber,
    broker: account.broker,
    serverName: account.serverName,
  };

  if (event.positionId) {
    return { ...base, positionId: event.positionId };
  }

  if (event.ticket) {
    return { ...base, ticket: event.ticket };
  }

  return {
    ...base,
    symbol: event.symbol?.trim().toUpperCase() || "",
    orderTicket: event.orderTicket || null,
  };
}

function toJournalEvent(input: ProcessJournalEventInput): JournalEventInput {
  const event = input.event;

  return {
    eventType: event.eventType,
    idempotencyKey: event.idempotencyKey,
    ticket: event.ticket,
    positionId: event.positionId,
    orderTicket: event.orderTicket,
    dealTicket: event.dealTicket,
    symbol: event.symbol,
    price:
      event.eventType === "close"
        ? event.closePrice ?? event.entryPrice
        : event.entryPrice ?? event.closePrice,
    volume: event.lotSize,
    profit: event.profit,
    eventTime: event.eventTime,
    rawPayload: event,
  };
}

function getResultFromProfit(profit: number | null | undefined): JournalTradeResult {
  if (profit === undefined || profit === null || profit === 0) {
    return "breakeven";
  }

  return profit > 0 ? "win" : "loss";
}

function getDurationSeconds(openTime: Date | null | undefined, closeTime: Date) {
  if (!openTime) {
    return null;
  }

  const durationMs = closeTime.getTime() - openTime.getTime();

  return durationMs >= 0 ? Math.floor(durationMs / 1000) : null;
}

function getActualRR(riskAmount: number | null | undefined, profit: number | null | undefined) {
  if (!riskAmount || profit === undefined || profit === null) {
    return null;
  }

  return profit / Math.abs(riskAmount);
}

function getUpdatedTradeLevelFields(event: JournalEventPayload): Partial<JournalTrade> {
  const fields: Partial<JournalTrade> = {};

  if (event.stopLoss !== undefined && event.stopLoss !== null) {
    fields.stopLoss = event.stopLoss;
  }

  if (event.takeProfit !== undefined && event.takeProfit !== null) {
    fields.takeProfit = event.takeProfit;
  }

  return fields;
}

function getOpenTradeFields(input: ProcessJournalEventInput): Partial<JournalTrade> {
  const { account, event } = input;

  return {
    userId: null,
    licenseKeyHash: null,
    accountNumber: account.accountNumber,
    broker: account.broker,
    serverName: account.serverName,
    symbol: event.symbol?.trim().toUpperCase() || "",
    ticket: event.ticket || null,
    positionId: event.positionId || null,
    orderTicket: event.orderTicket || null,
    dealTicketOpen: event.dealTicket || null,
    tradeType: event.tradeType || "buy",
    lotSize: event.lotSize ?? null,
    entryPrice: event.entryPrice ?? null,
    closePrice: event.closePrice ?? null,
    stopLoss: event.stopLoss ?? null,
    takeProfit: event.takeProfit ?? null,
    profit: event.profit ?? null,
    commission: event.commission ?? null,
    swap: event.swap ?? null,
    magicNumber: event.magicNumber ?? null,
    comment: event.comment || null,
    sourceType: event.sourceType || "unknown",
    entrySource: event.entrySource || "unknown",
    timeframe: event.timeframe || null,
    spread: event.spread ?? null,
    atr: event.atr ?? null,
    rsi: event.rsi ?? null,
    session: event.session || null,
    openTime: event.eventTime,
    closeTime: null,
    durationSeconds: null,
    result: "open",
    status: "open",
    entryScreenshotStatus: event.entryScreenshotStatus || "pending",
    updatedAt: new Date(),
  };
}

export async function findJournalTradeById(id: string) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = await getJournalCollection();

  return collection.findOne({ _id: new ObjectId(id) });
}

export async function createJournalTrade(input: JournalTradeInput) {
  const collection = await getJournalCollection();
  const trade = validateJournalTradeInput(input);
  const result = await collection.insertOne(
    trade as OptionalUnlessRequiredId<JournalTrade>
  );

  return { ...trade, _id: result.insertedId };
}

export async function upsertJournalTradeByPosition(input: JournalTradeInput) {
  const collection = await getJournalCollection();
  const trade = validateJournalTradeInput(input);
  const filter: Filter<JournalTrade> = trade.positionId
    ? {
        accountNumber: trade.accountNumber,
        broker: trade.broker,
        serverName: trade.serverName,
        positionId: trade.positionId,
      }
    : {
        accountNumber: trade.accountNumber,
        broker: trade.broker,
        serverName: trade.serverName,
        ticket: trade.ticket,
        symbol: trade.symbol,
      };
  const { createdAt, events, ...updateFields } = trade;

  await collection.updateOne(
    filter,
    {
      $set: updateFields as MatchKeysAndValues<JournalTrade>,
      $setOnInsert: {
        createdAt,
        events,
      },
    },
    { upsert: true }
  );

  return collection.findOne(filter);
}

export async function appendJournalEvent(
  tradeFilter: Filter<JournalTrade>,
  input: JournalEventInput
) {
  const collection = await getJournalCollection();
  const event = validateJournalEvent(input);
  const idempotentFilter: Filter<JournalTrade> = {
    ...tradeFilter,
    "events.idempotencyKey": { $ne: event.idempotencyKey },
  };

  try {
    const result = await collection.updateOne(idempotentFilter, {
      $push: { events: event },
      $set: { updatedAt: new Date() },
    });

    return { inserted: result.modifiedCount > 0, event };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return { inserted: false, event };
    }

    throw error;
  }
}

export async function listJournalTrades(options: JournalQueryOptions = {}) {
  const collection = await getJournalCollection();
  const filter = getJournalFilter(options);
  const { limit, page, skip } = getPagination(options);
  const [trades, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ openTime: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return {
    trades,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  };
}

export async function updateJournalTradePsychology(
  id: string,
  psychology: JournalTrade["psychology"]
) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = await getJournalCollection();

  return collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { psychology, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function updateJournalTradeTags(id: string, tags: string[]) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const collection = await getJournalCollection();

  return collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { tags, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
}

export async function processJournalEvent(
  input: ProcessJournalEventInput
): Promise<ProcessJournalEventResult> {
  const collection = await getJournalCollection();
  const existingEventTrade = await collection.findOne(
    { "events.idempotencyKey": input.event.idempotencyKey },
    { projection: { _id: 1 } }
  );

  if (existingEventTrade) {
    return {
      success: true,
      duplicate: true,
      tradeId: getTradeId(existingEventTrade),
    };
  }

  const now = new Date();
  const tradeFilter = getEventTradeFilter(input.account, input.event);
  const journalEvent = validateJournalEvent(toJournalEvent(input));
  const idempotentFilter: Filter<JournalTrade> = {
    ...tradeFilter,
    "events.idempotencyKey": { $ne: journalEvent.idempotencyKey },
  };

  try {
    if (
      input.event.eventType === "open" ||
      input.event.eventType === "pending_activated"
    ) {
      const openFields = getOpenTradeFields(input);
      const updateResult = await collection.findOneAndUpdate(
        idempotentFilter,
        {
          $set: openFields as MatchKeysAndValues<JournalTrade>,
          $setOnInsert: {
            createdAt: now,
            riskAmount: null,
            targetRR: null,
            actualRR: null,
            profitPercent: null,
            dealTicketClose: null,
            exitScreenshotUrl: null,
            exitScreenshotStatus: "not_requested",
            psychology: null,
            tags: [],
          },
          $push: { events: journalEvent },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

      return {
        success: true,
        duplicate: false,
        tradeId: getTradeId(updateResult),
      };
    }

    if (input.event.eventType === "sync_recovered") {
      const updateResult = await collection.findOneAndUpdate(
        idempotentFilter,
        {
          $set: {
            accountNumber: input.account.accountNumber,
            broker: input.account.broker,
            serverName: input.account.serverName,
            symbol: input.event.symbol?.trim().toUpperCase() || "",
            ticket: input.event.ticket || null,
            positionId: input.event.positionId || null,
            orderTicket: input.event.orderTicket || null,
            tradeType: input.event.tradeType || "buy",
            lotSize: input.event.lotSize ?? null,
            entryPrice: input.event.entryPrice ?? null,
            closePrice: input.event.closePrice ?? null,
            profit: input.event.profit ?? null,
            commission: input.event.commission ?? null,
            swap: input.event.swap ?? null,
            entryScreenshotStatus:
              input.event.entryScreenshotStatus || "unavailable_ea_offline",
            exitScreenshotStatus:
              input.event.exitScreenshotStatus || "unavailable_ea_offline",
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            userId: null,
            licenseKeyHash: null,
            dealTicketOpen: input.event.dealTicket || null,
            dealTicketClose: null,
            stopLoss: input.event.stopLoss ?? null,
            takeProfit: input.event.takeProfit ?? null,
            riskAmount: null,
            targetRR: null,
            actualRR: null,
            profitPercent: null,
            magicNumber: input.event.magicNumber ?? null,
            comment: input.event.comment || null,
            sourceType: input.event.sourceType || "unknown",
            entrySource: input.event.entrySource || "unknown",
            timeframe: input.event.timeframe || null,
            spread: input.event.spread ?? null,
            atr: input.event.atr ?? null,
            rsi: input.event.rsi ?? null,
            session: input.event.session || null,
            openTime: null,
            closeTime: null,
            durationSeconds: null,
            result: "open",
            status: "open",
            entryScreenshotUrl: null,
            exitScreenshotUrl: null,
            psychology: null,
            tags: [],
          },
          $push: { events: journalEvent },
        },
        { upsert: true, returnDocument: "after" }
      );

      return {
        success: true,
        duplicate: false,
        tradeId: getTradeId(updateResult),
      };
    }

    if (input.event.eventType === "partial_close") {
      const tradeLevelFields = getUpdatedTradeLevelFields(input.event);
      const updateResult = await collection.findOneAndUpdate(
        idempotentFilter,
        {
          $set: {
            accountNumber: input.account.accountNumber,
            broker: input.account.broker,
            serverName: input.account.serverName,
            symbol: input.event.symbol?.trim().toUpperCase() || "",
            ticket: input.event.ticket || null,
            positionId: input.event.positionId || null,
            orderTicket: input.event.orderTicket || null,
            status: "partially_closed",
            profit: input.event.profit ?? null,
            commission: input.event.commission ?? null,
            swap: input.event.swap ?? null,
            ...tradeLevelFields,
            updatedAt: now,
          },
          $setOnInsert: {
            createdAt: now,
            userId: null,
            licenseKeyHash: null,
            dealTicketOpen: null,
            dealTicketClose: input.event.dealTicket || null,
            tradeType: input.event.tradeType || "buy",
            lotSize: input.event.lotSize ?? null,
            entryPrice: input.event.entryPrice ?? null,
            closePrice: input.event.closePrice ?? null,
            stopLoss: input.event.stopLoss ?? null,
            takeProfit: input.event.takeProfit ?? null,
            riskAmount: null,
            targetRR: null,
            actualRR: null,
            profitPercent: null,
            magicNumber: input.event.magicNumber ?? null,
            comment: input.event.comment || null,
            sourceType: input.event.sourceType || "unknown",
            entrySource: input.event.entrySource || "unknown",
            timeframe: input.event.timeframe || null,
            spread: input.event.spread ?? null,
            atr: input.event.atr ?? null,
            rsi: input.event.rsi ?? null,
            session: input.event.session || null,
            openTime: null,
            closeTime: null,
            durationSeconds: null,
            result: "open",
            entryScreenshotUrl: null,
            exitScreenshotUrl: null,
            entryScreenshotStatus: "not_requested",
            exitScreenshotStatus: "not_requested",
            psychology: null,
            tags: [],
          },
          $push: { events: journalEvent },
        },
        { upsert: true, returnDocument: "after" }
      );

      return {
        success: true,
        duplicate: false,
        tradeId: getTradeId(updateResult),
      };
    }

    const existingTrade = await collection.findOne(tradeFilter);
    const closeTime = input.event.eventTime;
    const profit = input.event.profit ?? null;
    const closeFields: MatchKeysAndValues<JournalTrade> = {
      closePrice: input.event.closePrice ?? null,
      closeTime,
      profit,
      commission: input.event.commission ?? null,
      swap: input.event.swap ?? null,
      dealTicketClose: input.event.dealTicket || null,
      result: getResultFromProfit(profit),
      status: "closed",
      exitScreenshotStatus: input.event.exitScreenshotStatus || "pending",
      durationSeconds: getDurationSeconds(existingTrade?.openTime, closeTime),
      actualRR: getActualRR(existingTrade?.riskAmount, profit),
      ...getUpdatedTradeLevelFields(input.event),
      updatedAt: now,
    };
    const updateResult = await collection.findOneAndUpdate(
      idempotentFilter,
      {
        $set: closeFields,
        $setOnInsert: {
          createdAt: now,
          userId: null,
          licenseKeyHash: null,
          accountNumber: input.account.accountNumber,
          broker: input.account.broker,
          serverName: input.account.serverName,
          symbol: input.event.symbol?.trim().toUpperCase() || "",
          ticket: input.event.ticket || null,
          positionId: input.event.positionId || null,
          orderTicket: input.event.orderTicket || null,
          dealTicketOpen: null,
          tradeType: input.event.tradeType || "buy",
          lotSize: input.event.lotSize ?? null,
          entryPrice: input.event.entryPrice ?? null,
          stopLoss: input.event.stopLoss ?? null,
          takeProfit: input.event.takeProfit ?? null,
          riskAmount: null,
          targetRR: null,
          profitPercent: null,
          magicNumber: input.event.magicNumber ?? null,
          comment: input.event.comment || null,
          sourceType: input.event.sourceType || "unknown",
          entrySource: input.event.entrySource || "unknown",
          timeframe: input.event.timeframe || null,
          spread: input.event.spread ?? null,
          atr: input.event.atr ?? null,
          rsi: input.event.rsi ?? null,
          session: input.event.session || null,
          openTime: null,
          entryScreenshotUrl: null,
          entryScreenshotStatus: "not_requested",
          psychology: null,
          tags: [],
        },
        $push: { events: journalEvent },
      },
      {
        upsert: true,
        returnDocument: "after",
      }
    );

    return {
      success: true,
      duplicate: false,
      tradeId: getTradeId(updateResult),
    };
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const duplicateTrade = await collection.findOne(
        { "events.idempotencyKey": input.event.idempotencyKey },
        { projection: { _id: 1 } }
      );

      return {
        success: true,
        duplicate: true,
        tradeId: getTradeId(duplicateTrade),
      };
    }

    throw error;
  }
}
