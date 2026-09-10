//+------------------------------------------------------------------+
//| InguardyPositionSizeCalculator.mq5                                |
//| On-chart position sizing panel. Calculation only; no trade calls. |
//+------------------------------------------------------------------+
#property strict
#property version   "1.26"
#property description "Inguardy on-chart position size calculator. Never opens, closes, or modifies trades."

enum ENUM_IG_DIRECTION
{
   IG_BUY = 0,
   IG_SELL = 1
};

enum ENUM_IG_RISK_MODE
{
   IG_RISK_PERCENT = 0,
   IG_RISK_AMOUNT = 1
};

input ENUM_IG_DIRECTION START_DIRECTION = IG_BUY;
input ENUM_IG_RISK_MODE START_RISK_MODE = IG_RISK_PERCENT;
input double            START_RISK_VALUE = 1.0;
input double            START_RISK_REWARD = 2.0;
input int               DEFAULT_STOP_POINTS = 500;
input int               ZONE_WIDTH_BARS = 14;
input int               ZONE_RIGHT_OFFSET_BARS = 18;
input int               PANEL_X = 14;
input int               PANEL_Y = 16;
input color             PANEL_BACKGROUND = C'9,18,36';
input color             PANEL_BORDER = C'37,62,94';
input color             ACCENT_COLOR = C'14,165,233';
input color             BUY_COLOR = C'16,185,129';
input color             SELL_COLOR = C'244,63,94';
input color             TEXT_COLOR = C'241,245,249';
input color             MUTED_COLOR = C'148,163,184';

const string PREFIX = "IGPSC_";
const int PANEL_WIDTH = 420;
const int PANEL_HEIGHT = 248;

ENUM_IG_DIRECTION g_direction;
ENUM_IG_RISK_MODE g_riskMode;
double g_riskValue;
double g_riskReward;
double g_entryPrice;
double g_stopPrice;
double g_takeProfit;
bool g_setupActive = false;
bool g_internalDelete = false;
int g_panelOriginX = 0;
int g_panelOriginY = 0;
int g_lastChartWidth = 0;
int g_lastChartHeight = 0;

string N(const string suffix)
{
   return PREFIX + suffix;
}

int X(const int offset)
{
   return g_panelOriginX + offset;
}

int Y(const int offset)
{
   return g_panelOriginY + offset;
}

void UpdatePanelOrigin()
{
   g_lastChartWidth = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS, 0);
   g_lastChartHeight = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS, 0);

   g_panelOriginX = PANEL_X;
   g_panelOriginY = MathMax(g_lastChartHeight - PANEL_Y - PANEL_HEIGHT, 0);
}

double NormalizePrice(const double price)
{
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   if(tickSize <= 0.0)
      tickSize = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   if(tickSize <= 0.0)
      return NormalizeDouble(price, digits);
   return NormalizeDouble(MathRound(price / tickSize) * tickSize, digits);
}

double MarketEntryPrice()
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return SymbolInfoDouble(_Symbol, SYMBOL_BID);
   return g_direction == IG_BUY ? tick.ask : tick.bid;
}

int VolumeDigits(const double step)
{
   for(int digits = 0; digits <= 8; digits++)
   {
      if(MathAbs(step - NormalizeDouble(step, digits)) < 0.000000001)
         return digits;
   }
   return 8;
}

void SetCommonPixelProperties(const string name, const int x, const int y)
{
   ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, X(x));
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, Y(y));
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, name, OBJPROP_ZORDER, 20);
}

void CreateRectangle(const string name, const int x, const int y, const int width, const int height, const color background, const color border)
{
   ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   SetCommonPixelProperties(name, x, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, height);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, background);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, border);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
}

