import { Prisma, TradeDirection } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  analyticsTradeInclude,
  buildTradeAnalytics,
  type AnalyticsTrade,
} from "@/lib/analytics/tradeAnalytics";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import { generateGeminiJson, GeminiClientError } from "@/server/ai/gemini-client";
import type {
  AnalyticsDirectionalStats,
  JournalAnalyticsResponse,
  StrategyAnalyticsRow,
  SymbolAnalyticsRow,
  TagAnalyticsRow,
} from "@/types/analytics";

export const dynamic = "force-dynamic";

const WEEKLY_REPORT_DAYS = 7;
const MIN_WEEKLY_REPORT_TRADES = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

type ReportLanguage = "fa" | "en";
type ReportTone = "profit" | "loss" | "neutral" | "amber";
type ReportStatus = "profitable" | "losing" | "flat" | "insufficient_data";

type WeeklyBreakdownRow = {
  label: string;
  type: "strategy" | "setup" | "symbol" | "direction";
  totalTrades: number;
  netPnl: number;
  winRate: number;
  averagePnl: number;
  profitFactor: number | null;
  verdict: ReportStatus;
};

type WeeklyStrategyReport = {
  success: true;
  source: "ai" | "computed";
  generatedAt: string;
  periodLabel: string;
  verdict: {
    status: ReportStatus;
    label: string;
    tone: ReportTone;
    confidence: number;
    summary: string;
  };
  score: number;
  stats: {
    totalTrades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number | null;
    expectancyPerTrade: number;
    maxDrawdown: number;
  };
  strategyRead: string;
  strengths: string[];
  weaknesses: string[];
  riskWarnings: string[];
  nextWeekPlan: string[];
  bestContexts: string[];
  weakestContexts: string[];
  questions: string[];
  breakdown: {
    strategies: WeeklyBreakdownRow[];
    setups: WeeklyBreakdownRow[];
    symbols: WeeklyBreakdownRow[];
    directions: WeeklyBreakdownRow[];
  };
  ready: boolean;
  requirements: {
    minimumClosedTrades: number;
    currentClosedTrades: number;
    remainingClosedTrades: number;
    fullWeek: boolean;
    message: string;
  };
};

type AIReportPayload = Pick<
  WeeklyStrategyReport,
  | "verdict"
  | "score"
  | "strategyRead"
  | "strengths"
  | "weaknesses"
  | "riskWarnings"
  | "nextWeekPlan"
  | "questions"
>;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function getWeeklyRange() {
  const currentWeekStart = startOfWeek(new Date());
  const dateTo = endOfDay(currentWeekStart);
  dateTo.setDate(dateTo.getDate() - 1);

  const dateFrom = startOfDay(dateTo);
  dateFrom.setDate(dateFrom.getDate() - (WEEKLY_REPORT_DAYS - 1));

  return { dateFrom, dateTo };
}

function parseDateParam(value: string | null, end = false) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return end ? endOfDay(parsed) : startOfDay(parsed);
  }

  return parsed;
}

