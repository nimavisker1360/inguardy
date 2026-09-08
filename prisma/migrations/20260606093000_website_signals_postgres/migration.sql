-- CreateEnum
CREATE TYPE "WebsiteSignalDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "WebsiteSignalStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WebsiteSignalCloseReason" AS ENUM ('TP', 'SL');

-- CreateTable
CREATE TABLE "WebsiteSignal" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "direction" "WebsiteSignalDirection" NOT NULL,
    "entry" DECIMAL(18,5) NOT NULL,
    "stopLoss" DECIMAL(18,5) NOT NULL,
    "takeProfit" DECIMAL(18,5) NOT NULL,
    "timeframe" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "status" "WebsiteSignalStatus" NOT NULL DEFAULT 'OPEN',
    "ticket" TEXT,
    "closeReason" "WebsiteSignalCloseReason",
    "closePrice" DECIMAL(18,5),
    "resultSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "WebsiteSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteSignal_createdAt_idx" ON "WebsiteSignal"("createdAt");

-- CreateIndex
CREATE INDEX "WebsiteSignal_symbol_createdAt_idx" ON "WebsiteSignal"("symbol", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteSignal_status_createdAt_idx" ON "WebsiteSignal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteSignal_direction_createdAt_idx" ON "WebsiteSignal"("direction", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteSignal_closeReason_createdAt_idx" ON "WebsiteSignal"("closeReason", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteSignal_ticket_idx" ON "WebsiteSignal"("ticket");
