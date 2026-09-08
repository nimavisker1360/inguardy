//+------------------------------------------------------------------+
//| TradeJournalRecorder.mq5                                         |
//| Records MT5 trade events and sends them to a Next.js journal API. |
//+------------------------------------------------------------------+
#property strict
#property version   "1.15"
#property description "Trade Journal Recorder. Records trades only; never opens, closes, or modifies trades."

input string          JOURNAL_API_BASE_URL = "https://tradivix.com";
input string          JOURNAL_UPLOAD_SECRET = "";
input bool            JOURNAL_ENABLED = true;
input bool            DEBUG_MODE = true;
input bool            CAPTURE_SCREENSHOTS = true;
input bool            OPEN_CHART_FOR_SCREENSHOT = true;
input bool            CLOSE_TEMP_CHART_AFTER_SCREENSHOT = true;
input ENUM_TIMEFRAMES JOURNAL_SCREENSHOT_TIMEFRAME = PERIOD_M5;
input int             SCREENSHOT_WIDTH = 800;
input int             SCREENSHOT_HEIGHT = 450;
input int             SCREENSHOT_DELAY_MS = 1500;
input int             MISSED_CLOSE_RECOVERY_HOURS = 0;
input bool            SHOW_LIVE_TRADE_LEVELS = true;
input color           LIVE_TP_COLOR = clrDodgerBlue;
input color           LIVE_SL_COLOR = clrRed;
input int             LIVE_LEVEL_WIDTH = 1;
input bool            HIDE_NATIVE_TRADE_LEVELS = false;

const string TJR_BUILD = "TradeJournalRecorder 1.15 account-heartbeat";
const int ACCOUNT_HEARTBEAT_INTERVAL_SECONDS = 300;

string g_lockName = "";
bool   g_hasLock = false;
long   g_cachedPositionIds[];
string g_cachedPositionSymbols[];
double g_cachedEntryPrices[];
double g_cachedStopLosses[];
double g_cachedTakeProfits[];
string g_cachedTradeTypes[];
long   g_syncAttemptPositionIds[];
datetime g_syncAttemptTimes[];
string g_screenshotAttemptKeys[];
datetime g_screenshotAttemptTimes[];
string g_pendingJournalEndpoints[];
string g_pendingJournalBodies[];
int g_pendingJournalAttempts[];
datetime g_pendingJournalNextAttempts[];
long g_recoveredClosedPositionIds[];
datetime g_lastClosedPositionRecovery = 0;
datetime g_lastAccountHeartbeat = 0;
long g_drawnLevelPositionIds[];
bool g_originalShowTradeLevels = true;
bool g_nativeTradeLevelStateSaved = false;

//+------------------------------------------------------------------+
//| Expert lifecycle                                                  |
//+------------------------------------------------------------------+
int OnInit()
{
   Print(TJR_BUILD, " initialized.");
   Print("API URL: ", NormalizeBaseUrl(JOURNAL_API_BASE_URL));
   Print("Screenshots: ", CAPTURE_SCREENSHOTS ? "enabled" : "disabled", ", size: ", SCREENSHOT_WIDTH, "x", SCREENSHOT_HEIGHT);
   Print("This EA records trades only. It does not open, close, or modify trades.");
   g_originalShowTradeLevels =
      (bool)ChartGetInteger(0, CHART_SHOW_TRADE_LEVELS);
   g_nativeTradeLevelStateSaved = true;

   if(!JOURNAL_ENABLED)
   {
      Print("Trade Journal Recorder is disabled by JOURNAL_ENABLED=false.");
      return INIT_SUCCEEDED;
   }

   if(StringLen(StringTrimCopy(JOURNAL_UPLOAD_SECRET)) == 0)
   {
      Print("Trade Journal Recorder error: JOURNAL_UPLOAD_SECRET is empty.");
      return INIT_FAILED;
   }

   if(!AcquireSingleInstanceLock())
   {
      Print("Trade Journal Recorder error: attach this EA to one chart only.");
      return INIT_FAILED;
   }

   RefreshPositionLevelCache();
   SendAccountHeartbeat("init");
   EventSetTimer(1);

   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   for(int i = ArraySize(g_drawnLevelPositionIds) - 1; i >= 0; i--)
      DeleteLiveLevelObjects(g_drawnLevelPositionIds[i]);
   if(g_nativeTradeLevelStateSaved)
      ChartSetInteger(0, CHART_SHOW_TRADE_LEVELS, g_originalShowTradeLevels);
   ChartRedraw(0);
   ReleaseSingleInstanceLock();
   Print("Trade Journal Recorder stopped. Reason: ", reason);
}

void OnTimer()
{
   if(JOURNAL_ENABLED)
   {
      ProcessPendingJournalPayloads();
      SyncAccountHeartbeat();
      SyncPositionLevelChanges();
      SyncOpenPositions();
      SyncRecentClosedPositions();
      SyncLiveTradeLevelObjects();
      if(CAPTURE_SCREENSHOTS)
         CaptureEntryScreenshotsForOpenPositions();
   }
}

//+------------------------------------------------------------------+
//| Trade transaction listener                                        |
//+------------------------------------------------------------------+
void OnTradeTransaction(
   const MqlTradeTransaction &trans,
   const MqlTradeRequest &request,
   const MqlTradeResult &result
)
{
   if(!JOURNAL_ENABLED)
      return;

   if(trans.type == TRADE_TRANSACTION_POSITION)
   {
      CacheTransactionPosition(trans);
      return;
   }

   if(trans.type != TRADE_TRANSACTION_DEAL_ADD || trans.deal == 0)
      return;

   if(!HistoryDealSelect(trans.deal))
   {
      HistorySelect(TimeCurrent() - 86400 * 30, TimeCurrent() + 60);
      if(!HistoryDealSelect(trans.deal))
      {
         Print("Trade event detected but HistoryDealSelect failed. Deal: ", (string)trans.deal, ", error: ", GetLastError());
         return;
      }
   }

   string eventType = DetectEventType(trans.deal, trans.order);
   if(eventType == "")
      return;

   string symbol = HistoryDealGetString(trans.deal, DEAL_SYMBOL);
   if(symbol == "")
      symbol = trans.symbol;

   Print("Trade event detected. Event: ", eventType, ", symbol: ", symbol, ", deal: ", (string)trans.deal);

   string jsonBody = BuildTradeEventJson(eventType, trans.deal, symbol, (long)trans.position);
   if(jsonBody == "")
   {
      Print("Trade event skipped: failed to build payload for deal ", (string)trans.deal);
      return;
   }

   string response = "";
   int statusCode = 0;

   if(HttpPostJson("/api/mt5/journal", jsonBody, response, statusCode))
   {
      Print("Trade event payload sent. Status code: ", statusCode);
      DebugPrint("Event API response: " + response);
   }
   else
   {
      QueueJournalPayload("/api/mt5/journal", jsonBody);
      Print("Trade event upload failed. Status code: ", statusCode, ", response: ", response);
   }

   if(CAPTURE_SCREENSHOTS)
      ProcessScreenshotForDeal(eventType, trans.deal, symbol);
}

