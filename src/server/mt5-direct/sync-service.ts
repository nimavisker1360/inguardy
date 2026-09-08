import os from "os";
import {
  Mt5DirectConnectionStatus,
  Prisma,
  type Mt5DirectConnection,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decryptMt5Credential } from "@/server/mt5-direct/credential-vault";
import { persistMt5Deals, projectMt5Positions } from "@/server/mt5-direct/projector";
import { Mt5BridgeError, runMt5Bridge } from "@/server/mt5-direct/python-bridge";
import { captureMt5TradeScreenshots } from "@/server/mt5-direct/screenshots";
import { persistMt5AccountTelemetry } from "@/server/mt5-direct/telemetry";

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNC_BATCH_DAYS = 366;
const RECONCILIATION_OVERLAP_MS = 5 * 60 * 1000;
const LEASE_MS = 15 * 60 * 1000;

export const MT5_SYNC_WORKER_ID = `${os.hostname()}:${process.pid}`;

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown MT5 synchronization error";
  return message.replace(/[\r\n]+/g, " ").slice(0, 1000);
}

export async function acquireMt5ConnectionLease(connectionId: string, owner = MT5_SYNC_WORKER_ID) {
  const now = new Date();
  const result = await prisma.mt5DirectConnection.updateMany({
    where: {
      id: connectionId,
      enabled: true,
      credentialEncrypted: { not: null },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }, { leaseOwner: owner }],
    },
    data: {
      leaseOwner: owner,
      leaseUntil: new Date(now.getTime() + LEASE_MS),
    },
  });
  return result.count === 1;
}

export async function releaseMt5ConnectionLease(connectionId: string, owner = MT5_SYNC_WORKER_ID) {
  await prisma.mt5DirectConnection.updateMany({
    where: { id: connectionId, leaseOwner: owner },
    data: { leaseOwner: null, leaseUntil: null },
  });
}

function syncRange(connection: Mt5DirectConnection) {
  const now = new Date();
  const cursor = connection.cursorAt || connection.historyStartAt;
  const isCaughtUp = cursor.getTime() >= now.getTime() - RECONCILIATION_OVERLAP_MS;
  const from = isCaughtUp
    ? new Date(cursor.getTime() - RECONCILIATION_OVERLAP_MS)
    : cursor;
  const maximumBatchEnd = new Date(from.getTime() + SYNC_BATCH_DAYS * DAY_MS);
  const to = maximumBatchEnd < now ? maximumBatchEnd : now;
  return { from, to, willBeActive: to.getTime() >= now.getTime() - RECONCILIATION_OVERLAP_MS };
}

export async function synchronizeMt5Connection(connectionId: string) {
  const connection = await prisma.mt5DirectConnection.findUnique({ where: { id: connectionId } });
  if (!connection || !connection.enabled) {
    throw new Error("MT5 direct connection is not enabled");
  }

  const password = decryptMt5Credential(connection.credentialEncrypted);
  if (!password) {
    throw new Error("MT5 credential is unavailable");
  }

  const range = syncRange(connection);
  await prisma.mt5DirectConnection.update({
    where: { id: connection.id },
    data: {
      status: connection.cursorAt
        ? Mt5DirectConnectionStatus.CONNECTING
        : Mt5DirectConnectionStatus.INITIAL_SYNC,
      lastAttemptAt: new Date(),
      lastError: null,
    },
  });

  try {
    const snapshot = await runMt5Bridge({
      operation: "sync",
      server: connection.server,
      login: connection.login,
      password,
      from: range.from,
      to: range.to,
    });
    if (snapshot.deals.length > 0 && snapshot.symbols.length === 0) {
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "mt5_sync_missing_symbols",
        connectionId: connection.id,
        deals: snapshot.deals.length,
      }));
    }
    const now = new Date();
    const result = await prisma.$transaction(
      async (tx) => {
        const persisted = await persistMt5Deals(tx, connection, snapshot.deals);
        const accountInfo = snapshot.account;
        const telemetryPersisted = await persistMt5AccountTelemetry(tx, {
          accountId: connection.accountId,
          currency: accountInfo.currency || "USD",
          capturedAt: now,
          account: accountInfo,
          deals: snapshot.deals,
          symbols: snapshot.symbols,
        });
        const positionIds = [
          ...persisted.positionIds,
          ...snapshot.positions.map((position) => String(position.identifier || position.ticket || "")),
        ].filter(Boolean);
        const projected = await projectMt5Positions(
          tx,
          connection,
          positionIds,
          snapshot.positions,
          snapshot.historyOrders
        );
        await tx.tradingAccount.update({
          where: { id: connection.accountId },
          data: {
            name: accountInfo.name || undefined,
            broker: accountInfo.company || connection.server,
            platform: "MT5",
            currency: accountInfo.currency || undefined,
            balance:
              accountInfo.balance === undefined
                ? undefined
                : new Prisma.Decimal(accountInfo.balance),
            accountType:
              accountInfo.trade_mode === 0
                ? "DEMO"
                : accountInfo.trade_mode === 1
                  ? "CONTEST"
                  : accountInfo.trade_mode === 2
                    ? "REAL"
                    : undefined,
            mt5AccountNumber: connection.login,
            ingestionMode: "DIRECT_MT5",
            lastConnectedAt: now,
            lastSyncAt: now,
          },
        });
        const updatedConnection = await tx.mt5DirectConnection.update({
          where: { id: connection.id },
          data: {
            status: range.willBeActive
              ? Mt5DirectConnectionStatus.ACTIVE
              : Mt5DirectConnectionStatus.INITIAL_SYNC,
            cursorAt: range.to,
            lastConnectedAt: now,
            lastSyncAt: now,
            lastError: null,
            importedDealCount: { increment: persisted.created },
          },
        });
        return {
          createdDeals: persisted.created,
          projectedTrades: projected,
          symbolSpecificationsPersisted: telemetryPersisted.symbolSpecificationsPersisted,
          counts: {
            positions: snapshot.positions.length,
            deals: snapshot.deals.length,
            orders: snapshot.orders.length,
            historyOrders: snapshot.historyOrders.length,
            symbols: snapshot.symbols.length,
          },
          connection: updatedConnection,
        };
      },
      { timeout: 60_000 }
    );

    let screenshotResult = { captured: 0, errors: [] as string[] };
    try {
      screenshotResult = await captureMt5TradeScreenshots(connection, password);
    } catch (error) {
      screenshotResult.errors.push(errorMessage(error));
    }
    return {
      ...result,
      capturedScreenshots: screenshotResult.captured,
      screenshotErrors: screenshotResult.errors,
    };
  } catch (error) {
    await prisma.mt5DirectConnection.update({
      where: { id: connection.id },
      data: {
        status: Mt5DirectConnectionStatus.ERROR,
        lastError: errorMessage(error),
      },
    });
    throw error;
  }
}

export async function testMt5Credentials(input: {
  server: string;
  login: string;
  password: string;
}) {
  try {
    return await runMt5Bridge({ operation: "snapshot", ...input });
  } catch (error) {
    if (error instanceof Mt5BridgeError) {
      throw error;
    }
    throw new Mt5BridgeError(errorMessage(error));
  }
}
