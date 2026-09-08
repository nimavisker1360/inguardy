-- CreateTable
CREATE TABLE "PlaybookStrategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL DEFAULT 'demo-user',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "marketType" TEXT,
    "symbols" TEXT,
    "timeframes" TEXT,
    "riskPerTrade" DOUBLE PRECISION,
    "minRiskReward" DOUBLE PRECISION,
    "tags" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookStrategy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookRule" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaybookRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaybookChecklistLink" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "checklistTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaybookChecklistLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeStrategyReview" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "strategyId" TEXT,
    "strategyNameSnapshot" TEXT,
    "followedPlan" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "totalRules" INTEGER NOT NULL DEFAULT 0,
    "followedRules" INTEGER NOT NULL DEFAULT 0,
    "violatedRules" INTEGER NOT NULL DEFAULT 0,
    "requiredRules" INTEGER NOT NULL DEFAULT 0,
    "requiredFollowedRules" INTEGER NOT NULL DEFAULT 0,
    "compliancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiredCompliancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeStrategyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeStrategyRuleReview" (
    "id" TEXT NOT NULL,
    "tradeStrategyReviewId" TEXT NOT NULL,
    "originalRuleId" TEXT,
    "ruleTitleSnapshot" TEXT NOT NULL,
    "ruleDescriptionSnapshot" TEXT,
    "ruleSectionSnapshot" TEXT NOT NULL,
    "isRequiredSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'NOT_REVIEWED',
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeStrategyRuleReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaybookStrategy_userId_idx" ON "PlaybookStrategy"("userId");

-- CreateIndex
CREATE INDEX "PlaybookStrategy_isActive_idx" ON "PlaybookStrategy"("isActive");

-- CreateIndex
CREATE INDEX "PlaybookStrategy_name_idx" ON "PlaybookStrategy"("name");

-- CreateIndex
CREATE INDEX "PlaybookRule_strategyId_idx" ON "PlaybookRule"("strategyId");

-- CreateIndex
CREATE INDEX "PlaybookRule_section_idx" ON "PlaybookRule"("section");

-- CreateIndex
CREATE UNIQUE INDEX "PlaybookChecklistLink_strategyId_checklistTemplateId_key" ON "PlaybookChecklistLink"("strategyId", "checklistTemplateId");

-- CreateIndex
CREATE INDEX "PlaybookChecklistLink_checklistTemplateId_idx" ON "PlaybookChecklistLink"("checklistTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "TradeStrategyReview_tradeId_key" ON "TradeStrategyReview"("tradeId");

-- CreateIndex
CREATE INDEX "TradeStrategyReview_strategyId_idx" ON "TradeStrategyReview"("strategyId");

-- CreateIndex
CREATE INDEX "TradeStrategyReview_followedPlan_idx" ON "TradeStrategyReview"("followedPlan");

-- CreateIndex
CREATE INDEX "TradeStrategyRuleReview_tradeStrategyReviewId_idx" ON "TradeStrategyRuleReview"("tradeStrategyReviewId");

-- CreateIndex
CREATE INDEX "TradeStrategyRuleReview_originalRuleId_idx" ON "TradeStrategyRuleReview"("originalRuleId");

-- CreateIndex
CREATE INDEX "TradeStrategyRuleReview_status_idx" ON "TradeStrategyRuleReview"("status");

-- AddForeignKey
ALTER TABLE "PlaybookRule" ADD CONSTRAINT "PlaybookRule_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "PlaybookStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookChecklistLink" ADD CONSTRAINT "PlaybookChecklistLink_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "PlaybookStrategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaybookChecklistLink" ADD CONSTRAINT "PlaybookChecklistLink_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeStrategyReview" ADD CONSTRAINT "TradeStrategyReview_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeStrategyReview" ADD CONSTRAINT "TradeStrategyReview_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "PlaybookStrategy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeStrategyRuleReview" ADD CONSTRAINT "TradeStrategyRuleReview_tradeStrategyReviewId_fkey" FOREIGN KEY ("tradeStrategyReviewId") REFERENCES "TradeStrategyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
