import { ObjectId, type Collection, type Filter } from "mongodb";
import clientPromise from "@/lib/mongodb";

export type JournalTradeStatus = "OPEN" | "CLOSED" | "TEST";

export type JournalTrade = {
  _id?: ObjectId;
  tradeId: string;
  positionId?: string;
  orderId?: string;
  dealId?: string;
  symbol: string;
  side?: "BUY" | "SELL" | string;
  entry?: number;
  sl?: number;
  tp?: number;
  lot?: number;
  timeframe?: string;
  strategy?: string;
  magic?: number;
  openTime?: string;
  closeTime?: string | null;
  exitPrice?: number | null;
  profit?: number | null;
  commission?: number | null;
  swap?: number | null;
  status?: JournalTradeStatus | string;
  result?: "WIN" | "LOSS" | "BE" | string | null;
  startScreenshotPath?: string | null;
  endScreenshotPath?: string | null;
  startScreenshotUrl?: string | null;
  endScreenshotUrl?: string | null;
  startUploadStatus?: string | null;
  endUploadStatus?: string | null;
  startUploadError?: string | null;
  endUploadError?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type DisplayJournalTrade = Omit<JournalTrade, "_id"> & {
  id: string;
};

export type JournalTradeQueryOptions = {
  limit?: number;
  page?: number;
  status?: "all" | "open" | "closed" | "test";
  symbol?: string;
};

export type JournalTradeListResponse = {
  trades: DisplayJournalTrade[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  summary: {
    total: number;
    open: number;
    closed: number;
    win: number;
    loss: number;
    be: number;
  };
};

let journalIndexesPromise: Promise<unknown> | undefined;

function normalizeStatus(status: JournalTradeQueryOptions["status"]) {
  if (status === "open" || status === "closed" || status === "test") {
    return status;
  }

  return "all";
}

function normalizeSymbol(symbol: string | undefined) {
  const value = symbol?.trim().toUpperCase();
  return value && value !== "ALL" ? value : undefined;
}

function getDateValue(trade: JournalTrade) {
  return trade.openTime || trade.createdAt || trade.updatedAt || "";
}

function toDisplayJournalTrade(trade: JournalTrade): DisplayJournalTrade {
  return {
    ...trade,
    id: trade._id?.toString() || trade.tradeId,
  };
}

function getFilter(options: JournalTradeQueryOptions): Filter<JournalTrade> {
  const filter: Filter<JournalTrade> = {};
  const status = normalizeStatus(options.status);
  const symbol = normalizeSymbol(options.symbol);

  if (status === "open") {
    filter.status = "OPEN";
  } else if (status === "closed") {
    filter.status = "CLOSED";
  } else if (status === "test") {
    filter.status = "TEST";
  }

  if (symbol) {
    filter.symbol = symbol;
  }

  return filter;
}

async function ensureJournalIndexes(collection: Collection<JournalTrade>) {
  if (!journalIndexesPromise) {
    journalIndexesPromise = collection.createIndexes([
      { key: { openTime: -1 }, name: "journal_openTime_desc" },
      { key: { status: 1, openTime: -1 }, name: "journal_status_openTime_desc" },
      { key: { symbol: 1, openTime: -1 }, name: "journal_symbol_openTime_desc" },
      { key: { tradeId: 1 }, name: "journal_tradeId_asc" },
    ]);
  }

  await journalIndexesPromise;
}

export async function getJournalCollection() {
  const client = await clientPromise;
  const collectionName = process.env.MONGODB_COLLECTION_JOURNAL || "journal_trades";
  const collection = client.db().collection<JournalTrade>(collectionName);

  await ensureJournalIndexes(collection);

  return collection;
}

export async function getJournalTradesPage(
  options: JournalTradeQueryOptions = {}
): Promise<JournalTradeListResponse> {
  const collection = await getJournalCollection();
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);
  const page = Math.max(options.page ?? 1, 1);
  const filter = getFilter(options);
  const skip = (page - 1) * limit;
  const [trades, total, summaryRows] = await Promise.all([
    collection.find(filter).sort({ openTime: -1, createdAt: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(filter),
    collection
      .aggregate<{
        _id: null;
        total: number;
        open: number;
        closed: number;
        win: number;
        loss: number;
        be: number;
      }>([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: { $sum: { $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0] } },
            closed: { $sum: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] } },
            win: { $sum: { $cond: [{ $eq: ["$result", "WIN"] }, 1, 0] } },
            loss: { $sum: { $cond: [{ $eq: ["$result", "LOSS"] }, 1, 0] } },
            be: { $sum: { $cond: [{ $eq: ["$result", "BE"] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
  ]);
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  const summary = summaryRows[0] || {
    total: 0,
    open: 0,
    closed: 0,
    win: 0,
    loss: 0,
    be: 0,
  };

  return {
    trades: trades.map((trade) => toDisplayJournalTrade({ ...trade, openTime: getDateValue(trade) })),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    summary: {
      total: summary.total,
      open: summary.open,
      closed: summary.closed,
      win: summary.win,
      loss: summary.loss,
      be: summary.be,
    },
  };
}
