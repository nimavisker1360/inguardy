import os from "os";
import {
  Prisma,
  TradeLockerConnectionStatus,
  type TradeLockerConnection,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getTradeLockerAccountDetails,
  getTradeLockerAccountState,
  getTradeLockerConfig,
  getTradeLockerExecutions,
  getTradeLockerInstruments,
  getTradeLockerOrderHistory,
  getTradeLockerOrders,
  getTradeLockerPositions,
  refreshTradeLockerToken,
  rowsToRecords,
  TradeLockerApiError,
} from "@/server/tradelocker/client";
import { projectTradeLockerPositions } from "@/server/tradelocker/projector";
import { captureTradeLockerTradeScreenshots } from "@/server/tradelocker/screenshots";
import { tradeLockerEnvironmentSchema, type TradeLockerEnvironment } from "@/server/tradelocker/schemas";
import { decryptTradeLockerToken, encryptTradeLockerToken, jwtExpiration } from "@/server/tradelocker/token-vault";

const DAY_MS = 24 * 60 * 60 * 1000;
const SYNC_BATCH_DAYS = 366;
const HISTORY_OVERLAP_MS = 5 * 60 * 1000;
const CONNECTION_LEASE_MS = 15 * 60 * 1000;
const TOKEN_LEASE_MS = 30 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const MAX_HISTORY_SPLIT_DEPTH = 18;
const SYNC_REQUEST_DELAY_MS = Number(process.env.TRADELOCKER_SYNC_REQUEST_DELAY_MS || 1_100);

export const TRADELOCKER_SYNC_WORKER_ID = `${os.hostname()}:${process.pid}`;

function environment(value: string): TradeLockerEnvironment {
  return tradeLockerEnvironmentSchema.parse(value);
}

function cleanError(error: unknown) {
  const message = error instanceof TradeLockerApiError
    ? error.code === "AUTH_FAILED" || error.code === "INVALID_CREDENTIALS"
      ? "TradeLocker authentication failed"
      : "TradeLocker synchronization failed"
    : error instanceof Error
      ? error.message
      : "TradeLocker synchronization failed";
  return message.replace(/[\r\n]+/g, " ").slice(0, 500);
}

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dateValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  const date = Number.isFinite(number) ? new Date(number) : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function stringValue(value: unknown) {
  return value === null || value === undefined || value === "" ? null : String(value);
}

function jsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

async function waitForTradeLockerRateWindow() {
  if (SYNC_REQUEST_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, SYNC_REQUEST_DELAY_MS));
  }
}

export async function getValidTradeLockerAccessToken(connectionId: string, forceRefresh = false) {
  const initial = await prisma.tradeLockerConnection.findUnique({ where: { id: connectionId } });
  if (!initial || !initial.enabled) throw new Error("TradeLocker connection is not enabled");

  if (!forceRefresh && initial.accessTokenExpiresAt && initial.accessTokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS) {
    const token = decryptTradeLockerToken(initial.accessTokenEncrypted);
    if (token) return token;
  }

  const owner = `token:${TRADELOCKER_SYNC_WORKER_ID}:${crypto.randomUUID()}`;
  const now = new Date();
  const acquired = await prisma.tradeLockerConnection.updateMany({
    where: {
      id: connectionId,
      enabled: true,
      OR: [{ tokenRefreshUntil: null }, { tokenRefreshUntil: { lt: now } }],
    },
    data: { tokenRefreshOwner: owner, tokenRefreshUntil: new Date(now.getTime() + TOKEN_LEASE_MS) },
  });

  if (!acquired.count) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      const current = await prisma.tradeLockerConnection.findUnique({ where: { id: connectionId } });
      if (!current || !current.enabled) throw new Error("TradeLocker connection is not enabled");
      if (current.tokenVersion > initial.tokenVersion && current.accessTokenExpiresAt && current.accessTokenExpiresAt.getTime() > Date.now()) {
        const token = decryptTradeLockerToken(current.accessTokenEncrypted);
        if (token) return token;
      }
    }
    throw new Error("TradeLocker token refresh is already in progress");
  }

  try {
    const locked = await prisma.tradeLockerConnection.findUniqueOrThrow({ where: { id: connectionId } });
    const refreshToken = decryptTradeLockerToken(locked.refreshTokenEncrypted);
    if (!refreshToken) throw new Error("TradeLocker refresh token is unavailable");
    const tokens = await refreshTradeLockerToken({
      environment: environment(locked.environment),
      refreshToken,
    });
    const accessTokenExpiresAt = new Date(tokens.expireDate);
    const refreshTokenExpiresAt = jwtExpiration(tokens.refreshToken);
    await prisma.tradeLockerConnection.update({
      where: { id: connectionId },
      data: {
        accessTokenEncrypted: encryptTradeLockerToken(tokens.accessToken),
        refreshTokenEncrypted: encryptTradeLockerToken(tokens.refreshToken),
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        tokenVersion: { increment: 1 },
        tokenRefreshOwner: null,
        tokenRefreshUntil: null,
        lastError: null,
      },
    });
    return tokens.accessToken;
  } catch (error) {
    await prisma.tradeLockerConnection.updateMany({
      where: { id: connectionId, tokenRefreshOwner: owner },
      data: {
        tokenRefreshOwner: null,
        tokenRefreshUntil: null,
        status: TradeLockerConnectionStatus.REAUTH_REQUIRED,
        lastError: "TradeLocker authentication must be renewed",
      },
    });
    throw error;
  }
}

