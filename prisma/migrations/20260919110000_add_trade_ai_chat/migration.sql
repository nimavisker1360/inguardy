CREATE TABLE "TradeAIChatMessage" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isIntro" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeAIChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TradeAIChatMessage_tradeId_userId_createdAt_idx" ON "TradeAIChatMessage"("tradeId", "userId", "createdAt");
CREATE INDEX "TradeAIChatMessage_userId_idx" ON "TradeAIChatMessage"("userId");
CREATE UNIQUE INDEX "TradeAIChatMessage_one_intro_per_trade_idx" ON "TradeAIChatMessage"("tradeId", "userId") WHERE "isIntro" = true;

ALTER TABLE "TradeAIChatMessage" ADD CONSTRAINT "TradeAIChatMessage_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeAIChatMessage" ADD CONSTRAINT "TradeAIChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
