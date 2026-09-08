# Journal Step 3 Test

## Scope

These tests cover the journal trade detail view, edit flow, screenshot URL metadata, psychology notes, and delete behavior.

Do not use WebsiteSignal or `/api/signals` for this test.

## Prerequisites

- Next.js dev server is running.
- Neon PostgreSQL connection is configured in `.env`.
- Prisma Client is generated.
- At least one manual trade exists in `/journal`.

## Tests

### 1. Open Trade Detail

1. Go to `/journal`.
2. Click the eye icon on a trade row.
3. Confirm `/journal/[id]` opens.
4. Confirm the page shows:
   - Trade Overview
   - Trade Review
   - Psychology
   - Screenshots
   - Tags

### 2. Edit PnL From 100 to 120

1. Open a test trade with `profitLoss` / PnL set to `100`.
2. Click `Edit`.
3. Change PnL to `120`.
4. Click `Save`.
5. Confirm a success toast appears.
6. Go back to `/journal`.
7. Confirm the table row shows PnL `120`.

### 3. Summary Cards Update

1. After editing PnL to `120`, reload `/journal`.
2. Confirm Total PNL reflects the updated value.
3. Confirm Win Rate and Profit Factor still render without errors.

### 4. Add Screenshot URL

1. Open the same trade detail page.
2. In Screenshots, enter a valid image URL in `Screenshot URL`.
3. Select type `ENTRY`, `BEFORE`, `EXIT`, or `AFTER`.
4. Optionally enter a caption.
5. Click `Add`.
6. Confirm a success toast appears.
7. Confirm the screenshot preview appears in the matching screenshot section.

### 5. Add Psychology Note

1. Click `Edit`.
2. Update `Emotion`, `Mistakes`, and `Notes`.
3. Click `Save`.
4. Confirm a success toast appears.
5. Confirm the Psychology section reflects the updated values.

### 6. Delete Test Trade

1. Open a disposable test trade.
2. Click `Delete`.
3. Confirm the browser confirmation dialog.
4. Confirm the app returns to `/journal`.
5. Confirm the deleted trade is removed from the table.
6. Confirm summary cards refresh.

### 7. Prisma Studio Verification

1. Run:

```bash
npm run db:studio
```

2. Open the `Trade` model.
3. Confirm the edited trade fields are updated:
   - `profitLoss`
   - `status`
   - `session` for Strategy
   - `setup`
   - `emotion`
   - `mistake`
   - `notes`
4. Open the `TradeScreenshot` model.
5. Confirm the screenshot row exists with:
   - `tradeId`
   - `userId`
   - `type`
   - `url`

## Notes

- Screenshot captions are accepted by the UI for this step, but the current Prisma `TradeScreenshot` model has no caption column, so only `type` and `url` are persisted.
- The current Prisma `Trade` model has no `playbookId`, confidence, discipline, or lessons-learned columns, so those fields are not stored separately.