export async function acquireTradeLockerConnectionLease(connectionId: string, owner = TRADELOCKER_SYNC_WORKER_ID) {
  const now = new Date();
  const result = await prisma.tradeLockerConnection.updateMany({
    where: {
      id: connectionId,
      enabled: true,
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }, { leaseOwner: owner }],
    },
    data: { leaseOwner: owner, leaseUntil: new Date(now.getTime() + CONNECTION_LEASE_MS) },
  });
  return result.count === 1;
}

export async function releaseTradeLockerConnectionLease(connectionId: string, owner = TRADELOCKER_SYNC_WORKER_ID) {
  await prisma.tradeLockerConnection.updateMany({
    where: { id: connectionId, leaseOwner: owner },
    data: { leaseOwner: null, leaseUntil: null },
  });
}

function syncRange(connection: TradeLockerConnection) {
  const now = new Date();
  const cursor = connection.cursorAt || connection.historyStartAt;
  const caughtUp = cursor.getTime() >= now.getTime() - HISTORY_OVERLAP_MS;
  const from = caughtUp ? new Date(cursor.getTime() - HISTORY_OVERLAP_MS) : cursor;
  const to = new Date(Math.min(now.getTime(), from.getTime() + SYNC_BATCH_DAYS * DAY_MS));
  return { from, to, caughtUp: to.getTime() >= now.getTime() - HISTORY_OVERLAP_MS };
}

async function completeOrderHistory(input: {
  environment: TradeLockerEnvironment;
  accessToken: string;
  accNum: string;
  accountId: string;
  from: Date;
  to: Date;
  depth?: number;
}): Promise<unknown[][]> {
  await waitForTradeLockerRateWindow();
  const response = await getTradeLockerOrderHistory(
    input.environment, input.accessToken, input.accNum, input.accountId, input.from, input.to
  );
  if (!response.d.hasMore) return response.d.ordersHistory;
  const depth = input.depth || 0;
  if (depth >= MAX_HISTORY_SPLIT_DEPTH || input.to.getTime() - input.from.getTime() < 1000) {
    throw new Error("TradeLocker order history exceeds the safe synchronization window");
  }
  const midpoint = Math.floor((input.from.getTime() + input.to.getTime()) / 2);
  const left = await completeOrderHistory({ ...input, to: new Date(midpoint), depth: depth + 1 });
  const right = await completeOrderHistory({ ...input, from: new Date(midpoint + 1), depth: depth + 1 });
  return [...left, ...right];
}

