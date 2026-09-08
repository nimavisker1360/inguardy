# MT5 Journal API Test

API URL:

```text
https://tradivix.com/api/mt5/journal
```

Open trade test:

```powershell
$body = @{
  secret = "PASTE_USER_SECRET_HERE"
  eventType = "open"
  accountNumber = "7828373"
  broker = "AMarkets LLC"
  platform = "MT5"
  ticket = "987654321"
  symbol = "XAUUSD"
  side = "BUY"
  lot = 0.1
  entryPrice = 2335.20
  stopLoss = 2328.20
  takeProfit = 2349.20
  timeframe = "M5"
  spread = 20
  sessionTime = "London"
  mood = "Focused"
  openedAt = "2026-06-24T11:19:59.000Z"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://tradivix.com/api/mt5/journal" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

Close trade test:

```powershell
$body = @{
  secret = "PASTE_USER_SECRET_HERE"
  eventType = "close"
  accountNumber = "7828373"
  ticket = "987654321"
  exitPrice = 2340.10
  profitLoss = 48.30
  commission = -1.20
  swap = 0
  closedAt = "2026-06-24T13:55:00.000Z"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://tradivix.com/api/mt5/journal" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

EA settings:

```text
JOURNAL_API_BASE_URL = https://tradivix.com
JOURNAL_UPLOAD_SECRET = generated per-account secret
JOURNAL_ENABLED = true
DEBUG_MODE = true
```
