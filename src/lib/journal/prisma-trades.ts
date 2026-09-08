import { Prisma, TradeDirection, TradeReviewStatus, TradeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateChecklistCollectionProgress } from "@/lib/checklists/calculateChecklistProgress";
import { calculateTradeRequirements } from "@/lib/journal/review-requirements";
import {
  calculateTradeMetrics,
  decimalValue,
  parseDate,
  parsePositiveInt,
} from "@/lib/journal/api-utils";
import {
  EA_IMPORT_TRADE_SOURCE,
  EXCEL_JOURNAL_IMPORT_SOURCE,
  MT5_HTML_IMPORT_SOURCE,
  MANUAL_TRADE_SOURCE,
  MT5_TRADE_SOURCE,
  isImportedTradeSource,
  stripBrokerDataFields,
} from "@/lib/journal/trade-source";
import { getTradingSessionLabel, normalizeTradingSession } from "@/lib/journal/trading-session";
import type {
  JournalAccountPayload,
  JournalEventPayload,
  ProcessJournalEventInput,
  ProcessJournalEventResult,
} from "@/lib/journal/journal-service";

export const journalTradeInclude = {
  account: true,
  screenshots: true,
  updateLogs: {
    orderBy: {
      createdAt: "asc",
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  strategyReview: {
    include: {
      ruleReviews: true,
    },
  },
  aiReviews: {
    orderBy: {
      updatedAt: "desc",
    },
    take: 1,
  },
  journalMetadata: true,
  checklists: {
    select: {
      id: true,
      checklistTemplateId: true,
      titleSnapshot: true,
      completedCount: true,
      totalCount: true,
      completionPercent: true,
      updatedAt: true,
      answers: {
        select: {
          id: true,
          titleSnapshot: true,
          isRequiredSnapshot: true,
          isCriticalSnapshot: true,
          checked: true,
          answeredAt: true,
          note: true,
          updatedAt: true,
        },
      },
    },
  },
} satisfies Prisma.TradeInclude;

type JournalTradeWithRelations = Prisma.TradeGetPayload<{
  include: typeof journalTradeInclude;
}>;

function normalizeScreenshotType(type: string) {
  return type.trim().toUpperCase();
}

function latestTradeScreenshots(
  screenshots: JournalTradeWithRelations["screenshots"]
) {
  const byType = new Map<string, (typeof screenshots)[number]>();
  const additionalScreenshots: typeof screenshots = [];

  for (const screenshot of screenshots) {
    const type = normalizeScreenshotType(screenshot.type);

    if (type !== "ENTRY" && type !== "EXIT") {
      additionalScreenshots.push(screenshot);
      continue;
    }

    const existing = byType.get(type);

    if (!existing || screenshot.createdAt > existing.createdAt) {
      byType.set(type, {
        ...screenshot,
        type,
      });
    }
  }

  return [...byType.values(), ...additionalScreenshots];
}

type BuildCreateResult =
  | {
      data: Omit<Prisma.TradeUncheckedCreateInput, "accountId"> & {
        accountId?: string;
      };
      errors?: never;
    }
  | {
      data?: never;
      errors: string[];
    };

type BuildUpdateResult =
  | {
      data: Prisma.TradeUncheckedUpdateInput;
      errors?: never;
    }
  | {
      data?: never;
      errors: string[];
    };

const MT5_SETUP_PREFIX = "MT5:";

function readEnv(name: string) {
  return process.env[name]?.trim() || "";
}

async function findUserIdById(userId: string) {
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  return user?.id || null;
}

async function findUserIdByEmail(email: string) {
  if (!email) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    select: { id: true },
  });

  return user?.id || null;
}

export async function resolveJournalIngestionUserId() {
  const configuredUserId = readEnv("JOURNAL_USER_ID");
  const userIdFromConfig = await findUserIdById(configuredUserId);

  if (userIdFromConfig) {
    return userIdFromConfig;
  }

  if (configuredUserId) {
  }

  const configuredEmail = readEnv("JOURNAL_USER_EMAIL");
  const userIdFromEmail = await findUserIdByEmail(configuredEmail);

  if (userIdFromEmail) {
    return userIdFromEmail;
  }

  if (configuredEmail) {
  }

  const demoUserId = readEnv("DEMO_USER_ID");
  const userIdFromDemoEnv = await findUserIdById(demoUserId);

  if (userIdFromDemoEnv) {
    return userIdFromDemoEnv;
  }

  const adminEmails = readEnv("ADMIN_EMAILS")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (adminEmails.length === 1) {
    const userIdFromAdminEmail = await findUserIdByEmail(adminEmails[0]);

    if (userIdFromAdminEmail) {
      return userIdFromAdminEmail;
    }
  }

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!firstUser) {
    throw new Error("No user exists for MT5 journal ingestion");
  }

  return firstUser.id;
}

