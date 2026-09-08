import { Prisma, TradeDirection } from "@prisma/client";
import {
  analyticsTradeInclude,
  buildAnalyticsMetadata,
  buildTradeAnalytics,
} from "@/lib/analytics/tradeAnalytics";
import { prisma } from "@/lib/prisma";
import type { JournalAnalyticsResponse } from "@/types/analytics";

export const REPORT_DATE_RANGES = [
  "all",
  "today",
  "thisWeek",
  "thisMonth",
  "thisYear",
  "custom",
] as const;

export type ReportDateRange = (typeof REPORT_DATE_RANGES)[number];

export type JournalReportFilters = {
  dateRange: ReportDateRange;
  dateFrom: string;
  dateTo: string;
  accountId: string;
  symbol: string;
  direction: "" | "BUY" | "SELL";
  playbookId: string;
  strategy: string;
  session: string;
  result: "" | "WIN" | "LOSS" | "BREAKEVEN";
  aiReview: "" | "DONE" | "MISSING";
  humanReview: "" | "DONE" | "MISSING";
  screenshots: "" | "HAS" | "NONE";
  source: "" | "MANUAL" | "MT5" | "CTRADER";
  minAiScore: string;
  maxAiScore: string;
};

export type JournalReportTrade = {
  id: string;
  accountName: string;
  broker: string | null;
  accountNumber: string | null;
  symbol: string;
  direction: "BUY" | "SELL";
  status: string;
  source: string;
  pnl: number;
  rr: number | null;
  openedAt: string | null;
  closedAt: string | null;
  setup: string | null;
  session: string | null;
  emotion: string | null;
  mistake: string | null;
  notes: string | null;
  tags: string[];
  screenshotsCount: number;
  entryScreenshotUrl: string | null;
  exitScreenshotUrl: string | null;
  strategyName: string | null;
  followedPlan: string | null;
  compliancePercent: number | null;
  checklistCompletion: number | null;
  rating: number | null;
  exitReason: string | null;
  aiReviewStatus: string;
  aiReviewScore: number | null;
  aiReviewLabel: "Done" | "Missing";
  humanReviewLabel: "Done" | "Missing";
  combinedReviewStatus:
    | "Fully Reviewed"
    | "AI Reviewed / Human Missing"
    | "AI Missing / Human Reviewed"
    | "Not Reviewed";
};

export type JournalReportDailyNote = {
  id: string;
  date: string;
  mood: string | null;
  focusLevel: number | null;
  disciplineScore: number | null;
  whatWentWell: string | null;
  mistakesSummary: string | null;
  improvementPlan: string | null;
  tomorrowPlan: string | null;
  endOfDayNotes: string | null;
};

export type JournalReportPreTradeCheck = {
  id: string;
  date: string;
  scenario: string;
  decision: string;
  decisionLabel: string | null;
  readinessScore: number;
  mindsetCompleted: number;
  mindsetTotal: number;
  checklistCompleted: number;
  checklistTotal: number;
  selectedPlaybook: string | null;
  mainReason: string | null;
  highImpactEventCount: number;
};

export type LocalizedReportText = {
  en: string;
  fa: string;
};

export type JournalReportSummary = {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  averageRR: number | null;
  expectancy: number | null;
  bestTrade: JournalReportTrade | null;
  worstTrade: JournalReportTrade | null;
};

export type JournalReportAITextFrequency = {
  label: string;
  count: number;
};

export type JournalReportAITradeHighlight = {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  openedAt: string | null;
  pnl: number;
  score: number;
  summary: string;
};

export type JournalReportAIReviewSummary = {
  reviewedTrades: number;
  notReviewedTrades: number;
  failedReviews: number;
  reviewCoveragePercent: number;
  averageScore: number | null;
  averageConfidence: number | null;
  latestReviewAt: string | null;
  strongestTrades: JournalReportAITradeHighlight[];
  weakestTrades: JournalReportAITradeHighlight[];
  topStrengths: JournalReportAITextFrequency[];
  topWeaknesses: JournalReportAITextFrequency[];
  topMistakes: JournalReportAITextFrequency[];
  topTags: JournalReportAITextFrequency[];
  improvementPlan: JournalReportAITextFrequency[];
};

export type JournalReportAIScoreBreakdown = {
  riskManagement: number;
  executionQuality: number;
  planCompliance: number;
  documentationQuality: number;
};

export type JournalReportDataQuality = {
  level: "Good" | "Partial" | "Low";
  reason: string;
  missing: string[];
};

export type JournalReportConfidence = {
  label: "High" | "Medium" | "Low";
  reason: string;
};

export type JournalReportTradeReport = {
  trade: JournalReportTrade;
  aiReview: {
    score: number;
    breakdown: JournalReportAIScoreBreakdown;
    confidence: number;
    confidenceLabel: JournalReportConfidence["label"];
    confidenceReason: string;
    summary: string;
    fullSummary: string;
    strengths: string[];
    weaknesses: string[];
    mistakes: string[];
    riskReview: string;
    psychologyReview: string;
    playbookReview: string;
    improvementPlan: string[];
    tags: string[];
    updatedAt: string;
  } | null;
  dataQuality: JournalReportDataQuality;
  strategyReview: {
    strategyName: string | null;
    followedPlan: string;
    compliancePercent: number;
    requiredCompliancePercent: number;
    totalRules: number;
    followedRules: number;
    violatedRules: number;
    notes: string | null;
    ruleReviews: Array<{
      title: string;
      section: string | null;
      required: boolean;
      status: string;
      note: string | null;
    }>;
  } | null;
  checklists: Array<{
    title: string;
    category: string | null;
    completionPercent: number;
    completedCount: number;
    totalCount: number;
    requiredCompletedCount: number;
    requiredTotalCount: number;
    answers: Array<{
      title: string;
      required: boolean;
      checked: boolean;
      note: string | null;
    }>;
  }>;
  journal: {
    rating: number | null;
    exitReason: string | null;
    tradeNote: string | null;
    dailyJournal: string | null;
    psychologyStatus: string | null;
    mistakes: string[];
    setups: string[];
    emotions: string[];
    customTags: string[];
  } | null;
  screenshots: Array<{
    type: string;
    url: string;
    createdAt: string;
  }>;
};

