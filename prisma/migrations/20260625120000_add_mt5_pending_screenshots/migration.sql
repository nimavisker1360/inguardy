CREATE TABLE IF NOT EXISTS "Mt5PendingScreenshot" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "positionId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Mt5PendingScreenshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Mt5PendingScreenshot_accountId_positionId_type_key"
ON "Mt5PendingScreenshot"("accountId", "positionId", "type");

CREATE INDEX IF NOT EXISTS "Mt5PendingScreenshot_userId_idx"
ON "Mt5PendingScreenshot"("userId");

CREATE INDEX IF NOT EXISTS "Mt5PendingScreenshot_accountId_positionId_idx"
ON "Mt5PendingScreenshot"("accountId", "positionId");
