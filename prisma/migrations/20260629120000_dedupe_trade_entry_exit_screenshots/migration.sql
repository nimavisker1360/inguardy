WITH ranked_screenshots AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "tradeId", UPPER("type")
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "TradeScreenshot"
  WHERE UPPER("type") IN ('ENTRY', 'EXIT')
)
DELETE FROM "TradeScreenshot"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_screenshots
  WHERE row_number > 1
);

UPDATE "TradeScreenshot"
SET "type" = UPPER("type")
WHERE UPPER("type") IN ('ENTRY', 'EXIT');

CREATE UNIQUE INDEX IF NOT EXISTS "TradeScreenshot_tradeId_entry_exit_type_key"
ON "TradeScreenshot" ("tradeId", UPPER("type"))
WHERE UPPER("type") IN ('ENTRY', 'EXIT');
