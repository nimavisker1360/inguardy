import { z } from "zod";
import type {
  JournalEntrySource,
  JournalEvent,
  JournalEventInput,
  JournalScreenshotStatus,
  JournalSourceType,
  JournalTrade,
  JournalTradeInput,
  JournalTradeResult,
  JournalTradeStatus,
  JournalTradeType,
  Psychology,
} from "@/lib/journal/types";

export class JournalValidationError extends Error {}

const nullableNumberSchema = z
  .union([z.number().finite(), z.null()])
  .optional()
  .transform((value) => value ?? null);
const nullableStringSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => value ?? null);
const emptyStringToUndefined = (value: unknown) =>
  value === "" ? undefined : value;

export const journalEventRequestSchema = z.object({
  uploadSecret: z.string().min(1),
  account: z.object({
    accountNumber: z.string().trim().min(1),
    broker: z.string().trim().min(1),
    serverName: z.string().trim().min(1),
    balance: z.number().finite().optional(),
    equity: z.number().finite().optional(),
    freeMargin: z.number().finite().optional(),
    currency: z.string().trim().optional(),
  }),
  event: z
    .object({
      eventType: z.enum([
        "open",
        "pending_activated",
        "partial_close",
        "close",
        "sync_recovered",
      ]),
      idempotencyKey: z.string().trim().min(1),
      ticket: nullableStringSchema,
      positionId: nullableStringSchema,
      orderTicket: nullableStringSchema,
      dealTicket: nullableStringSchema,
      symbol: nullableStringSchema,
      tradeType: z.union([z.enum(["buy", "sell"]), z.null()]).optional(),
      lotSize: nullableNumberSchema,
      entryPrice: nullableNumberSchema,
      closePrice: nullableNumberSchema,
      stopLoss: nullableNumberSchema,
      takeProfit: nullableNumberSchema,
      profit: nullableNumberSchema,
      commission: nullableNumberSchema,
      swap: nullableNumberSchema,
      magicNumber: nullableNumberSchema,
      comment: nullableStringSchema,
      sourceType: z
        .union([z.enum(["manual", "expert_advisor", "bot", "unknown"]), z.null()])
        .optional(),
      entrySource: z
        .union([
          z.enum([
            "market_order",
            "pending_order_activation",
            "manual_trade",
            "expert_advisor",
            "unknown",
          ]),
          z.null(),
        ])
        .optional(),
      timeframe: nullableStringSchema,
      spread: nullableNumberSchema,
      atr: nullableNumberSchema,
      rsi: nullableNumberSchema,
      session: nullableStringSchema,
      entryScreenshotStatus: nullableStringSchema,
      exitScreenshotStatus: nullableStringSchema,
      openTime: z.coerce.date().nullable().optional(),
      eventTime: z.coerce.date(),
    })
    .passthrough(),
});

export const journalTradeQuerySchema = z.object({
  symbol: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(["open", "partially_closed", "closed"]).optional()
  ),
  result: z.preprocess(
    emptyStringToUndefined,
    z.enum(["win", "loss", "breakeven", "open"]).optional()
  ),
  tradeType: z.preprocess(
    emptyStringToUndefined,
    z.enum(["buy", "sell"]).optional()
  ),
  dateFrom: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  dateTo: z.preprocess(emptyStringToUndefined, z.coerce.date().optional()),
  page: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().optional()
  ),
  limit: z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().max(200).optional()
  ),
});

export const journalPsychologySchema = z.object({
  confidenceScore: nullableNumberSchema,
  emotionBefore: nullableStringSchema,
  emotionAfter: nullableStringSchema,
  followedPlan: z
    .union([z.boolean(), z.literal("partially"), z.null()])
    .optional()
    .transform((value) => value ?? null),
  mistakeTag: nullableStringSchema,
  entryReason: nullableStringSchema,
  personalNote: nullableStringSchema,
  lessonLearned: nullableStringSchema,
});

export const journalTagsSchema = z.object({
  tags: z
    .array(z.string().trim().min(1))
    .max(50)
    .transform((tags) => Array.from(new Set(tags))),
});

export const journalScreenshotRequestSchema = z.object({
  uploadSecret: z.string().min(1),
  accountNumber: z.string().trim().min(1),
  broker: z.string().trim().min(1),
  serverName: z.string().trim().min(1),
  positionId: z.string().trim().min(1),
  dealTicket: z.string().trim().min(1),
  type: z.enum(["entry", "exit"]),
  capturedAt: z.coerce.date(),
  status: z.string().trim().min(1),
  imageBase64: z.string().min(1),
});

const TRADE_TYPES = new Set<JournalTradeType>(["buy", "sell"]);
const SOURCE_TYPES = new Set<JournalSourceType>([
  "manual",
  "expert_advisor",
  "bot",
  "unknown",
]);
const ENTRY_SOURCES = new Set<JournalEntrySource>([
  "market_order",
  "pending_order_activation",
  "manual_trade",
  "expert_advisor",
  "unknown",
]);
const RESULTS = new Set<JournalTradeResult>([
  "win",
  "loss",
  "breakeven",
  "open",
]);
const STATUSES = new Set<JournalTradeStatus>([
  "open",
  "partially_closed",
  "closed",
]);
const SCREENSHOT_STATUSES = new Set<JournalScreenshotStatus>([
  "pending",
  "captured",
  "uploaded",
  "failed",
  "disabled",
  "not_requested",
]);

