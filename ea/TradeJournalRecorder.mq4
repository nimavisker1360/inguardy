//+------------------------------------------------------------------+
//| Inguardy Trade Journal Recorder for MetaTrader 4                 |
//| Records account activity only. It never places or changes orders.|
//+------------------------------------------------------------------+
#property strict
#property version "1.00"

input string JOURNAL_API_BASE_URL = "https://inguardy.com";
input string JOURNAL_UPLOAD_SECRET = "";
input bool JOURNAL_ENABLED = true;
input bool IMPORT_LOADED_HISTORY = true;
input int HISTORY_LOOKBACK_DAYS = 365;

int g_openTickets[];
string g_openSignatures[];
int g_closedTickets[];
datetime g_lastHeartbeat = 0;
datetime g_historyStart = 0;

int OnInit()
{
   if(!JOURNAL_ENABLED)
   {
      Print("Inguardy MT4 recorder is disabled.");
      return INIT_SUCCEEDED;
   }
   if(StringLen(JOURNAL_UPLOAD_SECRET) == 0)
   {
      Print("Inguardy MT4 recorder: JOURNAL_UPLOAD_SECRET is empty.");
      return INIT_FAILED;
   }
   g_historyStart = TimeCurrent();
   EventSetTimer(10);
   SyncAccount();
   SyncOpenOrders();
   SyncClosedOrders();
   Print("Inguardy MT4 recorder started. It never places or changes orders.");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   if(!JOURNAL_ENABLED) return;
   if(TimeCurrent() - g_lastHeartbeat >= 300) SyncAccount();
   SyncOpenOrders();
   SyncClosedOrders();
}

string JsonString(string value)
{
   string result = "\"";
   for(int i = 0; i < StringLen(value); i++)
   {
      int ch = StringGetCharacter(value, i);
      if(ch == 34) result += "\\\"";
      else if(ch == 92) result += "\\\\";
      else if(ch == 10) result += "\\n";
      else if(ch == 13) result += "\\r";
      else if(ch == 9) result += "\\t";
      else if(ch < 32) result += " ";
      else result += StringSubstr(value, i, 1);
   }
   return result + "\"";
}

string IsoTime(datetime serverTime)
{
   datetime utcTime = serverTime - (TimeCurrent() - TimeGMT());
   string text = TimeToString(utcTime, TIME_DATE | TIME_SECONDS);
   StringReplace(text, ".", "-");
   StringReplace(text, " ", "T");
   return text + "Z";
}

string BaseUrl()
{
   string result = JOURNAL_API_BASE_URL;
   while(StringLen(result) > 0 && StringSubstr(result, StringLen(result) - 1, 1) == "/")
      result = StringSubstr(result, 0, StringLen(result) - 1);
   return result;
}

bool PostJson(string endpoint, string body)
{
   char data[];
   char response[];
   string responseHeaders;
   int bytes = StringToCharArray(body, data, 0, WHOLE_ARRAY, CP_UTF8);
   if(bytes <= 0) return false;
   ArrayResize(data, bytes - 1); // Exclude the terminating zero from the HTTP body.
   ResetLastError();
   int status = WebRequest("POST", BaseUrl() + endpoint,
      "Content-Type: application/json\r\n", 15000, data, response, responseHeaders);
   if(status >= 200 && status < 300) return true;
   if(status == -1)
      Print("Inguardy MT4 WebRequest failed: ", GetLastError(), ". Allow ", BaseUrl(), " in Tools > Options > Expert Advisors.");
   else
      Print("Inguardy MT4 journal rejected request. HTTP ", status, ", response: ", CharArrayToString(response));
   return false;
}

void SyncAccount()
{
   string body = "{";
   body += "\"secret\":" + JsonString(JOURNAL_UPLOAD_SECRET) + ",";
   body += "\"accountNumber\":" + JsonString(IntegerToString(AccountNumber())) + ",";
   body += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
   body += "\"currency\":" + JsonString(AccountCurrency()) + ",";
   body += "\"broker\":" + JsonString(AccountCompany()) + ",";
   body += "\"platform\":\"MT4\"}";
   if(PostJson("/api/mt5/journal/account", body))
   {
      g_lastHeartbeat = TimeCurrent();
      Print("Inguardy MT4 account connected: ", AccountNumber());
   }
}

