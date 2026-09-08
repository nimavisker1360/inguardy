import { Prisma, TradeDirection, TradeReviewStatus, TradeStatus, TradeUpdateType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getTradingSessionLabel, normalizeTradingSession } from "@/lib/journal/trading-session";
import { closeTriggeredPropFirmChallenges } from "@/lib/prop-firms";
import { attachPendingMt5Screenshots } from "@/server/mt5/pending-screenshots";
import type {
  Mt5AccountHeartbeatPayload,
  Mt5JournalPayload,
} from "@/server/mt5/schemas";
import type { VerifiedJournalAccount } from "@/server/mt5/verify-journal-secret";

export class Mt5TradeJournalError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "Mt5TradeJournalError";
    this.status = status;
  }
}

const QUICK_CONNECT_ACCOUNT_NAME = "MT5 Auto Connect";

function decimal(value: number | null | undefined, fallback?: number) {
  if (value === undefined) {
    return fallback === undefined ? undefined : String(fallback);
  }

  if (value === null) {
    return fallback === undefined ? null : String(fallback);
  }

  return String(value);
}

function storedNumber(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function accumulatedDecimal(existingValue: unknown, delta: number | null | undefined) {
  if (delta === undefined) {
    return undefined;
  }

  return String(Number((storedNumber(existingValue) + (delta ?? 0)).toFixed(2)));
}

function dateValue(value: string | undefined, fallback?: Date) {
  return value ? new Date(value) : fallback;
}

function toDirection(value: Mt5JournalPayload["side"]) {
  return value === "SELL" ? TradeDirection.SELL : TradeDirection.BUY;
}

function calculateRr(input: {
  direction: TradeDirection;
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}) {
  const entry = input.entryPrice;
  const stop = input.stopLoss;
  const rewardTarget = input.exitPrice ?? input.takeProfit;

  if (entry === undefined || stop === undefined || rewardTarget === undefined) {
    return "0";
  }

  const risk =
    input.direction === TradeDirection.BUY ? entry - stop : stop - entry;
  const reward =
    input.direction === TradeDirection.BUY
      ? rewardTarget - entry
      : entry - rewardTarget;

  if (risk <= 0) {
    return "0";
  }

  return String(Number((reward / risk).toFixed(2)));
}

function defined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T;
}

function storedPrice(value: unknown) {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) && numberValue > 0
    ? numberValue
    : undefined;
}

function storedNullablePrice(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

function pricesEqual(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return true;
  }

  if (left === null || right === null) {
    return false;
  }

  return Math.abs(left - right) < 0.0000001;
}

function isMt5TicketUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function mt5JournalEventKey(payload: Mt5JournalPayload) {
  if (payload.eventType === "update") {
    return null;
  }

  if (payload.dealTicket) {
    return `deal:${payload.dealTicket}`;
  }

  return [
    "legacy",
    payload.openedAt ?? "",
    payload.closedAt ?? "",
    payload.entryPrice ?? "",
    payload.exitPrice ?? "",
    payload.profitLoss ?? "",
    payload.commission ?? "",
    payload.swap ?? "",
    payload.lot ?? "",
  ].join("|");
}