export type JournalReport = {
  success: true;
  generatedAt: string;
  filters: JournalReportFilters;
  filterOptions: {
    accounts: Array<{ id: string; name: string; broker: string | null }>;
    symbols: string[];
    playbooks: Array<{ id: string; name: string; isActive: boolean }>;
    strategies: string[];
  };
  summary: JournalReportSummary;
  analytics: JournalAnalyticsResponse;
  aiSummary: JournalReportAIReviewSummary;
  recentTrades: JournalReportTrade[];
  tradeReports: JournalReportTradeReport[];
  dailyNotes: JournalReportDailyNote[];
  preTradeChecks: JournalReportPreTradeCheck[];
  insights: {
    strengths: LocalizedReportText[];
    risks: LocalizedReportText[];
    actionPlan: LocalizedReportText[];
  };
};

export type JournalReportFilterOptions = JournalReport["filterOptions"];

type ReportTrade = Prisma.TradeGetPayload<{
  include: typeof reportTradeInclude;
}>;

type ReportSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

export class ReportValidationError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super("Validation failed");
    this.name = "ReportValidationError";
    this.errors = errors;
  }
}

const reportTradeInclude = {
  account: true,
  screenshots: true,
  tags: {
    include: {
      tag: true,
    },
  },
  checklists: {
    include: {
      answers: {
        orderBy: { sortOrder: "asc" },
      },
    },
  },
  strategyReview: {
    include: {
      ruleReviews: {
        orderBy: { sortOrder: "asc" },
      },
    },
  },
  aiReviews: {
    orderBy: { updatedAt: "desc" },
    take: 1,
  },
  journalMetadata: true,
} satisfies Prisma.TradeInclude;

function firstParam(
  params: ReportSearchParams,
  name: string
): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(name) || undefined;
  }

  const value = params[name];
  return Array.isArray(value) ? value[0] : value;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function parseDateParam(value: string | undefined, end = false) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return end ? endOfDay(parsed) : startOfDay(parsed);
  }

  return parsed;
}

function round(value: unknown, digits = 2) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Number(number.toFixed(digits)) : 0;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function rangeFromPreset(value: ReportDateRange) {
  const now = new Date();

  if (value === "all" || value === "custom") {
    return {};
  }

  if (value === "today") {
    return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
  }

  if (value === "thisWeek") {
    return { dateFrom: startOfWeek(now), dateTo: endOfDay(now) };
  }

  if (value === "thisMonth") {
    return {
      dateFrom: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      dateTo: endOfDay(now),
    };
  }

  return {
    dateFrom: startOfDay(new Date(now.getFullYear(), 0, 1)),
    dateTo: endOfDay(now),
  };
}

function normalizeDirection(value: string | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return "";
  }

  return normalized === TradeDirection.BUY || normalized === TradeDirection.SELL
    ? normalized
    : null;
}

function normalizeOption<T extends string>(
  value: string | undefined,
  allowed: readonly T[]
): "" | T | null {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) {
    return "";
  }

  return allowed.includes(normalized as T) ? (normalized as T) : null;
}

