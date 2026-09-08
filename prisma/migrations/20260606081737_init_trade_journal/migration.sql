-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TradingAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "broker" TEXT,
    "platform" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balance" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "entryPrice" DECIMAL(18,5),
    "exitPrice" DECIMAL(18,5),
    "stopLoss" DECIMAL(18,5),
    "takeProfit" DECIMAL(18,5),
    "lotSize" DECIMAL(18,2),
    "riskAmount" DECIMAL(18,2),
    "profitLoss" DECIMAL(18,2),
    "rr" DECIMAL(10,2),
    "setup" TEXT,
    "session" TEXT,
    "emotion" TEXT,
    "mistake" TEXT,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeScreenshot" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeScreenshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceMemo" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" INTEGER,
    "transcript" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceMemo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyJournal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "mood" TEXT,
    "notes" TEXT,
    "plan" TEXT,
    "mistakes" TEXT,
    "lesson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropFirmChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "startingBalance" DECIMAL(18,2) NOT NULL,
    "profitTarget" DECIMAL(18,2),
    "maxDailyLoss" DECIMAL(18,2),
    "maxTotalLoss" DECIMAL(18,2),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropFirmChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");

-- CreateIndex
CREATE INDEX "Trade_accountId_idx" ON "Trade"("accountId");

-- CreateIndex
CREATE INDEX "Trade_symbol_idx" ON "Trade"("symbol");

-- CreateIndex
CREATE INDEX "Trade_openedAt_idx" ON "Trade"("openedAt");

-- CreateIndex
CREATE INDEX "Trade_closedAt_idx" ON "Trade"("closedAt");

-- CreateIndex
CREATE INDEX "TradeScreenshot_tradeId_idx" ON "TradeScreenshot"("tradeId");

-- CreateIndex
CREATE INDEX "TradeScreenshot_userId_idx" ON "TradeScreenshot"("userId");

-- CreateIndex
CREATE INDEX "VoiceMemo_tradeId_idx" ON "VoiceMemo"("tradeId");

-- CreateIndex
CREATE INDEX "VoiceMemo_userId_idx" ON "VoiceMemo"("userId");

-- CreateIndex
CREATE INDEX "DailyJournal_userId_idx" ON "DailyJournal"("userId");

-- CreateIndex
CREATE INDEX "DailyJournal_date_idx" ON "DailyJournal"("date");

-- CreateIndex
CREATE INDEX "Playbook_userId_idx" ON "Playbook"("userId");

-- CreateIndex
CREATE INDEX "PropFirmChallenge_userId_idx" ON "PropFirmChallenge"("userId");

-- CreateIndex
CREATE INDEX "PropFirmChallenge_accountId_idx" ON "PropFirmChallenge"("accountId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeScreenshot" ADD CONSTRAINT "TradeScreenshot_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceMemo" ADD CONSTRAINT "VoiceMemo_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyJournal" ADD CONSTRAINT "DailyJournal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
