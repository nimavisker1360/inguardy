import { loadEnvConfig } from "@next/env";
import { Mt5DirectConnectionStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  acquireMt5ConnectionLease,
  MT5_SYNC_WORKER_ID,
  releaseMt5ConnectionLease,
  synchronizeMt5Connection,
} from "../server/mt5-direct/sync-service";

loadEnvConfig(process.cwd());

const POLL_INTERVAL_MS = Number(process.env.MT5_SYNC_POLL_INTERVAL_MS || 30_000);
const MAX_CONNECTIONS_PER_POLL = Number(process.env.MT5_SYNC_CONNECTION_LIMIT || 10);
const CATCHUP_BATCHES = Number(process.env.MT5_SYNC_CATCHUP_BATCHES || 4);

let stopping = false;

function log(event: string, details: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, workerId: MT5_SYNC_WORKER_ID, ...details }));
}

async function syncConnection(connectionId: string) {
  const acquired = await acquireMt5ConnectionLease(connectionId);
  if (!acquired) return;

  try {
    for (let batch = 0; batch < CATCHUP_BATCHES && !stopping; batch += 1) {
      const result = await synchronizeMt5Connection(connectionId);
      log("mt5_sync_succeeded", {
        connectionId,
        createdDeals: result.createdDeals,
        projectedTrades: result.projectedTrades,
        symbolSpecificationsPersisted: result.symbolSpecificationsPersisted,
        ...result.counts,
        capturedScreenshots: result.capturedScreenshots,
        screenshotErrors: result.screenshotErrors.slice(0, 3),
        status: result.connection.status,
      });
      if (result.connection.status === Mt5DirectConnectionStatus.ACTIVE) break;
    }
  } catch (error) {
    log("mt5_sync_failed", {
      connectionId,
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
    });
  } finally {
    await releaseMt5ConnectionLease(connectionId);
  }
}

async function poll() {
  if (process.env.MT5_DIRECT_SYNC_ENABLED !== "true") {
    return;
  }

  const connections = await prisma.mt5DirectConnection.findMany({
    where: {
      enabled: true,
      credentialEncrypted: { not: null },
      status: { not: Mt5DirectConnectionStatus.DISCONNECTED },
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
  log("mt5_worker_started", {
    pollIntervalMs: POLL_INTERVAL_MS,
    credentialVaultConfigured: Boolean(
      process.env.MT5_CREDENTIAL_ENCRYPTION_KEY || process.env.BETTER_AUTH_SECRET
    ),
    pythonConfigured: Boolean(process.env.MT5_PYTHON_PATH),
  });
  while (!stopping) {
    try {
      await poll();
    } catch (error) {
      log("mt5_worker_poll_failed", {
        error: error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      });
    }
    if (!stopping) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  await prisma.$disconnect();
  log("mt5_worker_stopped");
}

process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

void main();
