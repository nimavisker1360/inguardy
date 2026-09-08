ALTER TABLE "ChecklistItem" ADD COLUMN "section" TEXT;
ALTER TABLE "TradeChecklistAnswer" ADD COLUMN "sectionSnapshot" TEXT;

CREATE INDEX "ChecklistItem_section_idx" ON "ChecklistItem"("section");

UPDATE "ChecklistItem"
SET "section" = CASE
  WHEN "title" IN ('Trend direction is clear') THEN 'Market Context'
  WHEN "title" IN ('Setup matches my strategy', 'Trade does not violate my plan', 'This trade follows my plan') THEN 'Setup'
  WHEN "title" IN ('Entry level is valid', 'Stop Loss is placed before entry') THEN 'Entry'
  WHEN "title" IN ('Stop Loss is defined', 'Take Profit is defined', 'Risk/Reward is at least 1:2', 'Lot size is calculated correctly', 'Risk per trade is within my limit', 'Daily loss limit is not reached', 'No over-leveraging') THEN 'Risk'
  WHEN "title" IN ('No high-impact news nearby') THEN 'News'
  WHEN "title" IN ('I am not entering because of FOMO', 'I accept the risk before entering', 'I feel calm', 'I am not revenge trading', 'I am not chasing the market', 'I can accept a loss') THEN 'Psychology'
  ELSE "section"
END
WHERE "title" IN (
  'Trend direction is clear',
  'Setup matches my strategy',
  'Trade does not violate my plan',
  'This trade follows my plan',
  'Entry level is valid',
  'Stop Loss is placed before entry',
  'Stop Loss is defined',
  'Take Profit is defined',
  'Risk/Reward is at least 1:2',
  'Lot size is calculated correctly',
  'Risk per trade is within my limit',
  'Daily loss limit is not reached',
  'No over-leveraging',
  'No high-impact news nearby',
  'I am not entering because of FOMO',
  'I accept the risk before entering',
  'I feel calm',
  'I am not revenge trading',
  'I am not chasing the market',
  'I can accept a loss'
);

UPDATE "TradeChecklistAnswer"
SET "sectionSnapshot" = CASE
  WHEN "titleSnapshot" IN ('Trend direction is clear') THEN 'Market Context'
  WHEN "titleSnapshot" IN ('Setup matches my strategy', 'Trade does not violate my plan', 'This trade follows my plan') THEN 'Setup'
  WHEN "titleSnapshot" IN ('Entry level is valid', 'Stop Loss is placed before entry') THEN 'Entry'
  WHEN "titleSnapshot" IN ('Stop Loss is defined', 'Take Profit is defined', 'Risk/Reward is at least 1:2', 'Lot size is calculated correctly', 'Risk per trade is within my limit', 'Daily loss limit is not reached', 'No over-leveraging') THEN 'Risk'
  WHEN "titleSnapshot" IN ('No high-impact news nearby') THEN 'News'
  WHEN "titleSnapshot" IN ('I am not entering because of FOMO', 'I accept the risk before entering', 'I feel calm', 'I am not revenge trading', 'I am not chasing the market', 'I can accept a loss') THEN 'Psychology'
  ELSE "sectionSnapshot"
END
WHERE "titleSnapshot" IN (
  'Trend direction is clear',
  'Setup matches my strategy',
  'Trade does not violate my plan',
  'This trade follows my plan',
  'Entry level is valid',
  'Stop Loss is placed before entry',
  'Stop Loss is defined',
  'Take Profit is defined',
  'Risk/Reward is at least 1:2',
  'Lot size is calculated correctly',
  'Risk per trade is within my limit',
  'Daily loss limit is not reached',
  'No over-leveraging',
  'No high-impact news nearby',
  'I am not entering because of FOMO',
  'I accept the risk before entering',
  'I feel calm',
  'I am not revenge trading',
  'I am not chasing the market',
  'I can accept a loss'
);
