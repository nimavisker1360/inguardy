-- Keep MT5 journal event processing idempotent even when the EA sends the same
-- trade transaction more than once.
CREATE TABLE "Mt5JournalEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "mt5Ticket" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "dealTicket" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mt5JournalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Mt5JournalEvent_accountId_eventType_mt5Ticket_eventKey_key"
ON "Mt5JournalEvent"("accountId", "eventType", "mt5Ticket", "eventKey");

CREATE INDEX "Mt5JournalEvent_userId_idx" ON "Mt5JournalEvent"("userId");
CREATE INDEX "Mt5JournalEvent_accountId_mt5Ticket_idx" ON "Mt5JournalEvent"("accountId", "mt5Ticket");
CREATE INDEX "Mt5JournalEvent_createdAt_idx" ON "Mt5JournalEvent"("createdAt");
