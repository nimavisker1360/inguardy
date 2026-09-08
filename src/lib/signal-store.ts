import {
  Prisma,
  WebsiteSignalCloseReason,
  WebsiteSignalDirection,
  WebsiteSignalStatus,
  type WebsiteSignal,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  formatSignalDateGroupLabel,
  formatSignalTimestamp,
  getSignalDateKey,
  getSignalDayRange,
  getSignalWeekRange,
  parseSignalDateTime,
} from "@/lib/signal-time";
import type {
  DailySignalSummary,
  DisplaySignal,
  SignalDateFilter,
  SignalListResponse,
  SignalQueryOptions,
  SignalStatusFilter,
  SignalSummary,
} from "@/lib/signal-types";

type SignalType = "BUY" | "SELL";
type SignalStatus = "OPEN" | "CLOSED";
type SignalCloseReason = "TP" | "SL";

type IncomingSignal = {
  id?: unknown;
  signalId?: unknown;
  signal?: unknown;
  data?: unknown;
  payload?: unknown;
  ticket?: unknown;
  positionId?: unknown;
  position_id?: unknown;
  orderId?: unknown;
  symbol?: unknown;
  pair?: unknown;
  instrument?: unknown;
  market?: unknown;
  type?: unknown;
  side?: unknown;
  action?: unknown;
  direction?: unknown;
  orderType?: unknown;
  order_type?: unknown;
  entry?: unknown;
  entryPrice?: unknown;
  entry_price?: unknown;
  openPrice?: unknown;
  open_price?: unknown;
  price?: unknown;
  sl?: unknown;
  stopLoss?: unknown;
  stop_loss?: unknown;
  tp?: unknown;
  takeProfit?: unknown;
  take_profit?: unknown;
  tp1?: unknown;
  targets?: unknown;
  tps?: unknown;
  timeframe?: unknown;
  source?: unknown;
  status?: unknown;
  isOpen?: unknown;
  closeReason?: unknown;
  closedBy?: unknown;
  result?: unknown;
  outcome?: unknown;
  hit?: unknown;
  reason?: unknown;
  closePrice?: unknown;
  closedPrice?: unknown;
  exitPrice?: unknown;
  exit?: unknown;
  createdAt?: unknown;
  openedAt?: unknown;
  opened_at?: unknown;
  openTime?: unknown;
  open_time?: unknown;
  openTimestamp?: unknown;
  timestamp?: unknown;
  time?: unknown;
  datetime?: unknown;
  date?: unknown;
  closedAt?: unknown;
  closed_at?: unknown;
  closeTime?: unknown;
  close_time?: unknown;
  closeTimestamp?: unknown;
};

type DerivedCloseOutcome = {
  closeReason: SignalCloseReason;
  closePrice: number;
  closedAt: Date;
};

export class SignalValidationError extends Error {}

const DERIVED_STATUS_LOOKBACK_LIMIT = 1000;
const DERIVED_PRICE_TRAIL_LIMIT = 2000;

function hasValue(value: unknown) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getStringValue(...values: unknown[]) {
  for (const value of values) {
    if (hasValue(value)) {
      return String(value).trim();
    }
  }

  return "";
}

function getNestedSignalPayload(rawSignal: unknown): unknown {
  if (!rawSignal || typeof rawSignal !== "object" || Array.isArray(rawSignal)) {
    return rawSignal;
  }

  const signalInput = rawSignal as IncomingSignal;

  for (const value of [
    signalInput.signal,
    signalInput.data,
    signalInput.payload,
  ]) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
  }

  return rawSignal;
}

function parseNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseOptionalNumber(...values: unknown[]) {
  for (const value of values) {
    if (!hasValue(value)) {
      continue;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return undefined;
}

function getArrayFirstNumber(value: unknown) {
  return Array.isArray(value) ? parseOptionalNumber(...value) : undefined;
}

function normalizeText(value: unknown) {
  if (!hasValue(value)) {
    return "";
  }

  return String(value).trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function normalizeType(value: unknown): SignalType | null {
  const type = normalizeText(value);

  if (type === "BUY" || type === "LONG" || type === "BULLISH") {
    return "BUY";
  }

  if (type === "SELL" || type === "SHORT" || type === "BEARISH") {
    return "SELL";
  }

  return null;
}

function normalizeDirectionFilter(value: unknown): SignalType | undefined {
  return normalizeType(value) ?? undefined;
}

function normalizeStatusFilter(value: unknown): SignalStatusFilter {
  const status = normalizeText(value);

  if (status === "OPEN") {
    return "open";
  }

  if (status === "CLOSED") {
    return "closed";
  }

  if (status === "TP" || status === "TP_HIT" || status === "TAKE_PROFIT") {
    return "tp";
  }

  if (status === "SL" || status === "SL_HIT" || status === "STOP_LOSS") {
    return "sl";
  }

  return "all";
}

function normalizeDateFilter(value: unknown): SignalDateFilter {
  const date = normalizeText(value);

  if (date === "TODAY") {
    return "today";
  }

  if (date === "YESTERDAY") {
    return "yesterday";
  }

  if (date === "WEEK" || date === "THIS_WEEK") {
    return "week";
  }

  return "all";
}

function normalizeCloseReason(...values: unknown[]): SignalCloseReason | undefined {
  for (const value of values) {
    const text = normalizeText(value);
    const compact = text.replace(/_/g, "");

    if (!text) {
      continue;
    }

    if (
      compact === "TP" ||
      compact.includes("TAKEPROFIT") ||
      compact.includes("TARGET") ||
      compact.includes("TPHIT") ||
      text === "PROFIT" ||
      text === "WIN" ||
      text === "SUCCESS" ||
      text === "SUCCESSFUL"
    ) {
      return "TP";
    }

    if (
      compact === "SL" ||
      compact.includes("STOPLOSS") ||
      compact.includes("STOP") ||
      compact.includes("SLHIT") ||
      text === "LOSS" ||
      text === "LOSE" ||
      text === "FAIL" ||
      text === "FAILED" ||
      text === "UNSUCCESSFUL"
    ) {
      return "SL";
    }
  }

  return undefined;
}

function normalizeStatus(value: unknown): SignalStatus | null {
  const status = normalizeText(value);

  if (status === "OPEN" || status === "ACTIVE" || status === "RUNNING") {
    return "OPEN";
  }

  if (
    status === "CLOSED" ||
    status === "CLOSE" ||
    status === "CLOSE_POSITION" ||
    status === "DONE" ||
    status === "FINISHED" ||
    normalizeCloseReason(value)
  ) {
    return "CLOSED";
  }

  return null;
}

function isExplicitlyClosedFlag(value: unknown) {
  if (value === false) {
    return true;
  }

  const text = normalizeText(value);
  return text === "FALSE" || text === "NO" || text === "0" || text === "CLOSED";
}

function getSignalSymbol(signalInput: IncomingSignal) {
  return getStringValue(
    signalInput.symbol,
    signalInput.pair,
    signalInput.instrument,
    signalInput.market
  );
}

function getSignalTypeValue(signalInput: IncomingSignal) {
  return getStringValue(
    signalInput.type,
    signalInput.side,
    signalInput.action,
    signalInput.direction,
    signalInput.orderType,
    signalInput.order_type
  );
}

function getSignalEntryValue(signalInput: IncomingSignal) {
  return getStringValue(
    signalInput.entry,
    signalInput.entryPrice,
    signalInput.entry_price,
    signalInput.openPrice,
    signalInput.open_price,
    signalInput.price
  );
}

function getSignalStopLossValue(signalInput: IncomingSignal) {
  return getStringValue(
    signalInput.sl,
    signalInput.stopLoss,
    signalInput.stop_loss
  );
}

function getSignalTakeProfitValue(signalInput: IncomingSignal) {
  return getStringValue(
    signalInput.tp,
    signalInput.takeProfit,
    signalInput.take_profit,
    signalInput.tp1,
    getArrayFirstNumber(signalInput.targets),
    getArrayFirstNumber(signalInput.tps)
  );
}

function getCloseReason(signalInput: IncomingSignal) {
  return normalizeCloseReason(
    signalInput.closeReason,
    signalInput.closedBy,
    signalInput.result,
    signalInput.outcome,
    signalInput.hit,
    signalInput.reason,
    signalInput.status
  );
}

function isCloseSignal(signalInput: IncomingSignal) {
  return (
    normalizeStatus(signalInput.status) === "CLOSED" ||
    getCloseReason(signalInput) !== undefined ||
    isExplicitlyClosedFlag(signalInput.isOpen)
  );
}

function getTicket(signalInput: IncomingSignal) {
  return getStringValue(
    signalInput.ticket,
    signalInput.positionId,
    signalInput.position_id,
    signalInput.orderId
  );
}

function getSignalId(signalInput: IncomingSignal) {
  return getStringValue(signalInput.signalId, signalInput.id) || undefined;
}

function getFirstSignalDate(...values: unknown[]) {
  for (const value of values) {
    const date = parseSignalDateTime(value);

    if (date) {
      return date;
    }
  }

  return undefined;
}

function getOpenedAt(signalInput: IncomingSignal) {
  return getFirstSignalDate(
    signalInput.openedAt,
    signalInput.opened_at,
    signalInput.openTime,
    signalInput.open_time,
    signalInput.openTimestamp,
    signalInput.timestamp,
    signalInput.datetime,
    signalInput.time,
    signalInput.createdAt,
    signalInput.date
  );
}

function getClosedAt(signalInput: IncomingSignal) {
  return getFirstSignalDate(
    signalInput.closedAt,
    signalInput.closed_at,
    signalInput.closeTime,
    signalInput.close_time,
    signalInput.closeTimestamp
  );
}

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase();
}

function getSymbolAliases(symbol: string) {
  const normalized = normalizeSymbol(symbol);
  const compact = normalized.replace(/[^A-Z0-9]/g, "");
  const aliases = [normalized];

  if (compact && compact !== normalized) {
    aliases.push(compact);
  }

  if (compact.length === 6) {
    aliases.push(`${compact.slice(0, 3)}/${compact.slice(3)}`);
  }

  return Array.from(new Set(aliases));
}

function decimal(value: number) {
  return new Prisma.Decimal(value);
}

function inferCloseReasonFromPrice(
  closePrice: number | undefined,
  signal: Pick<WebsiteSignal, "direction" | "takeProfit" | "stopLoss">
): SignalCloseReason | undefined {
  if (closePrice === undefined) {
    return undefined;
  }

  const takeProfit = Number(signal.takeProfit);
  const stopLoss = Number(signal.stopLoss);

  if (signal.direction === WebsiteSignalDirection.BUY) {
    if (closePrice >= takeProfit) {
      return "TP";
    }

    if (closePrice <= stopLoss) {
      return "SL";
    }
  }

  if (signal.direction === WebsiteSignalDirection.SELL) {
    if (closePrice <= takeProfit) {
      return "TP";
    }

    if (closePrice >= stopLoss) {
      return "SL";
    }
  }

  return undefined;
}

function formatPair(symbol: string) {
  const normalized = normalizeSymbol(symbol);

  if (normalized.includes("/")) {
    return normalized;
  }

  if (normalized.length === 6) {
    return `${normalized.slice(0, 3)}/${normalized.slice(3)}`;
  }

  return normalized;
}

function getDateRange(dateFilter: SignalDateFilter) {
  if (dateFilter === "today") {
    const { start, end } = getSignalDayRange();
    return { gte: start, lt: end };
  }

  if (dateFilter === "yesterday") {
    const { start, end } = getSignalDayRange(new Date(), -1);
    return { gte: start, lt: end };
  }

  if (dateFilter === "week") {
    const { start } = getSignalWeekRange();
    return { gte: start };
  }

  return undefined;
}

function getBaseFilter(includeTestSignals = false): Prisma.WebsiteSignalWhereInput {
  return includeTestSignals ? {} : { source: { not: "LOCAL_TEST" } };
}

function getSignalFilter(
  options: SignalQueryOptions,
  includeStatusFilter = true
): Prisma.WebsiteSignalWhereInput {
  const filter = getBaseFilter(options.includeTestSignals);
  const status = normalizeStatusFilter(options.status);
  const direction = normalizeDirectionFilter(options.direction);
  const dateRange = getDateRange(normalizeDateFilter(options.date));

  if (includeStatusFilter && status === "open") {
    filter.status = WebsiteSignalStatus.OPEN;
  } else if (includeStatusFilter && status === "closed") {
    filter.status = WebsiteSignalStatus.CLOSED;
  } else if (includeStatusFilter && status === "tp") {
    filter.status = WebsiteSignalStatus.CLOSED;
    filter.closeReason = WebsiteSignalCloseReason.TP;
  } else if (includeStatusFilter && status === "sl") {
    filter.status = WebsiteSignalStatus.CLOSED;
    filter.closeReason = WebsiteSignalCloseReason.SL;
  }

  if (options.symbol && normalizeText(options.symbol) !== "ALL") {
    filter.symbol = { in: getSymbolAliases(options.symbol) };
  }

  if (direction) {
    filter.direction =
      direction === "BUY" ? WebsiteSignalDirection.BUY : WebsiteSignalDirection.SELL;
  }

  if (dateRange) {
    filter.createdAt = dateRange;
  }

  return filter;
}

function toDisplaySignal(
  signal: WebsiteSignal,
  derivedOutcome?: DerivedCloseOutcome
): DisplaySignal {
  const closePrice = signal.closePrice ? Number(signal.closePrice) : undefined;
  const effectiveClosePrice = closePrice ?? derivedOutcome?.closePrice;
  const effectiveClosedAt = signal.closedAt ?? derivedOutcome?.closedAt;
  const closeReason =
    signal.closeReason ??
    derivedOutcome?.closeReason ??
    inferCloseReasonFromPrice(effectiveClosePrice, signal);
  const success =
    closeReason === "TP"
      ? true
      : closeReason === "SL"
        ? false
        : undefined;
  const effectiveStatus: SignalStatus =
    signal.status === WebsiteSignalStatus.CLOSED || closeReason ? "CLOSED" : "OPEN";

  return {
    id: signal.id,
    pair: formatPair(signal.symbol),
    type: signal.direction === WebsiteSignalDirection.BUY ? "buy" : "sell",
    direction: signal.direction,
    price: Number(signal.entry),
    takeProfit: [Number(signal.takeProfit)],
    stopLoss: Number(signal.stopLoss),
    timestamp: formatSignalTimestamp(signal.createdAt),
    success,
    pairColor: "text-white",
    isOpen: effectiveStatus === "OPEN",
    closeReason: closeReason ?? undefined,
    closePrice: effectiveClosePrice,
    closedAt: effectiveClosedAt?.toISOString(),
    createdAt: signal.createdAt.toISOString(),
    source: signal.source,
    status: effectiveStatus,
    timeframe: signal.timeframe,
    ticket: signal.ticket ?? undefined,
    resultSource:
      signal.resultSource === "PYTHON_MT5_TICKS"
        ? "python"
        : signal.closeReason
          ? "stored"
          : derivedOutcome
            ? "derived"
            : undefined,
  };
}

async function getDerivedCloseOutcomes(
  signals: WebsiteSignal[],
  includeTestSignals = false
) {
  const outcomes = new Map<string, DerivedCloseOutcome>();
  const openSignals = signals.filter(
    (signal) => signal.status === WebsiteSignalStatus.OPEN && !signal.closeReason
  );

  if (openSignals.length === 0) {
    return outcomes;
  }

  const symbols = Array.from(new Set(openSignals.map((signal) => signal.symbol)));
  const minCreatedAt = openSignals.reduce(
    (earliest, signal) =>
      signal.createdAt < earliest ? signal.createdAt : earliest,
    openSignals[0].createdAt
  );
  const priceTrail = await prisma.websiteSignal.findMany({
    where: {
      ...getBaseFilter(includeTestSignals),
      symbol: { in: symbols },
      createdAt: { gt: minCreatedAt },
    },
    orderBy: { createdAt: "asc" },
    take: DERIVED_PRICE_TRAIL_LIMIT,
  });

  for (const signal of openSignals) {
    const firstHit = priceTrail.find((pricePoint) => {
      if (
        pricePoint.symbol !== signal.symbol ||
        pricePoint.createdAt <= signal.createdAt ||
        pricePoint.id === signal.id
      ) {
        return false;
      }

      return inferCloseReasonFromPrice(Number(pricePoint.entry), signal);
    });

    if (!firstHit) {
      continue;
    }

    const closeReason = inferCloseReasonFromPrice(Number(firstHit.entry), signal);

    if (!closeReason) {
      continue;
    }

    outcomes.set(signal.id, {
      closeReason,
      closePrice: Number(firstHit.entry),
      closedAt: firstHit.createdAt,
    });
  }

  return outcomes;
}

async function toDisplaySignalsWithDerivedOutcomes(
  signals: WebsiteSignal[],
  includeTestSignals = false
) {
  const outcomes = await getDerivedCloseOutcomes(signals, includeTestSignals);

  return signals.map((signal) => toDisplaySignal(signal, outcomes.get(signal.id)));
}

function displaySignalMatchesStatus(
  signal: DisplaySignal,
  status: SignalStatusFilter
) {
  if (status === "all") {
    return true;
  }

  if (status === "open") {
    return signal.isOpen === true;
  }

  if (status === "closed") {
    return signal.isOpen === false;
  }

  if (status === "tp") {
    return signal.closeReason === "TP";
  }

  return signal.closeReason === "SL";
}

async function getSignalSummary(
  includeTestSignals = false
): Promise<SignalSummary> {
  const baseFilter = getBaseFilter(includeTestSignals);
  const todayRange = getDateRange("today");
  const recentSignals = await prisma.websiteSignal.findMany({
    where: baseFilter,
    orderBy: { createdAt: "desc" },
    take: DERIVED_STATUS_LOOKBACK_LIMIT,
  });
  const displaySignals = await toDisplaySignalsWithDerivedOutcomes(
    recentSignals,
    includeTestSignals
  );
  const today = await prisma.websiteSignal.count({
    where: {
      ...baseFilter,
      createdAt: todayRange!,
    },
  });

  return {
    today,
    open: displaySignals.filter((signal) => signal.isOpen).length,
    tpHit: displaySignals.filter((signal) => signal.closeReason === "TP").length,
    slHit: displaySignals.filter((signal) => signal.closeReason === "SL").length,
  };
}

function getPipSize(pair: string) {
  if (pair.includes("JPY")) {
    return 0.01;
  }

  if (pair.includes("XAU")) {
    return 0.1;
  }

  return 0.0001;
}

function getClosedSignalPips(signal: DisplaySignal) {
  if (signal.isOpen) {
    return undefined;
  }

  const exitPrice =
    signal.closePrice ??
    (signal.closeReason === "TP" ? signal.takeProfit[0] : undefined) ??
    (signal.closeReason === "SL" ? signal.stopLoss : undefined);
  const pipSize = getPipSize(signal.pair);

  if (exitPrice === undefined || !pipSize) {
    return undefined;
  }

  const rawMove =
    signal.type === "buy"
      ? exitPrice - signal.price
      : signal.price - exitPrice;

  return rawMove / pipSize;
}

function buildDailySignalSummaries(
  signals: DisplaySignal[]
): DailySignalSummary[] {
  const groups = new Map<string, DailySignalSummary>();

  for (const signal of signals) {
    const createdAt = signal.createdAt ? new Date(signal.createdAt) : undefined;

    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      continue;
    }

    const dateKey = getSignalDateKey(createdAt);
    const current =
      groups.get(dateKey) ?? {
        dateKey,
        label: formatSignalDateGroupLabel(createdAt),
        signalCount: 0,
        open: 0,
        tpHit: 0,
        slHit: 0,
        profitPips: 0,
        lossPips: 0,
        netPips: 0,
      };
    const pips = getClosedSignalPips(signal);

    current.signalCount += 1;
    current.open += signal.isOpen ? 1 : 0;
    current.tpHit += signal.closeReason === "TP" ? 1 : 0;
    current.slHit += signal.closeReason === "SL" ? 1 : 0;

    if (pips !== undefined && Number.isFinite(pips)) {
      current.netPips += pips;

      if (pips >= 0) {
        current.profitPips += pips;
      } else {
        current.lossPips += Math.abs(pips);
      }
    }

    groups.set(dateKey, current);
  }

  return Array.from(groups.values()).sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey)
  );
}

