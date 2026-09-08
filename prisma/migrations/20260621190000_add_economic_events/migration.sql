-- CreateTable
CREATE TABLE "EconomicEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "impact" TEXT NOT NULL,
    "category" TEXT,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "actual" TEXT,
    "forecast" TEXT,
    "previous" TEXT,
    "outcome" TEXT,
    "strength" TEXT,
    "quality" TEXT,
    "source" TEXT NOT NULL DEFAULT 'jblanked-forex-factory',
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EconomicEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EconomicEvent_name_currency_eventTime_source_key" ON "EconomicEvent"("name", "currency", "eventTime", "source");

-- CreateIndex
CREATE INDEX "EconomicEvent_eventTime_idx" ON "EconomicEvent"("eventTime");

-- CreateIndex
CREATE INDEX "EconomicEvent_currency_idx" ON "EconomicEvent"("currency");

-- CreateIndex
CREATE INDEX "EconomicEvent_impact_idx" ON "EconomicEvent"("impact");
