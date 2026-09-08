export type AnalyticsDirection = "BUY" | "SELL";

export type AnalyticsTradeReference = {
  id: string;
  symbol: string;
  direction: AnalyticsDirection;
  pnl: number;
  openedAt: string | null;
  closedAt: string | null;
};

export type AnalyticsOverview = {
  totalNetPnl: number;
  grossProfit: number;
  grossLoss: number;
  winRate: number;
  lossRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  averageRR: number;
  bestTrade: AnalyticsTradeReference | null;
  worstTrade: AnalyticsTradeReference | null;
  maxDrawdown: number;
  currentDrawdown: number;
  expectancyPerTrade: number;
};

export type AnalyticsDirectionalStats = {
  direction: AnalyticsDirection;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  averagePnl: number;
  bestTrade: number;
  worstTrade: number;
};

export type AnalyticsGroupStats = {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number;
  lossRate: number;
  netPnl: number;
  averagePnl: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number | null;
  bestTrade: number;
  worstTrade: number;
};

export type SymbolAnalyticsRow = AnalyticsGroupStats & {
  symbol: string;
};

export type SessionAnalyticsRow = Pick<
  AnalyticsGroupStats,
  "totalTrades" | "winRate" | "netPnl" | "averagePnl"
> & {
  session: "Asia Session" | "London Session" | "New York Session" | "Other";
};

export type WeekdayAnalyticsRow = Pick<
  AnalyticsGroupStats,
  "totalTrades" | "winRate" | "netPnl" | "averagePnl"
> & {
  weekday: string;
  weekdayIndex: number;
};

export type HourlyAnalyticsRow = Pick<
  AnalyticsGroupStats,
  "totalTrades" | "winRate" | "netPnl" | "averagePnl"
> & {
  hour: number;
  label: string;
};

export type StrategyAnalyticsRow = Pick<
  AnalyticsGroupStats,
  "totalTrades" | "winRate" | "netPnl" | "averagePnl" | "profitFactor"
> & {
  strategy: string;
};

export type PsychologyAnalyticsRow = Pick<
  AnalyticsGroupStats,
  "totalTrades" | "winRate" | "netPnl" | "averagePnl"
> & {
  psychologyStatus: string;
};

export type TagAnalyticsRow = Pick<
  AnalyticsGroupStats,
  "totalTrades" | "winRate" | "netPnl" | "averagePnl" | "profitFactor"
> & {
  label: string;
  shareOfTrades: number;
};

export type EquityCurvePoint = {
  index: number;
  date: string;
  label: string;
  equity: number;
  pnl: number;
  tradeId: string;
  symbol: string;
};

export type DrawdownCurvePoint = {
  index: number;
  date: string;
  label: string;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
};

export type AnalyticsMetadata = {
  symbols: string[];
  strategies: string[];
  setups: string[];
  mistakes: string[];
  emotions: string[];
  sessions: string[];
  hasStrategyData: boolean;
  hasPsychologyData: boolean;
  hasTagData: boolean;
};

export type JournalAnalyticsResponse = {
  success: boolean;
  overview: AnalyticsOverview;
  longShort: {
    buy: AnalyticsDirectionalStats;
    sell: AnalyticsDirectionalStats;
  };
  bySymbol: SymbolAnalyticsRow[];
  bySession: SessionAnalyticsRow[];
  byWeekday: WeekdayAnalyticsRow[];
  byHour: HourlyAnalyticsRow[];
  byStrategy: StrategyAnalyticsRow[];
  byPsychology: PsychologyAnalyticsRow[];
  byMistake: TagAnalyticsRow[];
  byEmotion: TagAnalyticsRow[];
  bySetup: TagAnalyticsRow[];
  byTag: TagAnalyticsRow[];
  byChecklistCompletion: TagAnalyticsRow[];
  equityCurve: EquityCurvePoint[];
  drawdownCurve: DrawdownCurvePoint[];
  metadata: AnalyticsMetadata;
};