//+------------------------------------------------------------------+
//| JSON payload builders                                             |
//+------------------------------------------------------------------+
string BuildTradeEventJson(string eventType, ulong dealTicket, string fallbackSymbol, long fallbackPositionTicket = 0)
{
   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   if(symbol == "")
      symbol = fallbackSymbol;
   if(symbol == "")
      return "";

   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   long positionIdLong = ResolveStablePositionIdentifier(
      HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID),
      fallbackPositionTicket
   );
   double lotSize = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
   double dealPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
   double swap = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
   datetime eventTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   datetime openTime = eventTime;

   double entryPrice = 0.0;
   double closePrice = 0.0;
   double stopLoss = 0.0;
   double takeProfit = 0.0;
   string tradeType = GetTradeTypeForDeal(dealTicket, dealType);

   if(eventType == "open" || eventType == "pending_activated")
      entryPrice = dealPrice;
   else
      closePrice = dealPrice;

   FillPositionTradeDetails(positionIdLong, symbol, eventTime, entryPrice, stopLoss, takeProfit, tradeType);
   openTime = GetPositionOpenTime(positionIdLong, symbol, eventTime);

   string accountNumber = (string)AccountInfoInteger(ACCOUNT_LOGIN);
   string broker = GetBrokerName();
   string positionId = positionIdLong > 0 ? (string)positionIdLong : "";
   string dealTicketText = (string)dealTicket;
   string ticket = positionId != "" ? positionId : dealTicketText;
   string journalEventType = "update";
   if(eventType == "open" || eventType == "pending_activated")
      journalEventType = "open";
   else if(eventType == "partial_close")
      journalEventType = "partial_close";
   else if(eventType == "close")
      journalEventType = "close";
   string side = tradeType == "sell" ? "SELL" : "BUY";
   int digits = DigitsForSymbol(symbol);
   double journalLotSize = lotSize;
   if(eventType == "partial_close")
   {
      double remainingLotSize = GetOpenPositionVolumeByIdentifier(positionIdLong);
      if(remainingLotSize > 0.0)
         journalLotSize = remainingLotSize;
   }

   string json = "{";
   json += "\"secret\":" + JsonString(JOURNAL_UPLOAD_SECRET) + ",";
   json += "\"eventType\":" + JsonString(journalEventType) + ",";
   json += "\"accountNumber\":" + JsonString(accountNumber) + ",";
   json += "\"balance\":" + DoubleToJson(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"currency\":" + JsonString(AccountInfoString(ACCOUNT_CURRENCY)) + ",";
   json += "\"broker\":" + JsonString(broker) + ",";
   json += "\"platform\":\"MT5\",";
   json += "\"ticket\":" + JsonString(ticket) + ",";
   json += "\"dealTicket\":" + JsonString(dealTicketText) + ",";
   json += "\"symbol\":" + JsonString(symbol) + ",";
   json += "\"side\":" + JsonString(side) + ",";
   json += "\"lot\":" + DoubleToJson(journalLotSize, 2) + ",";

   if(entryPrice > 0.0)
      json += "\"entryPrice\":" + DoubleToJson(entryPrice, digits) + ",";
   else
      json += "\"entryPrice\":null,";

   if(eventType == "close" || eventType == "partial_close")
      json += "\"exitPrice\":" + DoubleToJson(closePrice, digits) + ",";
   else
      json += "\"exitPrice\":null,";

   json += "\"stopLoss\":" + NullablePriceToJson(stopLoss, digits) + ",";
   json += "\"takeProfit\":" + NullablePriceToJson(takeProfit, digits) + ",";

   if(eventType == "close" || eventType == "partial_close")
      json += "\"profitLoss\":" + DoubleToJson(profit, 2) + ",";
   else
      json += "\"profitLoss\":null,";

   json += "\"commission\":" + DoubleToJson(commission, 2) + ",";
   json += "\"swap\":" + DoubleToJson(swap, 2) + ",";
   json += "\"timeframe\":" + JsonString(TimeframeToString(JOURNAL_SCREENSHOT_TIMEFRAME)) + ",";
   json += "\"spread\":" + (string)GetSpread(symbol) + ",";
   json += "\"sessionTime\":" + JsonString(GetSession(eventTime)) + ",";
   json += "\"mood\":null,";
   json += "\"openedAt\":" + JsonString(TimeToTraderLocalIso8601(openTime)) + ",";
   json += "\"closedAt\":";
   if(journalEventType == "close")
      json += JsonString(TimeToTraderLocalIso8601(eventTime));
   else
      json += "null";
   json += "}";

   return json;
}

