import { headers } from "next/headers";
import type { JournalEvent, JournalTrade, Psychology } from "@/lib/journal/types";
import { isImportedTradeSource } from "@/lib/journal/trade-source";

export type JournalTradeDto = Omit<
  JournalTrade,
  "_id" | "openTime" | "closeTime" | "createdAt" | "updatedAt" | "events" | "psychology"
> & {
  _id: string;
  openTime: string | null;
  closeTime: string | null;
  createdAt: string;
  updatedAt: string;
  events: Array<Omit<JournalEvent, "eventTime"> & { eventTime: string }>;
  psychology: Psychology | null;
  source?: string | null;
  setup?: string | null;
  strategyReview?: PrismaTradeDto["strategyReview"];
  checklistCompletionPercent?: number | null;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
};

export type JournalTradesResponse = {
  success: boolean;
  trades: JournalTradeDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type JournalTradeResponse = {
  success: boolean;
  trade?: JournalTradeDto;
  message?: string;
};

export type JournalStatsResponse = {
  success: boolean;
  stats: {
    totalTrades: number;
    closedTrades: number;
    openTrades: number;
    winRate: number;
    totalProfit: number;
    profitFactor: number | null;
    averageRR: number | null;
    expectancy: number | null;
    bestSymbol: string | null;
    worstSymbol: string | null;
  };
};

export type PrismaTradingAccountDto = {
  id: string;
  userId: string;
  name: string;
  broker: string | null;
  platform: string | null;
  currency: string;
  balance: string | number | null;
  mt5AccountNumber?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PrismaTradeScreenshotDto = {
  id: string;
  tradeId: string;
  userId: string;
  type: string;
  url: string;
  createdAt: string;
};

export type PrismaTradeUpdateLogDto = {
  id: string;
  tradeId: string;
  type: "SL_CHANGED" | "TP_CHANGED";
  oldValue: string | number | null;
  newValue: string | number | null;
  createdAt: string;
};

export type PrismaTradeChecklistResultDto = {
  id: string;
  checklistTemplateId: string | null;
  titleSnapshot: string;
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  updatedAt: string;
  answers: Array<{
    id?: string;
    titleSnapshot: string;
    isRequiredSnapshot?: boolean;
    isCriticalSnapshot?: boolean;
    checked: boolean;
    answeredAt?: string | null;
    note: string | null;
    updatedAt: string;
  }>;
};

export type TradeReviewRequirementsDto = {
  readyToTrade: boolean;
  readyForAIReview: boolean;
  readyForCompleteReview: boolean;
  progressPercent: number;
  missingRequirements: string[];
  firstIncompleteStep: string | null;
  steps: Array<{
    id: string;
    label: string;
    complete: boolean;
    locked: boolean;
    reason: string | null;
    href: string;
  }>;
};

export type PrismaTradeAIReviewDto = {
  id: string;
  tradeId?: string;
  userId?: string;
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  mistakes: string[];
  riskReview: string;
  psychologyReview: string;
  playbookReview: string;
  improvementPlan: string[];
  tags: string[];
  confidence: number;
  createdAt?: string;
  updatedAt?: string;
};

export type PrismaTradeJournalMetadataDto = {
  rating: number | null;
  mistakes: unknown;
  setups: unknown;
  emotions: unknown;
  customTags: unknown;
  tradeNote: string | null;
  psychologyNote: string | null;
  lessonLearned: string | null;
  dailyJournal: string | null;
  checklistResults: unknown;
  psychologyStatus: string | null;
  exitReason: string | null;
};

export type PrismaTradingAccountsResponse = {
  success: boolean;
  data?: PrismaTradingAccountDto[];
  accounts?: PrismaTradingAccountDto[];
  message?: string;
};

export type PrismaTagDto = {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
};

export type PrismaTradeTagDto = {
  tradeId: string;
  tagId: string;
  tag: PrismaTagDto;
};

export type PrismaTradeDto = {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  direction: "BUY" | "SELL";
  status: "OPEN" | "CLOSED" | "CANCELLED";
  entryPrice: string | number | null;
  exitPrice: string | number | null;
  stopLoss: string | number | null;
  takeProfit: string | number | null;
  initialStopLoss?: string | number | null;
  initialTakeProfit?: string | number | null;
  currentStopLoss?: string | number | null;
  currentTakeProfit?: string | number | null;
  lotSize: string | number | null;
  riskAmount: string | number | null;
  profitLoss: string | number | null;
  commission: string | number | null;
  swap: string | number | null;
  rr: string | number | null;
  source: string;
  mt5Ticket: string | null;
  tradeLockerPositionId?: string | null;
  aiReviewStatus: "NOT_REVIEWED" | "REVIEWED" | "FAILED" | string;
  aiReviewScore: number | null;
  reviewStatus?: "DRAFT" | "NEEDS_REVIEW" | "REVIEWED" | string;
  reviewedAt?: string | null;
  playbookId?: string | null;
  checklistCompletedAt?: string | null;
  psychologyReviewCompletedAt?: string | null;
  strategyReviewCompletedAt?: string | null;
  setup: string | null;
  session: string | null;
  emotion: string | null;
  mistake: string | null;
  notes: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  account?: PrismaTradingAccountDto | null;
  tradingAccount?: PrismaTradingAccountDto | null;
  screenshots?: PrismaTradeScreenshotDto[];
  updateLogs?: PrismaTradeUpdateLogDto[];
  tags?: PrismaTradeTagDto[];
  checklistResult?: PrismaTradeChecklistResultDto | null;
  checklistCompletionPercent?: number | null;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
  reviewRequirements?: TradeReviewRequirementsDto;
  aiReview?: PrismaTradeAIReviewDto | null;
  journalMetadata?: PrismaTradeJournalMetadataDto | null;
  entryScreenshotUrl?: string | null;
  exitScreenshotUrl?: string | null;
  strategyReview?: {
    id: string;
    strategyId: string | null;
    strategyNameSnapshot: string | null;
    followedPlan: "YES" | "PARTIAL" | "NO" | "NOT_REVIEWED";
    totalRules: number;
    followedRules: number;
    violatedRules: number;
    compliancePercent: number;
    requiredCompliancePercent: number;
    ruleReviews?: Array<{
      id: string;
      status: string;
    }>;
  } | null;
  side?: "BUY" | "SELL";
  strategy?: string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  mistakes?: string | null;
};

export type PrismaTradesResponse = {
  success: boolean;
  data?: {
    trades: PrismaTradeDto[];
    pagination?: JournalTradesResponse["pagination"];
  };
  trades?: PrismaTradeDto[];
  pagination?: JournalTradesResponse["pagination"] & {
    hasMore?: boolean;
  };
};

export type PrismaTradeResponse = {
  success: boolean;
  data?: PrismaTradeDto;
  trade?: PrismaTradeDto;
  message?: string;
};

export type JournalSummaryResponse = {
  success: boolean;
  summary: {
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    breakEvenTrades: number;
    winRate: number;
    totalPnL: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number | null;
    bestTrade: PrismaTradeDto | null;
    worstTrade: PrismaTradeDto | null;
    openTrades: number;
    closedTrades: number;
  };
};

async function getBaseUrl() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") || "http";

  if (host) {
    return `${proto}://${host}`;
  }

  return process.env.JOURNAL_API_BASE_URL || "http://localhost:3000";
}

export class JournalApiError extends Error {
  status: number;

  constructor(status: number, statusText: string) {
    super(`Journal API request failed: ${status}${statusText ? ` ${statusText}` : ""}`);
    this.name = "JournalApiError";
    this.status = status;
  }
}

export async function fetchJournalApi<T>(path: string): Promise<T> {
  const baseUrl = await getBaseUrl();
  const headerList = await headers();
  const cookie = headerList.get("cookie");
  const response = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });

  if (!response.ok) {
    throw new JournalApiError(response.status, response.statusText);
  }

  return response.json() as Promise<T>;
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferResult(status: PrismaTradeDto["status"], profitLoss: number | null) {
  if (status === "OPEN") {
    return "open";
  }

  if (profitLoss === null || profitLoss === 0) {
    return "breakeven";
  }

  return profitLoss > 0 ? "win" : "loss";
}