void CreateLabel(const string name, const string text, const int x, const int y, const int fontSize, const color textColor)
{
   ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   SetCommonPixelProperties(name, x, y);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_COLOR, textColor);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, fontSize);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI");
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void CreateButton(const string name, const string text, const int x, const int y, const int width, const int height, const color background, const color textColor)
{
   ObjectCreate(0, name, OBJ_BUTTON, 0, 0, 0);
   SetCommonPixelProperties(name, x, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, height);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, background);
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, background);
   ObjectSetInteger(0, name, OBJPROP_COLOR, textColor);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 9);
   ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI Semibold");
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void CreateEdit(const string name, const string text, const int x, const int y, const int width, const int height)
{
   ObjectCreate(0, name, OBJ_EDIT, 0, 0, 0);
   SetCommonPixelProperties(name, x, y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, name, OBJPROP_YSIZE, height);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR, C'15,29,52');
   ObjectSetInteger(0, name, OBJPROP_BORDER_COLOR, PANEL_BORDER);
   ObjectSetInteger(0, name, OBJPROP_COLOR, TEXT_COLOR);
   ObjectSetInteger(0, name, OBJPROP_ALIGN, ALIGN_CENTER);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE, 10);
   ObjectSetString(0, name, OBJPROP_FONT, "Segoe UI Semibold");
   ObjectSetString(0, name, OBJPROP_TEXT, text);
}

void CreatePriceLine(const string name, const double price, const color lineColor, const string description, const bool draggable)
{
   ObjectCreate(0, name, OBJ_HLINE, 0, 0, price);
   ObjectSetDouble(0, name, OBJPROP_PRICE, price);
   ObjectSetInteger(0, name, OBJPROP_COLOR, lineColor);
   ObjectSetInteger(0, name, OBJPROP_STYLE, draggable ? STYLE_DASH : STYLE_DOT);
   ObjectSetInteger(0, name, OBJPROP_WIDTH, draggable ? 2 : 1);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, draggable);
   ObjectSetInteger(0, name, OBJPROP_SELECTED, false);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, false);
   ObjectSetInteger(0, name, OBJPROP_BACK, false);
   ObjectSetString(0, name, OBJPROP_TEXT, description);
}

void CreateZoneRectangle(const string name, const color fillColor)
{
   ObjectCreate(0, name, OBJ_RECTANGLE, 0, 0, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_COLOR, fillColor);
   ObjectSetInteger(0, name, OBJPROP_FILL, true);
   ObjectSetInteger(0, name, OBJPROP_BACK, true);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, name, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, name, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
}