function mt5TicketValue(value: string | null) {
  return value?.replace(MT5_SETUP_PREFIX, "").trim() || null;
}

function firstDefined(body: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    if (body[name] !== undefined) {
      return body[name];
    }
  }

  return undefined;
}

function optionalString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function parseDirection(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();

  if (normalized === TradeDirection.BUY || normalized === TradeDirection.SELL) {
    return normalized;
  }

  return null;
}

function parseStatus(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const normalized = String(value).trim().toUpperCase();

  if (
    normalized === TradeStatus.OPEN ||
    normalized === TradeStatus.CLOSED ||
    normalized === TradeStatus.CANCELLED
  ) {
    return normalized;
  }

  return null;
}

function parseRequiredDecimal(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  const parsed = decimalValue(value);

  if (parsed === undefined) {
    errors.push(`${fieldName} is required and must be a valid number`);
  }

  return parsed;
}

function parseOptionalDecimal(
  value: unknown,
  fieldName: string,
  errors: string[]
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = decimalValue(value);

  if (parsed === undefined) {
    errors.push(`${fieldName} must be a valid number`);
    return undefined;
  }

  return parsed;
}

function parseRequiredDate(value: unknown, fieldName: string, errors: string[]) {
  const parsed = parseDate(value);

  if (!parsed) {
    errors.push(`${fieldName} is required and must be a valid date`);
  }

  return parsed || undefined;
}

function parseOptionalDate(value: unknown, fieldName: string, errors: string[]) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = parseDate(value);

  if (!parsed) {
    errors.push(`${fieldName} must be a valid date`);
    return undefined;
  }

  return parsed;
}

export function serializeJournalTrade(trade: JournalTradeWithRelations) {
  const screenshots = latestTradeScreenshots(trade.screenshots);
  const checklistProgress = calculateChecklistCollectionProgress(trade.checklists);
  const screenshotUrl = (type: string) =>
    screenshots.find(
      (screenshot) => screenshot.type.toLowerCase() === type.toLowerCase()
    )?.url || null;

  const derivedSession = getTradingSessionLabel(trade.openedAt || trade.closedAt || trade.createdAt);

  return {
    ...trade,
    screenshots,
    tradingAccount: trade.account,
    side: trade.direction,
    entryTime: trade.openedAt,
    exitTime: trade.closedAt,
    initialStopLoss: trade.initialStopLoss ?? trade.stopLoss,
    initialTakeProfit: trade.initialTakeProfit ?? trade.takeProfit,
    currentStopLoss: trade.currentStopLoss ?? trade.stopLoss,
    currentTakeProfit: trade.currentTakeProfit ?? trade.takeProfit,
    checklistCompletionPercent: checklistProgress.completionPercent,
    checklistCompletedCount: checklistProgress.completedCount,
    checklistTotalCount: checklistProgress.totalCount,
    checklistResult: trade.checklists[0] || null,
    reviewRequirements: calculateTradeRequirements(trade),
    aiReview: trade.aiReviews[0] || null,
    journalMetadata: trade.journalMetadata,
    entryScreenshotUrl: screenshotUrl("ENTRY"),
    exitScreenshotUrl: screenshotUrl("EXIT"),
    session: derivedSession || trade.session,
    strategy: trade.strategyReview?.strategyNameSnapshot || trade.setup,
    mistakes: trade.mistake,
  };
}

export async function ensureManualTradingAccount(userId: string) {
  const existing = await prisma.tradingAccount.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return existing.id;
  }

  const account = await prisma.tradingAccount.create({
    data: {
      userId,
      name: "Manual Journal",
      broker: "Manual",
      platform: "Tradivix",
      currency: "USD",
    },
  });

  return account.id;
}