string BuildOpenPositionSyncJson()
{
   long positionIdLong = PositionGetInteger(POSITION_IDENTIFIER);
   string symbol = PositionGetString(POSITION_SYMBOL);

   if(positionIdLong <= 0 || symbol == "")
      return "";

   double lotSize = PositionGetDouble(POSITION_VOLUME);
   double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   double stopLoss = PositionGetDouble(POSITION_SL);
   double takeProfit = PositionGetDouble(POSITION_TP);
   datetime eventTime = (datetime)PositionGetInteger(POSITION_TIME);
   string tradeType = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell";
   string accountNumber = (string)AccountInfoInteger(ACCOUNT_LOGIN);
   string broker = GetBrokerName();
   string positionId = (string)positionIdLong;
   string ticket = positionId;
   string side = tradeType == "sell" ? "SELL" : "BUY";
   int digits = DigitsForSymbol(symbol);

   string json = "{";
   json += "\"secret\":" + JsonString(JOURNAL_UPLOAD_SECRET) + ",";
   json += "\"eventType\":\"update\",";
   json += "\"accountNumber\":" + JsonString(accountNumber) + ",";
   json += "\"balance\":" + DoubleToJson(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"currency\":" + JsonString(AccountInfoString(ACCOUNT_CURRENCY)) + ",";
   json += "\"broker\":" + JsonString(broker) + ",";
   json += "\"platform\":\"MT5\",";
   json += "\"ticket\":" + JsonString(ticket) + ",";
   json += "\"symbol\":" + JsonString(symbol) + ",";
   json += "\"side\":" + JsonString(side) + ",";
   json += "\"lot\":" + DoubleToJson(lotSize, 2) + ",";
   json += "\"entryPrice\":" + DoubleToJson(entryPrice, digits) + ",";
   json += "\"exitPrice\":null,";
   json += "\"stopLoss\":" + NullablePriceToJson(stopLoss, digits) + ",";
   json += "\"takeProfit\":" + NullablePriceToJson(takeProfit, digits) + ",";
   json += "\"profitLoss\":null,";
   json += "\"commission\":0,";
   json += "\"swap\":0,";
   json += "\"timeframe\":" + JsonString(TimeframeToString((ENUM_TIMEFRAMES)ChartPeriod(ChartID()))) + ",";
   json += "\"spread\":" + (string)GetSpread(symbol) + ",";
   json += "\"sessionTime\":" + JsonString(GetSession(eventTime)) + ",";
   json += "\"mood\":null,";
   json += "\"openedAt\":" + JsonString(TimeToTraderLocalIso8601(eventTime)) + ",";
   json += "\"closedAt\":null";
   json += "}";

   return json;
}

string BuildAccountHeartbeatJson()
{
   string json = "{";
   json += "\"secret\":" + JsonString(JOURNAL_UPLOAD_SECRET) + ",";
   json += "\"accountNumber\":" + JsonString((string)AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   json += "\"balance\":" + DoubleToJson(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
   json += "\"currency\":" + JsonString(AccountInfoString(ACCOUNT_CURRENCY)) + ",";
   json += "\"broker\":" + JsonString(GetBrokerName()) + ",";
   json += "\"platform\":\"MT5\"";
   json += "}";

   return json;
}

void SendAccountHeartbeat(string reason)
{
   if(!JOURNAL_ENABLED)
      return;

   g_lastAccountHeartbeat = TimeCurrent();

   string jsonBody = BuildAccountHeartbeatJson();
   string response = "";
   int statusCode = 0;

   if(HttpPostJson("/api/mt5/journal/account", jsonBody, response, statusCode))
   {
      Print("Account heartbeat sent. Reason: ", reason, ", status code: ", statusCode);
      DebugPrint("Account heartbeat response: " + response);
   }
   else
   {
      QueueJournalPayload("/api/mt5/journal/account", jsonBody);
      Print("Account heartbeat failed. Reason: ", reason, ", status code: ", statusCode, ", response: ", response);
   }
}

void SyncAccountHeartbeat()
{
   datetime now = TimeCurrent();

   if(g_lastAccountHeartbeat > 0 &&
      now - g_lastAccountHeartbeat < ACCOUNT_HEARTBEAT_INTERVAL_SECONDS)
      return;

   SendAccountHeartbeat("timer");
}

string BuildScreenshotJson(
   string positionId,
   string dealTicket,
   string type,
   string capturedAt,
   string status,
   string imageBase64
)
{
   string json = "{";
   json += "\"uploadSecret\":" + JsonString(JOURNAL_UPLOAD_SECRET) + ",";
   json += "\"accountNumber\":" + JsonString((string)AccountInfoInteger(ACCOUNT_LOGIN)) + ",";
   json += "\"broker\":" + JsonString(GetBrokerName()) + ",";
   json += "\"serverName\":" + JsonString(GetServerName()) + ",";
   json += "\"positionId\":" + JsonString(positionId) + ",";
   json += "\"dealTicket\":" + JsonString(dealTicket) + ",";
   json += "\"type\":" + JsonString(type) + ",";
   json += "\"capturedAt\":" + JsonString(capturedAt) + ",";
   json += "\"status\":" + JsonString(status) + ",";
   json += "\"imageBase64\":" + JsonString(imageBase64);
   json += "}";
   return json;
}

//+------------------------------------------------------------------+
//| HTTP                                                             |
//+------------------------------------------------------------------+
bool HttpPostJson(string endpoint, string jsonBody, string &response, int &statusCode)
{
   string url = BuildEndpointUrl(endpoint);
   char data[];
   char result[];
   string resultHeaders = "";
   string headers = "Content-Type: application/json\r\nAccept: application/json\r\n";

   StringToCharArray(jsonBody, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(ArraySize(data) > 0)
      ArrayResize(data, ArraySize(data) - 1);

   ResetLastError();
   statusCode = WebRequest("POST", url, headers, 15000, data, result, resultHeaders);
   int errorCode = GetLastError();
   response = CharArrayToString(result, 0, -1, CP_UTF8);

   Print("Response status code: ", statusCode);

   if(statusCode >= 200 && statusCode < 300)
      return true;

   Print("WebRequest error. URL: ", url, ", MT5 error: ", errorCode);
   if(errorCode == 4014)
      Print("Allow WebRequest URL in MT5: Tools > Options > Expert Advisors > Allow WebRequest for listed URL.");

   return false;
}

//+------------------------------------------------------------------+
//| Reliable journal event retry queue                                |
//+------------------------------------------------------------------+
void RemovePendingJournalPayload(int index)
{
   int count = ArraySize(g_pendingJournalBodies);
   if(index < 0 || index >= count)
      return;

   for(int i = index; i < count - 1; i++)
   {
      g_pendingJournalEndpoints[i] = g_pendingJournalEndpoints[i + 1];
      g_pendingJournalBodies[i] = g_pendingJournalBodies[i + 1];
      g_pendingJournalAttempts[i] = g_pendingJournalAttempts[i + 1];
      g_pendingJournalNextAttempts[i] = g_pendingJournalNextAttempts[i + 1];
   }

   ArrayResize(g_pendingJournalEndpoints, count - 1);
   ArrayResize(g_pendingJournalBodies, count - 1);
   ArrayResize(g_pendingJournalAttempts, count - 1);
   ArrayResize(g_pendingJournalNextAttempts, count - 1);
}

void QueueJournalPayload(string endpoint, string jsonBody)
{
   if(jsonBody == "")
      return;

   int count = ArraySize(g_pendingJournalBodies);
   for(int i = 0; i < count; i++)
   {
      if(g_pendingJournalEndpoints[i] == endpoint &&
         g_pendingJournalBodies[i] == jsonBody)
         return;
   }

   if(count >= 100)
   {
      Print("Journal retry queue full; dropping oldest payload.");
      RemovePendingJournalPayload(0);
      count--;
   }

   ArrayResize(g_pendingJournalEndpoints, count + 1);
   ArrayResize(g_pendingJournalBodies, count + 1);
   ArrayResize(g_pendingJournalAttempts, count + 1);
   ArrayResize(g_pendingJournalNextAttempts, count + 1);
   g_pendingJournalEndpoints[count] = endpoint;
   g_pendingJournalBodies[count] = jsonBody;
   g_pendingJournalAttempts[count] = 0;
   g_pendingJournalNextAttempts[count] = TimeCurrent() + 2;
   Print("Journal payload queued for retry. Queue size: ", count + 1);
}

void ProcessPendingJournalPayloads()
{
   datetime now = TimeCurrent();

   for(int i = ArraySize(g_pendingJournalBodies) - 1; i >= 0; i--)
   {
      if(g_pendingJournalNextAttempts[i] > now)
         continue;

      string response = "";
      int statusCode = 0;
      if(HttpPostJson(
         g_pendingJournalEndpoints[i],
         g_pendingJournalBodies[i],
         response,
         statusCode
      ))
      {
         Print("Queued journal payload delivered. Status code: ", statusCode);
         RemovePendingJournalPayload(i);
         continue;
      }

      g_pendingJournalAttempts[i]++;
      int delaySeconds = 5 * g_pendingJournalAttempts[i];
      if(delaySeconds > 60)
         delaySeconds = 60;
      g_pendingJournalNextAttempts[i] = now + delaySeconds;
      Print(
         "Queued journal payload retry failed. Attempt: ",
         g_pendingJournalAttempts[i],
         ", next retry in seconds: ",
         delaySeconds
      );
   }
}

//+------------------------------------------------------------------+
//| Recover close events missed during a temporary outage             |
//+------------------------------------------------------------------+
bool RecoveredClosedPosition(long positionId)
{
   for(int i = 0; i < ArraySize(g_recoveredClosedPositionIds); i++)
   {
      if(g_recoveredClosedPositionIds[i] == positionId)
         return true;
   }

   return false;
}

void MarkClosedPositionRecovered(long positionId)
{
   int count = ArraySize(g_recoveredClosedPositionIds);
   ArrayResize(g_recoveredClosedPositionIds, count + 1);
   g_recoveredClosedPositionIds[count] = positionId;
}

bool PositionIdentifierIsOpen(long positionId)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      if(PositionGetInteger(POSITION_IDENTIFIER) == positionId &&
         PositionGetDouble(POSITION_VOLUME) > 0.0)
         return true;
   }

   return false;
}

//+------------------------------------------------------------------+
//| Live solid SL/TP lines on the recorder chart                      |
//+------------------------------------------------------------------+
string LiveLevelObjectName(long positionId, string level, string kind)
{
   return "TJR_LIVE_" + (string)positionId + "_" + level + "_" + kind;
}

void DeleteLiveLevelObjects(long positionId)
{
   ObjectDelete(0, LiveLevelObjectName(positionId, "SL", "LINE"));
   ObjectDelete(0, LiveLevelObjectName(positionId, "SL", "TEXT"));
   ObjectDelete(0, LiveLevelObjectName(positionId, "TP", "LINE"));
   ObjectDelete(0, LiveLevelObjectName(positionId, "TP", "TEXT"));
}

int FindDrawnLevelPosition(long positionId)
{
   for(int i = 0; i < ArraySize(g_drawnLevelPositionIds); i++)
   {
      if(g_drawnLevelPositionIds[i] == positionId)
         return i;
   }

   return -1;
}

void RememberDrawnLevelPosition(long positionId)
{
   if(FindDrawnLevelPosition(positionId) >= 0)
      return;

   int count = ArraySize(g_drawnLevelPositionIds);
   ArrayResize(g_drawnLevelPositionIds, count + 1);
   g_drawnLevelPositionIds[count] = positionId;
}

void RemoveDrawnLevelPosition(int index)
{
   int count = ArraySize(g_drawnLevelPositionIds);
   if(index < 0 || index >= count)
      return;

   for(int i = index; i < count - 1; i++)
      g_drawnLevelPositionIds[i] = g_drawnLevelPositionIds[i + 1];

   ArrayResize(g_drawnLevelPositionIds, count - 1);
}

void DrawLiveLevel(
   long positionId,
   string level,
   double price,
   color lineColor,
   string symbol
)
{
   string lineName = LiveLevelObjectName(positionId, level, "LINE");
   string textName = LiveLevelObjectName(positionId, level, "TEXT");

   if(price <= 0.0)
   {
      ObjectDelete(0, lineName);
      ObjectDelete(0, textName);
      return;
   }

   if(ObjectFind(0, lineName) < 0)
      ObjectCreate(0, lineName, OBJ_HLINE, 0, 0, price);

   ObjectSetDouble(0, lineName, OBJPROP_PRICE, price);
   ObjectSetInteger(0, lineName, OBJPROP_COLOR, lineColor);
   ObjectSetInteger(0, lineName, OBJPROP_STYLE, STYLE_SOLID);
   ObjectSetInteger(0, lineName, OBJPROP_WIDTH, LIVE_LEVEL_WIDTH);
   ObjectSetInteger(0, lineName, OBJPROP_BACK, false);
   ObjectSetInteger(0, lineName, OBJPROP_ZORDER, 1000);
   ObjectSetInteger(0, lineName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, lineName, OBJPROP_HIDDEN, true);

   datetime labelTime = iTime(symbol, (ENUM_TIMEFRAMES)ChartPeriod(0), 0);
   if(labelTime <= 0)
      labelTime = TimeCurrent();
   int digits = DigitsForSymbol(symbol);
   string label = level + "  " + DoubleToString(price, digits);

   if(ObjectFind(0, textName) < 0)
      ObjectCreate(0, textName, OBJ_TEXT, 0, labelTime, price);

   ObjectMove(0, textName, 0, labelTime, price);
   ObjectSetString(0, textName, OBJPROP_TEXT, label);
   ObjectSetString(0, textName, OBJPROP_FONT, "Arial");
   ObjectSetInteger(0, textName, OBJPROP_FONTSIZE, 10);
   ObjectSetInteger(0, textName, OBJPROP_COLOR, lineColor);
   ObjectSetInteger(0, textName, OBJPROP_ANCHOR, ANCHOR_LEFT_LOWER);
   ObjectSetInteger(0, textName, OBJPROP_BACK, false);
   ObjectSetInteger(0, textName, OBJPROP_ZORDER, 1001);
   ObjectSetInteger(0, textName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, textName, OBJPROP_HIDDEN, true);
}

void SyncLiveTradeLevelObjects()
{
   if(HIDE_NATIVE_TRADE_LEVELS)
      ChartSetInteger(0, CHART_SHOW_TRADE_LEVELS, false);
   else if(g_nativeTradeLevelStateSaved)
      ChartSetInteger(0, CHART_SHOW_TRADE_LEVELS, g_originalShowTradeLevels);

   if(!SHOW_LIVE_TRADE_LEVELS)
   {
      for(int i = ArraySize(g_drawnLevelPositionIds) - 1; i >= 0; i--)
         DeleteLiveLevelObjects(g_drawnLevelPositionIds[i]);
      ArrayResize(g_drawnLevelPositionIds, 0);
      ChartRedraw(0);
      return;
   }

   string chartSymbol = ChartSymbol(0);
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      if(symbol != chartSymbol)
         continue;

      long positionId = PositionGetInteger(POSITION_IDENTIFIER);
      if(positionId <= 0)
         continue;

      RememberDrawnLevelPosition(positionId);
      DrawLiveLevel(
         positionId,
         "SL",
         PositionGetDouble(POSITION_SL),
         LIVE_SL_COLOR,
         symbol
      );
      DrawLiveLevel(
         positionId,
         "TP",
         PositionGetDouble(POSITION_TP),
         LIVE_TP_COLOR,
         symbol
      );
   }

   for(int i = ArraySize(g_drawnLevelPositionIds) - 1; i >= 0; i--)
   {
      long positionId = g_drawnLevelPositionIds[i];
      if(PositionIdentifierIsOpen(positionId))
         continue;

      DeleteLiveLevelObjects(positionId);
      RemoveDrawnLevelPosition(i);
   }

   ChartRedraw(0);
}

void SyncRecentClosedPositions()
{
   datetime now = TimeCurrent();
   if(g_lastClosedPositionRecovery > 0 &&
      now - g_lastClosedPositionRecovery < 30)
      return;

   g_lastClosedPositionRecovery = now;
   int recoveryHours = MISSED_CLOSE_RECOVERY_HOURS;
   if(recoveryHours <= 0)
      return;

   if(!HistorySelect(now - recoveryHours * 3600, now + 60))
      return;

   for(int i = HistoryDealsTotal() - 1; i >= 0; i--)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0)
         continue;

      ENUM_DEAL_TYPE dealType =
         (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
         continue;

      ENUM_DEAL_ENTRY entry =
         (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT &&
         entry != DEAL_ENTRY_OUT_BY &&
         entry != DEAL_ENTRY_INOUT)
         continue;

      long positionId =
         HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      if(positionId <= 0 ||
         RecoveredClosedPosition(positionId) ||
         PositionIdentifierIsOpen(positionId))
         continue;

      MarkClosedPositionRecovered(positionId);
      string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      string jsonBody = BuildTradeEventJson("close", dealTicket, symbol);
      if(jsonBody == "")
         continue;

      string response = "";
      int statusCode = 0;
      if(HttpPostJson("/api/mt5/journal", jsonBody, response, statusCode))
      {
         Print(
            "Missed close recovery sent. Position: ",
            (string)positionId,
            ", deal: ",
            (string)dealTicket
         );
      }
      else
      {
         QueueJournalPayload("/api/mt5/journal", jsonBody);
      }
   }
}