async function getDailySignalSummaries(
  filter: Prisma.WebsiteSignalWhereInput,
  status: SignalStatusFilter,
  includeTestSignals = false
) {
  const candidates = await prisma.websiteSignal.findMany({
    where: filter,
    orderBy: { createdAt: "desc" },
    take: DERIVED_STATUS_LOOKBACK_LIMIT,
  });
  const displaySignals = await toDisplaySignalsWithDerivedOutcomes(
    candidates,
    includeTestSignals
  );
  const filteredSignals = displaySignals.filter((signal) =>
    displaySignalMatchesStatus(signal, status)
  );

  return buildDailySignalSummaries(filteredSignals);
}

function getClosedSignalFallback(
  signalInput: IncomingSignal,
  closeReason: SignalCloseReason | undefined,
  closePrice: number | undefined,
  closedAt: Date
) {
  if (
    !getSignalSymbol(signalInput) ||
    !hasValue(getSignalEntryValue(signalInput)) ||
    !hasValue(getSignalStopLossValue(signalInput)) ||
    !hasValue(getSignalTakeProfitValue(signalInput))
  ) {
    return null;
  }

  const type = normalizeType(getSignalTypeValue(signalInput));

  if (!type) {
    return null;
  }

  const ticket = getTicket(signalInput);
  const fallback = {
    symbol: normalizeSymbol(getSignalSymbol(signalInput)),
    direction:
      type === "BUY" ? WebsiteSignalDirection.BUY : WebsiteSignalDirection.SELL,
    entry: decimal(parseNumber(getSignalEntryValue(signalInput))),
    stopLoss: decimal(parseNumber(getSignalStopLossValue(signalInput))),
    takeProfit: decimal(parseNumber(getSignalTakeProfitValue(signalInput))),
    timeframe: String(signalInput.timeframe || ""),
    source: String(signalInput.source || "UNKNOWN"),
    status: WebsiteSignalStatus.CLOSED,
    ticket: ticket || undefined,
    closeReason:
      closeReason === "TP"
        ? WebsiteSignalCloseReason.TP
        : closeReason === "SL"
          ? WebsiteSignalCloseReason.SL
          : undefined,
    closePrice: closePrice !== undefined ? decimal(closePrice) : undefined,
    createdAt: getOpenedAt(signalInput) ?? closedAt,
    closedAt,
  };

  return fallback;
}

