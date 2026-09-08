ALTER TABLE "PlaybookStrategy"
ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'BOTH',
ADD COLUMN "entryRules" TEXT,
ADD COLUMN "exitRules" TEXT,
ADD COLUMN "riskRules" TEXT,
ADD COLUMN "setupRules" TEXT,
ADD COLUMN "managementRules" TEXT,
ADD COLUMN "psychologyRules" TEXT,
ADD COLUMN "sessionFilter" TEXT,
ADD COLUMN "newsFilter" TEXT,
ADD COLUMN "htfBias" TEXT,
ADD COLUMN "exampleWinningTrade" TEXT,
ADD COLUMN "exampleLosingTrade" TEXT;

CREATE TABLE "PlaybookChecklistItem" (
  "id" TEXT NOT NULL,
  "strategyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlaybookChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlaybookChecklistItem_strategyId_idx" ON "PlaybookChecklistItem"("strategyId");

ALTER TABLE "PlaybookChecklistItem"
ADD CONSTRAINT "PlaybookChecklistItem_strategyId_fkey"
FOREIGN KEY ("strategyId") REFERENCES "PlaybookStrategy"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "PlaybookChecklistItem" (
  "id",
  "strategyId",
  "title",
  "description",
  "isRequired",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('pbci_', md5(random()::text || clock_timestamp()::text || ci."id" || pcl."strategyId")),
  pcl."strategyId",
  ci."title",
  ci."description",
  ci."isRequired",
  row_number() OVER (
    PARTITION BY pcl."strategyId"
    ORDER BY pcl."createdAt", ci."sortOrder", ci."createdAt"
  ) - 1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PlaybookChecklistLink" pcl
JOIN "ChecklistItem" ci ON ci."checklistId" = pcl."checklistTemplateId"
WHERE NOT EXISTS (
  SELECT 1
  FROM "PlaybookChecklistItem" existing
  WHERE existing."strategyId" = pcl."strategyId"
);