//+------------------------------------------------------------------+
//| Screenshot workflow                                               |
//+------------------------------------------------------------------+
void ProcessScreenshotForDeal(string eventType, ulong dealTicket, string fallbackSymbol)
{
   string screenshotType = "";
   if(eventType == "open" || eventType == "pending_activated")
      screenshotType = "entry";
   else if(eventType == "close" || eventType == "partial_close")
      screenshotType = "exit";
   else
      return;

   bool shouldDeleteTradeLevels = eventType == "close";

   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   if(symbol == "")
      symbol = fallbackSymbol;

   long positionIdLong = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   string positionId = positionIdLong > 0 ? (string)positionIdLong : "";
   if(symbol == "" || positionId == "")
   {
      Print("Screenshot skipped: missing symbol or position id. Deal: ", (string)dealTicket);
      return;
   }

   Print("Screenshot started. Type: ", screenshotType, ", symbol: ", symbol, ", deal: ", (string)dealTicket);

   bool isTemporary = false;
   long chartId = EnsureChartForSymbol(symbol, JOURNAL_SCREENSHOT_TIMEFRAME, isTemporary);
   if(chartId <= 0)
   {
      Print("Screenshot error: could not open/find chart for ", symbol);
      return;
   }

   ChartNavigate(chartId, CHART_END, 0);
   ChartRedraw(chartId);
   Print("Screenshot capture using visible chart. Symbol: ", symbol, ", chart ID: ", (string)chartId, ", timeframe: ", TimeframeToString((ENUM_TIMEFRAMES)ChartPeriod(chartId)));

   double entryPrice = 0.0;
   double stopLoss = 0.0;
   double takeProfit = 0.0;
   string tradeType = GetTradeTypeForDeal(dealTicket, (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE));
   datetime eventTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   double closePrice = 0.0;

   if(screenshotType == "entry")
      entryPrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
   else
      closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);

   FillPositionTradeDetails(positionIdLong, symbol, eventTime, entryPrice, stopLoss, takeProfit, tradeType);
   DrawTradeLevels(chartId, symbol, tradeType, HistoryDealGetDouble(dealTicket, DEAL_VOLUME), entryPrice, stopLoss, takeProfit, closePrice, eventTime);

   datetime capturedAt = TimeCurrent();
   string filename = BuildScreenshotFilename(symbol, positionId, (string)dealTicket, screenshotType, capturedAt);

   if(!CaptureChartScreenshot(chartId, filename))
   {
      Print("Screenshot error: ChartScreenShot failed for ", symbol);
      if(shouldDeleteTradeLevels)
         DeleteTradeLevels(chartId, symbol);
      CleanupTemporaryChart(chartId, isTemporary);
      return;
   }

   string imageBase64 = "";
   if(!ReadFileToBase64(filename, imageBase64))
   {
      Print("Screenshot error: could not read PNG for ", symbol);
      if(shouldDeleteTradeLevels)
         DeleteTradeLevels(chartId, symbol);
      CleanupTemporaryChart(chartId, isTemporary);
      return;
   }

   if(SendScreenshotToApi(positionId, (string)dealTicket, screenshotType, TimeToTraderLocalIso8601(capturedAt), "captured_on_time", imageBase64))
      Print("Screenshot uploaded. Type: ", screenshotType, ", deal: ", (string)dealTicket);
   else
      Print("Screenshot upload failed. Type: ", screenshotType, ", deal: ", (string)dealTicket);

   if(shouldDeleteTradeLevels)
      DeleteTradeLevels(chartId, symbol);

   CleanupTemporaryChart(chartId, isTemporary);
}

void ProcessScreenshotForOpenPosition(ulong positionTicket, long positionIdLong)
{
   if(positionTicket == 0 || positionIdLong <= 0)
      return;

   string attemptKey = "entry:" + (string)positionIdLong;
   if(!CanAttemptScreenshot(attemptKey, 10))
      return;

   SetLastScreenshotAttemptTime(attemptKey, TimeCurrent());

   if(!PositionSelectByTicket(positionTicket))
   {
      Print("Entry screenshot sync skipped: position is no longer open. Ticket: ", (string)positionTicket);
      return;
   }

   string symbol = PositionGetString(POSITION_SYMBOL);
   if(symbol == "")
   {
      Print("Entry screenshot sync skipped: missing symbol. Position: ", (string)positionIdLong);
      return;
   }

   Print("Entry screenshot sync started. Symbol: ", symbol, ", position: ", (string)positionIdLong);

   bool isTemporary = false;
   long chartId = EnsureChartForSymbol(symbol, JOURNAL_SCREENSHOT_TIMEFRAME, isTemporary);
   if(chartId <= 0)
   {
      Print("Entry screenshot sync error: could not open/find chart for ", symbol);
      return;
   }

   ChartNavigate(chartId, CHART_END, 0);
   ChartRedraw(chartId);

   double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   double stopLoss = PositionGetDouble(POSITION_SL);
   double takeProfit = PositionGetDouble(POSITION_TP);
   double lotSize = PositionGetDouble(POSITION_VOLUME);
   string tradeType = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_SELL ? "sell" : "buy";
   datetime eventTime = (datetime)PositionGetInteger(POSITION_TIME);

   DrawTradeLevels(chartId, symbol, tradeType, lotSize, entryPrice, stopLoss, takeProfit, 0.0, eventTime);

   datetime capturedAt = TimeCurrent();
   string positionId = (string)positionIdLong;
   string dealTicket = "sync-" + positionId;
   string filename = BuildScreenshotFilename(symbol, positionId, dealTicket, "entry", capturedAt);

   if(!CaptureChartScreenshot(chartId, filename))
   {
      Print("Entry screenshot sync error: ChartScreenShot failed for ", symbol);
      CleanupTemporaryChart(chartId, isTemporary);
      return;
   }

   string imageBase64 = "";
   if(!ReadFileToBase64(filename, imageBase64))
   {
      Print("Entry screenshot sync error: could not read PNG for ", symbol);
      CleanupTemporaryChart(chartId, isTemporary);
      return;
   }

   if(SendScreenshotToApi(positionId, dealTicket, "entry", TimeToTraderLocalIso8601(capturedAt), "captured_from_sync", imageBase64))
   {
      Print("Entry screenshot sync uploaded. Position: ", positionId);
      SetLastScreenshotAttemptTime(attemptKey, TimeCurrent() + 86400 * 365);
   }
   else
   {
      Print("Entry screenshot sync upload failed. Position: ", positionId);
   }

   CleanupTemporaryChart(chartId, isTemporary);
}

