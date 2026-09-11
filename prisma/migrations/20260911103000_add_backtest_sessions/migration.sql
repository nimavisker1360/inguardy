CREATE TABLE "BacktestSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "playbookId" TEXT,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "historySize" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL DEFAULT 700,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentCandleTime" TIMESTAMP(3),
    "activePosition" JSONB,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacktestSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BacktestTrade" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "clientPositionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "entry" DECIMAL(24,8) NOT NULL,
    "stopLoss" DECIMAL(24,8) NOT NULL,
    "takeProfit" DECIMAL(24,8) NOT NULL,
    "exitPrice" DECIMAL(24,8),
    "volume" DECIMAL(18,8),
    "riskAmount" DECIMAL(18,2) NOT NULL,
    "riskReward" DECIMAL(12,4) NOT NULL,
    "resultR" DECIMAL(12,4),
    "profitLoss" DECIMAL(18,2),
    "placedAtIndex" INTEGER NOT NULL,
    "lastEvaluatedIndex" INTEGER NOT NULL,
    "openedAtIndex" INTEGER,
    "closedAtIndex" INTEGER,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacktestTrade_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BacktestSession_userId_status_updatedAt_idx" ON "BacktestSession"("userId", "status", "updatedAt");
CREATE INDEX "BacktestSession_accountId_idx" ON "BacktestSession"("accountId");
CREATE INDEX "BacktestSession_playbookId_idx" ON "BacktestSession"("playbookId");
CREATE UNIQUE INDEX "BacktestTrade_sessionId_clientPositionId_key" ON "BacktestTrade"("sessionId", "clientPositionId");
CREATE INDEX "BacktestTrade_sessionId_status_idx" ON "BacktestTrade"("sessionId", "status");
CREATE INDEX "BacktestTrade_closedAt_idx" ON "BacktestTrade"("closedAt");

ALTER TABLE "BacktestSession" ADD CONSTRAINT "BacktestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BacktestSession" ADD CONSTRAINT "BacktestSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BacktestSession" ADD CONSTRAINT "BacktestSession_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "PlaybookStrategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BacktestTrade" ADD CONSTRAINT "BacktestTrade_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "BacktestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