function hasText(value: unknown) {
  return typeof value === "string" && value.trim() !== "";
}

function requiredString(value: unknown, fieldName: string) {
  if (!hasText(value)) {
    throw new JournalValidationError(`${fieldName} is required`);
  }

  return String(value).trim();
}

function nullableString(value: unknown) {
  return hasText(value) ? String(value).trim() : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function nullableBoolean(value: unknown) {
  if (value === "partially") {
    return value;
  }

  return typeof value === "boolean" ? value : null;
}

function nullableDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredDate(value: unknown, fieldName: string) {
  const date = nullableDate(value);

  if (!date) {
    throw new JournalValidationError(`${fieldName} must be a valid date`);
  }

  return date;
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: Set<T>,
  fallback: T
) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_") as T;

  return allowed.has(normalized) ? normalized : fallback;
}

function normalizeTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((tag) => String(tag || "").trim())
        .filter(Boolean)
    )
  );
}

export function normalizePsychology(value: unknown): Psychology | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const psychology = value as Partial<Psychology>;

  return {
    confidenceScore: nullableNumber(psychology.confidenceScore),
    emotionBefore: nullableString(psychology.emotionBefore),
    emotionAfter: nullableString(psychology.emotionAfter),
    followedPlan: nullableBoolean(psychology.followedPlan),
    mistakeTag: nullableString(psychology.mistakeTag),
    entryReason: nullableString(psychology.entryReason),
    personalNote: nullableString(psychology.personalNote),
    lessonLearned: nullableString(psychology.lessonLearned),
  };
}

export function validateJournalEvent(input: JournalEventInput): JournalEvent {
  const eventTime = input.eventTime
    ? requiredDate(input.eventTime, "eventTime")
    : new Date();

  return {
    eventType: requiredString(input.eventType, "eventType"),
    idempotencyKey: requiredString(input.idempotencyKey, "idempotencyKey"),
    ticket: nullableString(input.ticket),
    positionId: nullableString(input.positionId),
    orderTicket: nullableString(input.orderTicket),
    dealTicket: nullableString(input.dealTicket),
    symbol: nullableString(input.symbol)?.toUpperCase() ?? null,
    price: nullableNumber(input.price),
    volume: nullableNumber(input.volume),
    profit: nullableNumber(input.profit),
    eventTime,
    rawPayload: input.rawPayload ?? null,
  };
}

export function validateJournalTradeInput(input: JournalTradeInput): JournalTrade {
  const now = new Date();
  const status = normalizeEnum(input.status, STATUSES, "open");

  return {
    userId: nullableString(input.userId),
    licenseKeyHash: nullableString(input.licenseKeyHash),
    accountNumber: requiredString(input.accountNumber, "accountNumber"),
    broker: requiredString(input.broker, "broker"),
    serverName: requiredString(input.serverName, "serverName"),
    symbol: requiredString(input.symbol, "symbol").toUpperCase(),
    ticket: nullableString(input.ticket),
    positionId: nullableString(input.positionId),
    orderTicket: nullableString(input.orderTicket),
    dealTicketOpen: nullableString(input.dealTicketOpen),
    dealTicketClose: nullableString(input.dealTicketClose),
    tradeType: normalizeEnum(input.tradeType, TRADE_TYPES, "buy"),
    lotSize: nullableNumber(input.lotSize),
    entryPrice: nullableNumber(input.entryPrice),
    closePrice: nullableNumber(input.closePrice),
    stopLoss: nullableNumber(input.stopLoss),
    takeProfit: nullableNumber(input.takeProfit),
    riskAmount: nullableNumber(input.riskAmount),
    targetRR: nullableNumber(input.targetRR),
    actualRR: nullableNumber(input.actualRR),
    profit: nullableNumber(input.profit),
    profitPercent: nullableNumber(input.profitPercent),
    commission: nullableNumber(input.commission),
    swap: nullableNumber(input.swap),
    magicNumber: nullableNumber(input.magicNumber),
    comment: nullableString(input.comment),
    sourceType: normalizeEnum(input.sourceType, SOURCE_TYPES, "unknown"),
    entrySource: normalizeEnum(input.entrySource, ENTRY_SOURCES, "unknown"),
    timeframe: nullableString(input.timeframe),
    spread: nullableNumber(input.spread),
    atr: nullableNumber(input.atr),
    rsi: nullableNumber(input.rsi),
    session: nullableString(input.session),
    openTime: nullableDate(input.openTime),
    closeTime: nullableDate(input.closeTime),
    durationSeconds: nullableNumber(input.durationSeconds),
    result: normalizeEnum(
      input.result,
      RESULTS,
      status === "closed" ? "breakeven" : "open"
    ),
    status,
    entryScreenshotUrl: nullableString(input.entryScreenshotUrl),
    exitScreenshotUrl: nullableString(input.exitScreenshotUrl),
    entryScreenshotStatus: normalizeEnum(
      input.entryScreenshotStatus,
      SCREENSHOT_STATUSES,
      "not_requested"
    ),
    exitScreenshotStatus: normalizeEnum(
      input.exitScreenshotStatus,
      SCREENSHOT_STATUSES,
      "not_requested"
    ),
    psychology: normalizePsychology(input.psychology),
    tags: normalizeTags(input.tags),
    events: (input.events || []).map((event) => validateJournalEvent(event)),
    createdAt: now,
    updatedAt: now,
  };
}
