ALTER TYPE "TradingAccountIngestionMode" ADD VALUE 'DIRECT_CTRADER';

CREATE TYPE "CtraderDirectConnectionStatus" AS ENUM (
  'PENDING',
  'CONNECTING',
  'INITIAL_SYNC',
  'ACTIVE',
  'ERROR',
  'DISCONNECTED'
);

ALTER TABLE "TradingAccount" ADD COLUMN "ctraderAccountId" TEXT;

CREATE TABLE "CtraderOAuthGrant" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "permissionScope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CtraderOAuthGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CtraderDirectConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "grantId" TEXT NOT NULL,
  "ctidTraderAccountId" TEXT NOT NULL,
  "traderLogin" TEXT,
  "environment" TEXT NOT NULL,
  "brokerName" TEXT,
  "status" "CtraderDirectConnectionStatus" NOT NULL DEFAULT 'PENDING',
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
  CONSTRAINT "CtraderDirectConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CtraderBrokerDeal" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalDealId" TEXT NOT NULL,
  "externalOrderId" TEXT,
  "externalPositionId" TEXT NOT NULL,
  "symbolId" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "tradeSide" INTEGER NOT NULL,
  "isClosing" BOOLEAN NOT NULL DEFAULT false,
  "volume" DECIMAL(18,4) NOT NULL,
  "price" DECIMAL(18,8) NOT NULL,
  "commission" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "swap" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "profit" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "executedAt" TIMESTAMP(3) NOT NULL,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CtraderBrokerDeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CtraderOAuthGrant_userId_key" ON "CtraderOAuthGrant"("userId");
CREATE INDEX "CtraderOAuthGrant_accessTokenExpiresAt_idx" ON "CtraderOAuthGrant"("accessTokenExpiresAt");
CREATE UNIQUE INDEX "CtraderDirectConnection_accountId_key" ON "CtraderDirectConnection"("accountId");
CREATE UNIQUE INDEX "CtraderDirectConnection_userId_ctidTraderAccountId_key" ON "CtraderDirectConnection"("userId", "ctidTraderAccountId");
CREATE INDEX "CtraderDirectConnection_grantId_idx" ON "CtraderDirectConnection"("grantId");
CREATE INDEX "CtraderDirectConnection_enabled_status_idx" ON "CtraderDirectConnection"("enabled", "status");
CREATE INDEX "CtraderDirectConnection_leaseUntil_idx" ON "CtraderDirectConnection"("leaseUntil");
CREATE INDEX "CtraderDirectConnection_lastSyncAt_idx" ON "CtraderDirectConnection"("lastSyncAt");
CREATE UNIQUE INDEX "CtraderBrokerDeal_connectionId_externalDealId_key" ON "CtraderBrokerDeal"("connectionId", "externalDealId");
CREATE INDEX "CtraderBrokerDeal_accountId_externalPositionId_idx" ON "CtraderBrokerDeal"("accountId", "externalPositionId");
CREATE INDEX "CtraderBrokerDeal_connectionId_executedAt_idx" ON "CtraderBrokerDeal"("connectionId", "executedAt");
CREATE INDEX "CtraderBrokerDeal_externalOrderId_idx" ON "CtraderBrokerDeal"("externalOrderId");
CREATE INDEX "TradingAccount_ctraderAccountId_idx" ON "TradingAccount"("ctraderAccountId");

ALTER TABLE "CtraderOAuthGrant" ADD CONSTRAINT "CtraderOAuthGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CtraderDirectConnection" ADD CONSTRAINT "CtraderDirectConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CtraderDirectConnection" ADD CONSTRAINT "CtraderDirectConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CtraderDirectConnection" ADD CONSTRAINT "CtraderDirectConnection_grantId_fkey" FOREIGN KEY ("grantId") REFERENCES "CtraderOAuthGrant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CtraderBrokerDeal" ADD CONSTRAINT "CtraderBrokerDeal_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CtraderDirectConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CtraderBrokerDeal" ADD CONSTRAINT "CtraderBrokerDeal_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
