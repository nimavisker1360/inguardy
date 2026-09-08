import { loadEnvConfig } from "@next/env";
import { CtraderDirectConnectionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  acquireCtraderConnectionLease,
  CTRADER_SYNC_WORKER_ID,
  releaseCtraderConnectionLease,
  synchronizeCtraderConnection,
} from "../server/ctrader/sync-service";

loadEnvConfig(process.cwd());

const POLL_INTERVAL_MS = Number(process.env.CTRADER_SYNC_POLL_INTERVAL_MS || 2_000);
const MAX_CONNECTIONS_PER_POLL = Number(process.env.CTRADER_SYNC_CONNECTION_LIMIT || 10);
const CATCHUP_BATCHES = Number(process.env.CTRADER_SYNC_CATCHUP_BATCHES || 4);
let stopping = false;

function log(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    workerId: CTRADER_SYNC_WORKER_ID,
    ...details,
  }));
}

async function syncConnection(connectionId: string) {
  const acquired = await acquireCtraderConnectionLease(connectionId);
  if (!acquired) return;
  try {
    for (let batch = 0; batch < CATCHUP_BATCHES && !stopping; batch += 1) {
      const result = await synchronizeCtraderConnection(connectionId);
      log("ctrader_sync_succeeded", {
        connectionId,
        createdDeals: result.createdDeals,
        projectedTrades: result.projectedTrades,
        capturedScreenshots: result.capturedScreenshots,
        screenshotErrors: result.screenshotErrors.slice(0, 3),
        status: result.connection.status,
      });
      if (result.connection.status === CtraderDirectConnectionStatus.ACTIVE) break;
    }
  } catch (error) {
    log("ctrader_sync_failed", {
      connectionId,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
  } finally {
    await releaseCtraderConnectionLease(connectionId);
  }
}

async function poll() {
  if (process.env.CTRADER_DIRECT_SYNC_ENABLED !== "true") return;
  const connections = await prisma.ctraderDirectConnection.findMany({
    where: {
      enabled: true,
      status: { not: CtraderDirectConnectionStatus.DISCONNECTED },
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
  log("ctrader_worker_started", {
    pollIntervalMs: POLL_INTERVAL_MS,
    clientConfigured: Boolean(
      process.env.CTRADER_CLIENT_ID &&
      process.env.CTRADER_CLIENT_SECRET &&
      process.env.CTRADER_REDIRECT_URI
    ),
    tokenVaultConfigured: Boolean(
      process.env.CTRADER_TOKEN_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET
    ),
  });
  while (!stopping) {
    try {
      await poll();
    } catch (error) {
      log("ctrader_worker_poll_failed", {
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      });
    }
    if (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  await prisma.$disconnect();
  log("ctrader_worker_stopped");
}

process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });
void main();