export async function createTradingSignal(rawSignal: unknown) {
  if (!rawSignal || typeof rawSignal !== "object") {
    throw new SignalValidationError("Signal payload must be a JSON object");
  }

  const signalInput = rawSignal as IncomingSignal;
  const symbol = getSignalSymbol(signalInput);
  const typeValue = getSignalTypeValue(signalInput);

  if (!symbol) {
    throw new SignalValidationError("symbol is required");
  }

  if (!typeValue) {
    throw new SignalValidationError("type is required");
  }

  const type = normalizeType(typeValue);

  if (!type) {
    throw new SignalValidationError("type must be BUY or SELL");
  }

  const ticket = getTicket(signalInput);
  const signal = await prisma.websiteSignal.create({
    data: {
      symbol: normalizeSymbol(symbol),
      direction:
        type === "BUY" ? WebsiteSignalDirection.BUY : WebsiteSignalDirection.SELL,
      entry: decimal(parseNumber(getSignalEntryValue(signalInput))),
      stopLoss: decimal(parseNumber(getSignalStopLossValue(signalInput))),
      takeProfit: decimal(parseNumber(getSignalTakeProfitValue(signalInput))),
      timeframe: String(signalInput.timeframe || ""),
      source: String(signalInput.source || "UNKNOWN"),
      status: WebsiteSignalStatus.OPEN,
      ticket: ticket || undefined,
      createdAt: getOpenedAt(signalInput) ?? new Date(),
    },
  });

  return toDisplaySignal(signal);
}