void CaptureEntryScreenshotsForOpenPositions()
{
   static datetime lastScanLog = 0;
   datetime now = TimeCurrent();
   if(now - lastScanLog >= 10)
   {
      DebugPrint("Entry screenshot timer scan. Open positions: " + (string)PositionsTotal());
      lastScanLog = now;
   }

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      long positionId = PositionGetInteger(POSITION_IDENTIFIER);
      if(positionId <= 0)
         continue;

      ProcessScreenshotForOpenPosition(ticket, positionId);
   }
}

long FindChartBySymbolAndTimeframe(string symbol, ENUM_TIMEFRAMES tf)
{
   long chartId = ChartFirst();
   while(chartId >= 0)
   {
      if(ChartSymbol(chartId) == symbol && (ENUM_TIMEFRAMES)ChartPeriod(chartId) == tf)
         return chartId;

      chartId = ChartNext(chartId);
   }

   return -1;
}

long EnsureChartForSymbol(string symbol, ENUM_TIMEFRAMES tf, bool &isTemporary)
{
   isTemporary = false;

   long chartId = FindChartBySymbolAndTimeframe(symbol, tf);
   if(chartId > 0)
      return chartId;

   chartId = FindChartBySymbol(symbol);
   if(chartId > 0)
   {
      Print("Existing chart reused for screenshot. Symbol: ", symbol, ", chart ID: ", (string)chartId);
      return chartId;
   }

   if(!OPEN_CHART_FOR_SCREENSHOT)
      return -1;

   if(!SymbolSelect(symbol, true))
   {
      Print("SymbolSelect failed for ", symbol, ". Error: ", GetLastError());
      return -1;
   }

   chartId = ChartOpen(symbol, tf);
   if(chartId > 0)
   {
      isTemporary = true;
      Print("Temporary chart opened for screenshot. Symbol: ", symbol, ", timeframe: ", TimeframeToString(tf));
   }

   return chartId;
}

long FindChartBySymbol(string symbol)
{
   long chartId = ChartFirst();
   while(chartId >= 0)
   {
      if(ChartSymbol(chartId) == symbol)
         return chartId;

      chartId = ChartNext(chartId);
   }

   return -1;
}

bool WaitForChartReady(long chartId, string symbol, ENUM_TIMEFRAMES tf, int timeoutMs)
{
   int waited = 0;
   int stepMs = 200;
   int readyChecks = 0;

   while(waited <= timeoutMs)
   {
      if(ChartSymbol(chartId) != symbol || (ENUM_TIMEFRAMES)ChartPeriod(chartId) != tf)
         ChartSetSymbolPeriod(chartId, symbol, tf);

      ChartNavigate(chartId, CHART_END, 0);
      ChartRedraw(chartId);

      long synchronized = 0;
      bool seriesKnown = SeriesInfoInteger(symbol, tf, SERIES_SYNCHRONIZED, synchronized);
      bool chartMatches = ChartSymbol(chartId) == symbol && (ENUM_TIMEFRAMES)ChartPeriod(chartId) == tf;
      bool hasBars = Bars(symbol, tf) > 0;

      if(chartMatches && hasBars)
      {
         readyChecks++;

         if(readyChecks >= 3 || (seriesKnown && synchronized > 0))
            return true;
      }
      else
      {
         readyChecks = 0;
      }

      if(waited == 2000 || waited == 5000)
      {
         DebugPrint(
            "Waiting for chart. Symbol: " + symbol +
            ", timeframe: " + TimeframeToString(tf) +
            ", bars: " + (string)Bars(symbol, tf) +
            ", chart symbol: " + ChartSymbol(chartId) +
            ", chart period: " + TimeframeToString((ENUM_TIMEFRAMES)ChartPeriod(chartId)) +
            ", synchronized: " + (string)(seriesKnown ? synchronized : -1)
         );
      }

      Sleep(stepMs);
      waited += stepMs;
   }

   Print(
      "Chart ready timeout. Symbol: ", symbol,
      ", timeframe: ", TimeframeToString(tf),
      ", bars: ", Bars(symbol, tf),
      ", chart symbol: ", ChartSymbol(chartId),
      ", chart period: ", TimeframeToString((ENUM_TIMEFRAMES)ChartPeriod(chartId))
   );

   return false;
}

void DrawTradeLevels(
   long chartId,
   string symbol,
   string tradeType,
   double lotSize,
   double entryPrice,
   double stopLoss,
   double takeProfit,
   double closePrice,
   datetime eventTime
)
{
   string prefix = "TJR_" + SanitizeFilePart(symbol) + "_";
   DrawPriceLine(chartId, prefix + "ENTRY", "ENTRY", entryPrice, clrLimeGreen, 2);
   DrawPriceLine(chartId, prefix + "SL", "SL", stopLoss, clrTomato, 1);
   DrawPriceLine(chartId, prefix + "TP", "TP", takeProfit, clrDodgerBlue, 1);
   DrawPriceLine(chartId, prefix + "CLOSE", "CLOSE", closePrice, clrGold, 2);

   string labelName = prefix + "LABEL";
   if(ObjectFind(chartId, labelName) < 0)
      ObjectCreate(chartId, labelName, OBJ_LABEL, 0, 0, 0);

   string labelText = symbol +
      " | " + tradeType +
      " | lot " + DoubleToString(lotSize, 2) +
      " | entry " + PriceOrDash(entryPrice, symbol) +
      " | SL " + PriceOrDash(stopLoss, symbol) +
      " | TP " + PriceOrDash(takeProfit, symbol);

   if(closePrice > 0.0)
      labelText += " | close " + PriceOrDash(closePrice, symbol);

   labelText += " | " + TimeToString(eventTime, TIME_DATE | TIME_SECONDS);

   ObjectSetInteger(chartId, labelName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(chartId, labelName, OBJPROP_XDISTANCE, 10);
   ObjectSetInteger(chartId, labelName, OBJPROP_YDISTANCE, 20);
   ObjectSetInteger(chartId, labelName, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(chartId, labelName, OBJPROP_BACK, false);
   ObjectSetInteger(chartId, labelName, OBJPROP_FONTSIZE, 9);
   ObjectSetString(chartId, labelName, OBJPROP_TEXT, labelText);

   ChartRedraw(chartId);
}

void DeleteTradeLevels(long chartId, string symbol)
{
   if(chartId <= 0 || symbol == "")
      return;

   string prefix = "TJR_" + SanitizeFilePart(symbol) + "_";
   ObjectDelete(chartId, prefix + "ENTRY");
   ObjectDelete(chartId, prefix + "SL");
   ObjectDelete(chartId, prefix + "TP");
   ObjectDelete(chartId, prefix + "CLOSE");
   ObjectDelete(chartId, prefix + "LABEL");
   ChartRedraw(chartId);
}

bool CaptureChartScreenshot(long chartId, string filename)
{
   Sleep(MathMax(SCREENSHOT_DELAY_MS, 0));
   ChartRedraw(chartId);
   ResetLastError();

   bool ok = ChartScreenShot(
      chartId,
      filename,
      MathMax(SCREENSHOT_WIDTH, 320),
      MathMax(SCREENSHOT_HEIGHT, 240),
      ALIGN_RIGHT
   );

   if(!ok)
      Print("ChartScreenShot failed. Error: ", GetLastError());

   return ok;
}

bool ReadFileToBase64(string filename, string &base64)
{
   base64 = "";
   ResetLastError();

   int handle = INVALID_HANDLE;
   for(int attempt = 0; attempt < 20; attempt++)
   {
      handle = FileOpen(filename, FILE_READ | FILE_BIN);
      if(handle != INVALID_HANDLE)
         break;

      Sleep(100);
   }

   if(handle == INVALID_HANDLE)
   {
      Print("FileOpen screenshot failed. File: ", filename, ", error: ", GetLastError());
      return false;
   }

   ulong fileSize = FileSize(handle);
   if(fileSize == 0 || fileSize > 12 * 1024 * 1024)
   {
      FileClose(handle);
      Print("Screenshot file size invalid: ", (string)fileSize);
      return false;
   }

   uchar bytes[];
   ArrayResize(bytes, (int)fileSize);
   uint read = FileReadArray(handle, bytes, 0, (int)fileSize);
   FileClose(handle);

   if(read != (uint)fileSize)
   {
      Print("Screenshot file read incomplete. Read: ", read, ", expected: ", (string)fileSize);
      return false;
   }

   base64 = Base64Encode(bytes);
   return StringLen(base64) > 0;
}

bool SendScreenshotToApi(
   string positionId,
   string dealTicket,
   string type,
   string capturedAt,
   string status,
   string imageBase64
)
{
   string jsonBody = BuildScreenshotJson(positionId, dealTicket, type, capturedAt, status, imageBase64);
   string response = "";
   int statusCode = 0;
   bool ok = HttpPostJson("/api/mt5/journal/screenshot", jsonBody, response, statusCode);

   if(ok)
      DebugPrint("Screenshot API response: " + response);
   else
      Print("Screenshot API error. Status code: ", statusCode, ", response: ", response);

   return ok;
}

void CleanupTemporaryChart(long chartId, bool isTemporary)
{
   if(isTemporary && CLOSE_TEMP_CHART_AFTER_SCREENSHOT && chartId > 0)
   {
      ChartClose(chartId);
      Print("Temporary chart closed. Chart ID: ", (string)chartId);
   }
}

//+------------------------------------------------------------------+
//| Account and event helpers                                         |
//+------------------------------------------------------------------+
string BuildIdempotencyKey(string accountNumber, string broker, string serverName, string positionId, string dealTicket, string eventType)
{
   return accountNumber + "-" + broker + "-" + serverName + "-" + positionId + "-" + dealTicket + "-" + eventType;
}

string GetAccountCurrency()
{
   return AccountInfoString(ACCOUNT_CURRENCY);
}

string GetBrokerName()
{
   return AccountInfoString(ACCOUNT_COMPANY);
}

string GetServerName()
{
   return AccountInfoString(ACCOUNT_SERVER);
}

string GetSession()
{
   return GetSession(TimeCurrent());
}

string GetSession(datetime value)
{
   MqlDateTime parts;
   TimeToStruct(value, parts);
   int hour = parts.hour;

   if(hour >= 0 && hour < 7)
      return "Asia";
   if(hour >= 7 && hour < 12)
      return "London";
   if(hour >= 12 && hour < 17)
      return "London/New York";
   if(hour >= 17 && hour < 22)
      return "New York";

   return "After Hours";
}

string TimeframeToString(ENUM_TIMEFRAMES tf)
{
   switch(tf)
   {
      case PERIOD_M1:  return "M1";
      case PERIOD_M2:  return "M2";
      case PERIOD_M3:  return "M3";
      case PERIOD_M4:  return "M4";
      case PERIOD_M5:  return "M5";
      case PERIOD_M6:  return "M6";
      case PERIOD_M10: return "M10";
      case PERIOD_M12: return "M12";
      case PERIOD_M15: return "M15";
      case PERIOD_M20: return "M20";
      case PERIOD_M30: return "M30";
      case PERIOD_H1:  return "H1";
      case PERIOD_H2:  return "H2";
      case PERIOD_H3:  return "H3";
      case PERIOD_H4:  return "H4";
      case PERIOD_H6:  return "H6";
      case PERIOD_H8:  return "H8";
      case PERIOD_H12: return "H12";
      case PERIOD_D1:  return "D1";
      case PERIOD_W1:  return "W1";
      case PERIOD_MN1: return "MN1";
      default:         return EnumToString(tf);
   }
}

string DetectEventType(ulong dealTicket, ulong fallbackOrderTicket)
{
   ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL)
      return "";

   ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);

   if(entry == DEAL_ENTRY_IN)
      return IsPendingOrderActivation(dealTicket, fallbackOrderTicket) ? "pending_activated" : "open";

   if(entry == DEAL_ENTRY_OUT || entry == DEAL_ENTRY_OUT_BY)
      return IsPositionStillOpenAfterDeal(dealTicket) ? "partial_close" : "close";

   if(entry == DEAL_ENTRY_INOUT)
      return IsPositionStillOpenAfterDeal(dealTicket) ? "open" : "close";

   return "";
}

