CREATE TABLE "PreTradeCheck" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "scenario" TEXT NOT NULL DEFAULT 'trend',
  "decision" TEXT NOT NULL DEFAULT 'wait',
  "decisionLabel" TEXT,
  "readinessScore" INTEGER NOT NULL DEFAULT 0,
  "mindsetCompleted" INTEGER NOT NULL DEFAULT 0,
  "mindsetTotal" INTEGER NOT NULL DEFAULT 4,
  "checklistCompleted" INTEGER NOT NULL DEFAULT 0,
  "checklistTotal" INTEGER NOT NULL DEFAULT 6,
  "selectedPlaybook" TEXT,
  "selectedPlaybookDescription" TEXT,
  "mainReason" TEXT,
  "highImpactEventCount" INTEGER NOT NULL DEFAULT 0,
  "mindset" JSONB NOT NULL,
  "checklist" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PreTradeCheck_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PreTradeCheck_userId_date_key" ON "PreTradeCheck"("userId", "date");
CREATE INDEX "PreTradeCheck_userId_idx" ON "PreTradeCheck"("userId");
CREATE INDEX "PreTradeCheck_date_idx" ON "PreTradeCheck"("date");
CREATE INDEX "PreTradeCheck_decision_idx" ON "PreTradeCheck"("decision");

ALTER TABLE "PreTradeCheck"
  ADD CONSTRAINT "PreTradeCheck_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