async function fetchSnapshot(connection: TradeLockerConnection, accessToken: string, from: Date, to: Date) {
  const env = environment(connection.environment);
  const config = await getTradeLockerConfig(env, accessToken, connection.accNum);
  await waitForTradeLockerRateWindow();
  const accountDetails = await getTradeLockerAccountDetails(env, accessToken, connection.accNum);
  await waitForTradeLockerRateWindow();
  const state = await getTradeLockerAccountState(env, accessToken, connection.accNum, connection.tradeLockerAccountId);
  await waitForTradeLockerRateWindow();
  const positions = await getTradeLockerPositions(env, accessToken, connection.accNum, connection.tradeLockerAccountId);
  await waitForTradeLockerRateWindow();
  const orders = await getTradeLockerOrders(env, accessToken, connection.accNum, connection.tradeLockerAccountId, from, to);
  const orderHistoryRows = await completeOrderHistory({
    environment: env,
    accessToken,
    accNum: connection.accNum,
    accountId: connection.tradeLockerAccountId,
    from,
    to,
  });
  await waitForTradeLockerRateWindow();
  const instruments = await getTradeLockerInstruments(env, accessToken, connection.accNum, connection.tradeLockerAccountId);
  let executionRows: unknown[][] = [];
  if (config.d.filledOrdersConfig) {
    try {
      await waitForTradeLockerRateWindow();
      executionRows = (await getTradeLockerExecutions(env, accessToken, connection.accNum, connection.tradeLockerAccountId)).d.executions;
    } catch (error) {
      if (!(error instanceof TradeLockerApiError) || error.status !== 404) throw error;
    }
  }
  return {
    config,
    accountDetails: accountDetails.d,
    state: rowsToRecords(config.d.accountDetailsConfig.columns, [state.d.accountDetailsData])[0] || {},
    positions: rowsToRecords(config.d.positionsConfig.columns, positions.d.positions),
    orders: rowsToRecords(config.d.ordersConfig.columns, orders.d.orders),
    orderHistory: rowsToRecords(config.d.ordersHistoryConfig.columns, orderHistoryRows),
    executions: config.d.filledOrdersConfig
      ? rowsToRecords(config.d.filledOrdersConfig.columns, executionRows)
      : [],
    instruments: instruments.d.instruments,
  };
}

