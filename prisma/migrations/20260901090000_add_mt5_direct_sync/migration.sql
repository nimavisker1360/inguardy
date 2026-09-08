CREATE TYPE "TradingAccountIngestionMode" AS ENUM ('MANUAL', 'EA_LEGACY', 'DIRECT_MT5');
CREATE TYPE "Mt5DirectConnectionStatus" AS ENUM ('PENDING', 'CONNECTING', 'INITIAL_SYNC', 'ACTIVE', 'ERROR', 'DISCONNECTED');

ALTER TABLE "TradingAccount"
ADD COLUMN "ingestionMode" "TradingAccountIngestionMode" NOT NULL DEFAULT 'MANUAL';

UPDATE "TradingAccount"
SET "ingestionMode" = 'EA_LEGACY'
WHERE "journalSecretHash" IS NOT NULL;

CREATE TABLE "Mt5DirectConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "server" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "credentialEncrypted" TEXT,
    "status" "Mt5DirectConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "historyStartAt" TIMESTAMP(3) NOT NULL,
    "cursorAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastConnectedAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "importedDealCount" INTEGER NOT NULL DEFAULT 0,
    "leaseOwner" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mt5DirectConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Mt5BrokerDeal" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "externalDealId" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "externalPositionId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "dealType" INTEGER NOT NULL,
    "entryType" INTEGER NOT NULL,
    "reason" INTEGER,
    "magic" TEXT,
    "volume" DECIMAL(18,4) NOT NULL,
    "price" DECIMAL(18,8) NOT NULL,
    "commission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "swap" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "executedAt" TIMESTAMP(3) NOT NULL,
    "executedAtMsc" BIGINT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mt5BrokerDeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mt5DirectConnection_accountId_key" ON "Mt5DirectConnection"("accountId");
CREATE UNIQUE INDEX "Mt5DirectConnection_userId_server_login_key" ON "Mt5DirectConnection"("userId", "server", "login");
CREATE INDEX "Mt5DirectConnection_enabled_status_idx" ON "Mt5DirectConnection"("enabled", "status");
CREATE INDEX "Mt5DirectConnection_leaseUntil_idx" ON "Mt5DirectConnection"("leaseUntil");
CREATE INDEX "Mt5DirectConnection_lastSyncAt_idx" ON "Mt5DirectConnection"("lastSyncAt");
CREATE UNIQUE INDEX "Mt5BrokerDeal_connectionId_externalDealId_key" ON "Mt5BrokerDeal"("connectionId", "externalDealId");
CREATE INDEX "Mt5BrokerDeal_accountId_externalPositionId_idx" ON "Mt5BrokerDeal"("accountId", "externalPositionId");
CREATE INDEX "Mt5BrokerDeal_connectionId_executedAt_idx" ON "Mt5BrokerDeal"("connectionId", "executedAt");
CREATE INDEX "Mt5BrokerDeal_externalOrderId_idx" ON "Mt5BrokerDeal"("externalOrderId");

ALTER TABLE "Mt5DirectConnection"
ADD CONSTRAINT "Mt5DirectConnection_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mt5DirectConnection"
ADD CONSTRAINT "Mt5DirectConnection_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mt5BrokerDeal"
ADD CONSTRAINT "Mt5BrokerDeal_connectionId_fkey"
FOREIGN KEY ("connectionId") REFERENCES "Mt5DirectConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mt5BrokerDeal"
ADD CONSTRAINT "Mt5BrokerDeal_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
