import type { Collection, Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { JournalTrade } from "@/lib/journal/types";

const DEFAULT_DB_NAME = "trading_bot";
const DEFAULT_JOURNAL_COLLECTION = "journal_trades";

let journalIndexesPromise: Promise<unknown> | undefined;

function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

export function getJournalDbName() {
  return readEnv("MONGODB_DB_NAME", DEFAULT_DB_NAME);
}

export function getJournalCollectionName() {
  return readEnv("MONGODB_COLLECTION_JOURNAL", DEFAULT_JOURNAL_COLLECTION);
}

export function isJournalEnabled() {
  return readEnv("JOURNAL_ENABLED").toLowerCase() === "true";
}

export function useJournalMongoDb() {
  return readEnv("JOURNAL_USE_MONGODB").toLowerCase() === "true";
}

export async function getJournalDb(): Promise<Db> {
  const client = await clientPromise;

  return client.db(getJournalDbName());
}

export async function ensureJournalIndexes(
  collection?: Collection<JournalTrade>
) {
  const journalCollection = collection ?? (await getJournalCollection(false));

  if (!journalIndexesPromise) {
    journalIndexesPromise = journalCollection.createIndexes([
      {
        key: { "events.idempotencyKey": 1 },
        name: "journal_events_idempotencyKey_unique",
        unique: true,
        partialFilterExpression: {
          "events.idempotencyKey": { $type: "string" },
        },
      },
      {
        key: { accountNumber: 1, broker: 1, serverName: 1 },
        name: "journal_account_broker_server",
      },
      { key: { positionId: 1 }, name: "journal_positionId" },
      { key: { symbol: 1 }, name: "journal_symbol" },
      { key: { status: 1 }, name: "journal_status" },
      { key: { openTime: -1 }, name: "journal_openTime_desc" },
      { key: { closeTime: -1 }, name: "journal_closeTime_desc" },
    ]);
  }

  await journalIndexesPromise;
}

export async function getJournalCollection(ensureIndexes = true) {
  const db = await getJournalDb();
  const collection = db.collection<JournalTrade>(getJournalCollectionName());

  if (ensureIndexes) {
    await ensureJournalIndexes(collection);
  }

  return collection;
}
