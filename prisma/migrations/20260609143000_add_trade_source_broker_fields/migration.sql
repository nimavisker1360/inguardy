ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "mt5Ticket" TEXT;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "commission" DECIMAL(18, 2);
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "swap" DECIMAL(18, 2);

UPDATE "Trade"
SET
  "source" = 'MT5',
  "mt5Ticket" = regexp_replace("setup", '^MT5:', '')
WHERE "setup" LIKE 'MT5:%';

CREATE INDEX IF NOT EXISTS "Trade_source_idx" ON "Trade"("source");
CREATE INDEX IF NOT EXISTS "Trade_mt5Ticket_idx" ON "Trade"("mt5Ticket");
