export interface DisplaySignal {
  id: string;
  pair: string;
  type: "buy" | "sell";
  direction?: "BUY" | "SELL";
  price: number;
  takeProfit: number[];
  stopLoss: number;
  timestamp: string;
  success?: boolean;
  isPremium?: boolean;
  pairColor?: string;
  isOpen?: boolean;
  closeReason?: "TP" | "SL";
  closePrice?: number;
  closedAt?: string;
  createdAt?: string;
  source?: string;
  status?: "OPEN" | "CLOSED";
  timeframe?: string;
  ticket?: string;
  resultSource?: "stored" | "derived" | "python";
}

export type SignalStatusFilter = "all" | "open" | "closed" | "tp" | "sl";
export type SignalDirectionFilter = "all" | "BUY" | "SELL";
export type SignalDateFilter = "all" | "today" | "yesterday" | "week";

export interface SignalQueryOptions {
  limit?: number;
  page?: number;
  status?: SignalStatusFilter;
  symbol?: string;
  direction?: SignalDirectionFilter;
  date?: SignalDateFilter;
  includeTestSignals?: boolean;
}

export interface SignalPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SignalSummary {
  today: number;
  open: number;
  tpHit: number;
  slHit: number;
}

export interface DailySignalSummary {
  dateKey: string;
  label: string;
  signalCount: number;
  open: number;
  tpHit: number;
  slHit: number;
  profitPips: number;
  lossPips: number;
  netPips: number;
}

export interface SignalListResponse {
  signals: DisplaySignal[];
  pagination: SignalPagination;
  summary: SignalSummary;
  dailySummaries: DailySignalSummary[];
}