function parseNumberParam(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeJournalReportFilters(
  params: ReportSearchParams
): { filters: JournalReportFilters; dateFrom?: Date; dateTo?: Date; errors: string[] } {
  const errors: string[] = [];
  const rawDateRange = firstParam(params, "dateRange") || "thisMonth";
  const dateRange = REPORT_DATE_RANGES.includes(rawDateRange as ReportDateRange)
    ? (rawDateRange as ReportDateRange)
    : null;
  const direction = normalizeDirection(
    firstParam(params, "direction") || firstParam(params, "side")
  );
  const customDateFrom = parseDateParam(
    firstParam(params, "dateFrom") || firstParam(params, "from")
  );
  const customDateTo = parseDateParam(
    firstParam(params, "dateTo") || firstParam(params, "to"),
    true
  );
  const result = normalizeOption(firstParam(params, "result"), [
    "WIN",
    "LOSS",
    "BREAKEVEN",
  ] as const);
  const aiReview = normalizeOption(firstParam(params, "aiReview"), [
    "DONE",
    "MISSING",
  ] as const);
  const humanReview = normalizeOption(firstParam(params, "humanReview"), [
    "DONE",
    "MISSING",
  ] as const);
  const screenshots = normalizeOption(firstParam(params, "screenshots"), [
    "HAS",
    "NONE",
  ] as const);
  const source = normalizeOption(firstParam(params, "source"), [
    "MANUAL",
    "MT5",
    "CTRADER",
  ] as const);
  const minAiScore = parseNumberParam(firstParam(params, "minAiScore"));
  const maxAiScore = parseNumberParam(firstParam(params, "maxAiScore"));

  if (!dateRange) {
    errors.push("dateRange must be all, today, thisWeek, thisMonth, thisYear, or custom");
  }

  if (direction === null) {
    errors.push("direction must be BUY or SELL");
  }

  if (customDateFrom === null) {
    errors.push("dateFrom must be a valid date");
  }

  if (customDateTo === null) {
    errors.push("dateTo must be a valid date");
  }

  if (result === null) {
    errors.push("result must be WIN, LOSS, or BREAKEVEN");
  }

  if (aiReview === null) {
    errors.push("aiReview must be DONE or MISSING");
  }

  if (humanReview === null) {
    errors.push("humanReview must be DONE or MISSING");
  }

  if (screenshots === null) {
    errors.push("screenshots must be HAS or NONE");
  }

  if (source === null) {
    errors.push("source must be MANUAL, MT5, or CTRADER");
  }

  if (minAiScore === null) {
    errors.push("minAiScore must be a valid number");
  }

  if (maxAiScore === null) {
    errors.push("maxAiScore must be a valid number");
  }

  const presetRange = rangeFromPreset(dateRange || "thisMonth");
  const dateFrom = customDateFrom || presetRange.dateFrom;
  const dateTo = customDateTo || presetRange.dateTo;

  return {
    filters: {
      dateRange: dateRange || "thisMonth",
      dateFrom: firstParam(params, "dateFrom") || firstParam(params, "from") || "",
      dateTo: firstParam(params, "dateTo") || firstParam(params, "to") || "",
      accountId: firstParam(params, "accountId")?.trim() || "",
      symbol: firstParam(params, "symbol")?.trim() || "",
      direction: direction || "",
      playbookId: firstParam(params, "playbookId")?.trim() || "",
      strategy: firstParam(params, "strategy")?.trim() || "",
      session: firstParam(params, "session")?.trim() || "",
      result: result || "",
      aiReview: aiReview || "",
      humanReview: humanReview || "",
      screenshots: screenshots || "",
      source: source || "",
      minAiScore: firstParam(params, "minAiScore")?.trim() || "",
      maxAiScore: firstParam(params, "maxAiScore")?.trim() || "",
    },
    dateFrom,
    dateTo,
    errors,
  };
}

function buildTradeWhere(
  userId: string,
  filters: JournalReportFilters,
  dateFrom?: Date,
  dateTo?: Date
) {
  const and: Prisma.TradeWhereInput[] = [{ userId }];

  if (filters.accountId) {
    and.push({ accountId: filters.accountId });
  }

  if (filters.symbol) {
    and.push({ symbol: { contains: filters.symbol, mode: "insensitive" } });
  }

  if (filters.direction) {
    and.push({ direction: filters.direction });
  }

  if (filters.playbookId) {
    and.push({
      strategyReview: {
        strategyId: filters.playbookId,
      },
    });
  }

  if (filters.strategy) {
    and.push({
      OR: [
        { setup: { contains: filters.strategy, mode: "insensitive" } },
        { session: { contains: filters.strategy, mode: "insensitive" } },
        {
          strategyReview: {
            strategyNameSnapshot: {
              contains: filters.strategy,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  if (filters.session) {
    and.push({ session: { contains: filters.session, mode: "insensitive" } });
  }

  if (filters.result) {
    if (filters.result === "WIN") {
      and.push({ profitLoss: { gt: 0 } });
    } else if (filters.result === "LOSS") {
      and.push({ profitLoss: { lt: 0 } });
    } else {
      and.push({ profitLoss: 0 });
    }
  }

  if (filters.aiReview === "DONE") {
    and.push({ aiReviewStatus: "REVIEWED" });
  } else if (filters.aiReview === "MISSING") {
    and.push({ aiReviewStatus: { not: "REVIEWED" } });
  }

  if (filters.screenshots === "HAS") {
    and.push({ screenshots: { some: {} } });
  } else if (filters.screenshots === "NONE") {
    and.push({ screenshots: { none: {} } });
  }

  if (filters.source === "MANUAL") {
    and.push({ source: "MANUAL" });
  } else if (filters.source === "MT5") {
    and.push({ source: { in: ["MT5", "MT5_EA", "EA_IMPORT", "MT5_DIRECT"] } });
  } else if (filters.source === "CTRADER") {
    and.push({ source: "CTRADER_DIRECT" });
  }

  const minAiScore = parseNumberParam(filters.minAiScore);
  const maxAiScore = parseNumberParam(filters.maxAiScore);

  if (minAiScore !== undefined && minAiScore !== null) {
    and.push({ aiReviewScore: { gte: Math.max(0, minAiScore) } });
  }

  if (maxAiScore !== undefined && maxAiScore !== null) {
    and.push({ aiReviewScore: { lte: Math.min(100, maxAiScore) } });
  }

  if (dateFrom || dateTo) {
    and.push({
      openedAt: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    });
  }

  return { AND: and } satisfies Prisma.TradeWhereInput;
}

function matchesPostQueryFilters(trade: ReportTrade, filters: JournalReportFilters) {
  if (filters.humanReview === "DONE" && !hasHumanReview(trade)) {
    return false;
  }

  if (filters.humanReview === "MISSING" && hasHumanReview(trade)) {
    return false;
  }

  return true;
}

function screenshotUrl(trade: ReportTrade, type: string) {
  return (
    trade.screenshots.find(
      (screenshot) => screenshot.type.toLowerCase() === type
    )?.url || null
  );
}

function averageChecklistCompletion(trade: ReportTrade) {
  if (trade.checklists.length === 0) {
    return null;
  }

  return round(
    trade.checklists.reduce(
      (total, checklist) => total + toNumber(checklist.completionPercent),
      0
    ) / trade.checklists.length,
    1
  );
}

function hasHumanReview(trade: ReportTrade) {
  const strategyDone =
    Boolean(trade.strategyReview) &&
    trade.strategyReview?.followedPlan !== "NOT_REVIEWED";
  const checklistDone = trade.checklists.some(
    (checklist) => checklist.completionPercent > 0 || checklist.completedCount > 0
  );
  const metadata = trade.journalMetadata;
  const journalDone = Boolean(
    metadata &&
      (metadata.rating !== null ||
        metadata.tradeNote ||
        metadata.dailyJournal ||
        metadata.exitReason ||
        metadata.psychologyStatus)
  );

  return strategyDone || checklistDone || journalDone;
}

function combinedReviewStatus(trade: ReportTrade): JournalReportTrade["combinedReviewStatus"] {
  const aiDone = trade.aiReviewStatus === "REVIEWED";
  const humanDone = hasHumanReview(trade);

  if (aiDone && humanDone) {
    return "Fully Reviewed";
  }

  if (aiDone) {
    return "AI Reviewed / Human Missing";
  }

  if (humanDone) {
    return "AI Missing / Human Reviewed";
  }

  return "Not Reviewed";
}

function buildDataQuality(trade: ReportTrade): JournalReportDataQuality {
  const missing: string[] = [];

  if (!trade.strategyReview?.strategyNameSnapshot) {
    missing.push("strategy/playbook");
  }

  if (trade.checklists.length === 0) {
    missing.push("checklist");
  }

  if (trade.screenshots.length === 0) {
    missing.push("screenshots");
  }

  if (!trade.journalMetadata) {
    missing.push("journal");
  }

  if (missing.length === 0) {
    return {
      level: "Good",
      reason: "Strategy, checklist, screenshots, and journal data are available.",
      missing,
    };
  }

  if (missing.length <= 2) {
    return {
      level: "Partial",
      reason: `Missing ${missing.join(", ")}.`,
      missing,
    };
  }

  return {
    level: "Low",
    reason: `Mostly execution/import data. Missing ${missing.join(", ")}.`,
    missing,
  };
}

function buildConfidence(
  trade: ReportTrade,
  reviewConfidence?: number | null
): JournalReportConfidence {
  const quality = buildDataQuality(trade);

  if (quality.level === "Good" && toNumber(reviewConfidence) >= 0.7) {
    return {
      label: "High",
      reason: "Complete trade data with strategy, checklist, screenshots, and journal.",
    };
  }

  if (quality.level === "Low") {
    return {
      label: "Low",
      reason: quality.reason,
    };
  }

  return {
    label: "Medium",
    reason: quality.reason,
  };
}

function deriveAiScoreBreakdown(
  score: number,
  trade: ReportTrade
): JournalReportAIScoreBreakdown {
  const riskBase = trade.stopLoss && trade.takeProfit ? 30 : trade.stopLoss || trade.takeProfit ? 22 : 14;
  const executionBase = trade.status === "CLOSED" && trade.profitLoss !== null ? 30 : 18;
  const planBase = trade.strategyReview?.followedPlan && trade.strategyReview.followedPlan !== "NOT_REVIEWED"
    ? Math.max(8, Math.round((trade.strategyReview.compliancePercent / 100) * 20))
    : trade.setup
      ? 10
      : 5;
  const documentationBase =
    (trade.journalMetadata ? 7 : 0) +
    (trade.checklists.length > 0 ? 6 : 0) +
    (trade.screenshots.length > 0 ? 5 : 0) +
    (trade.notes ? 2 : 0);
  const baseTotal = riskBase + executionBase + planBase + documentationBase;
  const multiplier = baseTotal > 0 ? score / baseTotal : 0;
  const riskManagement = Math.min(30, Math.round(riskBase * multiplier));
  const executionQuality = Math.min(30, Math.round(executionBase * multiplier));
  const planCompliance = Math.min(20, Math.round(planBase * multiplier));
  const used = riskManagement + executionQuality + planCompliance;
  const documentationQuality = Math.max(0, Math.min(20, score - used));

  return {
    riskManagement,
    executionQuality,
    planCompliance,
    documentationQuality,
  };
}

function shortAiSummary(trade: ReportTrade, reviewSummary: string) {
  const sentence = reviewSummary.split(/[.!?]\s/)[0]?.trim();

  if (sentence && sentence.length <= 140) {
    return sentence.endsWith(".") ? sentence : `${sentence}.`;
  }

  const pnl = toNumber(trade.profitLoss);
  const outcome = pnl > 0 ? "Profitable trade" : pnl < 0 ? "Losing trade" : "Breakeven trade";
  const quality = buildDataQuality(trade);

  return `${outcome}; data quality is ${quality.level.toLowerCase()}.`;
}

function serializeTrade(trade: ReportTrade): JournalReportTrade {
  return {
    id: trade.id,
    accountName: trade.account.name,
    broker: trade.account.broker,
    accountNumber: trade.account.mt5AccountNumber,
    symbol: trade.symbol,
    direction: trade.direction,
    status: trade.status,
    source: trade.source,
    pnl: round(trade.profitLoss),
    rr: nullableNumber(trade.rr),
    openedAt: toIso(trade.openedAt),
    closedAt: toIso(trade.closedAt),
    setup: trade.setup,
    session: trade.session,
    emotion: trade.emotion,
    mistake: trade.mistake,
    notes: trade.notes,
    tags: trade.tags
      .map((tradeTag) => tradeTag.tag.name?.trim())
      .filter((tag): tag is string => Boolean(tag)),
    screenshotsCount: trade.screenshots.length,
    entryScreenshotUrl: screenshotUrl(trade, "entry"),
    exitScreenshotUrl: screenshotUrl(trade, "exit"),
    strategyName: trade.strategyReview?.strategyNameSnapshot || null,
    followedPlan: trade.strategyReview?.followedPlan || null,
    compliancePercent:
      trade.strategyReview?.compliancePercent === undefined
        ? null
        : round(trade.strategyReview.compliancePercent, 1),
    checklistCompletion: averageChecklistCompletion(trade),
    rating: trade.journalMetadata?.rating || null,
    exitReason: trade.journalMetadata?.exitReason || null,
    aiReviewStatus: trade.aiReviewStatus,
    aiReviewScore: trade.aiReviewScore,
    aiReviewLabel: trade.aiReviewStatus === "REVIEWED" ? "Done" : "Missing",
    humanReviewLabel: hasHumanReview(trade) ? "Done" : "Missing",
    combinedReviewStatus: combinedReviewStatus(trade),
  };
}

function latestAiReview(trade: ReportTrade) {
  return trade.aiReviews[0] || null;
}

function countText(items: string[], take = 5): JournalReportAITextFrequency[] {
  const map = new Map<string, JournalReportAITextFrequency>();

  for (const item of items) {
    const label = item.trim();

    if (!label) {
      continue;
    }

    const key = label.toLowerCase();
    const existing = map.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { label, count: 1 });
    }
  }

  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, take);
}

function buildAITradeHighlight(trade: ReportTrade): JournalReportAITradeHighlight | null {
  const review = latestAiReview(trade);

  if (!review) {
    return null;
  }

  return {
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction,
    openedAt: toIso(trade.openedAt),
    pnl: round(trade.profitLoss),
    score: review.score,
    summary: review.summary,
  };
}

function buildAIReviewSummary(trades: ReportTrade[]): JournalReportAIReviewSummary {
  const reviewedTrades = trades.filter((trade) => latestAiReview(trade));
  const reviewCount = reviewedTrades.length;
  const latestReviewAt = reviewedTrades
    .map((trade) => latestAiReview(trade)?.updatedAt)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const highlightedTrades = reviewedTrades
    .map(buildAITradeHighlight)
    .filter((trade): trade is JournalReportAITradeHighlight => Boolean(trade));

  return {
    reviewedTrades: reviewCount,
    notReviewedTrades: trades.filter((trade) => trade.aiReviewStatus === "NOT_REVIEWED").length,
    failedReviews: trades.filter((trade) => trade.aiReviewStatus === "FAILED").length,
    reviewCoveragePercent:
      trades.length > 0 ? round((reviewCount / trades.length) * 100, 1) : 0,
    averageScore:
      reviewCount > 0
        ? round(
            reviewedTrades.reduce(
              (total, trade) => total + toNumber(latestAiReview(trade)?.score),
              0
            ) / reviewCount,
            1
          )
        : null,
    averageConfidence:
      reviewCount > 0
        ? round(
            reviewedTrades.reduce(
              (total, trade) => total + toNumber(latestAiReview(trade)?.confidence),
              0
            ) / reviewCount,
            2
          )
        : null,
    latestReviewAt: latestReviewAt ? latestReviewAt.toISOString() : null,
    strongestTrades: [...highlightedTrades]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    weakestTrades: [...highlightedTrades]
      .sort((a, b) => a.score - b.score)
      .slice(0, 3),
    topStrengths: countText(
      reviewedTrades.flatMap((trade) => latestAiReview(trade)?.strengths || [])
    ),
    topWeaknesses: countText(
      reviewedTrades.flatMap((trade) => latestAiReview(trade)?.weaknesses || [])
    ),
    topMistakes: countText(
      reviewedTrades.flatMap((trade) => latestAiReview(trade)?.mistakes || [])
    ),
    topTags: countText(
      reviewedTrades.flatMap((trade) => latestAiReview(trade)?.tags || [])
    ),
    improvementPlan: countText(
      reviewedTrades.flatMap((trade) => latestAiReview(trade)?.improvementPlan || [])
    ),
  };
}

function jsonStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : String(item ?? "").trim()))
    .filter(Boolean);
}

function serializeTradeReport(trade: ReportTrade): JournalReportTradeReport {
  const review = latestAiReview(trade);
  const strategyReview = trade.strategyReview;
  const metadata = trade.journalMetadata;
  const confidence = buildConfidence(trade, review?.confidence);

  return {
    trade: serializeTrade(trade),
    aiReview: review
      ? {
          score: review.score,
          breakdown: deriveAiScoreBreakdown(review.score, trade),
          confidence: review.confidence,
          confidenceLabel: confidence.label,
          confidenceReason: confidence.reason,
          summary: shortAiSummary(trade, review.summary),
          fullSummary: review.summary,
          strengths: review.strengths,
          weaknesses: review.weaknesses,
          mistakes: review.mistakes,
          riskReview: review.riskReview,
          psychologyReview: review.psychologyReview,
          playbookReview: review.playbookReview,
          improvementPlan: review.improvementPlan,
          tags: review.tags,
          updatedAt: review.updatedAt.toISOString(),
        }
      : null,
    dataQuality: buildDataQuality(trade),
    strategyReview: strategyReview
      ? {
          strategyName: strategyReview.strategyNameSnapshot,
          followedPlan: strategyReview.followedPlan,
          compliancePercent: round(strategyReview.compliancePercent, 1),
          requiredCompliancePercent: round(strategyReview.requiredCompliancePercent, 1),
          totalRules: strategyReview.totalRules,
          followedRules: strategyReview.followedRules,
          violatedRules: strategyReview.violatedRules,
          notes: strategyReview.notes,
          ruleReviews: strategyReview.ruleReviews.map((rule) => ({
            title: rule.ruleTitleSnapshot,
            section: rule.ruleSectionSnapshot,
            required: rule.isRequiredSnapshot,
            status: rule.status,
            note: rule.note,
          })),
        }
      : null,
    checklists: trade.checklists.map((checklist) => ({
      title: checklist.titleSnapshot,
      category: checklist.categorySnapshot,
      completionPercent: round(checklist.completionPercent, 1),
      completedCount: checklist.completedCount,
      totalCount: checklist.totalCount,
      requiredCompletedCount: checklist.requiredCompletedCount,
      requiredTotalCount: checklist.requiredTotalCount,
      answers: checklist.answers.map((answer) => ({
        title: answer.titleSnapshot,
        required: answer.isRequiredSnapshot,
        checked: answer.checked,
        note: answer.note,
      })),
    })),
    journal: metadata
      ? {
          rating: metadata.rating,
          exitReason: metadata.exitReason,
          tradeNote: metadata.tradeNote,
          dailyJournal: metadata.dailyJournal,
          psychologyStatus: metadata.psychologyStatus,
          mistakes: jsonStringArray(metadata.mistakes),
          setups: jsonStringArray(metadata.setups),
          emotions: jsonStringArray(metadata.emotions),
          customTags: jsonStringArray(metadata.customTags),
        }
      : null,
    screenshots: trade.screenshots.map((screenshot) => ({
      type: screenshot.type,
      url: screenshot.url,
      createdAt: screenshot.createdAt.toISOString(),
    })),
  };
}

function summarizeTrades(trades: JournalReportTrade[]): JournalReportSummary {
  const closedTrades = trades.filter((trade) => trade.status === "CLOSED");
  const openTrades = trades.filter((trade) => trade.status === "OPEN");
  const wins = closedTrades.filter((trade) => trade.pnl > 0);
  const losses = closedTrades.filter((trade) => trade.pnl < 0);
  const breakEven = closedTrades.filter((trade) => trade.pnl === 0);
  const grossProfit = wins.reduce((total, trade) => total + trade.pnl, 0);
  const grossLoss = losses.reduce((total, trade) => total + Math.abs(trade.pnl), 0);
  const totalPnl = trades.reduce((total, trade) => total + trade.pnl, 0);
  const rrTrades = closedTrades.filter((trade) => trade.rr !== null);
  const bestTrade =
    trades.length > 0
      ? trades.reduce((best, trade) => (trade.pnl > best.pnl ? trade : best))
      : null;
  const worstTrade =
    trades.length > 0
      ? trades.reduce((worst, trade) => (trade.pnl < worst.pnl ? trade : worst))
      : null;

  return {
    totalTrades: trades.length,
    openTrades: openTrades.length,
    closedTrades: closedTrades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakEvenTrades: breakEven.length,
    winRate: closedTrades.length > 0 ? round((wins.length / closedTrades.length) * 100, 1) : 0,
    totalPnl: round(totalPnl),
    grossProfit: round(grossProfit),
    grossLoss: round(grossLoss),
    averageWin: wins.length > 0 ? round(grossProfit / wins.length) : 0,
    averageLoss: losses.length > 0 ? round(-grossLoss / losses.length) : 0,
    profitFactor: grossLoss > 0 ? round(grossProfit / grossLoss, 2) : null,
    averageRR:
      rrTrades.length > 0
        ? round(
            rrTrades.reduce((total, trade) => total + toNumber(trade.rr), 0) /
              rrTrades.length,
            2
          )
        : null,
    expectancy:
      closedTrades.length > 0 ? round(closedTrades.reduce((total, trade) => total + trade.pnl, 0) / closedTrades.length) : null,
    bestTrade,
    worstTrade,
  };
}

function compactText(value: string | null | undefined, fallback: string) {
  const text = value?.trim();
  return text || fallback;
}

function buildInsights(
  summary: JournalReportSummary,
  analytics: JournalAnalyticsResponse,
  trades: JournalReportTrade[],
  dailyNotes: JournalReportDailyNote[]
) {
  const bestSymbol = analytics.bySymbol[0];
  const worstSymbol = [...analytics.bySymbol].sort((a, b) => a.netPnl - b.netPnl)[0];
  const bestStrategy = analytics.byStrategy[0];
  const bestSession = analytics.bySession
    .filter((row) => row.totalTrades > 0)
    .sort((a, b) => b.netPnl - a.netPnl)[0];
  const worstMistake = analytics.byMistake[0];
  const weakestHour = [...analytics.byHour]
    .filter((row) => row.totalTrades > 0)
    .sort((a, b) => a.netPnl - b.netPnl)[0];
  const missingAiReviews = trades.filter((trade) => trade.aiReviewStatus === "MISSING").length;
  const missingHumanReviews = trades.filter((trade) => trade.humanReviewLabel === "Missing").length;
  const missingStrategyReviews = trades.filter((trade) => !trade.strategyName).length;
  const averageComplianceRows = trades.filter(
    (trade) => trade.compliancePercent !== null
  );
  const averageCompliance =
    averageComplianceRows.length > 0
      ? round(
          averageComplianceRows.reduce(
            (total, trade) => total + toNumber(trade.compliancePercent),
            0
          ) / averageComplianceRows.length,
          1
        )
      : null;
  const latestPlan = dailyNotes.find(
    (note) => note.improvementPlan || note.tomorrowPlan
  );

  const strengths = [
    summary.totalPnl > 0
      ? {
          en: `${summary.closedTrades} closed trades produced ${summary.totalPnl.toLocaleString("en-US")} net PnL with ${summary.winRate}% win rate.`,
          fa: `سود/زیان خالص در این بازه مثبت است: ${summary.totalPnl.toLocaleString("en-US")}.`,
        }
      : {
          en: `${summary.closedTrades} closed trades are included; current net PnL is ${summary.totalPnl.toLocaleString("en-US")} with ${summary.winRate}% win rate.`,
          fa: "این گزارش یک خط پایه شفاف برای بازه انتخاب‌شده ایجاد می‌کند.",
        },
    bestSymbol
      ? {
          en: `${bestSymbol.symbol} is the strongest symbol with ${bestSymbol.netPnl.toLocaleString("en-US")} net PnL.`,
          fa: `${bestSymbol.symbol} قوی‌ترین نماد بوده و ${bestSymbol.netPnl.toLocaleString("en-US")} سود/زیان خالص داشته است.`,
        }
      : {
          en: "No symbol edge is visible yet.",
          fa: "هنوز مزیت مشخصی در هیچ نمادی دیده نمی‌شود.",
        },
    bestSession
      ? {
          en: `${bestSession.session} is the strongest session with ${bestSession.netPnl.toLocaleString("en-US")} net PnL across ${bestSession.totalTrades} trades.`,
          fa: `${bestSession.session} قوی‌ترین سشن بوده و سود/زیان خالص آن ${bestSession.netPnl.toLocaleString("en-US")} است.`,
        }
      : {
          en: "Session data is not complete enough yet.",
          fa: "داده‌های استراتژی هنوز برای نتیجه‌گیری کامل کافی نیست.",
        },
  ];

  const risks = [
    summary.profitFactor !== null && summary.profitFactor < 1
      ? {
          en: `Profit factor is ${summary.profitFactor}; losses are outweighing wins.`,
          fa: `فاکتور سود ${summary.profitFactor} است؛ زیان‌ها از سودها سنگین‌تر هستند.`,
        }
      : {
          en: `Profit factor is ${summary.profitFactor ?? "not available"}; keep monitoring it as trade count grows.`,
          fa: "با بیشتر شدن تعداد معاملات، فاکتور سود را همچنان زیر نظر بگیر.",
        },
    worstSymbol
      ? {
          en: `${worstSymbol.symbol} is the weakest symbol with ${worstSymbol.netPnl.toLocaleString("en-US")} net PnL.`,
          fa: `${worstSymbol.symbol} ضعیف‌ترین نماد بوده و ${worstSymbol.netPnl.toLocaleString("en-US")} سود/زیان خالص داشته است.`,
        }
      : {
          en: "No weak symbol is visible yet.",
          fa: "هنوز نماد ضعیف مشخصی دیده نمی‌شود.",
        },
    worstMistake
      ? {
          en: `${worstMistake.label} is the most expensive repeated mistake.`,
          fa: `${worstMistake.label} پرهزینه‌ترین اشتباه تکراری بوده است.`,
        }
      : {
          en: `${missingAiReviews} trades miss AI review, ${missingHumanReviews} miss human review, and ${missingStrategyReviews} miss strategy/playbook data.`,
          fa: "تگ‌گذاری اشتباهات کامل نیست، بنابراین خواندن ریسک رفتاری سخت‌تر است.",
        },
  ];

  const actionPlan = [
    averageCompliance !== null && averageCompliance < 80
      ? {
          en: `Raise playbook compliance from ${averageCompliance}% toward 80%+ before increasing size.`,
          fa: `قبل از افزایش حجم، پایبندی به پلی‌بوک را از ${averageCompliance}% به بالای 80% برسان.`,
        }
      : {
          en: bestStrategy
            ? `Keep testing ${bestStrategy.strategy}; it has ${bestStrategy.totalTrades} reviewed trades and ${bestStrategy.winRate}% win rate.`
            : "Assign a real strategy/playbook to reviewed trades so this report can separate setup edge from session timing.",
          fa: "حجم معاملات را ثابت نگه دار و رفتارهایی را که نتیجه داده‌اند حفظ کن.",
        },
    weakestHour
      ? {
          en: `Review trades around ${weakestHour.label}; this time block produced ${weakestHour.netPnl.toLocaleString("en-US")} net PnL.`,
          fa: `معاملات حوالی ${weakestHour.label} را بازبینی کن؛ این بازه زمانی ${weakestHour.netPnl.toLocaleString("en-US")} سود/زیان خالص ساخته است.`,
        }
      : {
          en: "Tag sessions and trading hours consistently for sharper timing analysis.",
          fa: "سشن‌ها و ساعت معاملات را منظم تگ کن تا تحلیل زمانی دقیق‌تر شود.",
        },
    latestPlan
      ? {
          en: compactText(latestPlan.improvementPlan || latestPlan.tomorrowPlan, "Write one clear improvement rule for the next session."),
          fa: compactText(latestPlan.improvementPlan || latestPlan.tomorrowPlan, "برای جلسه بعدی یک قانون بهبود واضح بنویس."),
        }
      : {
          en: "Add an end-of-day improvement note so the next report can include a concrete execution plan.",
          fa: "آخر روز یک یادداشت بهبود ثبت کن تا گزارش بعدی برنامه اجرایی مشخص‌تری داشته باشد.",
        },
  ];

  return { strengths, risks, actionPlan };
}

function serializeDailyNote(note: {
  id: string;
  date: Date;
  mood: string | null;
  focusLevel: number | null;
  disciplineScore: number | null;
  whatWentWell: string | null;
  mistakesSummary: string | null;
  improvementPlan: string | null;
  tomorrowPlan: string | null;
  endOfDayNotes: string | null;
}): JournalReportDailyNote {
  return {
    ...note,
    date: note.date.toISOString(),
  };
}

function serializePreTradeCheck(check: {
  id: string;
  date: Date;
  scenario: string;
  decision: string;
  decisionLabel: string | null;
  readinessScore: number;
  mindsetCompleted: number;
  mindsetTotal: number;
  checklistCompleted: number;
  checklistTotal: number;
  selectedPlaybook: string | null;
  mainReason: string | null;
  highImpactEventCount: number;
}): JournalReportPreTradeCheck {
  return {
    ...check,
    date: check.date.toISOString(),
  };
}

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function journalReportToCsv(report: JournalReport, language: "en" | "fa" = "en") {
  const baseHeaders =
    language === "fa"
      ? [
          "زمان ورود",
          "زمان خروج",
          "حساب",
          "نماد",
          "جهت",
          "وضعیت",
          "سود/زیان",
          "RR",
          "ستاپ",
          "سشن",
          "احساس",
          "اشتباه",
          "تگ‌ها",
          "استراتژی",
          "پایبندی به پلن",
          "درصد پایبندی",
          "درصد چک‌لیست",
          "امتیاز",
          "دلیل خروج",
        ]
      : [
          "Opened At",
          "Closed At",
          "Account",
          "Symbol",
          "Direction",
          "Status",
          "PnL",
          "RR",
          "Setup",
          "Session",
          "Emotion",
          "Mistake",
          "Tags",
          "Strategy",
          "Followed Plan",
          "Compliance %",
          "Checklist %",
          "Rating",
          "Exit Reason",
        ];
  const headers = [
    ...baseHeaders,
    "Source",
    "AI Review Status",
    "AI Score",
    "Human Review Status",
    "Combined Review Status",
    "Screenshots",
    ...(language === "fa"
      ? [
          "آمادگی قبل از معامله",
          "تصمیم چک",
          "چک روانشناسی",
          "پلی‌بوک روز",
          "چک‌لیست ورود",
          "دلیل اصلی چک",
        ]
      : [
          "Pre-Trade Readiness",
          "Pre-Trade Decision",
          "Mindset Check",
          "Daily Playbook",
          "Entry Checklist",
          "Pre-Trade Main Reason",
        ]),
  ];
  const rows = report.recentTrades.map((trade) => {
    const preTradeCheck = trade.openedAt
      ? report.preTradeChecks.find((check) => check.date.slice(0, 10) === trade.openedAt?.slice(0, 10))
      : null;

    return [
      trade.openedAt,
      trade.closedAt,
      trade.accountName,
      trade.symbol,
      trade.direction,
      trade.status,
      trade.pnl,
      trade.rr,
      trade.setup,
      trade.session,
      trade.emotion,
      trade.mistake,
      trade.tags.join("; "),
      trade.strategyName,
      trade.followedPlan,
      trade.compliancePercent,
      trade.checklistCompletion,
      trade.rating,
      trade.exitReason,
      trade.source,
      trade.aiReviewStatus,
      trade.aiReviewScore,
      trade.humanReviewLabel,
      trade.combinedReviewStatus,
      trade.screenshotsCount,
      preTradeCheck?.readinessScore ?? "",
      preTradeCheck?.decisionLabel || preTradeCheck?.decision || "",
      preTradeCheck
        ? `${preTradeCheck.mindsetCompleted}/${preTradeCheck.mindsetTotal}`
        : "",
      preTradeCheck?.selectedPlaybook || "",
      preTradeCheck
        ? `${preTradeCheck.checklistCompleted}/${preTradeCheck.checklistTotal}`
        : "",
      preTradeCheck?.mainReason || "",
    ];
  });

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

export async function buildJournalReport(
  userId: string,
  params: ReportSearchParams = {}
): Promise<JournalReport> {
  const { filters, dateFrom, dateTo, errors } = normalizeJournalReportFilters(params);

  if (errors.length > 0) {
    throw new ReportValidationError(errors);
  }

  const where = buildTradeWhere(userId, filters, dateFrom, dateTo);
  const dailyWhere: Prisma.DailyJournalWhereInput = {
    userId,
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  };
  const preTradeWhere: Prisma.PreTradeCheckWhereInput = {
    userId,
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  };
  const [trades, metadataTrades, accounts, playbooks, dailyNotes, preTradeChecks] =
    await Promise.all([
      prisma.trade.findMany({
        where,
        include: reportTradeInclude,
        orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      }),
      prisma.trade.findMany({
        where: { userId },
        include: analyticsTradeInclude,
        orderBy: [{ symbol: "asc" }, { openedAt: "asc" }],
      }),
      prisma.tradingAccount.findMany({
        where: { userId },
        select: { id: true, name: true, broker: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.playbookStrategy.findMany({
        where: { userId },
        select: { id: true, name: true, isActive: true },
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.dailyJournal.findMany({
        where: dailyWhere,
        select: {
          id: true,
          date: true,
          mood: true,
          focusLevel: true,
          disciplineScore: true,
          whatWentWell: true,
          mistakesSummary: true,
          improvementPlan: true,
          tomorrowPlan: true,
          endOfDayNotes: true,
        },
        orderBy: { date: "desc" },
        take: 14,
      }),
      prisma.preTradeCheck.findMany({
        where: preTradeWhere,
        select: {
          id: true,
          date: true,
          scenario: true,
          decision: true,
          decisionLabel: true,
          readinessScore: true,
          mindsetCompleted: true,
          mindsetTotal: true,
          checklistCompleted: true,
          checklistTotal: true,
          selectedPlaybook: true,
          mainReason: true,
          highImpactEventCount: true,
        },
        orderBy: { date: "desc" },
        take: 31,
      }),
    ]);
  const reportTrades = trades.filter((trade) => matchesPostQueryFilters(trade, filters));
  const serializedTrades = reportTrades.map(serializeTrade);
  const metadata = buildAnalyticsMetadata(metadataTrades);
  const analytics = buildTradeAnalytics(reportTrades, metadata);
  const summary = summarizeTrades(serializedTrades);
  const aiSummary = buildAIReviewSummary(reportTrades);
  const tradeReports = reportTrades.map(serializeTradeReport);
  const serializedDailyNotes = dailyNotes.map(serializeDailyNote);
  const serializedPreTradeChecks = preTradeChecks.map(serializePreTradeCheck);

  return {
    success: true,
    generatedAt: new Date().toISOString(),
    filters,
    filterOptions: {
      accounts,
      symbols: metadata.symbols,
      playbooks,
      strategies: metadata.strategies,
    },
    summary,
    analytics,
    aiSummary,
    recentTrades: serializedTrades,
    tradeReports,
    dailyNotes: serializedDailyNotes,
    preTradeChecks: serializedPreTradeChecks,
    insights: buildInsights(summary, analytics, serializedTrades, serializedDailyNotes),
  };
}

export async function getJournalReportFilterOptions(userId: string): Promise<JournalReportFilterOptions> {
  const [metadataTrades, accounts, playbooks] = await Promise.all([
    prisma.trade.findMany({
      where: { userId },
      include: analyticsTradeInclude,
      orderBy: [{ symbol: "asc" }, { openedAt: "asc" }],
    }),
    prisma.tradingAccount.findMany({
      where: { userId },
      select: { id: true, name: true, broker: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.playbookStrategy.findMany({
      where: { userId },
      select: { id: true, name: true, isActive: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
  ]);
  const metadata = buildAnalyticsMetadata(metadataTrades);

  return {
    accounts,
    symbols: metadata.symbols,
    playbooks,
    strategies: metadata.strategies,
  };
}
