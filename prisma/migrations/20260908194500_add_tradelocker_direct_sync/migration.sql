ALTER TYPE "TradingAccountIngestionMode" ADD VALUE 'DIRECT_TRADELOCKER';

CREATE TYPE "TradeLockerConnectionStatus" AS ENUM (
  'CONNECTED',
  'SYNCING',
  'ERROR',
  'REAUTH_REQUIRED',
  'DISCONNECTED'
);

ALTER TABLE "TradingAccount" ADD COLUMN "tradeLockerAccountId" TEXT;
ALTER TABLE "Trade" ADD COLUMN "tradeLockerPositionId" TEXT;

CREATE TABLE "TradeLockerAuthSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "server" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT NOT NULL,
  "refreshTokenEncrypted" TEXT NOT NULL,
  "accessTokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeLockerAuthSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeLockerConnection" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "server" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tradeLockerAccountId" TEXT NOT NULL,
  "accNum" TEXT NOT NULL,
  "accountName" TEXT,
  "accountStatus" TEXT,
  "accessTokenEncrypted" TEXT,
  "refreshTokenEncrypted" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "tokenVersion" INTEGER NOT NULL DEFAULT 0,
  "tokenRefreshOwner" TEXT,
  "tokenRefreshUntil" TIMESTAMP(3),
  "status" "TradeLockerConnectionStatus" NOT NULL DEFAULT 'SYNCING',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "historyStartAt" TIMESTAMP(3) NOT NULL,
  "cursorAt" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "lastConnectedAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "lastError" TEXT,
  "importedOrderCount" INTEGER NOT NULL DEFAULT 0,
  "importedExecutionCount" INTEGER NOT NULL DEFAULT 0,
  "leaseOwner" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TradeLockerConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeLockerOrder" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalOrderId" TEXT NOT NULL,
  "dataKind" TEXT NOT NULL,
  "externalPositionId" TEXT,
  "tradableInstrumentId" TEXT,
  "side" TEXT,
  "orderType" TEXT,
  "status" TEXT,
  "quantity" DECIMAL(24,8),
  "filledQuantity" DECIMAL(24,8),
  "averagePrice" DECIMAL(24,10),
  "createdAtProvider" TIMESTAMP(3),
  "modifiedAtProvider" TIMESTAMP(3),
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeLockerOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeLockerExecution" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalExecutionId" TEXT NOT NULL,
  "externalOrderId" TEXT,
  "externalPositionId" TEXT,
  "tradableInstrumentId" TEXT,
  "side" TEXT,
  "quantity" DECIMAL(24,8),
  "price" DECIMAL(24,10),
  "executedAt" TIMESTAMP(3),
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeLockerExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeLockerPosition" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "externalPositionId" TEXT NOT NULL,
  "tradableInstrumentId" TEXT,
  "side" TEXT,
  "quantity" DECIMAL(24,8),
  "averagePrice" DECIMAL(24,10),
  "unrealizedPnl" DECIMAL(18,2),
  "openedAt" TIMESTAMP(3),
  "isOpen" BOOLEAN NOT NULL DEFAULT true,
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TradeLockerPosition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeLockerInstrument" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "tradableInstrumentId" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT,
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TradeLockerInstrument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeLockerAccountSnapshot" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "capturedAt" TIMESTAMP(3) NOT NULL,
  "balance" DECIMAL(18,2),
  "equity" DECIMAL(18,2),
  "floatingPnl" DECIMAL(18,2),
  "margin" DECIMAL(18,2),
  "freeMargin" DECIMAL(18,2),
  "rawPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TradeLockerAccountSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TradingAccount_tradeLockerAccountId_idx" ON "TradingAccount"("tradeLockerAccountId");
