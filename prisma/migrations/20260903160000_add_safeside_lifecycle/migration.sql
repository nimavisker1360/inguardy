CREATE TYPE "InsuranceCoverageStatus" AS ENUM ('ACTIVE', 'CLAIM_QUEUED', 'CLAIM_PROCESSING', 'CLAIM_PAID', 'EXPIRED', 'VOID', 'CANCELLED');
CREATE TYPE "InsuranceClaimStatus" AS ENUM ('QUEUED', 'PROCESSING', 'PAID', 'REJECTED', 'CANCELLED');

ALTER TABLE "InsuranceApplication"
  ADD COLUMN "insuredAmount" DECIMAL(18,2),
  ADD COLUMN "premiumRate" DECIMAL(10,6),
  ADD COLUMN "basePremium" DECIMAL(18,2),
  ADD COLUMN "loyaltyDiscountPercent" DECIMAL(5,2),
  ADD COLUMN "quotedPremium" DECIMAL(18,2),
  ADD COLUMN "quotedCoverageDurationDays" INTEGER,
  ADD COLUMN "payoutRate" DECIMAL(5,4);

CREATE TABLE "InsuranceCoverage" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL,
  "policyId" TEXT NOT NULL,
  "status" "InsuranceCoverageStatus" NOT NULL DEFAULT 'ACTIVE',
  "policyVersion" TEXT NOT NULL,
  "riskScoreAtStart" INTEGER NOT NULL,
  "riskLevelAtStart" "InsuranceRiskLevel" NOT NULL,
  "balanceAtStart" DECIMAL(18,2) NOT NULL,
  "insuredAmount" DECIMAL(18,2) NOT NULL,
  "coveragePercent" DECIMAL(5,2) NOT NULL,
  "drawdownLimitPercent" DECIMAL(5,2) NOT NULL,
  "payoutRate" DECIMAL(5,4) NOT NULL,
  "premiumRate" DECIMAL(10,6) NOT NULL,
  "basePremium" DECIMAL(18,2) NOT NULL,
  "loyaltyDiscountPercent" DECIMAL(5,2) NOT NULL,
  "premiumAmount" DECIMAL(18,2) NOT NULL,
  "poolShare" DECIMAL(18,2) NOT NULL,
  "brokerShare" DECIMAL(18,2) NOT NULL,
  "safesideShare" DECIMAL(18,2) NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "voidReason" TEXT,
  "voidedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "loyaltyApplied" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsuranceCoverage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaim" (
  "id" TEXT NOT NULL,
  "claimNumber" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "coverageId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "status" "InsuranceClaimStatus" NOT NULL DEFAULT 'QUEUED',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "balanceAtRequest" DECIMAL(18,2) NOT NULL,
  "actualLoss" DECIMAL(18,2) NOT NULL,
  "payoutAmount" DECIMAL(18,2) NOT NULL,
  "openPositionsAtRequest" INTEGER NOT NULL DEFAULT 0,
  "brokerAcknowledgedAt" TIMESTAMP(3),
  "externalReference" TEXT,
  "decisionReason" TEXT,
  "cancellationReason" TEXT,
  "reviewerId" TEXT,
  "brokerPayload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceLoyaltyProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "successfulCycles" INTEGER NOT NULL DEFAULT 0,
  "premiumDiscountPercent" INTEGER NOT NULL DEFAULT 0,
  "riskScoreReduction" INTEGER NOT NULL DEFAULT 0,
  "lastCoverageId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsuranceLoyaltyProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InsuranceCoverage_applicationId_key" ON "InsuranceCoverage"("applicationId");
CREATE INDEX "InsuranceCoverage_userId_createdAt_idx" ON "InsuranceCoverage"("userId", "createdAt");
CREATE INDEX "InsuranceCoverage_accountId_status_endsAt_idx" ON "InsuranceCoverage"("accountId", "status", "endsAt");
CREATE INDEX "InsuranceCoverage_status_endsAt_idx" ON "InsuranceCoverage"("status", "endsAt");
CREATE UNIQUE INDEX "InsuranceClaim_claimNumber_key" ON "InsuranceClaim"("claimNumber");
CREATE UNIQUE INDEX "InsuranceClaim_idempotencyKey_key" ON "InsuranceClaim"("idempotencyKey");
CREATE UNIQUE INDEX "InsuranceClaim_coverageId_key" ON "InsuranceClaim"("coverageId");
CREATE INDEX "InsuranceClaim_status_queuedAt_idx" ON "InsuranceClaim"("status", "queuedAt");
CREATE INDEX "InsuranceClaim_userId_requestedAt_idx" ON "InsuranceClaim"("userId", "requestedAt");
CREATE INDEX "InsuranceClaim_accountId_requestedAt_idx" ON "InsuranceClaim"("accountId", "requestedAt");
CREATE UNIQUE INDEX "InsuranceLoyaltyProfile_accountId_key" ON "InsuranceLoyaltyProfile"("accountId");
CREATE INDEX "InsuranceLoyaltyProfile_userId_idx" ON "InsuranceLoyaltyProfile"("userId");

ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InsuranceApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InsuranceAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InsurancePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceCoverage" ADD CONSTRAINT "InsuranceCoverage_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_coverageId_fkey" FOREIGN KEY ("coverageId") REFERENCES "InsuranceCoverage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim" ADD CONSTRAINT "InsuranceClaim_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceLoyaltyProfile" ADD CONSTRAINT "InsuranceLoyaltyProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceLoyaltyProfile" ADD CONSTRAINT "InsuranceLoyaltyProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
