CREATE TYPE "RiskLevel" AS ENUM ('SAFE', 'WARNING', 'HIGH_RISK', 'CRITICAL');
CREATE TYPE "RiskMode" AS ENUM ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE', 'CUSTOM');
CREATE INDEX "Trade_accountId_openedAt_idx" ON "Trade"("accountId", "openedAt");
CREATE INDEX "Trade_accountId_closedAt_idx" ON "Trade"("accountId", "closedAt");
ALTER TABLE "AccountEquitySnapshot" ADD COLUMN "marginCallLevel" DECIMAL(18,4), ADD COLUMN "stopOutLevel" DECIMAL(18,4);

CREATE TABLE "RiskSettings" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "accountId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true, "riskMode" "RiskMode" NOT NULL DEFAULT 'BALANCED',
  "warningMarginLevel" DOUBLE PRECISION NOT NULL DEFAULT 300,
  "highRiskMarginLevel" DOUBLE PRECISION NOT NULL DEFAULT 200,
  "criticalMarginLevel" DOUBLE PRECISION NOT NULL DEFAULT 150,
  "marginCallLevel" DOUBLE PRECISION, "stopOutLevel" DOUBLE PRECISION,
  "maxDailyDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "maxTotalDrawdown" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "maxOpenPositions" INTEGER NOT NULL DEFAULT 10,
  "maxTotalLots" DOUBLE PRECISION NOT NULL DEFAULT 5,
  "maxExposurePercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
  "lossVelocityThreshold" DOUBLE PRECISION NOT NULL DEFAULT 10,
  "emailAlerts" BOOLEAN NOT NULL DEFAULT true, "inAppAlerts" BOOLEAN NOT NULL DEFAULT true,
  "pushAlerts" BOOLEAN NOT NULL DEFAULT false, "telegramAlerts" BOOLEAN NOT NULL DEFAULT false,
  "notificationCooldownMinutes" INTEGER NOT NULL DEFAULT 15,
  "currentLevel" "RiskLevel" NOT NULL DEFAULT 'SAFE', "currentScore" INTEGER NOT NULL DEFAULT 0,
  "lastSnapshotAt" TIMESTAMP(3), "peakEquity" DOUBLE PRECISION, "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RiskSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RiskSettings_accountId_key" ON "RiskSettings"("accountId");
CREATE INDEX "RiskSettings_userId_idx" ON "RiskSettings"("userId");
ALTER TABLE "RiskSettings" ADD CONSTRAINT "RiskSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskSettings" ADD CONSTRAINT "RiskSettings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RiskEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "accountId" TEXT NOT NULL,
  "riskLevel" "RiskLevel" NOT NULL, "riskScore" INTEGER NOT NULL,
  "balance" DOUBLE PRECISION, "equity" DOUBLE PRECISION, "usedMargin" DOUBLE PRECISION,
  "freeMargin" DOUBLE PRECISION, "marginLevel" DOUBLE PRECISION,
  "dailyDrawdown" DOUBLE PRECISION, "totalDrawdown" DOUBLE PRECISION,
  "totalLots" DOUBLE PRECISION, "openPositions" INTEGER,
  "reasons" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3), CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RiskEvent_accountId_createdAt_idx" ON "RiskEvent"("accountId", "createdAt");
CREATE INDEX "RiskEvent_userId_createdAt_idx" ON "RiskEvent"("userId", "createdAt");
CREATE INDEX "RiskEvent_riskLevel_createdAt_idx" ON "RiskEvent"("riskLevel", "createdAt");
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskEvent" ADD CONSTRAINT "RiskEvent_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RiskNotification" (
  "id" TEXT NOT NULL, "riskEventId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL, "channel" TEXT NOT NULL, "status" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0, "nextAttemptAt" TIMESTAMP(3), "leaseUntil" TIMESTAMP(3),
  "failureReason" TEXT, "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3), CONSTRAINT "RiskNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RiskNotification_riskEventId_channel_key" ON "RiskNotification"("riskEventId", "channel");
CREATE INDEX "RiskNotification_userId_createdAt_idx" ON "RiskNotification"("userId", "createdAt");
CREATE INDEX "RiskNotification_accountId_createdAt_idx" ON "RiskNotification"("accountId", "createdAt");
CREATE INDEX "RiskNotification_status_nextAttemptAt_idx" ON "RiskNotification"("status", "nextAttemptAt");
ALTER TABLE "RiskNotification" ADD CONSTRAINT "RiskNotification_riskEventId_fkey" FOREIGN KEY ("riskEventId") REFERENCES "RiskEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskNotification" ADD CONSTRAINT "RiskNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskNotification" ADD CONSTRAINT "RiskNotification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
