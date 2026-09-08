import os from "os";
import {
  CtraderDirectConnectionStatus,
  Prisma,
  type CtraderDirectConnection,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchCtraderSnapshot,
  type CtraderAccountSnapshot,
  type CtraderEnvironment,
} from "@/server/ctrader/open-api-client";
import { refreshCtraderAccessToken } from "@/server/ctrader/oauth-client";
import { projectCtraderPositions, persistCtraderDeals } from "@/server/ctrader/projector";
import { captureCtraderTradeScreenshots } from "@/server/ctrader/screenshots";
import { decryptCtraderToken, encryptCtraderToken } from "@/server/ctrader/token-vault";

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNC_BATCH_DAYS = 366;
const RECONCILIATION_OVERLAP_MS = 5 * 60 * 1000;
const LEASE_MS = 15 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const CTRADER_SYNC_WORKER_ID = `${os.hostname()}:${process.pid}`;

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown cTrader synchronization error";
  return message.replace(/[\r\n]+/g, " ").slice(0, 1000);
}

function environment(value: string): CtraderEnvironment {
  if (value === "live" || value === "demo") return value;
  throw new Error("Invalid cTrader environment");
}

function normalizedMoney(value: unknown, digits: unknown) {
  const amount = Number(value);
  const exponent = Number(digits);
  return (Number.isFinite(amount) ? amount : 0) /
    10 ** (Number.isFinite(exponent) ? exponent : 2);
}

export async function getValidCtraderAccessToken(grantId: string) {
  const grant = await prisma.ctraderOAuthGrant.findUnique({ where: { id: grantId } });
  if (!grant) throw new Error("cTrader authorization grant is unavailable");

  if (grant.accessTokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    const accessToken = decryptCtraderToken(grant.accessTokenEncrypted);
    if (accessToken) return accessToken;
  }

  const refreshToken = decryptCtraderToken(grant.refreshTokenEncrypted);
  if (!refreshToken) throw new Error("cTrader refresh token is unavailable");
  const refreshed = await refreshCtraderAccessToken(refreshToken);
  const updated = await prisma.ctraderOAuthGrant.update({
    where: { id: grant.id },
    data: {
      accessTokenEncrypted: encryptCtraderToken(refreshed.accessToken),
      refreshTokenEncrypted: encryptCtraderToken(refreshed.refreshToken),
      accessTokenExpiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    },
  });
  const accessToken = decryptCtraderToken(updated.accessTokenEncrypted);
  if (!accessToken) throw new Error("Refreshed cTrader token could not be decrypted");
  return accessToken;
}

export async function acquireCtraderConnectionLease(
  connectionId: string,
  owner = CTRADER_SYNC_WORKER_ID
) {
  const now = new Date();
  const result = await prisma.ctraderDirectConnection.updateMany({
    where: {
      id: connectionId,
      enabled: true,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }, { leaseOwner: owner }],
    },
    data: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + LEASE_MS) },
  });
  return result.count === 1;
}

export async function releaseCtraderConnectionLease(
  connectionId: string,
  owner = CTRADER_SYNC_WORKER_ID
) {
  await prisma.ctraderDirectConnection.updateMany({
    where: { id: connectionId, leaseOwner: owner },
    data: { leaseOwner: null, leaseUntil: null },
  });
}

function syncRange(connection: CtraderDirectConnection) {
  const now = new Date();
  const cursor = connection.cursorAt || connection.historyStartAt;
  const caughtUp = cursor.getTime() >= now.getTime() - RECONCILIATION_OVERLAP_MS;
  const from = caughtUp ? new Date(cursor.getTime() - RECONCILIATION_OVERLAP_MS) : cursor;
  const batchEnd = new Date(from.getTime() + SYNC_BATCH_DAYS * DAY_MS);
  const to = batchEnd < now ? batchEnd : now;
  return {
    from,
    to,
    willBeActive: to.getTime() >= now.getTime() - RECONCILIATION_OVERLAP_MS,
  };
}

function accountValues(snapshot: CtraderAccountSnapshot, connection: CtraderDirectConnection) {
  const asset = snapshot.assets.find(
    (item) => String(item.assetId) === String(snapshot.trader.depositAssetId)
  );
  return {
    name: connection.traderLogin
      ? `cTrader ${connection.traderLogin}`
      : `cTrader ${connection.ctidTraderAccountId}`,
    broker: snapshot.trader.brokerName || connection.brokerName || "cTrader",
    currency: asset?.name || "USD",
    balance: new Prisma.Decimal(
      normalizedMoney(snapshot.trader.balance, snapshot.trader.moneyDigits)
    ),
  };
}

export async function synchronizeCtraderConnection(connectionId: string) {
  const connection = await prisma.ctraderDirectConnection.findUnique({ where: { id: connectionId } });
  if (!connection || !connection.enabled) throw new Error("cTrader connection is not enabled");

  const accessToken = await getValidCtraderAccessToken(connection.grantId);
  const range = syncRange(connection);
  await prisma.ctraderDirectConnection.update({
    where: { id: connection.id },
    data: {
      status: connection.cursorAt
        ? CtraderDirectConnectionStatus.CONNECTING
        : CtraderDirectConnectionStatus.INITIAL_SYNC,
      lastAttemptAt: new Date(),
      lastError: null,
    },
  });

  try {
    const snapshot = await fetchCtraderSnapshot({
      environment: environment(connection.environment),
      ctidTraderAccountId: connection.ctidTraderAccountId,
      accessToken,
      from: range.from,
      to: range.to,
    });
    const now = new Date();
    const result = await prisma.$transaction(
      async (tx) => {
        const persisted = await persistCtraderDeals(tx, connection, snapshot);
        const projected = await projectCtraderPositions(
          tx,
          connection,
          snapshot,
          persisted.positionIds
        );
        const values = accountValues(snapshot, connection);
        await tx.tradingAccount.update({
          where: { id: connection.accountId },
          data: {
            ...values,
            platform: "cTrader",
            ctraderAccountId: connection.ctidTraderAccountId,
            ingestionMode: "DIRECT_CTRADER",
            lastConnectedAt: now,
            lastSyncAt: now,
          },
        });
        const updatedConnection = await tx.ctraderDirectConnection.update({
          where: { id: connection.id },
          data: {
            traderLogin: snapshot.trader.traderLogin
              ? String(snapshot.trader.traderLogin)
              : connection.traderLogin,
            brokerName: snapshot.trader.brokerName || connection.brokerName,
            status: range.willBeActive
              ? CtraderDirectConnectionStatus.ACTIVE
              : CtraderDirectConnectionStatus.INITIAL_SYNC,
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
          connection: updatedConnection,
        };
      },
      { timeout: 60_000 }
    );
    let screenshotResult = { captured: 0, errors: [] as string[] };
    try {
      screenshotResult = await captureCtraderTradeScreenshots(connection, accessToken);
    } catch (error) {
      screenshotResult.errors.push(errorMessage(error));
    }
    return {
      ...result,
      capturedScreenshots: screenshotResult.captured,
      screenshotErrors: screenshotResult.errors,
    };
  } catch (error) {
    await prisma.ctraderDirectConnection.update({
      where: { id: connection.id },
      data: { status: CtraderDirectConnectionStatus.ERROR, lastError: errorMessage(error) },
    });
    throw error;
  }
}

export async function inspectCtraderAccount(input: {
  environment: CtraderEnvironment;
  ctidTraderAccountId: string;
  accessToken: string;
}) {
  const now = new Date();
  return fetchCtraderSnapshot({
    ...input,
    from: new Date(now.getTime() - 1000),
    to: now,
  });
}
