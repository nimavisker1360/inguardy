export type ApiResult<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type TradingAccountDto = {
  id: string;
  userId: string;
  name: string;
  broker: string | null;
  platform: string | null;
  currency: string;
  balance: string | number | null;
  journalEnabled: boolean;
  mt5AccountNumber: string | null;
  ctraderAccountId: string | null;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  ingestionMode: "MANUAL" | "EA_LEGACY" | "DIRECT_MT5" | "DIRECT_CTRADER";
  directConnection: Mt5DirectConnectionDto | null;
  ctraderConnection: CtraderDirectConnectionDto | null;
  hasJournalSecret?: boolean;
  journalUploadSecret?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PropFirmChallengeDto = {
  id: string;
  userId: string;
  accountId: string | null;
  name: string;
  startingBalance: string | number;
  currentBalance: number;
  profitTarget: string | number | null;
  maxDailyLoss: string | number | null;
  maxTotalLoss: string | number | null;
  progress: number;
  todayPnl: number;
  computedStatus: "Active" | "Passed" | "Failed - Daily Loss" | "Failed - Max Loss";
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  account: TradingAccountDto | null;
};

export type TagDto = {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
};

export type TradeTagDto = {
  tradeId: string;
  tagId: string;
  tag: TagDto;
};

export type TradeScreenshotDto = {
  id: string;
  tradeId: string;
  userId: string;
  type: string;
  url: string;
  createdAt: string;
};

export type TradeAIReviewDto = {
  id: string;
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

export type TradeDto = {
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
  aiReviewStatus: "NOT_REVIEWED" | "REVIEWED" | "FAILED" | string;
  aiReviewScore: number | null;
  reviewStatus?: "DRAFT" | "NEEDS_REVIEW" | "REVIEWED" | string;
  reviewedAt?: string | null;
  setup: string | null;
  session: string | null;
  emotion: string | null;
  mistake: string | null;
  notes: string | null;
  openedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  account?: TradingAccountDto | null;
  screenshots?: TradeScreenshotDto[];
  tags?: TradeTagDto[];
  aiReview?: TradeAIReviewDto | null;
  checklistCompletionPercent?: number | null;
  checklistCompletedCount?: number;
  checklistTotalCount?: number;
  reviewRequirements?: {
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
  } | null;
};

export type TradesListData = {
  trades: TradeDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type DashboardOverviewStats = {
  totalTrades: number;
  closedTrades: number;
  totalPnl: number;
  winRate: number;
  openTrades: number;
  notReviewedTrades: number;
};

export type Mt5DirectConnectionDto = {
  id: string;
  server: string;
  login: string;
  status: "PENDING" | "CONNECTING" | "INITIAL_SYNC" | "ACTIVE" | "ERROR" | "DISCONNECTED";
  enabled: boolean;
  lastAttemptAt: string | null;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  importedDealCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CtraderDirectConnectionDto = {
  id: string;
  ctidTraderAccountId: string;
  traderLogin: string | null;
  environment: "live" | "demo" | string;
  brokerName: string | null;
  status: "PENDING" | "CONNECTING" | "INITIAL_SYNC" | "ACTIVE" | "ERROR" | "DISCONNECTED";
  enabled: boolean;
  lastAttemptAt: string | null;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  importedDealCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DashboardPageStatKey =
  | "accounts"
  | "trades"
  | "reviews"
  | "dailyJournal"
  | "readiness"
  | "playbooks"
  | "checklists"
  | "propFirms";

export type DashboardPageStatDto = {
  key: DashboardPageStatKey;
  value: number;
  href: string;
};

export type DashboardOverviewData = {
  activeAccountId: string | null;
  accounts: TradingAccountDto[];
  trades: TradeDto[];
  stats: DashboardOverviewStats;
  pageStats: DashboardPageStatDto[];
};

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoney(
  value: string | number | null | undefined,
  currency = "USD"
) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "-";
  }

  return parsed.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

export function formatNumber(value: string | number | null | undefined, digits = 2) {
  const parsed = toNumber(value);

  if (parsed === null) {
    return "-";
  }

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}
