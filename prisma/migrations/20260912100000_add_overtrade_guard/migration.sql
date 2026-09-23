ALTER TABLE "PropFirmChallenge"
  ADD COLUMN "guardEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "maxDailyEntries" INTEGER,
  ADD COLUMN "maxConsecutiveLosses" INTEGER,
  ADD COLUMN "lossCooldownMinutes" INTEGER,
  ADD COLUMN "manualPauseUntil" TIMESTAMP(3);