int FindTicket(int &tickets[], int ticket)
{
   for(int i = 0; i < ArraySize(tickets); i++)
      if(tickets[i] == ticket) return i;
   return -1;
}

void RememberOpen(int ticket, string signature)
{
   int index = FindTicket(g_openTickets, ticket);
   if(index < 0)
   {
      index = ArraySize(g_openTickets);
      ArrayResize(g_openTickets, index + 1);
      ArrayResize(g_openSignatures, index + 1);
      g_openTickets[index] = ticket;
   }
   g_openSignatures[index] = signature;
}

string OrderSignature()
{
   return DoubleToString(OrderLots(), 2) + "|" +
      DoubleToString(OrderStopLoss(), 8) + "|" + DoubleToString(OrderTakeProfit(), 8);
}

string OrderJson(string eventType)
{
   int digits = (int)MarketInfo(OrderSymbol(), MODE_DIGITS);
   int ticket = OrderTicket();
   string side = OrderType() == OP_SELL ? "SELL" : "BUY";
   string body = "{";
   body += "\"secret\":" + JsonString(JOURNAL_UPLOAD_SECRET) + ",";
   body += "\"eventType\":" + JsonString(eventType) + ",";
   body += "\"accountNumber\":" + JsonString(IntegerToString(AccountNumber())) + ",";
   body += "\"balance\":" + DoubleToString(AccountBalance(), 2) + ",";
   body += "\"currency\":" + JsonString(AccountCurrency()) + ",";
   body += "\"ticket\":" + JsonString(IntegerToString(ticket)) + ",";
   body += "\"dealTicket\":" + JsonString(IntegerToString(ticket) + "-" + eventType + "-" + IntegerToString((int)OrderCloseTime())) + ",";
   body += "\"symbol\":" + JsonString(OrderSymbol()) + ",";
   body += "\"side\":" + JsonString(side) + ",";
   body += "\"lot\":" + DoubleToString(OrderLots(), 2) + ",";
   body += "\"entryPrice\":" + DoubleToString(OrderOpenPrice(), digits) + ",";
   body += "\"stopLoss\":" + DoubleToString(OrderStopLoss(), digits) + ",";
   body += "\"takeProfit\":" + DoubleToString(OrderTakeProfit(), digits) + ",";
   body += "\"openedAt\":" + JsonString(IsoTime(OrderOpenTime())) + ",";
   if(eventType == "close")
   {
      body += "\"exitPrice\":" + DoubleToString(OrderClosePrice(), digits) + ",";
      body += "\"closedAt\":" + JsonString(IsoTime(OrderCloseTime())) + ",";
      body += "\"profitLoss\":" + DoubleToString(OrderProfit(), 2) + ",";
      body += "\"commission\":" + DoubleToString(OrderCommission(), 2) + ",";
      body += "\"swap\":" + DoubleToString(OrderSwap(), 2) + ",";
   }
   body += "\"broker\":" + JsonString(AccountCompany()) + ",";
   body += "\"platform\":\"MT4\"}";
   return body;
}

void SyncOpenOrders()
{
   int sent = 0;
   for(int i = 0; i < OrdersTotal() && sent < 20; i++)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES)) continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL) continue;
      int ticket = OrderTicket();
      string signature = OrderSignature();
      int index = FindTicket(g_openTickets, ticket);
      if(index >= 0 && g_openSignatures[index] == signature) continue;
      string eventType = index < 0 ? "open" : "update";
      if(PostJson("/api/mt5/journal", OrderJson(eventType)))
      {
         RememberOpen(ticket, signature);
         sent++;
      }
   }
}

void SyncClosedOrders()
{
   int sent = 0;
   datetime oldest = IMPORT_LOADED_HISTORY
      ? TimeCurrent() - MathMax(0, HISTORY_LOOKBACK_DAYS) * 86400
      : g_historyStart;
   for(int i = OrdersHistoryTotal() - 1; i >= 0 && sent < 20; i--)
   {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL) continue;
      if(OrderCloseTime() <= 0 || OrderCloseTime() < oldest) continue;
      int ticket = OrderTicket();
      if(FindTicket(g_closedTickets, ticket) >= 0) continue;
      if(PostJson("/api/mt5/journal", OrderJson("close")))
      {
         int index = ArraySize(g_closedTickets);
         ArrayResize(g_closedTickets, index + 1);
         g_closedTickets[index] = ticket;
         sent++;
      }
   }
}
