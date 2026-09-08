-- Merge duplicate MT5 trades created by concurrent journal events before
-- enforcing one stored trade per MT5 position ticket per account.

CREATE TEMP TABLE "_mt5_trade_dedupe" AS
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY "accountId", "mt5Ticket"
      ORDER BY
        (
          CASE WHEN "stopLoss" IS NOT NULL AND "stopLoss" <> 0 THEN 1 ELSE 0 END +
          CASE WHEN "takeProfit" IS NOT NULL AND "takeProfit" <> 0 THEN 1 ELSE 0 END +
          CASE WHEN "currentStopLoss" IS NOT NULL AND "currentStopLoss" <> 0 THEN 1 ELSE 0 END +
          CASE WHEN "currentTakeProfit" IS NOT NULL AND "currentTakeProfit" <> 0 THEN 1 ELSE 0 END +
          CASE WHEN "status" = 'CLOSED' THEN 1 ELSE 0 END
        ) DESC,
        "updatedAt" DESC,
        "createdAt" ASC,
        id ASC
    ) AS keeper_id,
    COUNT(*) OVER (PARTITION BY "accountId", "mt5Ticket") AS duplicate_count
  FROM "Trade"
  WHERE "mt5Ticket" IS NOT NULL AND trim("mt5Ticket") <> ''
)
SELECT id AS duplicate_id, keeper_id
FROM ranked
WHERE duplicate_count > 1 AND id <> keeper_id;

WITH grouped_trades AS (
  SELECT DISTINCT d.keeper_id, t.*
  FROM "_mt5_trade_dedupe" d
  JOIN "Trade" t ON t.id = d.keeper_id OR t.id = d.duplicate_id
),
best_values AS (
  SELECT
    keeper_id,
    (array_agg("entryPrice" ORDER BY ("entryPrice" IS NOT NULL AND "entryPrice" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "entryPrice",
    (array_agg("exitPrice" ORDER BY ("exitPrice" IS NOT NULL AND "exitPrice" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "exitPrice",
    (array_agg("stopLoss" ORDER BY ("stopLoss" IS NOT NULL AND "stopLoss" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "stopLoss",
    (array_agg("takeProfit" ORDER BY ("takeProfit" IS NOT NULL AND "takeProfit" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "takeProfit",
    (array_agg("initialStopLoss" ORDER BY ("initialStopLoss" IS NOT NULL AND "initialStopLoss" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "initialStopLoss",
    (array_agg("initialTakeProfit" ORDER BY ("initialTakeProfit" IS NOT NULL AND "initialTakeProfit" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "initialTakeProfit",
    (array_agg("currentStopLoss" ORDER BY ("currentStopLoss" IS NOT NULL AND "currentStopLoss" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "currentStopLoss",
    (array_agg("currentTakeProfit" ORDER BY ("currentTakeProfit" IS NOT NULL AND "currentTakeProfit" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "currentTakeProfit",
    (array_agg("lotSize" ORDER BY ("lotSize" IS NOT NULL AND "lotSize" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "lotSize",
    (array_agg("riskAmount" ORDER BY ("riskAmount" IS NOT NULL AND "riskAmount" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "riskAmount",
    (array_agg("profitLoss" ORDER BY ("profitLoss" IS NOT NULL AND "profitLoss" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "profitLoss",
    (array_agg("commission" ORDER BY ("commission" IS NOT NULL AND "commission" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "commission",
    (array_agg("swap" ORDER BY ("swap" IS NOT NULL AND "swap" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "swap",
    (array_agg("rr" ORDER BY ("rr" IS NOT NULL AND "rr" <> 0) DESC, "updatedAt" DESC, "createdAt" DESC))[1] AS "rr",
    (array_agg("closedAt" ORDER BY ("closedAt" IS NOT NULL) DESC, "updatedAt" DESC))[1] AS "closedAt",
    (array_agg("aiReviewScore" ORDER BY ("aiReviewScore" IS NOT NULL) DESC, "updatedAt" DESC))[1] AS "aiReviewScore"
  FROM grouped_trades
  GROUP BY keeper_id
)
UPDATE "Trade" AS keeper
SET
  "entryPrice" = COALESCE(best."entryPrice", keeper."entryPrice"),
  "exitPrice" = COALESCE(best."exitPrice", keeper."exitPrice"),
  "stopLoss" = COALESCE(best."stopLoss", keeper."stopLoss"),
  "takeProfit" = COALESCE(best."takeProfit", keeper."takeProfit"),
  "initialStopLoss" = COALESCE(best."initialStopLoss", best."stopLoss", keeper."initialStopLoss"),
  "initialTakeProfit" = COALESCE(best."initialTakeProfit", best."takeProfit", keeper."initialTakeProfit"),
  "currentStopLoss" = COALESCE(best."currentStopLoss", best."stopLoss", keeper."currentStopLoss"),
  "currentTakeProfit" = COALESCE(best."currentTakeProfit", best."takeProfit", keeper."currentTakeProfit"),
  "lotSize" = COALESCE(best."lotSize", keeper."lotSize"),
  "riskAmount" = COALESCE(best."riskAmount", keeper."riskAmount"),
  "profitLoss" = COALESCE(best."profitLoss", keeper."profitLoss"),
  "commission" = COALESCE(best."commission", keeper."commission"),
  "swap" = COALESCE(best."swap", keeper."swap"),
  "rr" = COALESCE(best."rr", keeper."rr"),
  "closedAt" = COALESCE(best."closedAt", keeper."closedAt"),
  "aiReviewScore" = COALESCE(best."aiReviewScore", keeper."aiReviewScore")
FROM best_values AS best
WHERE keeper.id = best.keeper_id;

UPDATE "TradeUpdateLog" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

UPDATE "TradeScreenshot" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

UPDATE "VoiceMemo" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

DELETE FROM "TradeJournalMetadata" AS item
USING "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id
  AND EXISTS (
    SELECT 1 FROM "TradeJournalMetadata" AS keeper_item
    WHERE keeper_item."tradeId" = d.keeper_id
  );

UPDATE "TradeJournalMetadata" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

DELETE FROM "TradeStrategyReview" AS item
USING "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id
  AND EXISTS (
    SELECT 1 FROM "TradeStrategyReview" AS keeper_item
    WHERE keeper_item."tradeId" = d.keeper_id
  );

UPDATE "TradeStrategyReview" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

DELETE FROM "TradeAIReview" AS item
USING "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id
  AND EXISTS (
    SELECT 1 FROM "TradeAIReview" AS keeper_item
    WHERE keeper_item."tradeId" = d.keeper_id
      AND keeper_item."userId" = item."userId"
  );

UPDATE "TradeAIReview" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

DELETE FROM "TradeTag" AS item
USING "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id
  AND EXISTS (
    SELECT 1 FROM "TradeTag" AS keeper_item
    WHERE keeper_item."tradeId" = d.keeper_id
      AND keeper_item."tagId" = item."tagId"
  );

UPDATE "TradeTag" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

UPDATE "TradeChecklist" AS item
SET "tradeId" = d.keeper_id
FROM "_mt5_trade_dedupe" AS d
WHERE item."tradeId" = d.duplicate_id;

DELETE FROM "Trade" AS item
USING "_mt5_trade_dedupe" AS d
WHERE item.id = d.duplicate_id;

DROP TABLE "_mt5_trade_dedupe";

CREATE UNIQUE INDEX "Trade_accountId_mt5Ticket_key" ON "Trade"("accountId", "mt5Ticket");
