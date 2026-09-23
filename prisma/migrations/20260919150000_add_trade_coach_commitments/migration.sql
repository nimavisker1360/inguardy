CREATE TABLE "TradeCoachCommitment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "sourceTradeId" TEXT NOT NULL,
    "actionText" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "acceptedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "evaluatedTradeId" TEXT,
    "verdict" TEXT,
    "verdictReason" TEXT,
    "reflection" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TradeCoachCommitment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TradeCoachCommitment_sourceTradeId_key" ON "TradeCoachCommitment"("sourceTradeId");
CREATE INDEX "TradeCoachCommitment_userId_accountId_status_acceptedAt_idx" ON "TradeCoachCommitment"("userId", "accountId", "status", "acceptedAt");
CREATE INDEX "TradeCoachCommitment_evaluatedTradeId_idx" ON "TradeCoachCommitment"("evaluatedTradeId");
CREATE UNIQUE INDEX "TradeCoachCommitment_one_active_per_account_idx" ON "TradeCoachCommitment"("userId", "accountId") WHERE "status" = 'ACCEPTED';

ALTER TABLE "TradeCoachCommitment" ADD CONSTRAINT "TradeCoachCommitment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeCoachCommitment" ADD CONSTRAINT "TradeCoachCommitment_sourceTradeId_fkey" FOREIGN KEY ("sourceTradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeCoachCommitment" ADD CONSTRAINT "TradeCoachCommitment_evaluatedTradeId_fkey" FOREIGN KEY ("evaluatedTradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