bool IsPendingOrderActivation(ulong dealTicket, ulong fallbackOrderTicket)
{
   ulong orderTicket = (ulong)HistoryDealGetInteger(dealTicket, DEAL_ORDER);
   if(orderTicket == 0)
      orderTicket = fallbackOrderTicket;
   if(orderTicket == 0 || !HistoryOrderSelect(orderTicket))
      return false;

   ENUM_ORDER_TYPE orderType = (ENUM_ORDER_TYPE)HistoryOrderGetInteger(orderTicket, ORDER_TYPE);
   return orderType == ORDER_TYPE_BUY_LIMIT ||
      orderType == ORDER_TYPE_SELL_LIMIT ||
      orderType == ORDER_TYPE_BUY_STOP ||
      orderType == ORDER_TYPE_SELL_STOP ||
      orderType == ORDER_TYPE_BUY_STOP_LIMIT ||
      orderType == ORDER_TYPE_SELL_STOP_LIMIT;
}

long ResolveStablePositionIdentifier(long historyPositionId, long fallbackPositionTicket)
{
   if(historyPositionId > 0)
      return historyPositionId;

   if(fallbackPositionTicket <= 0)
      return 0;

   if(PositionSelectByTicket((ulong)fallbackPositionTicket))
   {
      long identifier = PositionGetInteger(POSITION_IDENTIFIER);
      if(identifier > 0)
         return identifier;
   }

   return fallbackPositionTicket;
}

bool IsPositionStillOpenAfterDeal(ulong dealTicket)
{
   long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   if(positionId <= 0)
      return false;

   if(PositionSelectByTicket((ulong)positionId))
      return PositionGetDouble(POSITION_VOLUME) > 0.0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      if(PositionGetInteger(POSITION_IDENTIFIER) == positionId && PositionGetDouble(POSITION_VOLUME) > 0.0)
         return true;
   }

   return false;
}

double GetOpenPositionVolumeByIdentifier(long positionId)
{
   if(positionId <= 0)
      return 0.0;

   if(PositionSelectByTicket((ulong)positionId))
   {
      if(PositionGetInteger(POSITION_IDENTIFIER) == positionId)
         return PositionGetDouble(POSITION_VOLUME);
   }

   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetInteger(POSITION_IDENTIFIER) == positionId)
         return PositionGetDouble(POSITION_VOLUME);
   }

   return 0.0;
}

int FindCachedPositionIndex(long positionId)
{
   for(int i = 0; i < ArraySize(g_cachedPositionIds); i++)
   {
      if(g_cachedPositionIds[i] == positionId)
         return i;
   }

   return -1;
}

void UpsertPositionLevelCache(
   long positionId,
   string symbol,
   double entryPrice,
   double stopLoss,
   double takeProfit,
   string tradeType
)
{
   if(positionId <= 0)
      return;

   int index = FindCachedPositionIndex(positionId);
   if(index < 0)
   {
      index = ArraySize(g_cachedPositionIds);
      ArrayResize(g_cachedPositionIds, index + 1);
      ArrayResize(g_cachedPositionSymbols, index + 1);
      ArrayResize(g_cachedEntryPrices, index + 1);
      ArrayResize(g_cachedStopLosses, index + 1);
      ArrayResize(g_cachedTakeProfits, index + 1);
      ArrayResize(g_cachedTradeTypes, index + 1);
   }

   g_cachedPositionIds[index] = positionId;
   g_cachedPositionSymbols[index] = symbol;
   g_cachedEntryPrices[index] = entryPrice;
   g_cachedStopLosses[index] = stopLoss;
   g_cachedTakeProfits[index] = takeProfit;
   g_cachedTradeTypes[index] = tradeType;
}

void CacheSelectedPosition()
{
   long positionId = PositionGetInteger(POSITION_IDENTIFIER);
   if(positionId <= 0)
      return;

   string symbol = PositionGetString(POSITION_SYMBOL);
   double entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
   double stopLoss = PositionGetDouble(POSITION_SL);
   double takeProfit = PositionGetDouble(POSITION_TP);
   string tradeType = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell";

   UpsertPositionLevelCache(positionId, symbol, entryPrice, stopLoss, takeProfit, tradeType);
}

void CacheTransactionPosition(const MqlTradeTransaction &trans)
{
   if(trans.position <= 0)
      return;

   if(PositionSelectByTicket(trans.position))
   {
      SendUpdateIfSelectedPositionLevelsChanged("transaction");
      CacheSelectedPosition();
   }
}

void RefreshPositionLevelCache()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      CacheSelectedPosition();
   }
}

bool PricesDiffer(double left, double right, string symbol)
{
   int digits = DigitsForSymbol(symbol);
   return NormalizeDouble(left, digits) != NormalizeDouble(right, digits);
}

bool SelectedPositionLevelsChanged()
{
   long positionId = PositionGetInteger(POSITION_IDENTIFIER);
   if(positionId <= 0)
      return false;

   int index = FindCachedPositionIndex(positionId);
   if(index < 0)
      return false;

   string symbol = PositionGetString(POSITION_SYMBOL);
   double stopLoss = PositionGetDouble(POSITION_SL);
   double takeProfit = PositionGetDouble(POSITION_TP);

   return PricesDiffer(g_cachedStopLosses[index], stopLoss, symbol) ||
          PricesDiffer(g_cachedTakeProfits[index], takeProfit, symbol);
}