CREATE UNIQUE INDEX "Trade_accountId_tradeLockerPositionId_key" ON "Trade"("accountId", "tradeLockerPositionId");
CREATE INDEX "TradeLockerAuthSession_userId_expiresAt_idx" ON "TradeLockerAuthSession"("userId", "expiresAt");
CREATE UNIQUE INDEX "TradeLockerConnection_accountId_key" ON "TradeLockerConnection"("accountId");
CREATE UNIQUE INDEX "TradeLockerConnection_userId_environment_server_tradeLockerAccountId_key" ON "TradeLockerConnection"("userId", "environment", "server", "tradeLockerAccountId");
CREATE INDEX "TradeLockerConnection_enabled_status_idx" ON "TradeLockerConnection"("enabled", "status");
CREATE INDEX "TradeLockerConnection_leaseUntil_idx" ON "TradeLockerConnection"("leaseUntil");
CREATE INDEX "TradeLockerConnection_lastSyncAt_idx" ON "TradeLockerConnection"("lastSyncAt");
CREATE INDEX "TradeLockerConnection_tokenRefreshUntil_idx" ON "TradeLockerConnection"("tokenRefreshUntil");
CREATE UNIQUE INDEX "TradeLockerOrder_connectionId_externalOrderId_dataKind_key" ON "TradeLockerOrder"("connectionId", "externalOrderId", "dataKind");
CREATE INDEX "TradeLockerOrder_connectionId_externalPositionId_idx" ON "TradeLockerOrder"("connectionId", "externalPositionId");
CREATE INDEX "TradeLockerOrder_connectionId_modifiedAtProvider_idx" ON "TradeLockerOrder"("connectionId", "modifiedAtProvider");
CREATE UNIQUE INDEX "TradeLockerExecution_connectionId_externalExecutionId_key" ON "TradeLockerExecution"("connectionId", "externalExecutionId");
CREATE INDEX "TradeLockerExecution_connectionId_externalPositionId_idx" ON "TradeLockerExecution"("connectionId", "externalPositionId");
CREATE INDEX "TradeLockerExecution_connectionId_executedAt_idx" ON "TradeLockerExecution"("connectionId", "executedAt");
CREATE UNIQUE INDEX "TradeLockerPosition_connectionId_externalPositionId_key" ON "TradeLockerPosition"("connectionId", "externalPositionId");
CREATE INDEX "TradeLockerPosition_accountId_isOpen_idx" ON "TradeLockerPosition"("accountId", "isOpen");
CREATE UNIQUE INDEX "TradeLockerInstrument_connectionId_tradableInstrumentId_key" ON "TradeLockerInstrument"("connectionId", "tradableInstrumentId");
CREATE INDEX "TradeLockerInstrument_connectionId_name_idx" ON "TradeLockerInstrument"("connectionId", "name");
CREATE UNIQUE INDEX "TradeLockerAccountSnapshot_connectionId_capturedAt_key" ON "TradeLockerAccountSnapshot"("connectionId", "capturedAt");
CREATE INDEX "TradeLockerAccountSnapshot_accountId_capturedAt_idx" ON "TradeLockerAccountSnapshot"("accountId", "capturedAt");

ALTER TABLE "TradeLockerAuthSession" ADD CONSTRAINT "TradeLockerAuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerConnection" ADD CONSTRAINT "TradeLockerConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerConnection" ADD CONSTRAINT "TradeLockerConnection_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerOrder" ADD CONSTRAINT "TradeLockerOrder_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TradeLockerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerOrder" ADD CONSTRAINT "TradeLockerOrder_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerExecution" ADD CONSTRAINT "TradeLockerExecution_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TradeLockerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerExecution" ADD CONSTRAINT "TradeLockerExecution_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerPosition" ADD CONSTRAINT "TradeLockerPosition_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TradeLockerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerPosition" ADD CONSTRAINT "TradeLockerPosition_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerInstrument" ADD CONSTRAINT "TradeLockerInstrument_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TradeLockerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerAccountSnapshot" ADD CONSTRAINT "TradeLockerAccountSnapshot_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "TradeLockerConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TradeLockerAccountSnapshot" ADD CONSTRAINT "TradeLockerAccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
