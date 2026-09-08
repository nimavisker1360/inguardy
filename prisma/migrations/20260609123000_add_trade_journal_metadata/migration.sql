CREATE TABLE "TradeJournalMetadata" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER,
    "mistakes" JSONB,
    "setups" JSONB,
    "emotions" JSONB,
    "customTags" JSONB,
    "tradeNote" TEXT,
    "dailyJournal" TEXT,
    "checklistResults" JSONB,
    "psychologyStatus" TEXT,
    "exitReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeJournalMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TradeJournalMetadata_tradeId_key" ON "TradeJournalMetadata"("tradeId");
CREATE INDEX "TradeJournalMetadata_userId_idx" ON "TradeJournalMetadata"("userId");
CREATE INDEX "TradeJournalMetadata_tradeId_idx" ON "TradeJournalMetadata"("tradeId");

ALTER TABLE "TradeJournalMetadata" ADD CONSTRAINT "TradeJournalMetadata_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