function startOfWeek(date: Date) {
  const copy = startOfDay(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function rangeFromPreset(value: string | null) {
  const now = new Date();

  if (!value || value === "all") {
    return {};
  }

  if (value === "today") {
    return { dateFrom: startOfDay(now), dateTo: endOfDay(now) };
  }

  if (value === "thisWeek") {
    return { dateFrom: startOfWeek(now), dateTo: endOfDay(now) };
  }

  if (value === "thisMonth") {
    return {
      dateFrom: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      dateTo: endOfDay(now),
    };
  }

  if (value === "thisYear") {
    return {
      dateFrom: startOfDay(new Date(now.getFullYear(), 0, 1)),
      dateTo: endOfDay(now),
    };
  }

  if (value === "custom") {
    return {};
  }

  return null;
}

function parseDirection(value: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === TradeDirection.BUY || normalized === TradeDirection.SELL) {
    return normalized;
  }

  return null;
}

function normalizeLanguage(value: string | null): ReportLanguage {
  return value === "en" ? "en" : "fa";
}

function labelForStatus(status: ReportStatus, language: ReportLanguage) {
  if (language === "fa") {
    return {
      profitable: "استراتژی این هفته سودده بوده",
      losing: "استراتژی این هفته ضررده بوده",
      flat: "استراتژی این هفته تقریبا خنثی بوده",
      insufficient_data: "داده کافی برای حکم قطعی وجود ندارد",
    }[status];
  }

  return {
    profitable: "This week was profitable",
    losing: "This week was losing",
    flat: "This week was roughly flat",
    insufficient_data: "Not enough data for a firm verdict",
  }[status];
}

function toneForStatus(status: ReportStatus): ReportTone {
  if (status === "profitable") return "profit";
  if (status === "losing") return "loss";
  if (status === "insufficient_data") return "amber";
  return "neutral";
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function uniqueLimited(items: string[], fallback: string[], limit = 4) {
  const cleaned = Array.from(
    new Set(items.map((item) => item.trim()).filter((item) => item.length > 0))
  );

  return (cleaned.length ? cleaned : fallback).slice(0, limit);
}

function topPositiveRows(rows: TagAnalyticsRow[], limit = 2) {
  return rows
    .filter((row) => row.totalTrades > 0 && row.netPnl > 0)
    .sort((a, b) => b.netPnl - a.netPnl || b.winRate - a.winRate)
    .slice(0, limit);
}

function topNegativeRows(rows: TagAnalyticsRow[], limit = 2) {
  return rows
    .filter((row) => row.totalTrades > 0 && row.netPnl < 0)
    .sort((a, b) => a.netPnl - b.netPnl || b.totalTrades - a.totalTrades)
    .slice(0, limit);
}

function rowLine(row: { label?: string; strategy?: string; session?: string; weekday?: string; netPnl: number; winRate: number; totalTrades: number }) {
  const label = row.label || row.strategy || row.session || row.weekday || "Unknown";
  return `${label}: ${row.netPnl.toFixed(2)} P&L, ${row.winRate.toFixed(1)}% WR, ${row.totalTrades} trades`;
}

function buildScore(analytics: JournalAnalyticsResponse) {
  const overview = analytics.overview;
  const profitFactor = overview.profitFactor ?? (overview.grossLoss === 0 && overview.grossProfit > 0 ? 3 : 0);
  let score = 45;

  score += overview.totalNetPnl > 0 ? 18 : overview.totalNetPnl < 0 ? -18 : 0;
  score += clamp((overview.winRate - 50) * 0.45, -14, 14);
  score += clamp((profitFactor - 1) * 12, -16, 18);
  score += overview.expectancyPerTrade > 0 ? 10 : overview.expectancyPerTrade < 0 ? -10 : 0;
  score -= overview.maxDrawdown > Math.abs(overview.totalNetPnl || 1) && overview.totalNetPnl <= 0 ? 8 : 0;

  return Math.round(clamp(score, 0, 100));
}

function statusFromAnalytics(analytics: JournalAnalyticsResponse): ReportStatus {
  const overview = analytics.overview;

  if (overview.totalTrades < MIN_WEEKLY_REPORT_TRADES) {
    return "insufficient_data";
  }

  if (overview.totalNetPnl > 0 && overview.expectancyPerTrade >= 0) {
    return "profitable";
  }

  if (overview.totalNetPnl < 0 && overview.expectancyPerTrade <= 0) {
    return "losing";
  }

  return "flat";
}

function statusFromRow(row: { totalTrades: number; netPnl: number; averagePnl: number }): ReportStatus {
  if (row.totalTrades < 2) {
    return "insufficient_data";
  }

  if (row.netPnl > 0 && row.averagePnl >= 0) {
    return "profitable";
  }

  if (row.netPnl < 0 && row.averagePnl <= 0) {
    return "losing";
  }

  return "flat";
}

function strategyRows(rows: StrategyAnalyticsRow[]): WeeklyBreakdownRow[] {
  return rows
    .filter((row) => row.totalTrades > 0)
    .map((row) => ({
      label: row.strategy,
      type: "strategy" as const,
      totalTrades: row.totalTrades,
      netPnl: row.netPnl,
      winRate: row.winRate,
      averagePnl: row.averagePnl,
      profitFactor: row.profitFactor,
      verdict: statusFromRow(row),
    }));
}

function setupRows(rows: TagAnalyticsRow[]): WeeklyBreakdownRow[] {
  return rows
    .filter((row) => row.totalTrades > 0)
    .sort((a, b) => b.netPnl - a.netPnl)
    .map((row) => ({
      label: row.label,
      type: "setup" as const,
      totalTrades: row.totalTrades,
      netPnl: row.netPnl,
      winRate: row.winRate,
      averagePnl: row.averagePnl,
      profitFactor: row.profitFactor,
      verdict: statusFromRow(row),
    }));
}

function symbolRows(rows: SymbolAnalyticsRow[]): WeeklyBreakdownRow[] {
  return rows
    .filter((row) => row.totalTrades > 0)
    .map((row) => ({
      label: row.symbol,
      type: "symbol" as const,
      totalTrades: row.totalTrades,
      netPnl: row.netPnl,
      winRate: row.winRate,
      averagePnl: row.averagePnl,
      profitFactor: row.profitFactor,
      verdict: statusFromRow(row),
    }));
}

function directionRows(rows: AnalyticsDirectionalStats[]): WeeklyBreakdownRow[] {
  return rows
    .filter((row) => row.totalTrades > 0)
    .map((row) => ({
      label: row.direction,
      type: "direction" as const,
      totalTrades: row.totalTrades,
      netPnl: row.netPnl,
      winRate: row.winRate,
      averagePnl: row.averagePnl,
      profitFactor: null,
      verdict: statusFromRow(row),
    }));
}

function buildBreakdown(analytics: JournalAnalyticsResponse): WeeklyStrategyReport["breakdown"] {
  return {
    strategies: strategyRows(analytics.byStrategy),
    setups: setupRows(analytics.bySetup).slice(0, 8),
    symbols: symbolRows(analytics.bySymbol).slice(0, 8),
    directions: directionRows([analytics.longShort.buy, analytics.longShort.sell]),
  };
}

function getInclusiveDayCount(dateFrom: Date, dateTo: Date) {
  const start = startOfDay(dateFrom).getTime();
  const end = startOfDay(dateTo).getTime();
  return Math.floor((end - start) / DAY_MS) + 1;
}

function buildRequirements({
  totalTrades,
  dateFrom,
  dateTo,
  language,
}: {
  totalTrades: number;
  dateFrom: Date;
  dateTo: Date;
  language: ReportLanguage;
}): WeeklyStrategyReport["requirements"] {
  const fullWeek = getInclusiveDayCount(dateFrom, dateTo) >= WEEKLY_REPORT_DAYS;
  const remainingClosedTrades = Math.max(MIN_WEEKLY_REPORT_TRADES - totalTrades, 0);
  const message =
    language === "fa"
      ? fullWeek
        ? `این بخش گزارش روزانه نیست. تحلیل پیشرفته فقط بعد از پایان یک هفته کامل و ثبت حداقل ${MIN_WEEKLY_REPORT_TRADES} معامله بسته‌شده در همان هفته تولید می‌شود. در این هفته ${totalTrades} معامله ثبت شده و ${remainingClosedTrades} معامله دیگر لازم است.`
        : `این بخش گزارش روزانه نیست. ابتدا باید بازه ${WEEKLY_REPORT_DAYS} روزه کامل شود و سپس حداقل ${MIN_WEEKLY_REPORT_TRADES} معامله بسته‌شده در همان هفته ثبت شده باشد.`
      : fullWeek
        ? `This is not a daily report. Advanced analysis is generated only after a full week has ended and at least ${MIN_WEEKLY_REPORT_TRADES} closed trades exist in that week. This week has ${totalTrades} trades, with ${remainingClosedTrades} more required.`
        : `This is not a daily report. A full ${WEEKLY_REPORT_DAYS}-day period must finish first, with at least ${MIN_WEEKLY_REPORT_TRADES} closed trades in that week.`;

  return {
    minimumClosedTrades: MIN_WEEKLY_REPORT_TRADES,
    currentClosedTrades: totalTrades,
    remainingClosedTrades,
    fullWeek,
    message,
  };
}

function buildComputedReport({
  analytics,
  language,
  periodLabel,
  source,
  dateFrom,
  dateTo,
}: {
  analytics: JournalAnalyticsResponse;
  language: ReportLanguage;
  periodLabel: string;
  source: WeeklyStrategyReport["source"];
  dateFrom: Date;
  dateTo: Date;
}): WeeklyStrategyReport {
  const overview = analytics.overview;
  const status = statusFromAnalytics(analytics);
  const score = buildScore(analytics);
  const requirements = buildRequirements({
    totalTrades: overview.totalTrades,
    dateFrom,
    dateTo,
    language,
  });
  const bestSetups = topPositiveRows(analytics.bySetup);
  const weakSetups = topNegativeRows(analytics.bySetup);
  const bestTags = topPositiveRows(analytics.byTag);
  const weakMistakes = topNegativeRows(analytics.byMistake);
  const bestStrategies = analytics.byStrategy
    .filter((row) => row.totalTrades > 0 && row.netPnl > 0)
    .sort((a, b) => b.netPnl - a.netPnl)
    .slice(0, 2);
  const weakStrategies = analytics.byStrategy
    .filter((row) => row.totalTrades > 0 && row.netPnl < 0)
    .sort((a, b) => a.netPnl - b.netPnl)
    .slice(0, 2);
  const bestContexts = uniqueLimited(
    [
      ...bestStrategies.map(rowLine),
      ...bestSetups.map(rowLine),
      ...bestTags.map(rowLine),
      ...analytics.bySession.filter((row) => row.netPnl > 0).sort((a, b) => b.netPnl - a.netPnl).slice(0, 1).map(rowLine),
    ],
    language === "fa"
      ? ["هنوز الگوی سودده قابل اتکا از این هفته مشخص نشده است."]
      : ["No reliable winning context has emerged this week."],
    4
  );
  const weakestContexts = uniqueLimited(
    [
      ...weakStrategies.map(rowLine),
      ...weakSetups.map(rowLine),
      ...weakMistakes.map(rowLine),
      ...analytics.bySession.filter((row) => row.netPnl < 0).sort((a, b) => a.netPnl - b.netPnl).slice(0, 1).map(rowLine),
    ],
    language === "fa"
      ? ["هنوز الگوی ضررده واضحی از این هفته ثبت نشده است."]
      : ["No clear losing context has been recorded this week."],
    4
  );

  const fa = language === "fa";
  const summary = fa
    ? `در ${overview.totalTrades} معامله بسته‌شده، نتیجه خالص ${overview.totalNetPnl.toFixed(2)} دلار بوده؛ نرخ برد ${overview.winRate.toFixed(1)}% و امید ریاضی هر معامله ${overview.expectancyPerTrade.toFixed(2)} دلار است.`
    : `Across ${overview.totalTrades} closed trades, net P&L was $${overview.totalNetPnl.toFixed(2)}, win rate was ${overview.winRate.toFixed(1)}%, and expectancy was $${overview.expectancyPerTrade.toFixed(2)} per trade.`;

  return {
    success: true,
    source,
    generatedAt: new Date().toISOString(),
    periodLabel,
    verdict: {
      status,
      label: labelForStatus(status, language),
      tone: toneForStatus(status),
      confidence: overview.totalTrades >= 20 ? 0.82 : overview.totalTrades >= 8 ? 0.62 : 0.38,
      summary,
    },
    score,
    stats: {
      totalTrades: overview.totalTrades,
      netPnl: overview.totalNetPnl,
      winRate: overview.winRate,
      profitFactor: overview.profitFactor,
      expectancyPerTrade: overview.expectancyPerTrade,
      maxDrawdown: overview.maxDrawdown,
    },
    strategyRead: fa
      ? status === "profitable"
        ? "هفته مثبت بوده، اما اعتبار آن را با پایبندی به همان شرایط سودده بررسی کن؛ هدف، تکرار زمینه‌های برنده است نه افزایش تعداد معاملات."
        : status === "losing"
          ? "هفته ضررده نشان می‌دهد یا شرایط اجرای استراتژی مناسب نبوده یا قوانین ورود/خروج به اندازه کافی رعایت نشده‌اند. قبل از افزایش حجم، معاملات ضررده را دسته‌بندی کن."
          : "نتیجه هفتگی هنوز سیگنال قطعی نمی‌دهد. تمرکز اصلی باید روی جمع‌آوری داده تمیز، ثبت ستاپ و حذف تصمیم‌های احساسی باشد."
      : status === "profitable"
        ? "The week is positive, but validate it by repeating the same winning contexts rather than simply increasing trade count."
        : status === "losing"
          ? "The losing week suggests weak market fit or inconsistent execution. Classify the losing trades before adding risk."
          : "The week does not give a decisive signal yet. Focus on clean tagging, setup notes, and removing emotional entries.",
    strengths: uniqueLimited(
      [
        ...bestContexts.map((item) => (fa ? `زمینه مثبت: ${item}` : `Positive context: ${item}`)),
        overview.profitFactor && overview.profitFactor > 1 ? (fa ? "فاکتور سود بالای ۱ بوده و سمت سود هنوز برتری دارد." : "Profit factor is above 1, so gains still outweigh losses.") : "",
        overview.expectancyPerTrade > 0 ? (fa ? "امید ریاضی هر معامله مثبت است." : "Expectancy per trade is positive.") : "",
      ],
      fa ? ["برای شناسایی نقطه قوت، چند معامله بیشتر با ستاپ مشخص ثبت کن."] : ["Add more tagged trades to identify a reliable strength."]
    ),
    weaknesses: uniqueLimited(
      [
        ...weakestContexts.map((item) => (fa ? `زمینه ضعیف: ${item}` : `Weak context: ${item}`)),
        overview.expectancyPerTrade < 0 ? (fa ? "امید ریاضی منفی است و هر معامله به طور میانگین به حساب فشار می‌آورد." : "Expectancy is negative, so each trade is costing the account on average.") : "",
        overview.winRate < 40 && overview.totalTrades >= 5 ? (fa ? "نرخ برد پایین است؛ کیفیت ورودها یا نسبت ریسک به بازده باید بازبینی شود." : "Win rate is low; review entry quality or reward-to-risk.") : "",
      ],
      fa ? ["ضعف واضحی ثبت نشده؛ tagging دقیق‌تر معاملات هفته را روشن‌تر می‌کند."] : ["No clear weakness is tagged yet; cleaner trade labels will make the report sharper."]
    ),
    riskWarnings: uniqueLimited(
      [
        overview.maxDrawdown > 0 ? (fa ? `افت سرمایه هفته تا ${overview.maxDrawdown.toFixed(2)} دلار رسیده است.` : `Weekly drawdown reached $${overview.maxDrawdown.toFixed(2)}.`) : "",
        overview.totalTrades < 8 ? (fa ? "نمونه معاملاتی کم است؛ روی این نتیجه شرط بزرگ نگذار." : "Sample size is small; do not make large risk changes from this alone.") : "",
        overview.grossLoss > overview.grossProfit ? (fa ? "زیان ناخالص از سود ناخالص بیشتر است؛ کنترل ضرر اولویت دارد." : "Gross loss is larger than gross profit; loss control is the priority.") : "",
      ],
      fa ? ["ریسک خاصی از داده‌های این هفته برجسته نشده است."] : ["No major risk warning stands out from this week."]
    ),
    nextWeekPlan: uniqueLimited(
      fa
        ? [
            "فقط ستاپ‌هایی را معامله کن که در گزارش به عنوان زمینه مثبت یا قابل بررسی دیده می‌شوند.",
            "برای هر معامله قبل از ورود، دلیل ورود و قانون خروج را ثبت کن.",
            "اگر دو ضرر پشت سر هم رخ داد، همان روز حجم را کاهش بده یا معامله را متوقف کن.",
            "پایان هر روز یک برچسب برای اشتباه، احساس و ستاپ ثبت کن تا گزارش هفته بعد دقیق‌تر شود.",
          ]
        : [
            "Trade only the setups that appear as positive or testable contexts in this report.",
            "Write the entry reason and exit rule before every trade.",
            "If two losses happen back to back, reduce size or stop trading for the day.",
            "Tag setup, mistake, and emotion at the end of each day so next week is sharper.",
          ],
      []
    ),
    bestContexts,
    weakestContexts,
    questions: uniqueLimited(
      fa
        ? [
            "کدام قانون قبل از ضررهای بزرگ نادیده گرفته شده؟",
            "آیا معاملات سودده در یک سشن یا نماد خاص متمرکز بوده‌اند؟",
            "آیا سود هفته از چند معامله باکیفیت آمده یا از تعداد زیاد معامله؟",
          ]
        : [
            "Which rule was ignored before the largest losses?",
            "Were winning trades concentrated in one session or symbol?",
            "Did profit come from a few quality trades or from high trade count?",
          ],
      []
    ),
    breakdown: buildBreakdown(analytics),
    ready: requirements.fullWeek && requirements.remainingClosedTrades === 0,
    requirements,
  };
}

function buildPrompt(analytics: JournalAnalyticsResponse, language: ReportLanguage, periodLabel: string) {
  const compact = {
    periodLabel,
    overview: analytics.overview,
    byStrategy: analytics.byStrategy.slice(0, 8),
    bySymbol: analytics.bySymbol.slice(0, 8),
    bySession: analytics.bySession,
    byWeekday: analytics.byWeekday,
    byHour: analytics.byHour.filter((row) => row.totalTrades > 0),
    bySetup: analytics.bySetup.slice(0, 8),
    byMistake: analytics.byMistake.slice(0, 8),
    byEmotion: analytics.byEmotion.slice(0, 8),
    byChecklistCompletion: analytics.byChecklistCompletion,
  };

  return `You are an expert trading performance coach. Analyze this user's last 7 days of closed trades and return only valid JSON.
Language: ${language === "fa" ? "Persian/Farsi" : "English"}.
Do not invent trades or market facts. Base every claim on the provided metrics.
Classify whether the strategy was profitable, losing, flat, or insufficient_data.
Return exactly this JSON shape:
{
  "verdict": {"status":"profitable|losing|flat|insufficient_data","label":"short label","tone":"profit|loss|neutral|amber","confidence":0.0,"summary":"1-2 sentence weekly summary"},
  "score": 0,
  "strategyRead": "one useful paragraph for the trader",
  "strengths": ["up to 4 concrete strengths"],
  "weaknesses": ["up to 4 concrete weaknesses"],
  "riskWarnings": ["up to 4 risk warnings"],
  "nextWeekPlan": ["up to 4 concrete next-week actions"],
  "questions": ["up to 3 review questions"]
}
Metrics:
${JSON.stringify(compact)}`;
}

function coerceStringArray(value: unknown, fallback: string[]) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 4)
    : fallback;
}

