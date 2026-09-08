CREATE TYPE "TradeUpdateType" AS ENUM ('SL_CHANGED', 'TP_CHANGED');

ALTER TABLE "Trade"
ADD COLUMN "initialStopLoss" DECIMAL(18,5),
ADD COLUMN "initialTakeProfit" DECIMAL(18,5),
ADD COLUMN "currentStopLoss" DECIMAL(18,5),
ADD COLUMN "currentTakeProfit" DECIMAL(18,5);

UPDATE "Trade"
SET
  "initialStopLoss" = COALESCE("initialStopLoss", "stopLoss"),
  "initialTakeProfit" = COALESCE("initialTakeProfit", "takeProfit"),
  "currentStopLoss" = COALESCE("currentStopLoss", "stopLoss"),
  "currentTakeProfit" = COALESCE("currentTakeProfit", "takeProfit");

CREATE TABLE "TradeUpdateLog" (
  "id" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "type" "TradeUpdateType" NOT NULL,
  "oldValue" DECIMAL(18,5),
  "newValue" DECIMAL(18,5),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TradeUpdateLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TradeUpdateLog_tradeId_idx" ON "TradeUpdateLog"("tradeId");
CREATE INDEX "TradeUpdateLog_type_idx" ON "TradeUpdateLog"("type");
CREATE INDEX "TradeUpdateLog_createdAt_idx" ON "TradeUpdateLog"("createdAt");

ALTER TABLE "TradeUpdateLog"
ADD CONSTRAINT "TradeUpdateLog_tradeId_fkey"
FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