function getMt5ExternalTradeKey(event: JournalEventPayload) {
  const value =
    event.positionId?.trim() ||
    event.ticket?.trim() ||
    event.orderTicket?.trim() ||
    event.dealTicket?.trim() ||
    "";

  return value ? `${MT5_SETUP_PREFIX}${value}` : null;
}

function toPrismaDirection(value: JournalEventPayload["tradeType"]) {
  return value === "sell" ? TradeDirection.SELL : TradeDirection.BUY;
}

function nullableDecimal(value: number | null | undefined) {
  return value === undefined || value === null ? undefined : String(value);
}

function nullableDecimalOrNull(value: number | null | undefined) {
  return value === undefined || value === null ? null : String(value);
}

async function ensureMt5TradingAccount(
  userId: string,
  account: JournalAccountPayload
) {
  const existing = await prisma.tradingAccount.findFirst({
    where: {
      userId,
      name: account.accountNumber,
      broker: account.broker,
      platform: account.serverName,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.tradingAccount.create({
    data: {
      userId,
      name: account.accountNumber,
      broker: account.broker,
      platform: account.serverName,
      currency: account.currency || "USD",
      balance: nullableDecimal(account.balance),
    },
  });
}

async function findMt5Trade(accountId: string, sourceKey: string | null) {
  const ticket = mt5TicketValue(sourceKey);

  if (!sourceKey && !ticket) {
    return null;
  }

  return prisma.trade.findFirst({
    where: {
      accountId,
      OR: [
        ...(ticket ? [{ mt5Ticket: ticket }] : []),
        ...(sourceKey ? [{ setup: sourceKey }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });
}

async function findFallbackOpenMt5Trade(
  accountId: string,
  event: JournalEventPayload
) {
  const symbol = event.symbol?.trim().toUpperCase();

  if (!symbol) {
    return null;
  }

  return prisma.trade.findFirst({
    where: {
      accountId,
      symbol,
      status: TradeStatus.OPEN,
      OR: [
        { source: { in: [MT5_TRADE_SOURCE, EA_IMPORT_TRADE_SOURCE, "MT5_EA"] } },
        { setup: { startsWith: MT5_SETUP_PREFIX } },
      ],
    },
    orderBy: { openedAt: "desc" },
  });
}

export async function processJournalEventPrisma(
  input: ProcessJournalEventInput,
  ingestionUserId?: string
): Promise<ProcessJournalEventResult> {
  const userId = ingestionUserId || (await resolveJournalIngestionUserId());
  const account = await ensureMt5TradingAccount(userId, input.account);
  const event = input.event;
  const sourceKey = getMt5ExternalTradeKey(event);
  const mt5Ticket = mt5TicketValue(sourceKey);
  const symbol = event.symbol?.trim().toUpperCase() || "UNKNOWN";
  const direction = toPrismaDirection(event.tradeType);
  const baseData = {
    userId,
    accountId: account.id,
    source: MT5_TRADE_SOURCE,
    mt5Ticket,
    symbol,
    direction,
    entryPrice: nullableDecimal(event.entryPrice),
    stopLoss: nullableDecimal(event.stopLoss),
    takeProfit: nullableDecimal(event.takeProfit),
    lotSize: nullableDecimal(event.lotSize),
    commission: nullableDecimal(event.commission),
    swap: nullableDecimal(event.swap),
  };

  if (
    event.eventType === "open" ||
    event.eventType === "pending_activated" ||
    event.eventType === "sync_recovered"
  ) {
    const existing = await findMt5Trade(account.id, sourceKey);

    if (existing) {
      const trade = await prisma.trade.update({
        where: { id: existing.id },
        data: {
          ...baseData,
          status: TradeStatus.OPEN,
          ...(existing.reviewStatus === TradeReviewStatus.REVIEWED
            ? {}
            : { reviewStatus: TradeReviewStatus.NEEDS_REVIEW }),
          exitPrice: null,
          profitLoss: null,
          rr: null,
          openedAt: event.eventTime,
          closedAt: null,
        },
      });

      return { success: true, duplicate: false, tradeId: trade.id };
    }

    const trade = await prisma.trade.create({
      data: {
        ...baseData,
        status: TradeStatus.OPEN,
        reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
        openedAt: event.eventTime,
      },
    });

    return { success: true, duplicate: false, tradeId: trade.id };
  }

  const existing =
    (await findMt5Trade(account.id, sourceKey)) ||
    (await findFallbackOpenMt5Trade(account.id, event));
  const isFinalClose = event.eventType === "close";
  const status = isFinalClose ? TradeStatus.CLOSED : TradeStatus.OPEN;
  const metrics = calculateTradeMetrics({
    status,
    direction: existing?.direction || direction,
    entryPrice: existing?.entryPrice ?? event.entryPrice,
    exitPrice: event.closePrice,
    stopLoss: existing?.stopLoss ?? event.stopLoss,
    lotSize: existing?.lotSize ?? event.lotSize,
    profitLoss: event.profit,
  });
  const closeData = {
    symbol,
    direction: existing?.direction || direction,
    status,
    exitPrice: nullableDecimalOrNull(event.closePrice),
    stopLoss: nullableDecimal(event.stopLoss),
    takeProfit: nullableDecimal(event.takeProfit),
    lotSize: nullableDecimal(event.lotSize),
    profitLoss: nullableDecimalOrNull(event.profit),
    commission: nullableDecimal(event.commission),
    swap: nullableDecimal(event.swap),
    rr: metrics.rr,
    source: MT5_TRADE_SOURCE,
    mt5Ticket,
    ...(existing?.reviewStatus === TradeReviewStatus.REVIEWED
      ? {}
      : { reviewStatus: TradeReviewStatus.NEEDS_REVIEW }),
    closedAt: isFinalClose ? event.eventTime : null,
  };

  if (existing) {
    const trade = await prisma.trade.update({
      where: { id: existing.id },
      data: closeData,
    });

    return { success: true, duplicate: false, tradeId: trade.id };
  }

  const trade = await prisma.trade.create({
    data: {
      ...baseData,
      status,
      reviewStatus: TradeReviewStatus.NEEDS_REVIEW,
      entryPrice: nullableDecimal(event.entryPrice),
      exitPrice: nullableDecimal(event.closePrice),
      profitLoss: nullableDecimal(event.profit) ?? metrics.profitLoss,
      rr: metrics.rr,
      openedAt: event.openTime ?? null,
      closedAt: isFinalClose ? event.eventTime : null,
    },
  });

  return { success: true, duplicate: false, tradeId: trade.id };
}

export async function saveMt5ScreenshotToPrismaTrade(input: {
  accountNumber: string;
  broker: string;
  serverName: string;
  positionId: string;
  type: string;
  imageUrl: string;
  userId?: string;
}) {
  const userId = input.userId || (await resolveJournalIngestionUserId());
  const account = await prisma.tradingAccount.findFirst({
    where: {
      userId,
      name: input.accountNumber,
      broker: input.broker,
      platform: input.serverName,
    },
  });

  if (!account) {
    return false;
  }

  const trade = await findMt5Trade(account.id, `${MT5_SETUP_PREFIX}${input.positionId}`);

  if (!trade) {
    return false;
  }

  const type = normalizeScreenshotType(input.type);
  const existing = await prisma.tradeScreenshot.findFirst({
    where: {
      tradeId: trade.id,
      type: {
        equals: type,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    await prisma.tradeScreenshot.update({
      where: {
        id: existing.id,
      },
      data: {
        type,
        url: input.imageUrl,
      },
    });
    return true;
  }

  await prisma.tradeScreenshot.create({
    data: {
      userId,
      tradeId: trade.id,
      type,
      url: input.imageUrl,
    },
  });

  return true;
}

export function buildTradeWhere(searchParams: URLSearchParams) {
  const where: Prisma.TradeWhereInput = {};
  const errors: string[] = [];
  const accountId = searchParams.get("accountId");
  const ticket = searchParams.get("ticket") || searchParams.get("mt5Ticket");
  const symbol = searchParams.get("symbol");
  const source = searchParams.get("source");
  const side = searchParams.get("side") || searchParams.get("direction") || searchParams.get("type");
  const status = searchParams.get("status");
  const userId = searchParams.get("userId");
  const dateFrom = parseDate(searchParams.get("dateFrom") || searchParams.get("from"));
  const dateTo = parseDate(searchParams.get("dateTo") || searchParams.get("to"));

  if (userId) {
    where.userId = userId;
  }

  if (accountId) {
    where.accountId = accountId;
  }

  if (ticket) {
    where.mt5Ticket = { contains: ticket.trim(), mode: "insensitive" };
  }

  if (symbol) {
    where.symbol = { contains: symbol.trim(), mode: "insensitive" };
  }

  if (source) {
    const normalizedSource = source.trim().toUpperCase();

    if (normalizedSource === "MANUAL") {
      where.source = { equals: MANUAL_TRADE_SOURCE, mode: "insensitive" };
    } else if (normalizedSource === "MT5") {
      where.source = {
        in: [MT5_TRADE_SOURCE, EA_IMPORT_TRADE_SOURCE, MT5_HTML_IMPORT_SOURCE, "MT5_EA"],
      };
    } else if (normalizedSource === "EXCEL") {
      where.source = { equals: EXCEL_JOURNAL_IMPORT_SOURCE };
    } else {
      where.source = { equals: source.trim(), mode: "insensitive" };
    }
  }

  if (side) {
    const direction = parseDirection(side);

    if (!direction) {
      errors.push("side must be BUY or SELL");
    } else {
      where.direction = direction;
    }
  }

  if (status) {
    const parsedStatus = parseStatus(status);

    if (!parsedStatus) {
      errors.push("status must be OPEN, CLOSED, or CANCELLED");
    } else {
      where.status = parsedStatus;
    }
  }

  if (dateFrom === null) {
    errors.push("dateFrom must be a valid date");
  }

  if (dateTo === null) {
    errors.push("dateTo must be a valid date");
  }

  if (dateFrom || dateTo) {
    where.openedAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  return { where, errors };
}

export function getPagination(searchParams: URLSearchParams) {
  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 50), 100);
  const totalPages = (total: number) => Math.max(Math.ceil(total / limit), 1);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    totalPages,
  };
}

export function buildManualTradeCreateData(
  body: Record<string, unknown>
): BuildCreateResult {
  const errors: string[] = [];
  const symbol = optionalString(body.symbol);
  const direction = parseDirection(
    firstDefined(body, ["side", "direction", "type"])
  );
  const statusInput = body.status;
  const parsedStatus = parseStatus(statusInput);
  const status =
    statusInput === undefined || statusInput === null || statusInput === ""
      ? TradeStatus.OPEN
      : parsedStatus;
  const entryPrice = parseRequiredDecimal(
    firstDefined(body, ["entryPrice", "entry"]),
    "entryPrice",
    errors
  );
  const openedAt = parseRequiredDate(
    firstDefined(body, ["entryTime", "openedAt", "openTime"]),
    "entryTime",
    errors
  );
  const exitPrice = parseOptionalDecimal(
    firstDefined(body, ["exitPrice", "exit"]),
    "exitPrice",
    errors
  );
  const profitLoss = parseOptionalDecimal(
    firstDefined(body, ["profitLoss", "pnl"]),
    "profitLoss",
    errors
  );
  const lotSize = parseOptionalDecimal(
    firstDefined(body, ["lotSize", "volume"]),
    "lotSize",
    errors
  );
  const closedAt = parseOptionalDate(
    firstDefined(body, ["exitTime", "closedAt", "closeTime"]),
    "exitTime",
    errors
  );

  if (!symbol) {
    errors.push("symbol is required");
  }

  if (!direction) {
    errors.push("side must be BUY or SELL");
  }

  if (!status) {
    errors.push("status must be OPEN, CLOSED, or CANCELLED");
  }

  const stopLoss = parseOptionalDecimal(body.stopLoss, "stopLoss", errors);
  const takeProfit = parseOptionalDecimal(body.takeProfit, "takeProfit", errors);
  const riskAmount = parseOptionalDecimal(body.riskAmount, "riskAmount", errors);
  const commission = parseOptionalDecimal(body.commission, "commission", errors);
  const swap = parseOptionalDecimal(body.swap, "swap", errors);
  const rrInput = parseOptionalDecimal(body.rr, "rr", errors);

  if (errors.length > 0 || !symbol || !direction || !status || !entryPrice || !openedAt) {
    return { errors };
  }

  const metrics = calculateTradeMetrics({
    ...body,
    direction,
    status,
    entryPrice,
    exitPrice,
    stopLoss,
    lotSize,
    profitLoss,
  });

  return {
    data: {
      userId: String(body.userId || ""),
      accountId: optionalString(body.accountId) || undefined,
      symbol: symbol.toUpperCase(),
      direction,
      status,
      entryPrice,
      exitPrice,
      stopLoss,
      takeProfit,
      initialStopLoss: stopLoss,
      initialTakeProfit: takeProfit,
      currentStopLoss: stopLoss,
      currentTakeProfit: takeProfit,
      lotSize,
      riskAmount,
      profitLoss: profitLoss ?? metrics.profitLoss,
      commission,
      swap,
      rr: rrInput ?? metrics.rr,
      source: MANUAL_TRADE_SOURCE,
      mt5Ticket: optionalString(body.mt5Ticket),
      setup: optionalString(body.setup) || optionalString(body.strategy),
      session: getTradingSessionLabel(openedAt) || normalizeTradingSession(body.session),
      emotion: optionalString(body.emotion),
      mistake: optionalString(firstDefined(body, ["mistakes", "mistake"])),
      notes: optionalString(body.notes),
      openedAt,
      closedAt,
    },
  };
}

export function buildManualTradeUpdateData(
  body: Record<string, unknown>
): BuildUpdateResult {
  const errors: string[] = [];
  const data: Prisma.TradeUncheckedUpdateInput = {};
  const directionValue = firstDefined(body, ["side", "direction", "type"]);
  const openedAtValue = firstDefined(body, ["entryTime", "openedAt", "openTime"]);
  const closedAtValue = firstDefined(body, ["exitTime", "closedAt", "closeTime"]);

  if (directionValue !== undefined) {
    const direction = parseDirection(directionValue);

    if (!direction) {
      errors.push("side must be BUY or SELL");
    } else {
      data.direction = direction;
    }
  }

  if (body.status !== undefined) {
    const status = parseStatus(body.status);

    if (!status) {
      errors.push("status must be OPEN, CLOSED, or CANCELLED");
    } else {
      data.status = status;
    }
  }

  if (openedAtValue !== undefined) {
    data.openedAt = parseOptionalDate(openedAtValue, "entryTime", errors);
    data.session = getTradingSessionLabel(data.openedAt as Date | null);
  }

  if (closedAtValue !== undefined) {
    data.closedAt = parseOptionalDate(closedAtValue, "exitTime", errors);
  }

  if (body.symbol !== undefined) {
    const symbol = optionalString(body.symbol);
    data.symbol = symbol ? symbol.toUpperCase() : "";
  }

  if (body.accountId !== undefined) {
    const accountId = optionalString(body.accountId);
    data.accountId = accountId || undefined;
  }

  if (body.mt5Ticket !== undefined) {
    data.mt5Ticket = optionalString(body.mt5Ticket);
  }

  for (const [field, value] of [
    ["entryPrice", firstDefined(body, ["entryPrice", "entry"])],
    ["exitPrice", firstDefined(body, ["exitPrice", "exit"])],
    ["stopLoss", body.stopLoss],
    ["takeProfit", body.takeProfit],
    ["lotSize", firstDefined(body, ["lotSize", "volume"])],
    ["riskAmount", body.riskAmount],
    ["profitLoss", firstDefined(body, ["profitLoss", "pnl"])],
    ["commission", body.commission],
    ["swap", body.swap],
    ["rr", body.rr],
  ] as const) {
    if (value !== undefined) {
      data[field] = parseOptionalDecimal(value, field, errors);
    }
  }

  if (body.stopLoss !== undefined) {
    data.currentStopLoss = data.stopLoss;
  }

  if (body.takeProfit !== undefined) {
    data.currentTakeProfit = data.takeProfit;
  }

  for (const [field, value] of [
    ["setup", body.setup ?? body.strategy],
    ["emotion", body.emotion],
    ["mistake", firstDefined(body, ["mistakes", "mistake"])],
    ["notes", body.notes],
  ] as const) {
    if (value !== undefined) {
      data[field] = optionalString(value);
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  return { data };
}

export function lockImportedBrokerUpdate(
  existing: { source?: string | null; setup?: string | null },
  data: Prisma.TradeUncheckedUpdateInput
) {
  return isImportedTradeSource(existing.source, existing.setup)
    ? (stripBrokerDataFields(data as Record<string, unknown>) as Prisma.TradeUncheckedUpdateInput)
    : data;
}