function parseAIReport(text: string, fallback: WeeklyStrategyReport): AIReportPayload {
  const parsed = JSON.parse(text) as Partial<AIReportPayload>;
  const status = ["profitable", "losing", "flat", "insufficient_data"].includes(
    String(parsed.verdict?.status)
  )
    ? (parsed.verdict?.status as ReportStatus)
    : fallback.verdict.status;
  const tone = ["profit", "loss", "neutral", "amber"].includes(String(parsed.verdict?.tone))
    ? (parsed.verdict?.tone as ReportTone)
    : toneForStatus(status);

  return {
    verdict: {
      status,
      label: String(parsed.verdict?.label || fallback.verdict.label),
      tone,
      confidence: clamp(asNumber(parsed.verdict?.confidence, fallback.verdict.confidence), 0, 1),
      summary: String(parsed.verdict?.summary || fallback.verdict.summary),
    },
    score: Math.round(clamp(asNumber(parsed.score, fallback.score), 0, 100)),
    strategyRead: String(parsed.strategyRead || fallback.strategyRead),
    strengths: coerceStringArray(parsed.strengths, fallback.strengths),
    weaknesses: coerceStringArray(parsed.weaknesses, fallback.weaknesses),
    riskWarnings: coerceStringArray(parsed.riskWarnings, fallback.riskWarnings),
    nextWeekPlan: coerceStringArray(parsed.nextWeekPlan, fallback.nextWeekPlan),
    questions: coerceStringArray(parsed.questions, fallback.questions),
  };
}

