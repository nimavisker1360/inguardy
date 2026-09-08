import type { ObjectId } from "mongodb";

export type JournalTradeType = "buy" | "sell";
export type JournalSourceType = "manual" | "expert_advisor" | "bot" | "unknown";
export type JournalEntrySource =
  | "market_order"
  | "pending_order_activation"
  | "manual_trade"
  | "expert_advisor"
  | "unknown";
export type JournalTradeResult = "win" | "loss" | "breakeven" | "open";
export type JournalTradeStatus = "open" | "partially_closed" | "closed";
export type JournalScreenshotStatus =
  | "pending"
  | "captured"
  | "uploaded"
  | "failed"
  | "disabled"
  | "not_requested";

export type Psychology = {
  confidenceScore: number | null;
  emotionBefore: string | null;
  emotionAfter: string | null;
  followedPlan: boolean | "partially" | null;
  mistakeTag: string | null;
  entryReason: string | null;
  personalNote: string | null;
  lessonLearned: string | null;
};

export type JournalEvent = {
  eventType: string;
  idempotencyKey: string;
  ticket: string | null;
  positionId: string | null;
  orderTicket: string | null;
  dealTicket: string | null;
  symbol: string | null;
  price: number | null;
  volume: number | null;
  profit: number | null;
  eventTime: Date;
  rawPayload: unknown;
};

export type JournalTrade = {
  _id?: ObjectId;
  userId: string | null;
  licenseKeyHash: string | null;
  accountNumber: string;
  broker: string;
  serverName: string;
  symbol: string;
  ticket: string | null;
  positionId: string | null;
  orderTicket: string | null;
  dealTicketOpen: string | null;
  dealTicketClose: string | null;
  tradeType: JournalTradeType;
  lotSize: number | null;
  entryPrice: number | null;
  closePrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskAmount: number | null;
  targetRR: number | null;
  actualRR: number | null;
  profit: number | null;
  profitPercent: number | null;
  commission: number | null;
  swap: number | null;
  magicNumber: number | null;
  comment: string | null;
  sourceType: JournalSourceType;
  entrySource: JournalEntrySource;
  timeframe: string | null;
  spread: number | null;
  atr: number | null;
  rsi: number | null;
  session: string | null;
  openTime: Date | null;
  closeTime: Date | null;
  durationSeconds: number | null;
  result: JournalTradeResult;
  status: JournalTradeStatus;
  entryScreenshotUrl: string | null;
  exitScreenshotUrl: string | null;
  entryScreenshotStatus: JournalScreenshotStatus | string | null;
  exitScreenshotStatus: JournalScreenshotStatus | string | null;
  psychology: Psychology | null;
  tags: string[];
  events: JournalEvent[];
  createdAt: Date;
  updatedAt: Date;
};

export type JournalTradeInput = Partial<
  Omit<JournalTrade, "_id" | "createdAt" | "updatedAt" | "events">
> & {
  accountNumber: string;
  broker: string;
  serverName: string;
  symbol: string;
  tradeType: JournalTradeType;
  events?: JournalEvent[];
};

export type JournalEventInput = Partial<JournalEvent> & {
  eventType: string;
  idempotencyKey: string;
};

export type JournalQueryOptions = {
  accountNumber?: string;
  broker?: string;
  serverName?: string;
  symbol?: string;
  status?: JournalTradeStatus;
  result?: JournalTradeResult;
  tradeType?: JournalTradeType;
  from?: Date;
  to?: Date;
  limit?: number;
  page?: number;
};

export type JournalSummary = {
  total: number;
  open: number;
  closed: number;
  partiallyClosed: number;
  wins: number;
  losses: number;
  breakeven: number;
  netProfit: number;
};