async function findTradeByMt5Ticket(
  tx: Prisma.TransactionClient,
  accountId: string,
  mt5Ticket: string
) {
  return tx.trade.findFirst({
    where: {
      accountId,
      mt5Ticket,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function findDuplicateMt5JournalEventTrade(
  tx: Prisma.TransactionClient,
  account: VerifiedJournalAccount,
  payload: Mt5JournalPayload
) {
  const eventKey = mt5JournalEventKey(payload);

  if (!eventKey) {
    return null;
  }

  const result = await tx.mt5JournalEvent.createMany({
    data: {
      userId: account.userId,
      accountId: account.id,
      eventType: payload.eventType,
      mt5Ticket: payload.ticket,
      eventKey,
      dealTicket: payload.dealTicket,
    },
    skipDuplicates: true,
  });

  if (result.count > 0) {
    return null;
  }

  return findTradeByMt5Ticket(tx, account.id, payload.ticket);
}

async function moveDuplicateAccountTrades(
  tx: Prisma.TransactionClient,
  duplicateAccountId: string,
  canonicalAccountId: string
) {
  const trades = await tx.trade.findMany({
    where: { accountId: duplicateAccountId },
    select: { id: true, mt5Ticket: true },
  });

  for (const trade of trades) {
    if (trade.mt5Ticket) {
      const existingTrade = await tx.trade.findFirst({
        where: {
          accountId: canonicalAccountId,
          mt5Ticket: trade.mt5Ticket,
          id: { not: trade.id },
        },
        select: { id: true },
      });

      if (existingTrade) {
        await tx.trade.update({
          where: { id: trade.id },
          data: { accountId: canonicalAccountId, mt5Ticket: null },
        });
        continue;
      }
    }

    await tx.trade.update({
      where: { id: trade.id },
      data: { accountId: canonicalAccountId },
    });
  }
}

async function mergeDuplicateMt5Account(
  tx: Prisma.TransactionClient,
  duplicate: VerifiedJournalAccount,
  canonical: VerifiedJournalAccount
) {
  await tx.tradingAccount.update({
    where: { id: duplicate.id },
    data: {
      journalSecretHash: null,
      journalSecretEncrypted: null,
      journalEnabled: false,
    },
  });

  await moveDuplicateAccountTrades(tx, duplicate.id, canonical.id);

  const pendingScreenshots = await tx.mt5PendingScreenshot.findMany({
    where: { accountId: duplicate.id },
    select: { id: true, positionId: true, type: true },
  });

  for (const screenshot of pendingScreenshots) {
    const existing = await tx.mt5PendingScreenshot.findFirst({
      where: {
        accountId: canonical.id,
        positionId: screenshot.positionId,
        type: screenshot.type,
      },
      select: { id: true },
    });

    if (existing) {
      await tx.mt5PendingScreenshot.delete({ where: { id: screenshot.id } });
    } else {
      await tx.mt5PendingScreenshot.update({
        where: { id: screenshot.id },
        data: { accountId: canonical.id },
      });
    }
  }

  await tx.propFirmChallenge.updateMany({
    where: { accountId: duplicate.id },
    data: { accountId: canonical.id },
  });

  await tx.tradingAccount.update({
    where: { id: canonical.id },
    data: {
      journalEnabled: true,
      journalSecretHash: duplicate.journalSecretHash,
      journalSecretEncrypted: duplicate.journalSecretEncrypted,
    },
  });

  await tx.tradingAccount.delete({
    where: { id: duplicate.id },
  });
}

async function resolveCanonicalMt5Account(
  tx: Prisma.TransactionClient,
  account: VerifiedJournalAccount,
  payload: { accountNumber?: string },
  shouldBindAccountNumber: boolean
) {
  const accountNumber = payload.accountNumber?.trim();

  if (!shouldBindAccountNumber || !accountNumber) {
    return account;
  }

  const matches = await tx.tradingAccount.findMany({
    where: {
      userId: account.userId,
      id: { not: account.id },
      OR: [{ mt5AccountNumber: accountNumber }, { name: accountNumber }],
    },
    select: {
      id: true,
      userId: true,
      name: true,
      broker: true,
      platform: true,
      journalEnabled: true,
      journalSecretHash: true,
      journalSecretEncrypted: true,
      mt5AccountNumber: true,
      lastConnectedAt: true,
      lastSyncAt: true,
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
      _count: {
        select: {
          trades: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  const canonical = matches.sort(
    (left, right) => right._count.trades - left._count.trades
  )[0];

  if (!canonical) {
    return account;
  }

  await mergeDuplicateMt5Account(tx, account, canonical);

  return {
    ...canonical,
    journalEnabled: true,
    journalSecretHash: account.journalSecretHash,
    journalSecretEncrypted: account.journalSecretEncrypted,
  };
}

function buildAccountActivityData(
  account: VerifiedJournalAccount,
  payload: Mt5AccountHeartbeatPayload | Mt5JournalPayload,
  shouldBindAccountNumber: boolean
) {
  const data: Prisma.TradingAccountUpdateInput = {
    lastConnectedAt: new Date(),
    lastSyncAt: new Date(),
  };

  if (shouldBindAccountNumber || !account.mt5AccountNumber) {
    data.mt5AccountNumber = payload.accountNumber;
  }

  if (account.name === QUICK_CONNECT_ACCOUNT_NAME && payload.accountNumber) {
    data.name = payload.accountNumber;
  }

  if (!account.broker && payload.broker) {
    data.broker = payload.broker;
  }

  if (!account.platform && payload.platform) {
    data.platform = payload.platform;
  }

  if (payload.balance !== undefined) {
    data.balance = String(payload.balance);
  }

  if (payload.currency) {
    data.currency = payload.currency;
  }

  return data;
}

export async function saveMt5AccountHeartbeat(input: {
  account: VerifiedJournalAccount;
  payload: Mt5AccountHeartbeatPayload;
  shouldBindAccountNumber: boolean;
}) {
  const { account, payload, shouldBindAccountNumber } = input;

  return prisma.$transaction(async (tx) => {
    const activeAccount = await resolveCanonicalMt5Account(
      tx,
      account,
      payload,
      shouldBindAccountNumber
    );
    const shouldBindActiveAccountNumber =
      activeAccount.id === account.id ? shouldBindAccountNumber : false;

    return tx.tradingAccount.update({
      where: { id: activeAccount.id },
      data: buildAccountActivityData(
        activeAccount,
        payload,
        shouldBindActiveAccountNumber
      ),
      select: {
        id: true,
        name: true,
        broker: true,
        platform: true,
        currency: true,
        balance: true,
        mt5AccountNumber: true,
        lastConnectedAt: true,
        lastSyncAt: true,
      },
    });
  });
}

function buildOpenTradeData(
  account: VerifiedJournalAccount,
  payload: Mt5JournalPayload
) {
  const direction = toDirection(payload.side);
  const openedAt = dateValue(payload.openedAt, new Date());
  const setup = normalizeTradingSession(payload.sessionTime) ? "MT5 Import" : payload.sessionTime || "MT5 Import";

  return defined({
    userId: account.userId,
    accountId: account.id,
    mt5Ticket: payload.ticket,
    symbol: payload.symbol || "UNKNOWN",
    direction,
    status: TradeStatus.OPEN,
    entryPrice: decimal(payload.entryPrice, 0),
    exitPrice: decimal(payload.exitPrice, 0),
    stopLoss: decimal(payload.stopLoss, 0),
    takeProfit: decimal(payload.takeProfit, 0),
    initialStopLoss: decimal(payload.stopLoss, 0),
    initialTakeProfit: decimal(payload.takeProfit, 0),
    currentStopLoss: decimal(payload.stopLoss, 0),
    currentTakeProfit: decimal(payload.takeProfit, 0),
    lotSize: decimal(payload.lot, 0),
    profitLoss: decimal(0),
    commission: decimal(payload.commission, 0),
    swap: decimal(payload.swap, 0),
    rr: calculateRr({
      direction,
      entryPrice: payload.entryPrice,
      stopLoss: payload.stopLoss ?? undefined,
      takeProfit: payload.takeProfit ?? undefined,
    }),
    setup,
    session: getTradingSessionLabel(openedAt) || normalizeTradingSession(payload.sessionTime),
    emotion: payload.mood,
    notes: "Imported from MT5 EA",
    openedAt,
    source: "MT5",
    reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
  }) satisfies Prisma.TradeUncheckedCreateInput;
}

function buildUpdateTradeData(payload: Mt5JournalPayload) {
  const data: Prisma.TradeUncheckedUpdateInput = {};

  if (payload.symbol) {
    data.symbol = payload.symbol;
  }

  if (payload.side) {
    data.direction = toDirection(payload.side);
  }

  if (payload.entryPrice !== undefined) {
    data.entryPrice = decimal(payload.entryPrice);
  }

  if (payload.exitPrice !== undefined) {
    data.exitPrice = decimal(payload.exitPrice);
  }

  if (payload.stopLoss !== undefined) {
    data.stopLoss = decimal(payload.stopLoss);
  }

  if (payload.takeProfit !== undefined) {
    data.takeProfit = decimal(payload.takeProfit);
  }

  if (payload.lot !== undefined) {
    data.lotSize = decimal(payload.lot);
  }

  if (payload.profitLoss !== undefined) {
    data.profitLoss = decimal(payload.profitLoss);
  }

  if (payload.commission !== undefined) {
    data.commission = decimal(payload.commission);
  }

  if (payload.swap !== undefined) {
    data.swap = decimal(payload.swap);
  }

  if (payload.mood) {
    data.emotion = payload.mood;
  }

  if (payload.openedAt) {
    const openedAt = dateValue(payload.openedAt);
    data.openedAt = openedAt;
    data.session = getTradingSessionLabel(openedAt) || normalizeTradingSession(payload.sessionTime);
  } else if (payload.sessionTime) {
    data.session = normalizeTradingSession(payload.sessionTime) || undefined;
  }

  data.source = "MT5";

  return data;
}

function buildCloseCreateData(
  account: VerifiedJournalAccount,
  payload: Mt5JournalPayload
) {
  if (!payload.symbol || !payload.side) {
    throw new Mt5TradeJournalError("Trade not found", 404);
  }

  const direction = toDirection(payload.side);
  const entryPrice = payload.entryPrice ?? payload.exitPrice ?? 0;
  const openedAt = dateValue(payload.openedAt);
  const setup = normalizeTradingSession(payload.sessionTime) ? "MT5 Import" : payload.sessionTime || "MT5 Import";

  return defined({
    userId: account.userId,
    accountId: account.id,
    mt5Ticket: payload.ticket,
    symbol: payload.symbol,
    direction,
    status: TradeStatus.CLOSED,
    entryPrice: decimal(entryPrice, 0),
    exitPrice: decimal(payload.exitPrice, 0),
    stopLoss: decimal(payload.stopLoss, 0),
    takeProfit: decimal(payload.takeProfit, 0),
    initialStopLoss: decimal(payload.stopLoss, 0),
    initialTakeProfit: decimal(payload.takeProfit, 0),
    currentStopLoss: decimal(payload.stopLoss, 0),
    currentTakeProfit: decimal(payload.takeProfit, 0),
    lotSize: decimal(payload.lot, 0),
    profitLoss: decimal(payload.profitLoss, 0),
    commission: decimal(payload.commission, 0),
    swap: decimal(payload.swap, 0),
    rr: calculateRr({
      direction,
      entryPrice,
      exitPrice: payload.exitPrice,
      stopLoss: payload.stopLoss ?? undefined,
    }),
    setup,
    session: getTradingSessionLabel(openedAt || dateValue(payload.closedAt, new Date())) || normalizeTradingSession(payload.sessionTime),
    emotion: payload.mood,
    notes: "Imported from MT5 EA",
    openedAt,
    closedAt: dateValue(payload.closedAt, new Date()),
    source: "MT5",
    reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
  }) satisfies Prisma.TradeUncheckedCreateInput;
}

export async function saveMt5JournalTrade(input: {
  account: VerifiedJournalAccount;
  payload: Mt5JournalPayload;
  shouldBindAccountNumber: boolean;
}) {
  const { account, payload, shouldBindAccountNumber } = input;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const savedTrade = await prisma.$transaction(async (tx) => {
        const activeAccount = await resolveCanonicalMt5Account(
          tx,
          account,
          payload,
          shouldBindAccountNumber
        );
        const shouldUpdateAccountNumber =
          activeAccount.id === account.id ? shouldBindAccountNumber : false;

        let existingTrade = await findTradeByMt5Ticket(
          tx,
          activeAccount.id,
          payload.ticket
        );

        const duplicateEventTrade = await findDuplicateMt5JournalEventTrade(
          tx,
          activeAccount,
          payload
        );

        if (duplicateEventTrade) {
          return duplicateEventTrade;
        }

    if (
      !existingTrade &&
      payload.eventType === "update" &&
      payload.symbol &&
      payload.side &&
      payload.openedAt
    ) {
      const openedAt = dateValue(payload.openedAt);
      const direction = toDirection(payload.side);

      if (openedAt) {
        existingTrade = await tx.trade.findFirst({
          where: defined({
            accountId: activeAccount.id,
            source: "MT5",
            status: TradeStatus.OPEN,
            symbol: payload.symbol,
            direction,
            openedAt: {
              gte: new Date(openedAt.getTime() - 15_000),
              lte: new Date(openedAt.getTime() + 15_000),
            },
            mt5Ticket: { not: payload.ticket },
            entryPrice:
              payload.entryPrice === undefined
                ? undefined
                : decimal(payload.entryPrice),
            lotSize:
              payload.lot === undefined ? undefined : decimal(payload.lot),
          }),
          orderBy: { createdAt: "desc" },
        });
      }
    }

    let trade;

    if (payload.eventType === "close") {
      if (existingTrade) {
        const shouldAccumulateCloseValues = existingTrade.status !== TradeStatus.CLOSED;
        const direction = payload.side
          ? toDirection(payload.side)
          : existingTrade.direction;
        const entryPrice =
          payload.entryPrice ?? Number(existingTrade.entryPrice ?? 0);
        const stopLoss = payload.stopLoss ?? storedPrice(existingTrade.stopLoss);
        trade = await tx.trade.update({
          where: { id: existingTrade.id },
          data: defined({
            status: TradeStatus.CLOSED,
            symbol: payload.symbol,
            direction,
            entryPrice: decimal(payload.entryPrice),
            exitPrice: decimal(payload.exitPrice, 0),
            currentStopLoss: decimal(payload.stopLoss),
            currentTakeProfit: decimal(payload.takeProfit),
            profitLoss: shouldAccumulateCloseValues
              ? accumulatedDecimal(existingTrade.profitLoss, payload.profitLoss)
              : undefined,
            commission: shouldAccumulateCloseValues
              ? accumulatedDecimal(existingTrade.commission, payload.commission)
              : undefined,
            swap: shouldAccumulateCloseValues
              ? accumulatedDecimal(existingTrade.swap, payload.swap)
              : undefined,
            rr: calculateRr({
              direction,
              entryPrice,
              exitPrice: payload.exitPrice,
              stopLoss,
            }),
            closedAt: dateValue(payload.closedAt, new Date()),
            source: "MT5",
            reviewStatus:
              existingTrade.reviewStatus === TradeReviewStatus.REVIEWED
                ? undefined
                : TradeReviewStatus.NEEDS_REVIEW,
          }),
        });
      } else {
        trade = await tx.trade.create({
          data: buildCloseCreateData(activeAccount, payload),
        });
      }
    } else if (payload.eventType === "partial_close") {
      if (existingTrade) {
        const direction = payload.side
          ? toDirection(payload.side)
          : existingTrade.direction;
        const entryPrice =
          payload.entryPrice ?? storedPrice(existingTrade.entryPrice);
        const stopLoss =
          payload.stopLoss === undefined
            ? storedPrice(existingTrade.stopLoss)
            : payload.stopLoss ?? undefined;
        const takeProfit =
          payload.takeProfit === undefined
            ? storedPrice(existingTrade.takeProfit)
            : payload.takeProfit ?? undefined;

        trade = await tx.trade.update({
          where: { id: existingTrade.id },
          data: defined({
            status: TradeStatus.OPEN,
            symbol: payload.symbol,
            direction,
            entryPrice: decimal(payload.entryPrice),
            exitPrice: decimal(payload.exitPrice),
            stopLoss: decimal(payload.stopLoss),
            takeProfit: decimal(payload.takeProfit),
            currentStopLoss: decimal(payload.stopLoss),
            currentTakeProfit: decimal(payload.takeProfit),
            lotSize: decimal(payload.lot),
            profitLoss: accumulatedDecimal(existingTrade.profitLoss, payload.profitLoss),
            commission: accumulatedDecimal(existingTrade.commission, payload.commission),
            swap: accumulatedDecimal(existingTrade.swap, payload.swap),
            rr: calculateRr({
              direction,
              entryPrice,
              stopLoss,
              takeProfit,
            }),
            closedAt: null,
            source: "MT5",
            reviewStatus:
              existingTrade.reviewStatus === TradeReviewStatus.REVIEWED
                ? undefined
                : TradeReviewStatus.NEEDS_REVIEW,
          }),
        });
      } else {
        trade = await tx.trade.create({
          data: {
            ...buildOpenTradeData(activeAccount, payload),
            exitPrice: decimal(payload.exitPrice),
            profitLoss: decimal(payload.profitLoss, 0),
            commission: decimal(payload.commission, 0),
            swap: decimal(payload.swap, 0),
          },
        });
      }
    } else if (existingTrade) {
      const updateData: Prisma.TradeUncheckedUpdateInput =
        payload.eventType === "update"
          ? {
              source: "MT5",
              stopLoss: decimal(payload.stopLoss),
              takeProfit: decimal(payload.takeProfit),
              currentStopLoss: decimal(payload.stopLoss),
              currentTakeProfit: decimal(payload.takeProfit),
              reviewStatus:
                existingTrade.reviewStatus === TradeReviewStatus.REVIEWED
                  ? undefined
                  : TradeReviewStatus.NEEDS_REVIEW,
            }
          : buildUpdateTradeData(payload);
      const direction = payload.side
        ? toDirection(payload.side)
        : existingTrade.direction;

      if (payload.eventType === "open") {
        updateData.status = TradeStatus.OPEN;
        updateData.initialStopLoss = decimal(payload.stopLoss, 0);
        updateData.initialTakeProfit = decimal(payload.takeProfit, 0);
        updateData.currentStopLoss = decimal(payload.stopLoss, 0);
        updateData.currentTakeProfit = decimal(payload.takeProfit, 0);
      }

      if (existingTrade.reviewStatus !== TradeReviewStatus.REVIEWED) {
        updateData.reviewStatus = TradeReviewStatus.NEEDS_REVIEW;
      }

      if (existingTrade.mt5Ticket !== payload.ticket) {
        updateData.mt5Ticket = payload.ticket;
      }

      if (payload.eventType === "update") {
        const oldStopLoss = storedNullablePrice(
          existingTrade.currentStopLoss ?? existingTrade.stopLoss
        );
        const newStopLoss =
          payload.stopLoss === undefined
            ? oldStopLoss
            : storedNullablePrice(payload.stopLoss);
        const oldTakeProfit = storedNullablePrice(
          existingTrade.currentTakeProfit ?? existingTrade.takeProfit
        );
        const newTakeProfit =
          payload.takeProfit === undefined
            ? oldTakeProfit
            : storedNullablePrice(payload.takeProfit);

        if (
          !storedPrice(existingTrade.initialStopLoss) &&
          newStopLoss !== null
        ) {
          updateData.initialStopLoss = decimal(newStopLoss);
        }

        if (
          !storedPrice(existingTrade.initialTakeProfit) &&
          newTakeProfit !== null
        ) {
          updateData.initialTakeProfit = decimal(newTakeProfit);
        }

        updateData.rr = calculateRr({
          direction,
          entryPrice: storedPrice(existingTrade.entryPrice),
          stopLoss: newStopLoss ?? undefined,
          takeProfit: newTakeProfit ?? undefined,
        });

        if (!pricesEqual(oldStopLoss, newStopLoss)) {
          await tx.tradeUpdateLog.create({
            data: {
              tradeId: existingTrade.id,
              type: TradeUpdateType.SL_CHANGED,
              oldValue: decimal(oldStopLoss),
              newValue: decimal(newStopLoss),
            },
          });
        }

        if (!pricesEqual(oldTakeProfit, newTakeProfit)) {
          await tx.tradeUpdateLog.create({
            data: {
              tradeId: existingTrade.id,
              type: TradeUpdateType.TP_CHANGED,
              oldValue: decimal(oldTakeProfit),
              newValue: decimal(newTakeProfit),
            },
          });
        }
      }

      if (
        payload.eventType !== "update" &&
        (payload.side ||
          payload.entryPrice !== undefined ||
          payload.stopLoss !== undefined ||
          payload.takeProfit !== undefined)
      ) {
        const stopLoss =
          payload.stopLoss === undefined
            ? storedPrice(existingTrade.stopLoss)
            : payload.stopLoss ?? undefined;
        const takeProfit =
          payload.takeProfit === undefined
            ? storedPrice(existingTrade.takeProfit)
            : payload.takeProfit ?? undefined;

        updateData.rr = calculateRr({
          direction,
          entryPrice:
            payload.entryPrice ?? storedPrice(existingTrade.entryPrice),
          stopLoss,
          takeProfit,
        });
      }

      trade = await tx.trade.update({
        where: { id: existingTrade.id },
        data: updateData,
      });
    } else {
      trade = await tx.trade.create({
        data: buildOpenTradeData(activeAccount, payload),
      });
    }

    await tx.tradingAccount.update({
      where: { id: activeAccount.id },
      data: buildAccountActivityData(
        activeAccount,
        payload,
        shouldUpdateAccountNumber
      ),
    });

    await attachPendingMt5Screenshots(tx as any, {
      userId: activeAccount.userId,
      accountId: activeAccount.id,
      positionId: payload.ticket,
      tradeId: trade.id,
    });

        return trade;
      });

      if (savedTrade.status === TradeStatus.CLOSED) {
        await closeTriggeredPropFirmChallenges(savedTrade.userId, {
          accountId: savedTrade.accountId,
        });
      }

      return savedTrade;
    } catch (error) {
      if (attempt === 0 && isMt5TicketUniqueConflict(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new Mt5TradeJournalError("Failed to save trade", 500);
}