void SendUpdateIfSelectedPositionLevelsChanged(string reason)
{
   if(!SelectedPositionLevelsChanged())
      return;

   long positionId = PositionGetInteger(POSITION_IDENTIFIER);
   string jsonBody = BuildOpenPositionSyncJson();
   if(jsonBody == "")
      return;

   string response = "";
   int statusCode = 0;

   if(HttpPostJson("/api/mt5/journal", jsonBody, response, statusCode))
   {
      Print("Position level update sent. Position: ", (string)positionId, ", reason: ", reason, ", status code: ", statusCode);
      DebugPrint("Position level update response: " + response);
   }
   else
   {
      QueueJournalPayload("/api/mt5/journal", jsonBody);
      Print("Position level update failed. Position: ", (string)positionId, ", reason: ", reason, ", status code: ", statusCode, ", response: ", response);
   }
}

void SyncPositionLevelChanges()
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      SendUpdateIfSelectedPositionLevelsChanged("timer");
      CacheSelectedPosition();
   }
}

int FindSyncAttemptIndex(long positionId)
{
   for(int i = 0; i < ArraySize(g_syncAttemptPositionIds); i++)
   {
      if(g_syncAttemptPositionIds[i] == positionId)
         return i;
   }

   return -1;
}

datetime GetLastSyncAttemptTime(long positionId)
{
   int index = FindSyncAttemptIndex(positionId);
   if(index < 0)
      return 0;

   return g_syncAttemptTimes[index];
}

void SetLastSyncAttemptTime(long positionId, datetime value)
{
   int index = FindSyncAttemptIndex(positionId);
   if(index < 0)
   {
      index = ArraySize(g_syncAttemptPositionIds);
      ArrayResize(g_syncAttemptPositionIds, index + 1);
      ArrayResize(g_syncAttemptTimes, index + 1);
   }

   g_syncAttemptPositionIds[index] = positionId;
   g_syncAttemptTimes[index] = value;
}

int FindScreenshotAttemptIndex(string key)
{
   for(int i = 0; i < ArraySize(g_screenshotAttemptKeys); i++)
   {
      if(g_screenshotAttemptKeys[i] == key)
         return i;
   }

   return -1;
}

datetime GetLastScreenshotAttemptTime(string key)
{
   int index = FindScreenshotAttemptIndex(key);
   if(index < 0)
      return 0;

   return g_screenshotAttemptTimes[index];
}

void SetLastScreenshotAttemptTime(string key, datetime value)
{
   int index = FindScreenshotAttemptIndex(key);
   if(index < 0)
   {
      index = ArraySize(g_screenshotAttemptKeys);
      ArrayResize(g_screenshotAttemptKeys, index + 1);
      ArrayResize(g_screenshotAttemptTimes, index + 1);
   }

   g_screenshotAttemptKeys[index] = key;
   g_screenshotAttemptTimes[index] = value;
}

bool CanAttemptScreenshot(string key, int cooldownSeconds)
{
   datetime lastAttempt = GetLastScreenshotAttemptTime(key);
   datetime now = TimeCurrent();

   if(lastAttempt <= 0)
      return true;

   return now - lastAttempt >= cooldownSeconds;
}

void SyncOpenPositions()
{
   datetime now = TimeCurrent();

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;

      long positionId = PositionGetInteger(POSITION_IDENTIFIER);
      if(positionId <= 0)
         continue;

      datetime lastAttempt = GetLastSyncAttemptTime(positionId);
      if(lastAttempt > 0 && now - lastAttempt < 30)
         continue;

      string jsonBody = BuildOpenPositionSyncJson();
      if(jsonBody == "")
         continue;

      string response = "";
      int statusCode = 0;
      SetLastSyncAttemptTime(positionId, now);

      if(HttpPostJson("/api/mt5/journal", jsonBody, response, statusCode))
      {
         Print("Open position sync sent. Position: ", (string)positionId, ", status code: ", statusCode);
         DebugPrint("Open position sync response: " + response);
         if(CAPTURE_SCREENSHOTS)
            ProcessScreenshotForOpenPosition(ticket, positionId);
      }
      else
      {
         Print("Open position sync failed. Position: ", (string)positionId, ", status code: ", statusCode, ", response: ", response);
      }
   }
}

bool GetCachedPositionTradeDetails(
   long positionId,
   string symbol,
   double &entryPrice,
   double &stopLoss,
   double &takeProfit,
   string &tradeType
)
{
   int index = FindCachedPositionIndex(positionId);
   if(index < 0)
      return false;

   if(symbol != "" && g_cachedPositionSymbols[index] != "" && g_cachedPositionSymbols[index] != symbol)
      return false;

   if(entryPrice <= 0.0)
      entryPrice = g_cachedEntryPrices[index];

   stopLoss = g_cachedStopLosses[index];
   takeProfit = g_cachedTakeProfits[index];

   if(g_cachedTradeTypes[index] != "")
      tradeType = g_cachedTradeTypes[index];

   return true;
}

void FillPositionTradeDetails(
   long positionId,
   string symbol,
   datetime eventTime,
   double &entryPrice,
   double &stopLoss,
   double &takeProfit,
   string &tradeType
)
{
   if(positionId <= 0)
      return;

   if(PositionSelectByTicket((ulong)positionId))
   {
      if(entryPrice <= 0.0)
         entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      stopLoss = PositionGetDouble(POSITION_SL);
      takeProfit = PositionGetDouble(POSITION_TP);
      tradeType = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell";
      CacheSelectedPosition();
      return;
   }

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetInteger(POSITION_IDENTIFIER) != positionId)
         continue;

      if(entryPrice <= 0.0)
         entryPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      stopLoss = PositionGetDouble(POSITION_SL);
      takeProfit = PositionGetDouble(POSITION_TP);
      tradeType = PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY ? "buy" : "sell";
      CacheSelectedPosition();
      return;
   }

   if(GetCachedPositionTradeDetails(positionId, symbol, entryPrice, stopLoss, takeProfit, tradeType))
      return;

   datetime from = eventTime - 86400 * 60;
   datetime to = eventTime + 60;
   if(!HistorySelect(from, to))
      return;

   int total = HistoryDealsTotal();
   for(int index = 0; index < total; index++)
   {
      ulong historyDeal = HistoryDealGetTicket(index);
      if(historyDeal == 0)
         continue;
      if(HistoryDealGetInteger(historyDeal, DEAL_POSITION_ID) != positionId)
         continue;
      if(HistoryDealGetString(historyDeal, DEAL_SYMBOL) != symbol)
         continue;

      ENUM_DEAL_ENTRY historyEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(historyDeal, DEAL_ENTRY);
      ENUM_DEAL_TYPE historyType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(historyDeal, DEAL_TYPE);
      if(historyEntry == DEAL_ENTRY_IN && (historyType == DEAL_TYPE_BUY || historyType == DEAL_TYPE_SELL))
      {
         if(entryPrice <= 0.0)
            entryPrice = HistoryDealGetDouble(historyDeal, DEAL_PRICE);
         tradeType = historyType == DEAL_TYPE_BUY ? "buy" : "sell";

         ulong orderTicket = (ulong)HistoryDealGetInteger(historyDeal, DEAL_ORDER);
         if(orderTicket > 0 && HistoryOrderSelect(orderTicket))
         {
            stopLoss = HistoryOrderGetDouble(orderTicket, ORDER_SL);
            takeProfit = HistoryOrderGetDouble(orderTicket, ORDER_TP);
         }
         return;
      }
   }
}

datetime GetPositionOpenTime(long positionId, string symbol, datetime fallbackTime)
{
   if(positionId <= 0)
      return fallbackTime;

   if(PositionSelectByTicket((ulong)positionId))
   {
      datetime positionTime = (datetime)PositionGetInteger(POSITION_TIME);
      if(positionTime > 0)
         return positionTime;
   }

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket))
         continue;
      if(PositionGetInteger(POSITION_IDENTIFIER) != positionId)
         continue;

      datetime positionTime = (datetime)PositionGetInteger(POSITION_TIME);
      if(positionTime > 0)
         return positionTime;
   }

   datetime from = fallbackTime - 86400 * 60;
   datetime to = fallbackTime + 60;
   if(!HistorySelect(from, to))
      return fallbackTime;

   datetime earliestOpenTime = 0;
   int total = HistoryDealsTotal();
   for(int index = 0; index < total; index++)
   {
      ulong historyDeal = HistoryDealGetTicket(index);
      if(historyDeal == 0)
         continue;
      if(HistoryDealGetInteger(historyDeal, DEAL_POSITION_ID) != positionId)
         continue;
      if(symbol != "" && HistoryDealGetString(historyDeal, DEAL_SYMBOL) != symbol)
         continue;

      ENUM_DEAL_ENTRY historyEntry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(historyDeal, DEAL_ENTRY);
      ENUM_DEAL_TYPE historyType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(historyDeal, DEAL_TYPE);
      if(historyEntry == DEAL_ENTRY_IN && (historyType == DEAL_TYPE_BUY || historyType == DEAL_TYPE_SELL))
      {
         datetime historyTime = (datetime)HistoryDealGetInteger(historyDeal, DEAL_TIME);
         if(historyTime > 0 && (earliestOpenTime == 0 || historyTime < earliestOpenTime))
            earliestOpenTime = historyTime;
      }
   }

   return earliestOpenTime > 0 ? earliestOpenTime : fallbackTime;
}