async function persistSnapshot(tx: Prisma.TransactionClient, connection: TradeLockerConnection, snapshot: Awaited<ReturnType<typeof fetchSnapshot>>, now: Date) {
  const toOrder = (row: Record<string, unknown>, dataKind: "OPEN" | "HISTORY") => {
    const externalOrderId = stringValue(row.id);
    if (!externalOrderId) return null;
    const quantity = numeric(row.qty);
    const filledQuantity = numeric(row.filledQty);
    const averagePrice = numeric(row.avgPrice);
    return {
      connectionId: connection.id,
      accountId: connection.accountId,
      externalOrderId,
      dataKind,
      externalPositionId: stringValue(row.positionId),
      tradableInstrumentId: stringValue(row.tradableInstrumentId),
      side: stringValue(row.side),
      orderType: stringValue(row.type),
      status: stringValue(row.status),
      quantity: quantity === null ? null : new Prisma.Decimal(quantity),
      filledQuantity: filledQuantity === null ? null : new Prisma.Decimal(filledQuantity),
      averagePrice: averagePrice === null ? null : new Prisma.Decimal(averagePrice),
      createdAtProvider: dateValue(row.createdDate),
      modifiedAtProvider: dateValue(row.lastModified),
      rawPayload: jsonValue(row),
    };
  };
  const openOrders = snapshot.orders
    .map((row) => toOrder(row, "OPEN"))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const historicalOrders = snapshot.orderHistory
    .map((row) => toOrder(row, "HISTORY"))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const existingOpenOrderIds = new Set(
    (await tx.tradeLockerOrder.findMany({
      where: { connectionId: connection.id, dataKind: "OPEN", externalOrderId: { in: openOrders.map((item) => item.externalOrderId) } },
      select: { externalOrderId: true },
    })).map((item) => item.externalOrderId)
  );
  for (const order of openOrders) {
    await tx.tradeLockerOrder.upsert({
      where: {
        connectionId_externalOrderId_dataKind: {
          connectionId: connection.id,
          externalOrderId: order.externalOrderId,
          dataKind: "OPEN",
        },
      },
      create: order,
      update: order,
    });
  }
  const historicalResult = historicalOrders.length
    ? await tx.tradeLockerOrder.createMany({ data: historicalOrders, skipDuplicates: true })
    : { count: 0 };
  const createdOrderCount = historicalResult.count + openOrders.filter((item) => !existingOpenOrderIds.has(item.externalOrderId)).length;

  await tx.tradeLockerPosition.updateMany({ where: { connectionId: connection.id }, data: { isOpen: false } });
  for (const row of snapshot.positions) {
    const externalPositionId = stringValue(row.id);
    if (!externalPositionId) continue;
    const quantity = numeric(row.qty);
    const averagePrice = numeric(row.avgPrice);
    const unrealizedPnl = numeric(row.unrealizedPl);
    const data = {
      accountId: connection.accountId,
      tradableInstrumentId: stringValue(row.tradableInstrumentId),
      side: stringValue(row.side),
      quantity: quantity === null ? null : new Prisma.Decimal(quantity),
      averagePrice: averagePrice === null ? null : new Prisma.Decimal(averagePrice),
      unrealizedPnl: unrealizedPnl === null ? null : new Prisma.Decimal(unrealizedPnl),
      openedAt: dateValue(row.openDate),
      isOpen: true,
      rawPayload: jsonValue(row),
    };
    await tx.tradeLockerPosition.upsert({
      where: { connectionId_externalPositionId: { connectionId: connection.id, externalPositionId } },
      create: { connectionId: connection.id, externalPositionId, ...data },
      update: data,
    });
  }

  const executions = snapshot.executions.flatMap((row) => {
    const externalExecutionId = stringValue(row.id);
    if (!externalExecutionId) return [];
    const quantity = numeric(row.qty);
    const price = numeric(row.price);
    return [{
      connectionId: connection.id,
      accountId: connection.accountId,
      externalExecutionId,
      externalOrderId: stringValue(row.orderId),
      externalPositionId: stringValue(row.positionId),
      tradableInstrumentId: stringValue(row.tradableInstrumentId),
      side: stringValue(row.side),
      quantity: quantity === null ? null : new Prisma.Decimal(quantity),
      price: price === null ? null : new Prisma.Decimal(price),
      executedAt: dateValue(row.createdDate),
      rawPayload: jsonValue(row),
    }];
  });
  const createdExecutions = executions.length
    ? await tx.tradeLockerExecution.createMany({ data: executions, skipDuplicates: true })
    : { count: 0 };

  await tx.tradeLockerInstrument.deleteMany({ where: { connectionId: connection.id } });
  if (snapshot.instruments.length) {
    await tx.tradeLockerInstrument.createMany({
      data: snapshot.instruments.map((instrument) => ({
        connectionId: connection.id,
        tradableInstrumentId: instrument.tradableInstrumentId,
        instrumentId: instrument.id,
        name: instrument.name,
        type: instrument.type || null,
        rawPayload: jsonValue(instrument),
      })),
    });
  }

  const state = snapshot.state;
  const balance = numeric(state.balance);
  const equity = numeric(state.projectedBalance);
  const floatingPnl = numeric(state.openNetPnL);
  const margin = numeric(state.maintMarginReq);
  const freeMargin = numeric(state.availableFunds);
  await tx.tradeLockerAccountSnapshot.create({
    data: {
      connectionId: connection.id,
      accountId: connection.accountId,
      capturedAt: now,
      balance: balance === null ? null : new Prisma.Decimal(balance),
      equity: equity === null ? null : new Prisma.Decimal(equity),
      floatingPnl: floatingPnl === null ? null : new Prisma.Decimal(floatingPnl),
      margin: margin === null ? null : new Prisma.Decimal(margin),
      freeMargin: freeMargin === null ? null : new Prisma.Decimal(freeMargin),
      rawPayload: jsonValue(state),
    },
  });
  if (balance !== null && equity !== null && floatingPnl !== null) {
    await tx.accountEquitySnapshot.upsert({
      where: { accountId_timestamp: { accountId: connection.accountId, timestamp: now } },
      create: {
        accountId: connection.accountId,
        timestamp: now,
        balance: new Prisma.Decimal(balance),
        equity: new Prisma.Decimal(equity),
        floatingPnl: new Prisma.Decimal(floatingPnl),
        margin: margin === null ? null : new Prisma.Decimal(margin),
        freeMargin: freeMargin === null ? null : new Prisma.Decimal(freeMargin),
      },
      update: {},
    });
  }
  const changedPositionIds = [...new Set([
    ...snapshot.positions.map((row) => stringValue(row.id)),
    ...snapshot.orderHistory.map((row) => stringValue(row.positionId)),
    ...snapshot.executions.map((row) => stringValue(row.positionId)),
  ].filter((value): value is string => Boolean(value)))];
  return { createdOrders: createdOrderCount, createdExecutions: createdExecutions.count, changedPositionIds, balance };
}