export async function closeTradingSignal(rawSignal: unknown) {
  if (!rawSignal || typeof rawSignal !== "object") {
    throw new SignalValidationError("Signal payload must be a JSON object");
  }

  const signalInput = rawSignal as IncomingSignal;
  const closeReason = getCloseReason(signalInput);
  const closePrice = parseOptionalNumber(
    signalInput.closePrice,
    signalInput.closedPrice,
    signalInput.exitPrice,
    signalInput.exit,
    closeReason === "TP" ? getSignalTakeProfitValue(signalInput) : undefined,
    closeReason === "SL" ? getSignalStopLossValue(signalInput) : undefined
  );
  const closedAt = getClosedAt(signalInput) ?? new Date();
  const filters: Prisma.WebsiteSignalWhereInput[] = [];
  const signalId = getSignalId(signalInput);
  const ticket = getTicket(signalInput);

  if (signalId) {
    filters.push({ id: signalId });
  }

  if (ticket) {
    filters.push({ ticket, status: WebsiteSignalStatus.OPEN });
  }

  const symbol = getSignalSymbol(signalInput);

  if (symbol) {
    const type = normalizeType(getSignalTypeValue(signalInput));
    filters.push({
      symbol: { in: getSymbolAliases(symbol) },
      ...(type
        ? {
            direction:
              type === "BUY"
                ? WebsiteSignalDirection.BUY
                : WebsiteSignalDirection.SELL,
          }
        : {}),
      status: WebsiteSignalStatus.OPEN,
    });
  }

  for (const filter of filters) {
    const existingSignal = await prisma.websiteSignal.findFirst({
      where: filter,
      orderBy: { createdAt: "desc" },
    });

    if (!existingSignal) {
      continue;
    }

    const resolvedCloseReason =
      closeReason ?? inferCloseReasonFromPrice(closePrice, existingSignal);
    const signal = await prisma.websiteSignal.update({
      where: { id: existingSignal.id },
      data: {
        status: WebsiteSignalStatus.CLOSED,
        closedAt,
        closeReason:
          resolvedCloseReason === "TP"
            ? WebsiteSignalCloseReason.TP
            : resolvedCloseReason === "SL"
              ? WebsiteSignalCloseReason.SL
              : undefined,
        closePrice: closePrice !== undefined ? decimal(closePrice) : undefined,
      },
    });

    return toDisplaySignal(signal);
  }

  const fallbackSignal = getClosedSignalFallback(
    signalInput,
    closeReason,
    closePrice,
    closedAt
  );

  if (fallbackSignal) {
    const signal = await prisma.websiteSignal.create({ data: fallbackSignal });
    return toDisplaySignal(signal);
  }

  throw new SignalValidationError("No open signal found to close");
}