void CreateChartBadge(const string suffix, const int width, const color background)
{
   string boxName = N(suffix + "_box");
   string textName = N(suffix + "_text");

   ObjectCreate(0, boxName, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, boxName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, boxName, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, boxName, OBJPROP_YSIZE, 22);
   ObjectSetInteger(0, boxName, OBJPROP_BGCOLOR, background);
   ObjectSetInteger(0, boxName, OBJPROP_BORDER_COLOR, background);
   ObjectSetInteger(0, boxName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, boxName, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, boxName, OBJPROP_ZORDER, 12);
   ObjectSetInteger(0, boxName, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);

   ObjectCreate(0, textName, OBJ_LABEL, 0, 0, 0);
   ObjectSetInteger(0, textName, OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, textName, OBJPROP_ANCHOR, ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0, textName, OBJPROP_COLOR, clrWhite);
   ObjectSetInteger(0, textName, OBJPROP_FONTSIZE, 8);
   ObjectSetInteger(0, textName, OBJPROP_SELECTABLE, false);
   ObjectSetInteger(0, textName, OBJPROP_HIDDEN, true);
   ObjectSetInteger(0, textName, OBJPROP_ZORDER, 13);
   ObjectSetInteger(0, textName, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
   ObjectSetString(0, textName, OBJPROP_FONT, "Segoe UI Semibold");
}

void SetChartBadge(const string suffix, const string text, const datetime when, const double price, const int width, const int yOffset)
{
   int chartX = 0;
   int chartY = 0;
   string boxName = N(suffix + "_box");
   string textName = N(suffix + "_text");
   if(!ChartTimePriceToXY(0, 0, when, price, chartX, chartY))
   {
      ObjectSetInteger(0, boxName, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
      ObjectSetInteger(0, textName, OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
      return;
   }

   int left = MathMax(chartX - width / 2, 2);
   int top = MathMax(chartY + yOffset, 2);
   ObjectSetInteger(0, boxName, OBJPROP_XSIZE, width);
   ObjectSetInteger(0, boxName, OBJPROP_XDISTANCE, left);
   ObjectSetInteger(0, boxName, OBJPROP_YDISTANCE, top);
   ObjectSetInteger(0, textName, OBJPROP_XDISTANCE, left + 7);
   ObjectSetInteger(0, textName, OBJPROP_YDISTANCE, top + 4);
   ObjectSetString(0, textName, OBJPROP_TEXT, text);
   ObjectSetInteger(0, boxName, OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
   ObjectSetInteger(0, textName, OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
}

void SetText(const string suffix, const string text)
{
   ObjectSetString(0, N(suffix), OBJPROP_TEXT, text);
}

void SetTextColor(const string suffix, const color value)
{
   ObjectSetInteger(0, N(suffix), OBJPROP_COLOR, value);
}

void BuildPanel()
{
   UpdatePanelOrigin();
   CreateRectangle(N("panel"), 0, 0, PANEL_WIDTH, PANEL_HEIGHT, PANEL_BACKGROUND, PANEL_BORDER);
   CreateRectangle(N("accent"), 0, 0, 5, PANEL_HEIGHT, ACCENT_COLOR, ACCENT_COLOR);

   CreateLabel(N("title"), "INGUARDY LOT CALCULATOR", 16, 12, 11, TEXT_COLOR);
   CreateLabel(N("subtitle"), _Symbol + "  •  broker data", 238, 15, 8, MUTED_COLOR);
   CreateButton(N("clear"), "CLEAR", 344, 9, 60, 24, C'51,31,47', SELL_COLOR);

   CreateButton(N("buy"), "BUY", 16, 43, 102, 31, C'15,47,55', BUY_COLOR);
   CreateButton(N("sell"), "SELL", 126, 43, 102, 31, C'58,27,43', SELL_COLOR);

   CreateLabel(N("risk_label"), "RISK", 242, 44, 8, MUTED_COLOR);
   CreateButton(N("risk_mode"), "%", 242, 58, 46, 29, ACCENT_COLOR, clrWhite);
   CreateEdit(N("risk_edit"), DoubleToString(g_riskValue, 2), 296, 58, 72, 29);
   CreateLabel(N("risk_unit"), "% bal", 375, 65, 8, MUTED_COLOR);

   CreateLabel(N("rr_label"), "R / R", 16, 105, 8, MUTED_COLOR);
   CreateEdit(N("rr_edit"), DoubleToString(g_riskReward, 2), 62, 95, 72, 29);

   CreateLabel(N("entry_caption"), "ENTRY", 154, 104, 8, MUTED_COLOR);
   CreateLabel(N("entry_value"), "-", 208, 102, 10, TEXT_COLOR);
   CreateButton(N("market"), "MARKET", 318, 94, 86, 29, C'20,42,70', ACCENT_COLOR);
   CreateLabel(N("entry_hint"), "drag lines to adjust", 16, 137, 8, MUTED_COLOR);

   CreateLabel(N("stop_caption"), "STOP LOSS", 154, 136, 8, MUTED_COLOR);
   CreateLabel(N("stop_value"), "-", 226, 134, 10, SELL_COLOR);
   CreateLabel(N("tp_caption"), "TAKE PROFIT", 296, 136, 8, MUTED_COLOR);
   CreateLabel(N("tp_value"), "-", 392, 134, 10, BUY_COLOR);

   CreateRectangle(N("result_box"), 14, 166, 392, 54, C'8,79,121', C'14,165,233');
   CreateLabel(N("lot_caption"), "SAFE VOLUME", 26, 174, 8, C'186,230,253');
   CreateLabel(N("lot_value"), "-", 26, 190, 16, clrWhite);
   CreateLabel(N("risk_result"), "Waiting for levels", 236, 193, 8, C'224,242,254');
   CreateLabel(N("status"), "Drag Entry and Stop Loss lines", 16, 229, 8, MUTED_COLOR);
}

void CreateTradeObjects()
{
   g_internalDelete = true;
   ObjectDelete(0, N("entry_line"));
   ObjectDelete(0, N("stop_line"));
   ObjectDelete(0, N("tp_line"));
   ObjectDelete(0, N("reward_zone"));
   ObjectDelete(0, N("risk_zone"));
   ObjectDelete(0, N("target_badge_box"));
   ObjectDelete(0, N("target_badge_text"));
   ObjectDelete(0, N("stop_badge_box"));
   ObjectDelete(0, N("stop_badge_text"));
   ObjectDelete(0, N("ratio_badge_box"));
   ObjectDelete(0, N("ratio_badge_text"));
   g_internalDelete = false;

   g_entryPrice = NormalizePrice(MarketEntryPrice());
   double point = SymbolInfoDouble(_Symbol, SYMBOL_POINT);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double distance = MathMax(point * MathMax(DEFAULT_STOP_POINTS, 10), tickSize * 10.0);

   if(g_direction == IG_BUY)
      g_stopPrice = NormalizePrice(g_entryPrice - distance);
   else
      g_stopPrice = NormalizePrice(g_entryPrice + distance);

   CreatePriceLine(N("entry_line"), g_entryPrice, ACCENT_COLOR, "Inguardy Entry", true);
   CreatePriceLine(N("stop_line"), g_stopPrice, SELL_COLOR, "Inguardy Stop Loss", true);
   g_takeProfit = g_direction == IG_BUY
      ? NormalizePrice(g_entryPrice + distance * g_riskReward)
      : NormalizePrice(g_entryPrice - distance * g_riskReward);
   CreatePriceLine(N("tp_line"), g_takeProfit, BUY_COLOR, "Inguardy Take Profit", true);
   CreateZoneRectangle(N("reward_zone"), C'23,78,66');
   CreateZoneRectangle(N("risk_zone"), C'84,38,51');
   CreateChartBadge("target_badge", 218, C'5,150,105');
   CreateChartBadge("stop_badge", 184, C'225,45,70');
   CreateChartBadge("ratio_badge", 224, C'225,45,70');
   g_setupActive = true;
}

void DeleteTradeObjects()
{
   g_internalDelete = true;
   string suffixes[] =
   {
      "entry_line", "stop_line", "tp_line", "reward_zone", "risk_zone",
      "target_badge_box", "target_badge_text", "stop_badge_box", "stop_badge_text",
      "ratio_badge_box", "ratio_badge_text"
   };
   for(int index = 0; index < ArraySize(suffixes); index++)
      ObjectDelete(0, N(suffixes[index]));
   g_internalDelete = false;
   g_setupActive = false;
   SetText("entry_value", "-");
   SetText("stop_value", "-");
   SetText("tp_value", "-");
   SetText("lot_value", "-");
   SetText("risk_result", "No active setup");
   SetText("status", "Click BUY or SELL to create a new setup");
   SetTextColor("status", MUTED_COLOR);
   ChartRedraw(0);
}

void StartNewSetup(const ENUM_IG_DIRECTION direction)
{
   g_direction = direction;
   CreateTradeObjects();
   UpdateDirectionButtons();
   CalculateAndRender();
}

void UpdateDirectionButtons()
{
   bool isBuy = g_direction == IG_BUY;
   ObjectSetInteger(0, N("buy"), OBJPROP_BGCOLOR, isBuy ? BUY_COLOR : C'15,47,55');
   ObjectSetInteger(0, N("buy"), OBJPROP_COLOR, isBuy ? clrWhite : BUY_COLOR);
   ObjectSetInteger(0, N("sell"), OBJPROP_BGCOLOR, isBuy ? C'58,27,43' : SELL_COLOR);
   ObjectSetInteger(0, N("sell"), OBJPROP_COLOR, isBuy ? SELL_COLOR : clrWhite);
}

void UpdateRiskMode()
{
   bool percent = g_riskMode == IG_RISK_PERCENT;
   ObjectSetString(0, N("risk_mode"), OBJPROP_TEXT, percent ? "%" : "CASH");
   string currency = AccountInfoString(ACCOUNT_CURRENCY);
   SetText("risk_unit", percent ? "% bal" : currency);
}

void PutStopOnCorrectSide()
{
   double distance = MathAbs(g_entryPrice - g_stopPrice);
   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   if(distance < tickSize)
      distance = MathMax(SymbolInfoDouble(_Symbol, SYMBOL_POINT) * MathMax(DEFAULT_STOP_POINTS, 10), tickSize * 10.0);
   g_stopPrice = NormalizePrice(g_direction == IG_BUY ? g_entryPrice - distance : g_entryPrice + distance);
   ObjectSetDouble(0, N("stop_line"), OBJPROP_PRICE, g_stopPrice);
}

void ResetEntryToMarket()
{
   double oldDistance = MathAbs(g_entryPrice - g_stopPrice);
   g_entryPrice = NormalizePrice(MarketEntryPrice());
   if(oldDistance <= 0.0)
      oldDistance = SymbolInfoDouble(_Symbol, SYMBOL_POINT) * MathMax(DEFAULT_STOP_POINTS, 10);
   g_stopPrice = NormalizePrice(g_direction == IG_BUY ? g_entryPrice - oldDistance : g_entryPrice + oldDistance);
   ObjectSetDouble(0, N("entry_line"), OBJPROP_PRICE, g_entryPrice);
   ObjectSetDouble(0, N("stop_line"), OBJPROP_PRICE, g_stopPrice);
}

void SetPlanVisualsVisible(const bool visible)
{
   long periods = visible ? OBJ_ALL_PERIODS : OBJ_NO_PERIODS;
   string suffixes[] =
   {
      "reward_zone", "risk_zone", "target_badge_box", "target_badge_text",
      "stop_badge_box", "stop_badge_text", "ratio_badge_box", "ratio_badge_text"
   };
   for(int index = 0; index < ArraySize(suffixes); index++)
   {
      string name = N(suffixes[index]);
      if(ObjectFind(0, name) >= 0)
         ObjectSetInteger(0, name, OBJPROP_TIMEFRAMES, periods);
   }
}

void UpdatePlanVisuals(const double volume, const int volumeDigits, const double actualRisk,
                       const double targetRisk, const bool minimumVolumeWarning, const string currency)
{
   int seconds = PeriodSeconds(_Period);
   if(seconds <= 0)
      seconds = 60;

   int rightOffset = MathMax(ZONE_RIGHT_OFFSET_BARS, 0);
   int widthBars = MathMax(ZONE_WIDTH_BARS, 3);
   datetime endTime = iTime(_Symbol, _Period, rightOffset);
   datetime startTime = iTime(_Symbol, _Period, rightOffset + widthBars);
   if(endTime <= 0)
      endTime = TimeCurrent() - seconds * rightOffset;
   if(startTime <= 0 || startTime >= endTime)
      startTime = endTime - seconds * widthBars;

   ObjectMove(0, N("reward_zone"), 0, startTime, g_entryPrice);
   ObjectMove(0, N("reward_zone"), 1, endTime, g_takeProfit);
   ObjectMove(0, N("risk_zone"), 0, startTime, g_entryPrice);
   ObjectMove(0, N("risk_zone"), 1, endTime, g_stopPrice);
   SetPlanVisualsVisible(true);

   datetime badgeTime = startTime + (endTime - startTime) / 2;
   double rewardAmount = actualRisk * g_riskReward;
   double requestedReward = targetRisk * g_riskReward;
   string targetText = "TARGET  +" + DoubleToString(rewardAmount, 2) + " " + currency + "  |  R " + DoubleToString(g_riskReward, 2);
   string stopText = "STOP  -" + DoubleToString(actualRisk, 2) + " " + currency;
   int targetWidth = 218;
   int stopWidth = 184;
   if(minimumVolumeWarning)
   {
      targetText = "TARGET +" + DoubleToString(rewardAmount, 2) + " | requested +" + DoubleToString(requestedReward, 2) + " " + currency;
      stopText = "STOP -" + DoubleToString(actualRisk, 2) + " | requested -" + DoubleToString(targetRisk, 2) + " " + currency;
      targetWidth = 274;
      stopWidth = 254;
   }
   string ratioText = DoubleToString(volume, volumeDigits) + " lots  |  Risk/Reward 1:" + DoubleToString(g_riskReward, 2);
   SetChartBadge("target_badge", targetText, badgeTime, g_takeProfit, targetWidth, -24);
   SetChartBadge("stop_badge", stopText, badgeTime, g_stopPrice, stopWidth, 2);
   SetChartBadge("ratio_badge", ratioText, badgeTime, (g_entryPrice + g_stopPrice) / 2.0, 224, -11);
}

void ShowInvalid(const string message)
{
   SetText("lot_value", "-");
   SetText("risk_result", "Not calculated");
   SetText("status", message);
   SetTextColor("status", SELL_COLOR);
   SetText("tp_value", "-");
   SetPlanVisualsVisible(false);
   ObjectSetInteger(0, N("tp_line"), OBJPROP_TIMEFRAMES, OBJ_NO_PERIODS);
   ChartRedraw(0);
}

void CalculateAndRender()
{
   if(!g_setupActive)
      return;
   if(ObjectFind(0, N("entry_line")) < 0 || ObjectFind(0, N("stop_line")) < 0)
   {
      DeleteTradeObjects();
      return;
   }

   g_entryPrice = ObjectGetDouble(0, N("entry_line"), OBJPROP_PRICE);
   g_stopPrice = ObjectGetDouble(0, N("stop_line"), OBJPROP_PRICE);

   int digits = (int)SymbolInfoInteger(_Symbol, SYMBOL_DIGITS);
   SetText("entry_value", DoubleToString(g_entryPrice, digits));
   SetText("stop_value", DoubleToString(g_stopPrice, digits));

   if(g_riskValue <= 0.0 || g_riskReward <= 0.0)
   {
      ShowInvalid("Risk and R:R must be greater than zero");
      return;
   }
   if(g_direction == IG_BUY && g_stopPrice >= g_entryPrice)
   {
      ShowInvalid("For BUY, Stop Loss must be below Entry");
      return;
   }
   if(g_direction == IG_SELL && g_stopPrice <= g_entryPrice)
   {
      ShowInvalid("For SELL, Stop Loss must be above Entry");
      return;
   }

   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double targetRisk = g_riskMode == IG_RISK_PERCENT
      ? balance * g_riskValue / 100.0
      : g_riskValue;
   if(targetRisk <= 0.0 || targetRisk > balance)
   {
      ShowInvalid("Risk amount is outside the account balance");
      return;
   }

   double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
   double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE_LOSS);
   if(tickValue <= 0.0)
      tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if(tickSize <= 0.0 || tickValue <= 0.0)
   {
      ShowInvalid("Broker tick-size or tick-value is unavailable");
      return;
   }

   double volumeMin = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
   double volumeMax = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
   double volumeStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
   if(volumeMin <= 0.0 || volumeStep <= 0.0)
   {
      ShowInvalid("Broker volume limits are unavailable");
      return;
   }

   double stopDistance = MathAbs(g_entryPrice - g_stopPrice);
   double riskPerLot = (stopDistance / tickSize) * tickValue;
   if(riskPerLot <= 0.0)
   {
      ShowInvalid("Unable to calculate risk for one lot");
      return;
   }

   double rawVolume = targetRisk / riskPerLot;
   double safeVolume = MathFloor((rawVolume + 0.0000000001) / volumeStep) * volumeStep;
   string status = "Calculated from live broker specifications";
   color statusColor = BUY_COLOR;
   bool minimumVolumeWarning = false;
   SetText("lot_caption", "SAFE VOLUME");

   if(volumeMax > 0.0 && safeVolume > volumeMax)
   {
      safeVolume = MathFloor((volumeMax + 0.0000000001) / volumeStep) * volumeStep;
      status = "Volume capped at the broker maximum";
      statusColor = C'245,158,11';
   }
   if(safeVolume < volumeMin)
   {
      safeVolume = volumeMin;
      minimumVolumeWarning = true;
      status = "Broker minimum used - actual risk exceeds target";
      statusColor = C'245,158,11';
      SetText("lot_caption", "BROKER MINIMUM");
   }

   int volumeDigits = VolumeDigits(volumeStep);
   safeVolume = NormalizeDouble(safeVolume, volumeDigits);
   double actualRisk = safeVolume * riskPerLot;
   g_takeProfit = NormalizePrice(g_direction == IG_BUY
      ? g_entryPrice + stopDistance * g_riskReward
      : g_entryPrice - stopDistance * g_riskReward);

   ObjectSetDouble(0, N("tp_line"), OBJPROP_PRICE, g_takeProfit);
   ObjectSetInteger(0, N("tp_line"), OBJPROP_TIMEFRAMES, OBJ_ALL_PERIODS);
   SetText("tp_value", DoubleToString(g_takeProfit, digits));
   SetText("lot_value", DoubleToString(safeVolume, volumeDigits) + " lots");
   string currency = AccountInfoString(ACCOUNT_CURRENCY);
   string riskText = "Risk " + DoubleToString(actualRisk, 2) + " " + currency;
   if(minimumVolumeWarning)
      riskText += " > " + DoubleToString(targetRisk, 2);
   SetText("risk_result", riskText);
   SetText("status", status);
   SetTextColor("status", statusColor);
   UpdatePlanVisuals(safeVolume, volumeDigits, actualRisk, targetRisk, minimumVolumeWarning, currency);
   ChartRedraw(0);
}

bool SyncEditableValues()
{
   bool changed = false;
   if(ObjectFind(0, N("risk_edit")) >= 0)
   {
      double nextRisk = StringToDouble(ObjectGetString(0, N("risk_edit"), OBJPROP_TEXT));
      if(nextRisk > 0.0 && MathAbs(nextRisk - g_riskValue) > 0.00000001)
      {
         g_riskValue = nextRisk;
         changed = true;
      }
   }
   if(ObjectFind(0, N("rr_edit")) >= 0)
   {
      double nextRiskReward = StringToDouble(ObjectGetString(0, N("rr_edit"), OBJPROP_TEXT));
      if(nextRiskReward > 0.0 && MathAbs(nextRiskReward - g_riskReward) > 0.00000001)
      {
         g_riskReward = nextRiskReward;
         changed = true;
      }
   }
   return changed;
}

void ApplyTakeProfitDrag()
{
   if(!g_setupActive || ObjectFind(0, N("tp_line")) < 0)
      return;

   double draggedTakeProfit = ObjectGetDouble(0, N("tp_line"), OBJPROP_PRICE);
   double stopDistance = MathAbs(g_entryPrice - g_stopPrice);
   bool correctSide = (g_direction == IG_BUY && draggedTakeProfit > g_entryPrice)
      || (g_direction == IG_SELL && draggedTakeProfit < g_entryPrice);
   if(correctSide && stopDistance > 0.0)
   {
      g_riskReward = MathAbs(draggedTakeProfit - g_entryPrice) / stopDistance;
      g_riskReward = MathMax(NormalizeDouble(g_riskReward, 2), 0.01);
      ObjectSetString(0, N("rr_edit"), OBJPROP_TEXT, DoubleToString(g_riskReward, 2));
   }
   CalculateAndRender();
}

void DeletePanelObjects()
{
   for(int index = ObjectsTotal(0) - 1; index >= 0; index--)
   {
      string name = ObjectName(0, index);
      if(StringFind(name, PREFIX) == 0)
         ObjectDelete(0, name);
   }
}

void DeletePanelControls()
{
   string suffixes[] =
   {
      "panel", "accent", "title", "subtitle", "clear", "buy", "sell",
      "risk_label", "risk_mode", "risk_edit", "risk_unit", "rr_label", "rr_edit",
      "entry_caption", "entry_value", "market", "entry_hint", "stop_caption", "stop_value",
      "tp_caption", "tp_value", "result_box", "lot_caption", "lot_value", "risk_result", "status"
   };
   for(int index = 0; index < ArraySize(suffixes); index++)
      ObjectDelete(0, N(suffixes[index]));
}

void RebuildPanelControls()
{
   DeletePanelControls();
   BuildPanel();
   UpdateDirectionButtons();
   UpdateRiskMode();
   if(g_setupActive)
      CalculateAndRender();
   else
      DeleteTradeObjects();
}

int OnInit()
{
   g_direction = START_DIRECTION;
   g_riskMode = START_RISK_MODE;
   g_riskValue = START_RISK_VALUE;
   g_riskReward = START_RISK_REWARD;

   DeletePanelObjects();
   BuildPanel();
   ChartSetInteger(0, CHART_EVENT_OBJECT_DELETE, true);
   UpdateDirectionButtons();
   UpdateRiskMode();
   StartNewSetup(g_direction);
   EventSetMillisecondTimer(250);
   Print("Inguardy Position Size Calculator initialized on ", _Symbol, ". Calculation only; no trade execution.");
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason)
{
   EventKillTimer();
   DeletePanelObjects();
   ChartRedraw(0);
}

void OnTimer()
{
   int chartWidth = (int)ChartGetInteger(0, CHART_WIDTH_IN_PIXELS, 0);
   int chartHeight = (int)ChartGetInteger(0, CHART_HEIGHT_IN_PIXELS, 0);
   if(ObjectFind(0, N("panel")) < 0 || chartWidth != g_lastChartWidth || chartHeight != g_lastChartHeight)
      RebuildPanelControls();
   if(SyncEditableValues())
      CalculateAndRender();
}

void OnChartEvent(const int id, const long &lparam, const double &dparam, const string &sparam)
{
   if(id == CHARTEVENT_OBJECT_CLICK)
   {
      if(sparam == N("buy") || sparam == N("sell"))
      {
         StartNewSetup(sparam == N("buy") ? IG_BUY : IG_SELL);
      }
      else if(sparam == N("risk_mode"))
      {
         g_riskMode = g_riskMode == IG_RISK_PERCENT ? IG_RISK_AMOUNT : IG_RISK_PERCENT;
         UpdateRiskMode();
         CalculateAndRender();
      }
      else if(sparam == N("market"))
      {
         if(!g_setupActive)
            StartNewSetup(g_direction);
         else
         {
            ResetEntryToMarket();
            CalculateAndRender();
         }
      }
      else if(sparam == N("clear"))
      {
         DeleteTradeObjects();
      }
      ObjectSetInteger(0, sparam, OBJPROP_STATE, false);
   }
   else if(id == CHARTEVENT_OBJECT_ENDEDIT)
   {
      if(sparam == N("risk_edit"))
      {
         double nextValue = StringToDouble(ObjectGetString(0, sparam, OBJPROP_TEXT));
         if(nextValue > 0.0)
            g_riskValue = nextValue;
         ObjectSetString(0, sparam, OBJPROP_TEXT, DoubleToString(g_riskValue, 2));
         CalculateAndRender();
      }
      else if(sparam == N("rr_edit"))
      {
         double nextValue = StringToDouble(ObjectGetString(0, sparam, OBJPROP_TEXT));
         if(nextValue > 0.0)
            g_riskReward = nextValue;
         ObjectSetString(0, sparam, OBJPROP_TEXT, DoubleToString(g_riskReward, 2));
         CalculateAndRender();
      }
   }
   else if(id == CHARTEVENT_OBJECT_DRAG && (sparam == N("entry_line") || sparam == N("stop_line")))
   {
      CalculateAndRender();
   }
   else if(id == CHARTEVENT_OBJECT_DRAG && sparam == N("tp_line"))
   {
      ApplyTakeProfitDrag();
   }
   else if(id == CHARTEVENT_OBJECT_DELETE && !g_internalDelete && g_setupActive)
   {
      bool deletedCoreLine = sparam == N("entry_line") || sparam == N("stop_line") || sparam == N("tp_line");
      if(deletedCoreLine && (ObjectFind(0, N("entry_line")) < 0 || ObjectFind(0, N("stop_line")) < 0 || ObjectFind(0, N("tp_line")) < 0))
         DeleteTradeObjects();
   }
   else if(id == CHARTEVENT_CHART_CHANGE)
   {
      RebuildPanelControls();
   }
}
