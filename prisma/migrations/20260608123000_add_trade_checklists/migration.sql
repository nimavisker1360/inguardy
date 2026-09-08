-- CreateTable
CREATE TABLE "ChecklistTemplate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistItem" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeChecklist" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "checklistTemplateId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "categorySnapshot" TEXT,
    "completedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "requiredCompletedCount" INTEGER NOT NULL DEFAULT 0,
    "requiredTotalCount" INTEGER NOT NULL DEFAULT 0,
    "completionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeChecklistAnswer" (
    "id" TEXT NOT NULL,
    "tradeChecklistId" TEXT NOT NULL,
    "checklistItemId" TEXT,
    "titleSnapshot" TEXT NOT NULL,
    "descriptionSnapshot" TEXT,
    "isRequiredSnapshot" BOOLEAN NOT NULL DEFAULT false,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeChecklistAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChecklistTemplate_isActive_idx" ON "ChecklistTemplate"("isActive");

-- CreateIndex
CREATE INDEX "ChecklistTemplate_category_idx" ON "ChecklistTemplate"("category");

-- CreateIndex
CREATE INDEX "ChecklistItem_checklistId_idx" ON "ChecklistItem"("checklistId");

-- CreateIndex
CREATE INDEX "TradeChecklist_tradeId_idx" ON "TradeChecklist"("tradeId");

-- CreateIndex
CREATE INDEX "TradeChecklist_checklistTemplateId_idx" ON "TradeChecklist"("checklistTemplateId");

-- CreateIndex
CREATE INDEX "TradeChecklistAnswer_tradeChecklistId_idx" ON "TradeChecklistAnswer"("tradeChecklistId");

-- CreateIndex
CREATE INDEX "TradeChecklistAnswer_checklistItemId_idx" ON "TradeChecklistAnswer"("checklistItemId");

-- AddForeignKey
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeChecklist" ADD CONSTRAINT "TradeChecklist_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeChecklist" ADD CONSTRAINT "TradeChecklist_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "ChecklistTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeChecklistAnswer" ADD CONSTRAINT "TradeChecklistAnswer_tradeChecklistId_fkey" FOREIGN KEY ("tradeChecklistId") REFERENCES "TradeChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
