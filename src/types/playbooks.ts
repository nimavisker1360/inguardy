export type PlaybookRuleSection =
  | "SETUP"
  | "ENTRY"
  | "EXIT"
  | "RISK"
  | "MANAGEMENT"
  | "PSYCHOLOGY";

export type FollowedPlanStatus = "YES" | "PARTIAL" | "NO" | "NOT_REVIEWED";

export type RuleReviewStatus =
  | "FOLLOWED"
  | "VIOLATED"
  | "NOT_APPLICABLE"
  | "NOT_REVIEWED";

export type PlaybookRuleDto = {
  id?: string;
  title: string;
  description: string | null;
  section: PlaybookRuleSection;
  isRequired: boolean;
  sortOrder: number;
};

export type PlaybookChecklistDto = {
  id: string;
  title: string;
  description?: string | null;
  category: string | null;
  isActive: boolean;
  itemCount: number;
};

export type PlaybookChecklistItemDto = {
  id?: string;
  title: string;
  description?: string | null;
  isRequired: boolean;
  sortOrder: number;
};

export type StrategyGroupStats = {
  totalTrades: number;
  winRate: number;
  netPnl: number;
  averagePnl: number;
};

export type StrategyTradeSummary = {
  id: string;
  symbol: string;
  pnl: number;
  rr: number | null;
  openedAt: string | null;
};

export type StrategyAnalyticsDto = {
  totalTrades: number;
  netPnl: number;
  winRate: number;
  lossRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  averageRR: number;
  bestTrade: StrategyTradeSummary | null;
  worstTrade: StrategyTradeSummary | null;
  followedPlanStats: StrategyGroupStats;
  partialFollowedPlanStats: StrategyGroupStats;
  notFollowedPlanStats: StrategyGroupStats;
  notReviewedPlanStats: StrategyGroupStats;
  exampleWinningTrades: StrategyTradeSummary[];
  exampleLosingTrades: StrategyTradeSummary[];
  recentTrades: StrategyTradeSummary[];
};

export type PlaybookStrategyDto = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  marketType: string | null;
  symbols: string | null;
  timeframes: string | null;
  direction: string;
  riskPerTrade: number | null;
  minRiskReward: number | null;
  entryRules: string | null;
  exitRules: string | null;
  riskRules: string | null;
  setupRules: string | null;
  managementRules: string | null;
  psychologyRules: string | null;
  sessionFilter: string | null;
  newsFilter: string | null;
  htfBias: string | null;
  exampleWinningTrade: string | null;
  exampleLosingTrade: string | null;
  tags: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  rules: PlaybookRuleDto[];
  checklistItems: PlaybookChecklistItemDto[];
  checklists: PlaybookChecklistDto[];
  linkedChecklistCount: number;
  ruleCount: number;
  tradeCount: number;
  analytics?: StrategyAnalyticsDto;
};

export type TradeStrategyRuleReviewDto = {
  id: string;
  originalRuleId: string | null;
  ruleTitleSnapshot: string;
  ruleDescriptionSnapshot: string | null;
  ruleSectionSnapshot: PlaybookRuleSection;
  isRequiredSnapshot: boolean;
  status: RuleReviewStatus;
  note: string | null;
  sortOrder: number;
};

export type TradeStrategyReviewDto = {
  id: string;
  tradeId: string;
  strategyId: string | null;
  strategyNameSnapshot: string | null;
  followedPlan: FollowedPlanStatus;
  totalRules: number;
  followedRules: number;
  violatedRules: number;
  requiredRules: number;
  requiredFollowedRules: number;
  compliancePercent: number;
  requiredCompliancePercent: number;
  notes: string | null;
  ruleReviews: TradeStrategyRuleReviewDto[];
};
