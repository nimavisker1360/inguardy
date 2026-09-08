# Journal Step 2 API Tests

Run these from PowerShell while the Next.js dev server is running.

## Create Trade

```powershell
$body = @{
  symbol = "XAUUSD"
  side = "BUY"
  entryPrice = 2350.50
  exitPrice = 2360.00
  stopLoss = 2345.00
  takeProfit = 2360.00
  lotSize = 0.10
  riskAmount = 50
  profitLoss = 100
  entryTime = "2026-06-06T10:00:00.000Z"
  exitTime = "2026-06-06T11:30:00.000Z"
  status = "CLOSED"
  strategy = "SMC + EMA"
  setup = "Order Block"
  emotion = "Calm"
  mistakes = "None"
  notes = "Manual journal test trade"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://localhost:3000/api/journal/trades" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

## Get Trades

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/journal/trades" `
  -Method GET
```

## Get Summary

```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/api/journal/summary" `
  -Method GET
```
