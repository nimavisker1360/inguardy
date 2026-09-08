ALTER TABLE "Trade"
  ADD COLUMN IF NOT EXISTS "aiReviewStatus" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
  ADD COLUMN IF NOT EXISTS "aiReviewScore" INTEGER;

CREATE TABLE IF NOT EXISTS "TradeAIReview" (
  "id" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "summary" TEXT NOT NULL,
  "strengths" TEXT[] NOT NULL,
  "weaknesses" TEXT[] NOT NULL,
  "mistakes" TEXT[] NOT NULL,
  "riskReview" TEXT NOT NULL,
  "psychologyReview" TEXT NOT NULL,
  "playbookReview" TEXT NOT NULL,
  "improvementPlan" TEXT[] NOT NULL,
  "tags" TEXT[] NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TradeAIReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TradeAIReview_tradeId_userId_key"
  ON "TradeAIReview"("tradeId", "userId");

CREATE INDEX IF NOT EXISTS "Trade_aiReviewStatus_idx"
  ON "Trade"("aiReviewStatus");

CREATE INDEX IF NOT EXISTS "TradeAIReview_userId_idx"
  ON "TradeAIReview"("userId");

CREATE INDEX IF NOT EXISTS "TradeAIReview_tradeId_idx"
  ON "TradeAIReview"("tradeId");

CREATE INDEX IF NOT EXISTS "TradeAIReview_score_idx"
  ON "TradeAIReview"("score");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TradeAIReview_tradeId_fkey'
  ) THEN
    ALTER TABLE "TradeAIReview"
      ADD CONSTRAINT "TradeAIReview_tradeId_fkey"
      FOREIGN KEY ("tradeId") REFERENCES "Trade"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TradeAIReview_userId_fkey'
  ) THEN
    ALTER TABLE "TradeAIReview"
      ADD CONSTRAINT "TradeAIReview_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