function screenshotUrl(trade: PrismaTradeDto, type: string) {
  return (
    trade.screenshots?.find(
      (screenshot) => screenshot.type.toLowerCase() === type
    )?.url || null
  );
}

export function mapPrismaTradeToJournalTrade(trade: PrismaTradeDto): JournalTradeDto {
  const profitLoss = toNumber(trade.profitLoss);
  const account = trade.account || trade.tradingAccount;
  const entryScreenshotUrl = screenshotUrl(trade, "entry");
  const exitScreenshotUrl = screenshotUrl(trade, "exit");
  const psychologyNote = trade.journalMetadata?.psychologyNote || null;
  const lessonLearned = trade.journalMetadata?.lessonLearned || null;
  const psychology: Psychology | null =
    trade.emotion ||
    trade.mistake ||
    psychologyNote ||
    lessonLearned ||
    trade.journalMetadata?.rating ||
    trade.journalMetadata?.psychologyStatus
      ? {
          confidenceScore: trade.journalMetadata?.rating ?? null,
          emotionBefore: trade.emotion,
          emotionAfter: null,
          followedPlan:
            trade.journalMetadata?.psychologyStatus === "followed_plan"
              ? true
              : trade.journalMetadata?.psychologyStatus === "broke_plan"
                ? false
                : trade.journalMetadata?.psychologyStatus === "partially_followed_plan"
                  ? "partially"
                  : null,
          mistakeTag: trade.mistake,
          entryReason: trade.setup,
          personalNote: psychologyNote,
          lessonLearned,
        }
      : null;

  return {
    _id: trade.id,
    userId: trade.userId,
    licenseKeyHash: null,
    accountNumber: account?.name || trade.accountId,
    broker: account?.broker || "-",
    serverName: account?.platform || "-",
    symbol: trade.symbol,
    ticket: trade.tradeLockerPositionId || trade.mt5Ticket,
    positionId: trade.tradeLockerPositionId || trade.mt5Ticket,
    orderTicket: null,
    dealTicketOpen: null,
    dealTicketClose: null,
    tradeType: trade.direction.toLowerCase() as JournalTradeDto["tradeType"],
    lotSize: toNumber(trade.lotSize),
    entryPrice: toNumber(trade.entryPrice),
    closePrice: toNumber(trade.exitPrice),
    stopLoss: toNumber(trade.currentStopLoss ?? trade.stopLoss),
    takeProfit: toNumber(trade.currentTakeProfit ?? trade.takeProfit),
    riskAmount: toNumber(trade.riskAmount),
    targetRR: null,
    actualRR: toNumber(trade.rr),
    profit: profitLoss,
    profitPercent: null,
    commission: toNumber(trade.commission),
    swap: toNumber(trade.swap),
    magicNumber: null,
    comment: trade.notes,
    sourceType: isImportedTradeSource(trade.source, trade.setup)
      ? "expert_advisor"
      : "manual",
    entrySource: isImportedTradeSource(trade.source, trade.setup)
      ? "expert_advisor"
      : "manual_trade",
    source: trade.source,
    timeframe: null,
    spread: null,
    atr: null,
    rsi: null,
    session: trade.strategy || trade.session,
    openTime: trade.entryTime || trade.openedAt,
    closeTime: trade.exitTime || trade.closedAt,
    durationSeconds: null,
    result: inferResult(trade.status, profitLoss),
    status:
      trade.status === "CLOSED"
        ? "closed"
        : trade.status === "OPEN"
          ? "open"
          : "closed",
    entryScreenshotUrl,
    exitScreenshotUrl,
    entryScreenshotStatus: entryScreenshotUrl ? "uploaded" : "pending",
    exitScreenshotStatus: exitScreenshotUrl ? "uploaded" : "pending",
    psychology,
    strategyReview: trade.strategyReview,
    checklistCompletionPercent: trade.checklistCompletionPercent,
    checklistCompletedCount: trade.checklistCompletedCount,
    checklistTotalCount: trade.checklistTotalCount,
    tags: trade.tags?.map((item) => item.tag.name) || [],
    events: [],
    createdAt: trade.createdAt,
    updatedAt: trade.updatedAt,
  };
}
