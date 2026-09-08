CREATE TABLE "MarketRadarAnalysisUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketRadarAnalysisUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketRadarAnalysisUsage_userId_key" ON "MarketRadarAnalysisUsage"("userId");
CREATE INDEX "MarketRadarAnalysisUsage_usedAt_idx" ON "MarketRadarAnalysisUsage"("usedAt");

ALTER TABLE "MarketRadarAnalysisUsage"
ADD CONSTRAINT "MarketRadarAnalysisUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
