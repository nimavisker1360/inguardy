-- MarginGuard is additive: existing accounts and trades remain untouched.
CREATE TYPE "InsuranceEligibility" AS ENUM ('ELIGIBLE', 'MANUAL_REVIEW', 'NOT_ELIGIBLE', 'INSUFFICIENT_DATA', 'PENDING_ANALYSIS');
CREATE TYPE "InsuranceDataQuality" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'INSUFFICIENT');
CREATE TYPE "InsuranceRiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH');
CREATE TYPE "InsuranceFlagSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH', 'CRITICAL');
CREATE TYPE "InsuranceApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "CashTransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BONUS', 'TRANSFER');

ALTER TABLE "Trade"
  ADD COLUMN "grossProfit" DECIMAL(18,2),
  ADD COLUMN "balanceAtOpen" DECIMAL(18,2),
  ADD COLUMN "equityAtOpen" DECIMAL(18,2),
  ADD COLUMN "balanceAtClose" DECIMAL(18,2),
  ADD COLUMN "equityAtClose" DECIMAL(18,2),
  ADD COLUMN "magicNumber" TEXT,
  ADD COLUMN "closeReason" TEXT;

ALTER TABLE "TradingAccount" ADD COLUMN "accountType" TEXT;

CREATE TABLE "AccountEquitySnapshot" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "timestamp" TIMESTAMP(3) NOT NULL,
  "balance" DECIMAL(18,2) NOT NULL, "equity" DECIMAL(18,2) NOT NULL,
  "floatingPnl" DECIMAL(18,2) NOT NULL, "margin" DECIMAL(18,2),
  "freeMargin" DECIMAL(18,2), "marginLevel" DECIMAL(18,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountEquitySnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AccountEquitySnapshot_accountId_timestamp_key" ON "AccountEquitySnapshot"("accountId", "timestamp");
CREATE INDEX "AccountEquitySnapshot_accountId_timestamp_idx" ON "AccountEquitySnapshot"("accountId", "timestamp");

CREATE TABLE "SymbolSpecification" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "symbol" TEXT NOT NULL,
  "contractSize" DECIMAL(24,8), "tickSize" DECIMAL(24,12), "tickValue" DECIMAL(24,8),
  "digits" INTEGER, "baseCurrency" TEXT, "quoteCurrency" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SymbolSpecification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SymbolSpecification_accountId_symbol_key" ON "SymbolSpecification"("accountId", "symbol");
CREATE INDEX "SymbolSpecification_accountId_idx" ON "SymbolSpecification"("accountId");

CREATE TABLE "CashTransaction" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "type" "CashTransactionType" NOT NULL,
  "amount" DECIMAL(18,2) NOT NULL, "currency" TEXT NOT NULL, "occurredAt" TIMESTAMP(3) NOT NULL,
  "sourceRef" TEXT, "rawPayload" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CashTransaction_accountId_sourceRef_key" ON "CashTransaction"("accountId", "sourceRef");
CREATE INDEX "CashTransaction_accountId_occurredAt_idx" ON "CashTransaction"("accountId", "occurredAt");
CREATE INDEX "CashTransaction_type_idx" ON "CashTransaction"("type");

CREATE TABLE "InsurancePolicy" (
  "id" TEXT NOT NULL, "version" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "featureVersion" TEXT NOT NULL, "rules" JSONB NOT NULL, "thresholds" JSONB NOT NULL,
  "weights" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT false, "publishedAt" TIMESTAMP(3),
  "createdById" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsurancePolicy_version_key" ON "InsurancePolicy"("version");
CREATE INDEX "InsurancePolicy_isActive_publishedAt_idx" ON "InsurancePolicy"("isActive", "publishedAt");

CREATE TABLE "InsurancePackage" (
  "id" TEXT NOT NULL, "slug" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT,
  "minBalance" DECIMAL(18,2) NOT NULL, "maxBalance" DECIMAL(18,2) NOT NULL,
  "coveragePercent" DECIMAL(5,2) NOT NULL, "maxCoverageAmount" DECIMAL(18,2) NOT NULL,
  "coverageDurationDays" INTEGER NOT NULL, "maxDrawdownPercent" DECIMAL(5,2) NOT NULL,
  "maxRiskPerTradePercent" DECIMAL(5,2) NOT NULL, "price" DECIMAL(18,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'USD', "terms" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false, "isTest" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsurancePackage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsurancePackage_slug_key" ON "InsurancePackage"("slug");
CREATE INDEX "InsurancePackage_isActive_minBalance_maxBalance_idx" ON "InsurancePackage"("isActive", "minBalance", "maxBalance");

CREATE TABLE "InsuranceAssessment" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "userId" TEXT NOT NULL, "policyId" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL, "featureVersion" TEXT NOT NULL, "aiModel" TEXT,
  "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dataFrom" TIMESTAMP(3) NOT NULL,
  "dataTo" TIMESTAMP(3) NOT NULL, "riskScore" INTEGER NOT NULL, "riskLevel" "InsuranceRiskLevel" NOT NULL,
  "dataQuality" "InsuranceDataQuality" NOT NULL, "confidence" DOUBLE PRECISION NOT NULL,
  "eligibility" "InsuranceEligibility" NOT NULL, "recommendedPackageId" TEXT,
  "metricsSnapshot" JSONB NOT NULL, "aiSummary" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsuranceAssessment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InsuranceAssessment_accountId_assessmentDate_idx" ON "InsuranceAssessment"("accountId", "assessmentDate");
CREATE INDEX "InsuranceAssessment_userId_assessmentDate_idx" ON "InsuranceAssessment"("userId", "assessmentDate");
CREATE INDEX "InsuranceAssessment_eligibility_idx" ON "InsuranceAssessment"("eligibility");

CREATE TABLE "InsuranceMetrics" (
  "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "featureVersion" TEXT NOT NULL,
  "dataFrom" TIMESTAMP(3) NOT NULL, "dataTo" TIMESTAMP(3) NOT NULL, "tradingStyle" TEXT NOT NULL,
  "closedTradeCount" INTEGER NOT NULL, "snapshotCoverage" DOUBLE PRECISION NOT NULL,
  "trades1Week" INTEGER NOT NULL, "trades2Weeks" INTEGER NOT NULL, "trades4Weeks" INTEGER NOT NULL,
  "avgHoldingMinutes" DOUBLE PRECISION, "medianHoldingMinutes" DOUBLE PRECISION,
  "winRate" DOUBLE PRECISION NOT NULL, "profitFactor" DOUBLE PRECISION,
  "grossProfit" DECIMAL(18,2) NOT NULL, "grossLoss" DECIMAL(18,2) NOT NULL,
  "netPnl1Week" DECIMAL(18,2) NOT NULL, "netPnl2Weeks" DECIMAL(18,2) NOT NULL, "netPnl4Weeks" DECIMAL(18,2) NOT NULL,
  "maxDailyDd" DOUBLE PRECISION NOT NULL, "maxWeeklyDd" DOUBLE PRECISION NOT NULL, "maxMonthlyDd" DOUBLE PRECISION NOT NULL,
  "averageRiskPercent" DOUBLE PRECISION, "medianRiskPercent" DOUBLE PRECISION, "riskPercentStdDev" DOUBLE PRECISION,
  "averageR" DOUBLE PRECISION, "medianR" DOUBLE PRECISION, "revengeTradePercentage" DOUBLE PRECISION,
  "metrics" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsuranceMetrics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "InsuranceMetrics_assessmentId_key" ON "InsuranceMetrics"("assessmentId");
CREATE INDEX "InsuranceMetrics_accountId_createdAt_idx" ON "InsuranceMetrics"("accountId", "createdAt");

CREATE TABLE "InsuranceRiskFlag" (
  "id" TEXT NOT NULL, "assessmentId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "relatedTradeId" TEXT,
  "code" TEXT NOT NULL, "title" TEXT NOT NULL, "severity" "InsuranceFlagSeverity" NOT NULL,
  "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "affectsEligibility" BOOLEAN NOT NULL DEFAULT false,
  "recommendation" TEXT, "evidence" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsuranceRiskFlag_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InsuranceRiskFlag_assessmentId_severity_idx" ON "InsuranceRiskFlag"("assessmentId", "severity");
CREATE INDEX "InsuranceRiskFlag_accountId_detectedAt_idx" ON "InsuranceRiskFlag"("accountId", "detectedAt");

CREATE TABLE "InsuranceApplication" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "assessmentId" TEXT NOT NULL,
  "packageId" TEXT NOT NULL, "status" "InsuranceApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewReason" TEXT, "reviewedById" TEXT, "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InsuranceApplication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InsuranceApplication_userId_createdAt_idx" ON "InsuranceApplication"("userId", "createdAt");
CREATE INDEX "InsuranceApplication_status_createdAt_idx" ON "InsuranceApplication"("status", "createdAt");
CREATE INDEX "InsuranceApplication_accountId_idx" ON "InsuranceApplication"("accountId");

CREATE TABLE "InsuranceDecisionLog" (
  "id" TEXT NOT NULL, "applicationId" TEXT NOT NULL, "actorId" TEXT,
  "decision" TEXT NOT NULL, "reason" TEXT NOT NULL, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InsuranceDecisionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InsuranceDecisionLog_applicationId_createdAt_idx" ON "InsuranceDecisionLog"("applicationId", "createdAt");
CREATE INDEX "InsuranceDecisionLog_actorId_idx" ON "InsuranceDecisionLog"("actorId");


ALTER TABLE "AccountEquitySnapshot" ADD CONSTRAINT "AccountEquitySnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SymbolSpecification" ADD CONSTRAINT "SymbolSpecification_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceAssessment" ADD CONSTRAINT "InsuranceAssessment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceAssessment" ADD CONSTRAINT "InsuranceAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceAssessment" ADD CONSTRAINT "InsuranceAssessment_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "InsurancePolicy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceAssessment" ADD CONSTRAINT "InsuranceAssessment_recommendedPackageId_fkey" FOREIGN KEY ("recommendedPackageId") REFERENCES "InsurancePackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceMetrics" ADD CONSTRAINT "InsuranceMetrics_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceMetrics" ADD CONSTRAINT "InsuranceMetrics_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InsuranceAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceRiskFlag" ADD CONSTRAINT "InsuranceRiskFlag_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InsuranceAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceRiskFlag" ADD CONSTRAINT "InsuranceRiskFlag_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceRiskFlag" ADD CONSTRAINT "InsuranceRiskFlag_relatedTradeId_fkey" FOREIGN KEY ("relatedTradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "TradingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "InsuranceAssessment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceApplication" ADD CONSTRAINT "InsuranceApplication_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "InsurancePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceDecisionLog" ADD CONSTRAINT "InsuranceDecisionLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "InsuranceApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InsuranceDecisionLog" ADD CONSTRAINT "InsuranceDecisionLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- No policy or price package is seeded here: production underwriting stays disabled until an admin publishes official, versioned values.
