# Inguardy MT4 Expert Advisor setup

The `TradeJournalRecorder.mq4` Expert Advisor reads account details and trades and sends them to your Inguardy journal. It never places, closes, or changes orders.

1. In Inguardy, choose **MetaTrader 4 → Key generator** and create a connection key. Keep the key private.
2. In MetaTrader 4, choose **File → Open Data Folder**. Copy the ready-to-use `TradeJournalRecorder.ex4` into `MQL4/Experts`. The `.mq4` source file is included if you want to inspect or compile it yourself.
3. Return to MetaTrader and refresh **Navigator → Expert Advisors**.
4. In **Tools → Options → Expert Advisors**, enable **Allow WebRequest for listed URL** and add `https://inguardy.com`. Enable automated trading so the EA can run; this EA contains no order execution functions.
5. Attach **TradeJournalRecorder** to **one chart**. In **Inputs**, set `JOURNAL_UPLOAD_SECRET` to your Inguardy key and keep `JOURNAL_API_BASE_URL` as `https://inguardy.com`. Keep MetaTrader open.
6. Look for **Inguardy MT4 account connected** in the **Experts** tab, then refresh your Inguardy accounts page. The account number is linked on the first successful heartbeat; opening a new trade is not required.

The EA syncs open orders and the closed orders currently loaded in the terminal's **Account History** tab, up to the configured `HISTORY_LOOKBACK_DAYS`. Choose **All History** in that tab if you want a longer history. Set `IMPORT_LOADED_HISTORY=false` to sync only open orders and future closes.

If the Experts tab reports a WebRequest error, recheck the allowed URL and your internet connection. If it reports HTTP 401 or 403, check that the key belongs to this Inguardy account. To replace a key, generate a new one and update `JOURNAL_UPLOAD_SECRET` in the EA.