function resolveWeeklyRange(searchParams: URLSearchParams) {
  const errors: string[] = [];
  const dateRange = searchParams.get("dateRange");
  const presetRange = rangeFromPreset(dateRange);
  const customDateFrom = parseDateParam(searchParams.get("dateFrom") || searchParams.get("from"));
  const customDateTo = parseDateParam(searchParams.get("dateTo") || searchParams.get("to"), true);

  if (presetRange === null) {
    errors.push("dateRange must be all, today, thisWeek, thisMonth, thisYear, or custom");
  }

  if (customDateFrom === null) {
    errors.push("dateFrom must be a valid date");
  }

  if (customDateTo === null) {
    errors.push("dateTo must be a valid date");
  }

  if (errors.length > 0) {
    const fallback = getWeeklyRange();
    return { ...fallback, errors };
  }

  if (customDateFrom || customDateTo || presetRange?.dateFrom || presetRange?.dateTo) {
    const dateTo = customDateTo || presetRange?.dateTo || endOfDay(new Date());
    const dateFrom = customDateFrom || presetRange?.dateFrom || startOfDay(new Date(dateTo.getTime() - 6 * 24 * 60 * 60 * 1000));
    return { dateFrom, dateTo, errors };
  }

  return { ...getWeeklyRange(), errors };
}