export async function synchronizeTradeLockerConnection(connectionId: string) {
  const connection = await prisma.tradeLockerConnection.findUnique({ where: { id: connectionId } });
  if (!connection || !connection.enabled) throw new Error("TradeLocker connection is not enabled");
  const range = syncRange(connection);
  await prisma.tradeLockerConnection.update({
    where: { id: connection.id },
    data: { status: TradeLockerConnectionStatus.SYNCING, lastAttemptAt: new Date(), lastError: null },
  });

  try {
    let accessToken = await getValidTradeLockerAccessToken(connection.id);
    let snapshot;
    try {
      snapshot = await fetchSnapshot(connection, accessToken, range.from, range.to);
    } catch (error) {
      if (!(error instanceof TradeLockerApiError) || error.code !== "AUTH_FAILED") throw error;
      accessToken = await getValidTradeLockerAccessToken(connection.id, true);
      snapshot = await fetchSnapshot(connection, accessToken, range.from, range.to);
    }
    const now = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const persisted = await persistSnapshot(tx, connection, snapshot, now);
      const projectedTrades = await projectTradeLockerPositions(tx, connection, persisted.changedPositionIds);
      const detail = snapshot.accountDetails.find((item) => item.id === connection.tradeLockerAccountId);
      await tx.tradingAccount.update({
        where: { id: connection.accountId },
        data: {
          name: detail?.name || connection.accountName || `TradeLocker ${connection.tradeLockerAccountId}`,
          broker: connection.server,
          platform: "TradeLocker",
          currency: detail?.currency || undefined,
          balance: persisted.balance === null ? undefined : new Prisma.Decimal(persisted.balance),
          tradeLockerAccountId: connection.tradeLockerAccountId,
          ingestionMode: "DIRECT_TRADELOCKER",
          lastConnectedAt: now,
          lastSyncAt: now,
        },
      });
      const updated = await tx.tradeLockerConnection.update({
        where: { id: connection.id },
        data: {
          accountName: detail?.name || connection.accountName,
          accountStatus: detail?.status || connection.accountStatus,
          status: range.caughtUp ? TradeLockerConnectionStatus.CONNECTED : TradeLockerConnectionStatus.SYNCING,
          cursorAt: range.to,
          lastConnectedAt: now,
          lastSyncAt: now,
          lastError: null,
          importedOrderCount: { increment: persisted.createdOrders },
          importedExecutionCount: { increment: persisted.createdExecutions },
        },
      });
      return { connection: updated, ...persisted, projectedTrades };
    }, { timeout: 60_000 });
    let screenshotResult = { captured: 0, errors: [] as string[] };
    try {
      screenshotResult = await captureTradeLockerTradeScreenshots(connection, accessToken);
    } catch (error) {
      screenshotResult.errors.push(cleanError(error));
    }
    return {
      ...result,
      capturedScreenshots: screenshotResult.captured,
      screenshotErrors: screenshotResult.errors,
    };
  } catch (error) {
    const reauth = error instanceof TradeLockerApiError && (error.code === "AUTH_FAILED" || error.code === "INVALID_CREDENTIALS");
    await prisma.tradeLockerConnection.update({
      where: { id: connection.id },
      data: {
        status: reauth ? TradeLockerConnectionStatus.REAUTH_REQUIRED : TradeLockerConnectionStatus.ERROR,
        lastError: cleanError(error),
      },
    });
    throw error;
  }
}
