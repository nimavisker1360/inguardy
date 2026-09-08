import { loadEnvConfig } from "@next/env";
import { TradeLockerConnectionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  acquireTradeLockerConnectionLease,
  releaseTradeLockerConnectionLease,
  synchronizeTradeLockerConnection,
  TRADELOCKER_SYNC_WORKER_ID,
} from "../server/tradelocker/sync-service";

loadEnvConfig(process.cwd());

const POLL_INTERVAL_MS = Number(process.env.TRADELOCKER_SYNC_POLL_INTERVAL_MS || 5_000);
const MAX_CONNECTIONS_PER_POLL = Number(process.env.TRADELOCKER_SYNC_CONNECTION_LIMIT || 10);
const CATCHUP_BATCHES = Number(process.env.TRADELOCKER_SYNC_CATCHUP_BATCHES || 4);
let stopping = false;

function log(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, workerId: TRADELOCKER_SYNC_WORKER_ID, ...details }));
}

async function syncConnection(connectionId: string) {
  if (!await acquireTradeLockerConnectionLease(connectionId)) return;
  try {
    for (let batch = 0; batch < CATCHUP_BATCHES && !stopping; batch += 1) {
      const result = await synchronizeTradeLockerConnection(connectionId);
      log("tradelocker_sync_succeeded", {
        connectionId,
        createdOrders: result.createdOrders,
        createdExecutions: result.createdExecutions,
        projectedTrades: result.projectedTrades,
        status: result.connection.status,
      });
      if (result.connection.status === TradeLockerConnectionStatus.CONNECTED) break;
    }
  } catch (error) {
    log("tradelocker_sync_failed", { connectionId, error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error" });
  } finally {
    await releaseTradeLockerConnectionLease(connectionId);
  }
}

async function poll() {
  if (process.env.TRADELOCKER_DIRECT_SYNC_ENABLED !== "true") return;
  const connections = await prisma.tradeLockerConnection.findMany({
    where: {
      enabled: true,
      status: { notIn: [TradeLockerConnectionStatus.DISCONNECTED, TradeLockerConnectionStatus.REAUTH_REQUIRED] },
    },
    orderBy: [{ lastAttemptAt: "asc" }, { createdAt: "asc" }],
    take: MAX_CONNECTIONS_PER_POLL,
    select: { id: true },
  });
  for (const connection of connections) {
    if (stopping) break;
    await syncConnection(connection.id);
  }
}

async function main() {
  log("tradelocker_worker_started", {
    pollIntervalMs: POLL_INTERVAL_MS,
    developerKeyConfigured: Boolean(process.env.TRADELOCKER_DEVELOPER_API_KEY),
    tokenVaultConfigured: Boolean(process.env.TRADE_CONNECTION_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET),
  });
  while (!stopping) {
    try { await poll(); }
    catch (error) { log("tradelocker_worker_poll_failed", { error: error instanceof Error ? error.message.slice(0, 300) : "Unknown error" }); }
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  await prisma.$disconnect();
  log("tradelocker_worker_stopped");
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
void main();