async function buildWeeklyWhere(searchParams: URLSearchParams, userId: string) {
  const errors: string[] = [];
  const direction = parseDirection(searchParams.get("direction") || searchParams.get("side"));
  const accountId = searchParams.get("accountId")?.trim();
  const symbol = searchParams.get("symbol")?.trim();
  const setup = searchParams.get("setup")?.trim();
  const mistake = searchParams.get("mistake")?.trim();
  const emotion = searchParams.get("emotion")?.trim();

  if (direction === null) {
    errors.push("direction must be BUY or SELL");
  }

  const baseAnd: Prisma.TradeWhereInput[] = [
    { userId },
    {
      OR: [{ status: "CLOSED" }, { closedAt: { not: null } }, { exitPrice: { not: null } }],
    },
  ];

  if (accountId) baseAnd.push({ accountId });
  if (symbol) baseAnd.push({ symbol: { contains: symbol, mode: "insensitive" } });
  if (direction) baseAnd.push({ direction });
  if (setup) baseAnd.push({ setup: { contains: setup, mode: "insensitive" } });
  if (mistake) baseAnd.push({ mistake: { contains: mistake, mode: "insensitive" } });
  if (emotion) baseAnd.push({ emotion: { contains: emotion, mode: "insensitive" } });

  const range = resolveWeeklyRange(searchParams);
  errors.push(...range.errors);

  return {
    where: {
      AND: [
        ...baseAnd,
        {
          OR: [
            { closedAt: { gte: range.dateFrom, lte: range.dateTo } },
            { AND: [{ closedAt: null }, { openedAt: { gte: range.dateFrom, lte: range.dateTo } }] },
            {
              AND: [
                { closedAt: null },
                { openedAt: null },
                { createdAt: { gte: range.dateFrom, lte: range.dateTo } },
              ],
            },
          ],
        },
      ],
    } satisfies Prisma.TradeWhereInput,
    errors,
    periodLabel: `${formatDate(range.dateFrom)} - ${formatDate(range.dateTo)}`,
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
  };
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "advancedAnalytics");

    const { searchParams } = new URL(request.url);
    const language = normalizeLanguage(searchParams.get("language"));
    const { where, errors, periodLabel, dateFrom, dateTo } = await buildWeeklyWhere(searchParams, userId);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: "Validation failed", errors }, { status: 400 });
    }

    const trades = await prisma.trade.findMany({
      where,
      include: analyticsTradeInclude,
      orderBy: [{ closedAt: "asc" }, { openedAt: "asc" }, { createdAt: "asc" }],
    });
    const analytics = buildTradeAnalytics(trades as AnalyticsTrade[]);
    const fallback = buildComputedReport({
      analytics,
      language,
      periodLabel,
      source: "computed",
      dateFrom,
      dateTo,
    });

    if (!fallback.ready) {
      return NextResponse.json(fallback);
    }

    try {
      const responseText = await generateGeminiJson(buildPrompt(analytics, language, periodLabel), {
        systemInstruction:
          "You are a concise trading analytics coach. Return only strict JSON. Never provide financial guarantees.",
        timeoutMs: 35_000,
      });
      const aiPayload = parseAIReport(responseText, fallback);

      return NextResponse.json({
        ...fallback,
        ...aiPayload,
        source: "ai",
      } satisfies WeeklyStrategyReport);
    } catch (error) {
      if (error instanceof GeminiClientError || error instanceof SyntaxError) {
        return NextResponse.json(fallback);
      }

      throw error;
    }
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }

    return NextResponse.json(
      { success: false, message: "Failed to generate weekly strategy report" },
      { status: 500 }
    );
  }
}
