ALTER TABLE "TradingAccount"
  ADD COLUMN IF NOT EXISTS "journalEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "journalSecretHash" TEXT,
  ADD COLUMN IF NOT EXISTS "mt5AccountNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "lastConnectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "TradingAccount_journalSecretHash_key"
  ON "TradingAccount"("journalSecretHash");

CREATE INDEX IF NOT EXISTS "TradingAccount_mt5AccountNumber_idx"
  ON "TradingAccount"("mt5AccountNumber");

ALTER TABLE "PlaybookStrategy"
  ALTER COLUMN "userId" DROP DEFAULT;
