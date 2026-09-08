-- Drop the account-owned journal relation. Daily journals are one record per user per date.
ALTER TABLE "DailyJournal" DROP CONSTRAINT IF EXISTS "DailyJournal_accountId_fkey";

-- Preserve useful legacy values while expanding the journal into the day-level workflow.
ALTER TABLE "DailyJournal"
  ADD COLUMN IF NOT EXISTS "marketBias" TEXT,
  ADD COLUMN IF NOT EXISTS "todayFocus" TEXT,
  ADD COLUMN IF NOT EXISTS "maxTradesAllowed" INTEGER,
  ADD COLUMN IF NOT EXISTS "maxDailyLoss" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "mainPlaybookId" TEXT,
  ADD COLUMN IF NOT EXISTS "symbolsToTrade" TEXT,
  ADD COLUMN IF NOT EXISTS "newsToWatch" TEXT,
  ADD COLUMN IF NOT EXISTS "preMarketNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "focusLevel" INTEGER,
  ADD COLUMN IF NOT EXISTS "confidenceLevel" INTEGER,
  ADD COLUMN IF NOT EXISTS "stressLevel" INTEGER,
  ADD COLUMN IF NOT EXISTS "sleepQuality" TEXT,
  ADD COLUMN IF NOT EXISTS "disciplineScore" INTEGER,
  ADD COLUMN IF NOT EXISTS "checklistNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "respectedRisk" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "waitedForConfirmation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "avoidedRevengeTrading" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "stoppedAfterDailyLimit" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "followedPlaybook" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "avoidedOvertrading" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "whatWentWell" TEXT,
  ADD COLUMN IF NOT EXISTS "mistakesSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "followedPlanReview" TEXT,
  ADD COLUMN IF NOT EXISTS "improvementPlan" TEXT,
  ADD COLUMN IF NOT EXISTS "tomorrowPlan" TEXT,
  ADD COLUMN IF NOT EXISTS "endOfDayNotes" TEXT;

UPDATE "DailyJournal"
SET
  "preMarketNotes" = COALESCE("preMarketNotes", "plan"),
  "mistakesSummary" = COALESCE("mistakesSummary", "mistakes"),
  "improvementPlan" = COALESCE("improvementPlan", "lesson"),
  "endOfDayNotes" = COALESCE("endOfDayNotes", "notes");

-- Normalize existing dates to UTC day start before enforcing one row per user/day.
UPDATE "DailyJournal"
SET "date" = date_trunc('day', "date");

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "date"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "DailyJournal"
)
DELETE FROM "DailyJournal"
WHERE "id" IN (
  SELECT "id"
  FROM ranked
  WHERE row_number > 1
);

ALTER TABLE "DailyJournal"
  DROP COLUMN IF EXISTS "accountId",
  DROP COLUMN IF EXISTS "notes",
  DROP COLUMN IF EXISTS "plan",
  DROP COLUMN IF EXISTS "mistakes",
  DROP COLUMN IF EXISTS "lesson";

CREATE UNIQUE INDEX IF NOT EXISTS "DailyJournal_userId_date_key" ON "DailyJournal"("userId", "date");
