ALTER TABLE "TradingAccount"
  ADD COLUMN IF NOT EXISTS "journalSecretEncrypted" TEXT;
