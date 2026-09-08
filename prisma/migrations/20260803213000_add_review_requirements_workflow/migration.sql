DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TradeReviewStatus') THEN
    CREATE TYPE "TradeReviewStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'REVIEWED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DailyJournalStatus') THEN
    CREATE TYPE "DailyJournalStatus" AS ENUM ('DRAFT', 'COMPLETED');
  END IF;
END $$;

ALTER TABLE "Trade"
  ADD COLUMN IF NOT EXISTS "reviewStatus" "TradeReviewStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "playbookId" TEXT,
  ADD COLUMN IF NOT EXISTS "checklistCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "psychologyReviewCompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "strategyReviewCompletedAt" TIMESTAMP(3);

ALTER TABLE "DailyJournal"
  ADD COLUMN IF NOT EXISTS "status" "DailyJournalStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3);

ALTER TABLE "ChecklistItem"
  ADD COLUMN IF NOT EXISTS "isCritical" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "TradeChecklistAnswer"
  ADD COLUMN IF NOT EXISTS "isCriticalSnapshot" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "answeredAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Trade_reviewStatus_idx" ON "Trade"("reviewStatus");
CREATE INDEX IF NOT EXISTS "Trade_playbookId_idx" ON "Trade"("playbookId");