string GetTradeTypeForDeal(ulong dealTicket, ENUM_DEAL_TYPE fallbackDealType)
{
   long positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   datetime eventTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   double entryPrice = 0.0;
   double stopLoss = 0.0;
   double takeProfit = 0.0;
   string tradeType = fallbackDealType == DEAL_TYPE_BUY ? "buy" : "sell";

   FillPositionTradeDetails(positionId, symbol, eventTime, entryPrice, stopLoss, takeProfit, tradeType);
   return tradeType;
}

int GetSpread(string symbol)
{
   long spread = 0;
   if(SymbolInfoInteger(symbol, SYMBOL_SPREAD, spread))
      return (int)spread;

   double ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
   double bid = SymbolInfoDouble(symbol, SYMBOL_BID);
   double point = SymbolInfoDouble(symbol, SYMBOL_POINT);

   if(point > 0.0 && ask > 0.0 && bid > 0.0)
      return (int)MathRound((ask - bid) / point);

   return 0;
}

//+------------------------------------------------------------------+
//| Drawing and file helpers                                          |
//+------------------------------------------------------------------+
void DrawPriceLine(long chartId, string objectName, string label, double price, color lineColor, int lineWidth)
{
   if(price <= 0.0 || !MathIsValidNumber(price))
      return;

   if(ObjectFind(chartId, objectName) < 0)
      ObjectCreate(chartId, objectName, OBJ_HLINE, 0, 0, price);
   else
      ObjectMove(chartId, objectName, 0, 0, price);

   ObjectSetInteger(chartId, objectName, OBJPROP_COLOR, lineColor);
   ObjectSetInteger(chartId, objectName, OBJPROP_STYLE, STYLE_SOLID);
   int safeLineWidth = lineWidth < 1 ? 1 : lineWidth;
   ObjectSetInteger(chartId, objectName, OBJPROP_WIDTH, safeLineWidth);
   ObjectSetInteger(chartId, objectName, OBJPROP_BACK, false);
   ObjectSetString(chartId, objectName, OBJPROP_TEXT, label + " " + DoubleToString(price, DigitsForSymbol(ChartSymbol(chartId))));
}

string BuildScreenshotFilename(string symbol, string positionId, string dealTicket, string type, datetime capturedAt)
{
   return "journal_" +
      SanitizeFilePart(symbol) + "_" +
      SanitizeFilePart(positionId) + "_" +
      SanitizeFilePart(dealTicket) + "_" +
      SanitizeFilePart(type) + "_" +
      IntegerToString((int)capturedAt) +
      ".png";
}

string Base64Encode(const uchar &bytes[])
{
   string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
   string encoded = "";
   int size = ArraySize(bytes);

   for(int i = 0; i < size; i += 3)
   {
      int b0 = bytes[i];
      int b1 = (i + 1 < size) ? bytes[i + 1] : 0;
      int b2 = (i + 2 < size) ? bytes[i + 2] : 0;
      int triple = (b0 << 16) | (b1 << 8) | b2;

      encoded += StringSubstr(alphabet, (triple >> 18) & 0x3F, 1);
      encoded += StringSubstr(alphabet, (triple >> 12) & 0x3F, 1);
      encoded += (i + 1 < size) ? StringSubstr(alphabet, (triple >> 6) & 0x3F, 1) : "=";
      encoded += (i + 2 < size) ? StringSubstr(alphabet, triple & 0x3F, 1) : "=";
   }

   return encoded;
}

//+------------------------------------------------------------------+
//| JSON and formatting helpers                                       |
//+------------------------------------------------------------------+
string JsonEscape(string value)
{
   string escaped = "";

   for(int i = 0; i < StringLen(value); i++)
   {
      ushort ch = StringGetCharacter(value, i);

      if(ch == '\\')
         escaped += "\\\\";
      else if(ch == '"')
         escaped += "\\\"";
      else if(ch == '\n')
         escaped += "\\n";
      else if(ch == '\r')
         escaped += "\\r";
      else if(ch == '\t')
         escaped += "\\t";
      else if(ch < 32)
         escaped += "";
      else
         escaped += ShortToString(ch);
   }

   return escaped;
}

string JsonString(string value)
{
   return "\"" + JsonEscape(value) + "\"";
}

string DoubleToJson(double value, int digits)
{
   if(!MathIsValidNumber(value))
      return "0";

   return DoubleToString(value, MathMax(digits, 0));
}

string NullablePriceToJson(double value, int digits)
{
   if(value <= 0.0 || !MathIsValidNumber(value))
      return "null";

   return DoubleToJson(value, digits);
}

string TimeToIso8601(datetime value)
{
   MqlDateTime parts;
   TimeToStruct(value, parts);

   return StringFormat(
      "%04d-%02d-%02dT%02d:%02d:%02dZ",
      parts.year,
      parts.mon,
      parts.day,
      parts.hour,
      parts.min,
      parts.sec
   );
}

string TimeToTraderLocalIso8601(datetime brokerServerTime)
{
   datetime utcTime = brokerServerTime + (TimeGMT() - TimeCurrent());

   return TimeToIso8601(utcTime);
}

int DigitsForSymbol(string symbol)
{
   long digits = 0;
   if(SymbolInfoInteger(symbol, SYMBOL_DIGITS, digits))
      return (int)digits;

   return _Digits;
}

string PriceOrDash(double price, string symbol)
{
   if(price <= 0.0 || !MathIsValidNumber(price))
      return "-";

   return DoubleToString(price, DigitsForSymbol(symbol));
}

string BuildEndpointUrl(string endpoint)
{
   if(StringFind(endpoint, "http://") == 0 || StringFind(endpoint, "https://") == 0)
      return endpoint;

   string baseUrl = NormalizeBaseUrl(JOURNAL_API_BASE_URL);
   string journalEndpoint = "/api/mt5/journal";

   if(StringEndsWith(baseUrl, journalEndpoint))
      baseUrl = StringSubstr(baseUrl, 0, StringLen(baseUrl) - StringLen(journalEndpoint));

   return baseUrl + endpoint;
}

string NormalizeBaseUrl(string value)
{
   value = StringTrimCopy(value);

   while(StringLen(value) > 0 && StringSubstr(value, StringLen(value) - 1, 1) == "/")
      value = StringSubstr(value, 0, StringLen(value) - 1);

   return value;
}

string StringTrimCopy(string value)
{
   StringTrimLeft(value);
   StringTrimRight(value);
   return value;
}

bool StringEndsWith(string value, string suffix)
{
   int valueLength = StringLen(value);
   int suffixLength = StringLen(suffix);

   if(suffixLength <= 0)
      return true;

   if(valueLength < suffixLength)
      return false;

   return StringSubstr(value, valueLength - suffixLength, suffixLength) == suffix;
}

string SanitizeFilePart(string value)
{
   string result = "";

   for(int i = 0; i < StringLen(value); i++)
   {
      ushort ch = StringGetCharacter(value, i);
      bool allowed =
         (ch >= 'A' && ch <= 'Z') ||
         (ch >= 'a' && ch <= 'z') ||
         (ch >= '0' && ch <= '9') ||
         ch == '_' ||
         ch == '-';

      result += allowed ? ShortToString(ch) : "_";
   }

   return result == "" ? "unknown" : result;
}

void DebugPrint(string message)
{
   if(DEBUG_MODE)
      Print(message);
}

//+------------------------------------------------------------------+
//| Single attachment lock                                            |
//+------------------------------------------------------------------+
bool AcquireSingleInstanceLock()
{
   g_lockName = "TradeJournalRecorder.Lock." + (string)AccountInfoInteger(ACCOUNT_LOGIN);
   long currentChartId = ChartID();

   if(GlobalVariableCheck(g_lockName))
   {
      long existingChartId = (long)GlobalVariableGet(g_lockName);
      if(existingChartId != currentChartId && ChartIdIsOpen(existingChartId))
         return false;
   }

   GlobalVariableSet(g_lockName, (double)currentChartId);
   g_hasLock = true;
   return true;
}

void ReleaseSingleInstanceLock()
{
   if(!g_hasLock || g_lockName == "")
      return;

   if(GlobalVariableCheck(g_lockName))
   {
      long existingChartId = (long)GlobalVariableGet(g_lockName);
      if(existingChartId == ChartID())
         GlobalVariableDel(g_lockName);
   }

   g_hasLock = false;
}

bool ChartIdIsOpen(long chartIdToFind)
{
   long chartId = ChartFirst();
   while(chartId >= 0)
   {
      if(chartId == chartIdToFind)
         return true;

      chartId = ChartNext(chartId);
   }

   return false;
}