export async function saveTradingSignal(rawSignal: unknown) {
  const payload = getNestedSignalPayload(rawSignal);

  if (!payload || typeof payload !== "object") {
    throw new SignalValidationError("Signal payload must be a JSON object");
  }

  const signalInput = payload as IncomingSignal;

  if (isCloseSignal(signalInput)) {
    return closeTradingSignal(signalInput);
  }

  return createTradingSignal(signalInput);
}

export async function getTradingSignalsPage(
  options: SignalQueryOptions = {}
): Promise<SignalListResponse> {
  const limit = Math.min(Math.max(options.limit ?? 12, 1), 50);
  const page = Math.max(options.page ?? 1, 1);
  const status = normalizeStatusFilter(options.status);
  const useDerivedStatusFilter = status !== "all";
  const filter = getSignalFilter(options, !useDerivedStatusFilter);
  const summaryPromise = getSignalSummary(options.includeTestSignals);

  if (useDerivedStatusFilter) {
    const candidates = await prisma.websiteSignal.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: DERIVED_STATUS_LOOKBACK_LIMIT,
    });
    const displayCandidates = await toDisplaySignalsWithDerivedOutcomes(
      candidates,
      options.includeTestSignals
    );
    const filteredSignals = displayCandidates.filter((signal) =>
      displaySignalMatchesStatus(signal, status)
    );
    const total = filteredSignals.length;
    const totalPages = Math.max(Math.ceil(total / limit), 1);
    const summary = await summaryPromise;

    return {
      signals: filteredSignals.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
      summary,
      dailySummaries: buildDailySignalSummaries(filteredSignals),
    };
  }

  const [signals, total, summary, dailySummaries] = await Promise.all([
    prisma.websiteSignal.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.websiteSignal.count({ where: filter }),
    summaryPromise,
    getDailySignalSummaries(filter, status, options.includeTestSignals),
  ]);
  const displaySignals = await toDisplaySignalsWithDerivedOutcomes(
    signals,
    options.includeTestSignals
  );
  const totalPages = Math.max(Math.ceil(total / limit), 1);

  return {
    signals: displaySignals,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
    summary,
    dailySummaries,
  };
}

export async function getTradingSignals(
  limit = 100,
  includeTestSignals = false
) {
  const signals = await prisma.websiteSignal.findMany({
    where: getBaseFilter(includeTestSignals),
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return toDisplaySignalsWithDerivedOutcomes(signals, includeTestSignals);
}
