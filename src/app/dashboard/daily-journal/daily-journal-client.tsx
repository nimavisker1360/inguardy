"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  CalendarDays,
  ClipboardCheck,
  CheckCircle2,
  Save,
  ShieldAlert,
  Target,
} from "lucide-react";
import { TradingWorkflowStrip } from "@/components/journal/TradingWorkflowStrip";
import { useLanguage } from "@/lib/language-context";

type JournalForm = {
  marketBias: string;
  todayFocus: string;
  maxTradesAllowed: string;
  maxDailyLoss: string;
  mainPlaybookId: string;
  symbolsToTrade: string;
  newsToWatch: string;
  preMarketNotes: string;
  mood: string;
  focusLevel: string;
  confidenceLevel: string;
  stressLevel: string;
  sleepQuality: string;
  disciplineScore: string;
  checklistNotes: string;
  respectedRisk: boolean;
  waitedForConfirmation: boolean;
  avoidedRevengeTrading: boolean;
  stoppedAfterDailyLimit: boolean;
  followedPlaybook: boolean;
  avoidedOvertrading: boolean;
  whatWentWell: string;
  mistakesSummary: string;
  followedPlanReview: string;
  improvementPlan: string;
  tomorrowPlan: string;
  endOfDayNotes: string;
};

type DailyJournalRecord = Partial<JournalForm> & {
  id: string;
  date: string;
  status?: string;
  completedAt?: string | null;
};

type DailyJournalStats = {
  date: string;
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  netPnl: number;
  winRate: number;
  averageRR: number;
  bestTradePnl: number;
  worstTradePnl: number;
  bestTrade: { id: string; symbol: string; pnl: number } | null;
  worstTrade: { id: string; symbol: string; pnl: number } | null;
  checklistCompletionRate: number;
  mostRepeatedMistake: string | null;
  mostCommonEmotion: string | null;
};

type DailyJournalTrade = {
  id: string;
  openTime: string | null;
  symbol: string;
  direction: "BUY" | "SELL";
  entry: number | null;
  exit: number | null;
  stopLoss: number | null;
  pnl: number | null;
  rMultiple: number | null;
  status: string;
  setup: string | null;
  emotion: string | null;
  mistake: string | null;
  checklistCompletionPercent: number | null;
  reviewStatus?: string;
};

type DailyJournalRequirements = {
  readyToComplete: boolean;
  missingRequirements: string[];
  message: string | null;
  missingItems: Array<{
    code: string;
    label: string;
    href: string;
  }>;
};

type PlaybookOption = {
  id: string;
  name: string;
};

type AccountOption = {
  id: string;
  name: string;
};

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";

type TomorrowSuggestion = {
  id: string;
  category: "risk" | "psychology" | "discipline" | "planning";
  priority: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
};

const emptyForm: JournalForm = {
  marketBias: "",
  todayFocus: "",
  maxTradesAllowed: "",
  maxDailyLoss: "",
  mainPlaybookId: "",
  symbolsToTrade: "",
  newsToWatch: "",
  preMarketNotes: "",
  mood: "",
  focusLevel: "",
  confidenceLevel: "",
  stressLevel: "",
  sleepQuality: "",
  disciplineScore: "",
  checklistNotes: "",
  respectedRisk: false,
  waitedForConfirmation: false,
  avoidedRevengeTrading: false,
  stoppedAfterDailyLimit: false,
  followedPlaybook: false,
  avoidedOvertrading: false,
  whatWentWell: "",
  mistakesSummary: "",
  followedPlanReview: "",
  improvementPlan: "",
  tomorrowPlan: "",
  endOfDayNotes: "",
};

const formFieldKeys = Object.keys(emptyForm) as Array<keyof JournalForm>;

const inputClass =
  "h-10 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-blue-600";
const textareaClass =
  "w-full rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-sm leading-6 text-[#E5E7EB] outline-none focus:border-blue-600";

const copy = {
  en: {
    title: "Daily Journal",
    subtitle: "Plan the day, track your mindset, and review what to improve tomorrow.",
    loading: "Loading...",
    saving: "Saving...",
    saved: "Saved",
    errorSaving: "Error saving",
    save: "Save",
    completeDay: "Complete Day",
    completed: "Completed",
    completionBlocked: "You have trades waiting for review. Complete their Playbook and Checklist before closing the day.",
    date: "Date",
    account: "Account",
    allAccounts: "All accounts",
    previousDay: "Previous Day",
    today: "Today",
    nextDay: "Next Day",
    netPnl: "Net P&L",
    totalTrades: "Total Trades",
    winRate: "Win Rate",
    averageRr: "Average R:R",
    bestTrade: "Best Trade",
    worstTrade: "Worst Trade",
    dailyPlan: "Morning Plan",
    marketBias: "Market Bias",
    selectBias: "Select bias",
    todayFocus: "Today's Focus",
    maxTradesAllowed: "Max Trades Allowed",
    maxDailyLoss: "Max Daily Loss",
    mainPlaybook: "Main Playbook",
    noPlaybookSelected: "No playbook selected",
    symbolsToTrade: "Symbols to Trade",
    newsToWatch: "News to Watch",
    preMarketNotes: "Pre-Market Notes",
    dailyPsychology: "Daily Psychology",
    mood: "Mood",
    selectMood: "Select mood",
    focusLevel: "Focus Level",
    confidenceLevel: "Confidence Level",
    stressLevel: "Stress Level",
    disciplineScore: "Discipline Score",
    sleepQuality: "Sleep Quality",
    selectSleepQuality: "Select sleep quality",
    dailyChecklist: "Daily Discipline Checklist",
    respectedRisk: "I respected my risk",
    waitedForConfirmation: "I waited for confirmation",
    avoidedRevengeTrading: "I avoided revenge trading",
    stoppedAfterDailyLimit: "I stopped after daily limit",
    followedPlaybook: "I followed my playbook",
    avoidedOvertrading: "I avoided overtrading",
    checklistNotes: "Checklist Notes",
    endOfDayReview: "End of Day Review",
    whatWentWell: "What went well today?",
    mistakesSummary: "What mistakes did I make?",
    followedPlanReview: "Did I follow my plan?",
    improvementPlan: "What should I improve tomorrow?",
    tomorrowPlan: "Tomorrow Plan",
    endOfDayNotes: "End of Day Notes",
    linkedTrades: "Linked Trades",
    linkedTradesSubtitle: "A compact evidence view for the daily review. Full execution details stay in each trade review.",
    time: "Time",
    symbol: "Symbol",
    direction: "Direction",
    entry: "Entry",
    exit: "Exit",
    pnl: "PnL",
    rr: "R:R",
    status: "Status",
    openReview: "Open Review",
    showAllTrades: "Show all trades",
    showLessTrades: "Show less",
    showingTrades: "Showing",
    ofTrades: "of",
    missingChecklist: "Missing Checklist",
    noStopLoss: "No Stop Loss",
    reviewedTrades: "Reviewed Trades",
    repeatedMistake: "Repeated Mistake",
    checklistColumn: "Checklist",
    mistakeColumn: "Mistake",
    stopLossLabel: "Stop Loss",
    setLabel: "Set",
    missingLabel: "Missing",
    noTrades: "No trades found for this date. You can still write your plan and review.",
    tomorrowSuggestions: "Tomorrow Suggestions",
    tomorrowSuggestionsSubtitle: "Built from today's trades, mindset, risk behavior, and end-of-day review.",
    addSuggestionsToPlan: "Add to Tomorrow Plan",
    noEvidenceTitle: "No journal evidence yet",
    noEvidenceDetail: "There are no trades or completed journal notes for this date, so tomorrow suggestions cannot be evaluated yet.",
    noEvidenceAction: "Record a trade or fill the daily review first; then tomorrow suggestions will be built from real evidence.",
    noSuggestionTitle: "Keep the same routine",
    noSuggestionDetail: "No major risk, psychology, or discipline issue is visible from today's journal.",
    noSuggestionAction: "Repeat the same pre-market checklist and only take trades that match the playbook.",
    highPriority: "High",
    mediumPriority: "Medium",
    lowPriority: "Low",
    biasOptions: ["Bullish", "Bearish", "Neutral", "Range", "Waiting"],
    moodOptions: ["Calm", "Confident", "Stressed", "Fearful", "Angry", "Tired", "Distracted"],
    sleepOptions: ["Good", "Normal", "Bad"],
  },
  fa: {
    title: "ژورنال روزانه",
    subtitle: "برنامه روز را بنویس، ذهنیتت را ثبت کن و مرور کن فردا چه چیزی باید بهتر شود.",
    loading: "در حال بارگذاری...",
    saving: "در حال ذخیره...",
    saved: "ذخیره شد",
    errorSaving: "خطا در ذخیره",
    save: "ذخیره",
    completeDay: "Complete Day",
    completed: "Completed",
    completionBlocked: "You have trades waiting for review. Complete their Playbook and Checklist before closing the day.",
    date: "تاریخ",
    account: "حساب",
    allAccounts: "همه حساب‌ها",
    previousDay: "روز قبل",
    today: "امروز",
    nextDay: "روز بعد",
    netPnl: "سود و زیان خالص",
    totalTrades: "تعداد معاملات",
    winRate: "نرخ برد",
    averageRr: "میانگین R:R",
    bestTrade: "بهترین معامله",
    worstTrade: "بدترین معامله",
    dailyPlan: "برنامه روزانه",
    marketBias: "جهت بازار",
    selectBias: "انتخاب جهت",
    todayFocus: "تمرکز امروز",
    maxTradesAllowed: "حداکثر تعداد معاملات",
    maxDailyLoss: "حداکثر ضرر روزانه",
    mainPlaybook: "پلی‌بوک اصلی",
    noPlaybookSelected: "پلی‌بوکی انتخاب نشده",
    symbolsToTrade: "نمادهای قابل معامله",
    newsToWatch: "اخبار مهم",
    preMarketNotes: "یادداشت‌های قبل بازار",
    dailyPsychology: "روانشناسی روزانه",
    mood: "حال روحی",
    selectMood: "انتخاب حال روحی",
    focusLevel: "سطح تمرکز",
    confidenceLevel: "سطح اعتمادبه‌نفس",
    stressLevel: "سطح استرس",
    disciplineScore: "امتیاز نظم",
    sleepQuality: "کیفیت خواب",
    selectSleepQuality: "انتخاب کیفیت خواب",
    dailyChecklist: "چک‌لیست انضباط روزانه",
    respectedRisk: "ریسک خودم را رعایت کردم",
    waitedForConfirmation: "برای تایید صبر کردم",
    avoidedRevengeTrading: "از معامله انتقامی دوری کردم",
    stoppedAfterDailyLimit: "بعد از حد روزانه توقف کردم",
    followedPlaybook: "طبق پلی‌بوک عمل کردم",
    avoidedOvertrading: "از بیش‌معامله‌گری دوری کردم",
    checklistNotes: "یادداشت چک‌لیست",
    endOfDayReview: "مرور پایان روز",
    whatWentWell: "امروز چه چیزهایی خوب پیش رفت؟",
    mistakesSummary: "چه اشتباهاتی داشتم؟",
    followedPlanReview: "آیا طبق برنامه عمل کردم؟",
    improvementPlan: "فردا چه چیزی را بهتر کنم؟",
    tomorrowPlan: "برنامه فردا",
    endOfDayNotes: "یادداشت‌های پایان روز",
    linkedTrades: "معاملات مرتبط",
    linkedTradesSubtitle: "نمای خلاصه برای مرور روزانه است؛ جزئیات کامل اجرا داخل بررسی هر معامله می‌ماند.",
    time: "زمان",
    symbol: "نماد",
    direction: "جهت",
    entry: "ورود",
    exit: "خروج",
    pnl: "سود/زیان",
    rr: "R:R",
    status: "وضعیت",
    openReview: "باز کردن بررسی",
    showAllTrades: "نمایش همه معاملات",
    showLessTrades: "نمایش کمتر",
    showingTrades: "نمایش",
    ofTrades: "از",
    missingChecklist: "بدون چک‌لیست",
    noStopLoss: "بدون حد ضرر",
    reviewedTrades: "معاملات بررسی‌شده",
    repeatedMistake: "اشتباه پرتکرار",
    checklistColumn: "چک‌لیست",
    mistakeColumn: "اشتباه",
    stopLossLabel: "حد ضرر",
    setLabel: "ثبت شده",
    missingLabel: "ثبت نشده",
    noTrades: "برای این تاریخ معامله‌ای پیدا نشد. همچنان می‌توانی برنامه و مرور روزت را بنویسی.",
    tomorrowSuggestions: "پیشنهادهای فردا",
    tomorrowSuggestionsSubtitle: "بر اساس معاملات امروز، ذهنیت، رفتار ریسک و مرور پایان روز ساخته می‌شود.",
    addSuggestionsToPlan: "افزودن به برنامه فردا",
    noEvidenceTitle: "هنوز داده‌ای برای پیشنهاد فردا وجود ندارد",
    noEvidenceDetail: "برای این تاریخ نه معامله‌ای ثبت شده و نه مرور روزانه‌ای تکمیل شده؛ بنابراین هنوز نمی‌شود از ژورنال امروز نتیجه گرفت.",
    noEvidenceAction: "اول یک معامله ثبت کن یا مرور پایان روز را کامل کن؛ بعد پیشنهادهای فردا بر اساس داده واقعی ساخته می‌شود.",
    noSuggestionTitle: "همین روتین را حفظ کن",
    noSuggestionDetail: "از ژورنال امروز مشکل جدی در ریسک، روانشناسی یا انضباط دیده نمی‌شود.",
    noSuggestionAction: "همان چک‌لیست قبل بازار را تکرار کن و فقط معامله‌های مطابق پلی‌بوک را بگیر.",
    highPriority: "مهم",
    mediumPriority: "متوسط",
    lowPriority: "کم",
    biasOptions: ["صعودی", "نزولی", "خنثی", "رنج", "منتظر"],
    moodOptions: ["آرام", "مطمئن", "پراسترس", "ترسان", "عصبانی", "خسته", "حواس‌پرت"],
    sleepOptions: ["خوب", "معمولی", "بد"],
  },
} as const;

const biasValues = ["Bullish", "Bearish", "Neutral", "Range", "Waiting"] as const;
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : todayKey();
}

function adjacentDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function formatTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function hasJournalEvidence(form: JournalForm, trades: DailyJournalTrade[]) {
  if (trades.length > 0) {
    return true;
  }

  return formFieldKeys.some((key) => {
    const value = form[key];

    if (typeof value === "boolean") {
      return value;
    }

    return hasText(value);
  });
}

function matchesAny(value: string | null | undefined, patterns: string[]) {
  const normalized = String(value || "").trim().toLowerCase();

  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
}

type Language = keyof typeof copy;

const tomorrowPlanActionTranslations = [
  {
    en: "Before entry, write the SL price and risk amount; if the SL is unclear, skip the trade.",
    fa: "قبل از ورود، قیمت SL و مقدار ریسک را بنویس؛ اگر SL مشخص نیست، معامله ممنوع.",
  },
  {
    en: "Tomorrow, once the daily loss limit is reached, close the platform and only complete the journal.",
    fa: "فردا بعد از رسیدن به حد ضرر روزانه، پلتفرم را ببند و فقط ژورنال را تکمیل کن.",
  },
  {
    en: "Write one rule for tomorrow: position size is allowed only after risk is calculated.",
    fa: "برای فردا یک قانون بنویس: حجم معامله فقط بعد از محاسبه ریسک مجاز است.",
  },
  {
    en: "Tomorrow before entry, name one specific checklist or playbook confirmation out loud.",
    fa: "فردا قبل از ورود، یک تایید مشخص از چک‌لیست یا پلی‌بوک را با صدای بلند نام ببر.",
  },
  {
    en: "Tomorrow after each loss, step away for 15 minutes and allow the next trade only after reviewing the plan.",
    fa: "فردا بعد از هر ضرر، ۱۵ دقیقه از چارت دور شو و معامله بعدی فقط بعد از مرور پلن مجاز است.",
  },
  {
    en: "Tomorrow after two back-to-back trades, take a 10-minute pause and write the entry reason.",
    fa: "فردا بعد از دو معامله پشت‌سرهم، ۱۰ دقیقه توقف و ثبت دلیل ورود الزامی باشد.",
  },
  {
    en: "Tomorrow only the main playbook setup is allowed; any other setup gets a screenshot and note only.",
    fa: "فردا فقط ستاپ پلی‌بوک اصلی مجاز باشد؛ هر ستاپ دیگر فقط اسکرین‌شات و یادداشت شود.",
  },
  {
    en: "Tomorrow if focus is below 5 or stress is above 7, allow half risk only or observe the market.",
    fa: "فردا اگر تمرکز زیر ۵ یا استرس بالای ۷ بود، فقط نیم‌ریسک یا فقط مشاهده بازار مجاز باشد.",
  },
  {
    en: "Tomorrow before increasing size, use only playbook stats and fixed risk as the decision criteria.",
    fa: "فردا قبل از افزایش حجم، فقط آمار پلی‌بوک و ریسک ثابت را معیار تصمیم بگذار.",
  },
  {
    en: "Tomorrow focus on one behavior only: confirmed entry, respected SL, or stopping at the daily limit.",
    fa: "فردا فقط روی یک رفتار تمرکز کن: ورود با تایید، رعایت SL، یا توقف بعد از حد ضرر.",
  },
  {
    en: "Write three lines: allowed symbols, allowed setup, and conditions that forbid trading.",
    fa: "سه خط بنویس: نمادهای مجاز، ستاپ مجاز، و شرایطی که معامله را ممنوع می‌کند.",
  },
  {
    en: "Repeat the same pre-market checklist and only take trades that match the playbook.",
    fa: "همان چک‌لیست قبل بازار را تکرار کن و فقط معامله‌های مطابق پلی‌بوک را بگیر.",
  },
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toEnglishDigits(value: string) {
  const digits: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };

  return value.replace(/[۰-۹]/g, (digit) => digits[digit] || digit);
}

function localizeTomorrowPlanActions(value: string, language: Language) {
  let localized = value;
  const sourceLanguage: Language = language === "fa" ? "en" : "fa";

  for (const translation of tomorrowPlanActionTranslations) {
    localized = localized.replace(
      new RegExp(escapeRegExp(translation[sourceLanguage]), "g"),
      translation[language]
    );
  }

  if (language === "fa") {
    localized = localized.replace(
      /Tomorrow after ([0-9۰-۹]+) trade\(s\), record new setups in the journal instead of entering them\./g,
      (_match, count: string) =>
        `فردا بعد از ${toEnglishDigits(count)} معامله، حتی با وجود ستاپ جدید، معامله بعدی فقط در ژورنال یادداشت شود.`
    );
  } else {
    localized = localized.replace(
      /فردا بعد از ([0-9۰-۹]+) معامله، حتی با وجود ستاپ جدید، معامله بعدی فقط در ژورنال یادداشت شود\./g,
      (_match, count: string) =>
        `Tomorrow after ${toEnglishDigits(count)} trade(s), record new setups in the journal instead of entering them.`
    );
  }

  return localized;
}

function buildTomorrowSuggestions({
  form,
  stats,
  trades,
  isFa,
  text,
}: {
  form: JournalForm;
  stats: DailyJournalStats | null;
  trades: DailyJournalTrade[];
  isFa: boolean;
  text: (typeof copy)[keyof typeof copy];
}): TomorrowSuggestion[] {
  const suggestions: TomorrowSuggestion[] = [];
  const hasEvidence = hasJournalEvidence(form, trades);

  if (!hasEvidence) {
    return [
      {
        id: "no-journal-evidence",
        category: "planning",
        priority: "low",
        title: text.noEvidenceTitle,
        detail: text.noEvidenceDetail,
        action: text.noEvidenceAction,
      },
    ];
  }

  const missingStopLossTrades = trades.filter(
    (trade) => trade.status !== "CANCELLED" && !isPositiveNumber(trade.stopLoss)
  );
  const maxTradesAllowed = Number(form.maxTradesAllowed);
  const maxDailyLoss = Math.abs(Number(form.maxDailyLoss));
  const netPnl = stats?.netPnl || 0;
  const stressLevel = Number(form.stressLevel);
  const focusLevel = Number(form.focusLevel);
  const confidenceLevel = Number(form.confidenceLevel);
  const disciplineScore = Number(form.disciplineScore);
  const repeatedMistake = stats?.mostRepeatedMistake || null;
  const commonEmotion = stats?.mostCommonEmotion || form.mood || null;
  const hasTrades = trades.length > 0;
  const hadLoss = (stats?.losses || 0) > 0 || netPnl < 0;

  if (missingStopLossTrades.length > 0) {
    suggestions.push({
      id: "missing-stop-loss",
      category: "risk",
      priority: "high",
      title: isFa ? "فردا هیچ معامله‌ای بدون حد ضرر باز نشود" : "Do not open a trade without a stop loss tomorrow",
      detail: isFa
        ? `${missingStopLossTrades.length} معامله امروز بدون حد ضرر ثبت‌شده بود. این مستقیم‌ترین ریسک قابل کنترل است.`
        : `${missingStopLossTrades.length} trade(s) today had no recorded stop loss. This is the most direct controllable risk.`,
      action: isFa
        ? "قبل از ورود، قیمت SL و مقدار ریسک را بنویس؛ اگر SL مشخص نیست، معامله ممنوع."
        : "Before entry, write the SL price and risk amount; if the SL is unclear, skip the trade.",
    });
  }

  if (Number.isFinite(maxDailyLoss) && maxDailyLoss > 0 && netPnl < -maxDailyLoss) {
    suggestions.push({
      id: "daily-loss-limit",
      category: "risk",
      priority: "high",
      title: isFa ? "قانون توقف روزانه را سخت‌تر اجرا کن" : "Enforce the daily stop rule more tightly",
      detail: isFa
        ? `زیان خالص امروز از حد ضرر روزانه ثبت‌شده بیشتر شد. بعد از رسیدن به این سطح، تصمیم‌های بعدی معمولا احساسی‌تر می‌شوند.`
        : "Today's net loss exceeded the daily loss limit in the journal. After that point, decisions tend to get more emotional.",
      action: isFa
        ? "فردا بعد از رسیدن به حد ضرر روزانه، پلتفرم را ببند و فقط ژورنال را تکمیل کن."
        : "Tomorrow, once the daily loss limit is reached, close the platform and only complete the journal.",
    });
  }

  if (Number.isFinite(maxTradesAllowed) && maxTradesAllowed > 0 && trades.length > maxTradesAllowed) {
    suggestions.push({
      id: "max-trades",
      category: "discipline",
      priority: "high",
      title: isFa ? "تعداد معاملات فردا را قفل کن" : "Lock tomorrow's trade count",
      detail: isFa
        ? `امروز ${trades.length} معامله ثبت شد، بیشتر از سقف ${maxTradesAllowed}. این نشانه‌ی احتمال اورترید است.`
        : `Today had ${trades.length} trades, above the ${maxTradesAllowed} trade limit. That is a possible overtrading signal.`,
      action: isFa
        ? `فردا بعد از ${maxTradesAllowed} معامله، حتی با وجود ستاپ جدید، معامله بعدی فقط در ژورنال یادداشت شود.`
        : `Tomorrow after ${maxTradesAllowed} trade(s), record new setups in the journal instead of entering them.`,
    });
  }

  if (hasTrades && !form.respectedRisk) {
    suggestions.push({
      id: "risk-respect",
      category: "risk",
      priority: "high",
      title: isFa ? "ریسک هر معامله را قبل از کلیک نهایی تایید کن" : "Confirm risk before the final click",
      detail: isFa ? "چک‌لیست امروز نشان می‌دهد ریسک کاملا رعایت نشده است." : "Today's checklist says risk was not fully respected.",
      action: isFa
        ? "برای فردا یک قانون بنویس: حجم معامله فقط بعد از محاسبه ریسک مجاز است."
        : "Write one rule for tomorrow: position size is allowed only after risk is calculated.",
    });
  }

  if (hasTrades && (!form.waitedForConfirmation || matchesAny(repeatedMistake, ["No Confirmation", "Entered Early", "بدون", "زود"]))) {
    suggestions.push({
      id: "confirmation",
      category: "discipline",
      priority: "medium",
      title: isFa ? "ورود را با یک تایید مشخص کند کن" : "Slow entries down with one clear confirmation",
      detail: repeatedMistake
        ? isFa
          ? `اشتباه پرتکرار امروز: ${repeatedMistake}.`
          : `Most repeated mistake today: ${repeatedMistake}.`
        : isFa
          ? "امروز صبر برای تایید کامل علامت نخورده است."
          : "Waiting for confirmation was not checked today.",
      action: isFa
        ? "فردا قبل از ورود، یک تایید مشخص از چک‌لیست یا پلی‌بوک را با صدای بلند نام ببر."
        : "Tomorrow before entry, name one specific checklist or playbook confirmation out loud.",
    });
  }

  if ((hasTrades && !form.avoidedRevengeTrading) || matchesAny(commonEmotion, ["Revenge", "Angry", "Regret", "انتقامی", "عصبانی", "پشیمان"])) {
    suggestions.push({
      id: "revenge-trading",
      category: "psychology",
      priority: "high",
      title: isFa ? "بعد از ضرر، وقفه اجباری بگذار" : "Use a mandatory pause after a loss",
      detail: isFa
        ? "ژورنال امروز نشانه‌ی ریسک معامله انتقامی یا تصمیم هیجانی دارد."
        : "Today's journal shows risk of revenge trading or emotional decision-making.",
      action: isFa
        ? "فردا بعد از هر ضرر، ۱۵ دقیقه از چارت دور شو و معامله بعدی فقط بعد از مرور پلن مجاز است."
        : "Tomorrow after each loss, step away for 15 minutes and allow the next trade only after reviewing the plan.",
    });
  }

  if (hasTrades && !form.avoidedOvertrading) {
    suggestions.push({
      id: "overtrading",
      category: "discipline",
      priority: "medium",
      title: isFa ? "برای اورترید یک ترمز بیرونی بگذار" : "Add an external brake for overtrading",
      detail: isFa ? "امروز گزینه دوری از بیش‌معامله‌گری علامت نخورده است." : "Avoiding overtrading was not checked today.",
      action: isFa
        ? "فردا بعد از دو معامله پشت‌سرهم، ۱۰ دقیقه توقف و ثبت دلیل ورود الزامی باشد."
        : "Tomorrow after two back-to-back trades, take a 10-minute pause and write the entry reason.",
    });
  }

  if (hasTrades && !form.followedPlaybook) {
    suggestions.push({
      id: "playbook",
      category: "planning",
      priority: "medium",
      title: isFa ? "فقط یک ستاپ اصلی را معامله کن" : "Trade only one main setup",
      detail: isFa ? "امروز پایبندی کامل به پلی‌بوک ثبت نشده است." : "Full playbook adherence was not recorded today.",
      action: isFa
        ? "فردا فقط ستاپ پلی‌بوک اصلی مجاز باشد؛ هر ستاپ دیگر فقط اسکرین‌شات و یادداشت شود."
        : "Tomorrow only the main playbook setup is allowed; any other setup gets a screenshot and note only.",
    });
  }

  if (
    (Number.isFinite(stressLevel) && stressLevel >= 7) ||
    (Number.isFinite(focusLevel) && focusLevel > 0 && focusLevel <= 4) ||
    matchesAny(form.mood || commonEmotion, ["Stressed", "Fearful", "Tired", "Distracted", "پراسترس", "ترسان", "خسته", "حواس"])
  ) {
    suggestions.push({
      id: "mindset-readiness",
      category: "psychology",
      priority: "medium",
      title: isFa ? "قبل از بازار وضعیت ذهنی را فیلتر کن" : "Filter mindset before the session",
      detail: isFa
        ? "استرس، تمرکز پایین یا خستگی می‌تواند کیفیت اجرای پلن فردا را پایین بیاورد."
        : "Stress, low focus, or tiredness can reduce tomorrow's execution quality.",
      action: isFa
        ? "فردا اگر تمرکز زیر ۵ یا استرس بالای ۷ بود، فقط نیم‌ریسک یا فقط مشاهده بازار مجاز باشد."
        : "Tomorrow if focus is below 5 or stress is above 7, allow half risk only or observe the market.",
    });
  }

  if (Number.isFinite(confidenceLevel) && confidenceLevel >= 8 && hadLoss) {
    suggestions.push({
      id: "confidence-check",
      category: "psychology",
      priority: "low",
      title: isFa ? "اعتمادبه‌نفس را با داده کنترل کن" : "Keep confidence data-driven",
      detail: isFa
        ? "اعتمادبه‌نفس بالا همراه با ضرر می‌تواند باعث بزرگ کردن حجم یا ورود زودهنگام شود."
        : "High confidence with losses can lead to bigger size or early entries.",
      action: isFa
        ? "فردا قبل از افزایش حجم، فقط آمار پلی‌بوک و ریسک ثابت را معیار تصمیم بگذار."
        : "Tomorrow before increasing size, use only playbook stats and fixed risk as the decision criteria.",
    });
  }

  if (Number.isFinite(disciplineScore) && disciplineScore > 0 && disciplineScore <= 5) {
    suggestions.push({
      id: "discipline-score",
      category: "discipline",
      priority: "medium",
      title: isFa ? "هدف فردا را کوچک و قابل اجرا کن" : "Make tomorrow's goal small and executable",
      detail: isFa ? "امتیاز نظم امروز پایین ثبت شده است." : "Today's discipline score was low.",
      action: isFa
        ? "فردا فقط روی یک رفتار تمرکز کن: ورود با تایید، رعایت SL، یا توقف بعد از حد ضرر."
        : "Tomorrow focus on one behavior only: confirmed entry, respected SL, or stopping at the daily limit.",
    });
  }

  if (!hasText(form.tomorrowPlan) && trades.length > 0) {
    suggestions.push({
      id: "write-tomorrow-plan",
      category: "planning",
      priority: "low",
      title: isFa ? "برنامه فردا را قبل از خواب کامل کن" : "Complete tomorrow's plan before you leave",
      detail: isFa ? "بخش برنامه فردا هنوز خالی است." : "The tomorrow plan field is still empty.",
      action: isFa
        ? "سه خط بنویس: نمادهای مجاز، ستاپ مجاز، و شرایطی که معامله را ممنوع می‌کند."
        : "Write three lines: allowed symbols, allowed setup, and conditions that forbid trading.",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "steady-routine",
      category: "planning",
      priority: "low",
      title: text.noSuggestionTitle,
      detail: text.noSuggestionDetail,
      action: text.noSuggestionAction,
    });
  }

  return suggestions.slice(0, 5);
}

function suggestionIcon(category: TomorrowSuggestion["category"]) {
  if (category === "risk") return ShieldAlert;
  if (category === "psychology") return Brain;
  if (category === "discipline") return ClipboardCheck;
  return Target;
}

function suggestionPriorityLabel(priority: TomorrowSuggestion["priority"], text: (typeof copy)[keyof typeof copy]) {
  if (priority === "high") return text.highPriority;
  if (priority === "medium") return text.mediumPriority;
  return text.lowPriority;
}

function formFromJournal(journal: DailyJournalRecord | null): JournalForm {
  if (!journal) {
    return emptyForm;
  }

  const nextForm = { ...emptyForm };

  for (const key of formFieldKeys) {
    const value = journal[key];

    if (typeof emptyForm[key] === "boolean") {
      nextForm[key] = Boolean(value) as never;
    } else {
      nextForm[key] = (typeof value === "number" ? String(value) : value ?? "") as never;
    }
  }

  return nextForm;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
      {label}
      {children}
    </label>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-xl border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
      <div className="text-xs font-medium uppercase text-slate-400">{label}</div>
      <div
        className={[
          "mt-2 text-xl font-semibold",
          tone === "profit" ? "text-emerald-300" : "",
          tone === "loss" ? "text-red-300" : "",
          tone === "blue" ? "text-blue-200" : "",
          tone === "amber" ? "text-amber-200" : "",
          tone === "neutral" ? "text-white" : "",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 bg-white accent-blue-600 dark:border-slate-700 dark:bg-slate-950"
      />
      {label}
    </label>
  );
}

export function DailyJournalClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const text = copy[language] || copy.fa;
  const [date, setDate] = useState(() => normalizeDate(searchParams?.get("date") || null));
  const [accountId, setAccountId] = useState(() => searchParams?.get("accountId") || "");
  const [form, setForm] = useState<JournalForm>(emptyForm);
  const [playbooks, setPlaybooks] = useState<PlaybookOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [stats, setStats] = useState<DailyJournalStats | null>(null);
  const [trades, setTrades] = useState<DailyJournalTrade[]>([]);
  const [requirements, setRequirements] = useState<DailyJournalRequirements | null>(null);
  const [showAllTrades, setShowAllTrades] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const [completingDay, setCompletingDay] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [dirty, setDirty] = useState(false);
  const latestSaveRef = useRef(0);

  const statusText = useMemo(() => {
    if (status === "loading") return text.loading;
    if (status === "saving") return text.saving;
    if (status === "error") return saveError || text.errorSaving;
    return "";
  }, [saveError, status, text]);
  const isFa = language === "fa";
  const tomorrowSuggestions = useMemo(
    () => buildTomorrowSuggestions({ form, stats, trades, isFa, text }),
    [form, isFa, stats, text, trades]
  );
  const hasActionableTomorrowSuggestions = tomorrowSuggestions.some(
    (suggestion) => suggestion.id !== "no-journal-evidence"
  );
  const tradeEvidence = useMemo(() => {
    const missingChecklistCount = trades.filter((trade) => trade.checklistCompletionPercent === null).length;
    const noStopLossCount = trades.filter(
      (trade) => trade.status !== "CANCELLED" && !isPositiveNumber(trade.stopLoss)
    ).length;
    const reviewedTradesCount = trades.filter(
      (trade) => trade.checklistCompletionPercent !== null || hasText(trade.mistake) || hasText(trade.emotion)
    ).length;
    const visibleTrades = showAllTrades ? trades : trades.slice(0, 6);

    return {
      missingChecklistCount,
      noStopLossCount,
      reviewedTradesCount,
      visibleTrades,
    };
  }, [showAllTrades, trades]);

  const updateUrl = useCallback(
    (nextDate: string, nextAccountId: string) => {
      const params = new URLSearchParams();
      params.set("date", nextDate);

      if (nextAccountId) {
        params.set("accountId", nextAccountId);
      }

      router.push(`/dashboard/daily-journal?${params.toString()}`);
    },
    [router]
  );

  const updateForm = useCallback(<K extends keyof JournalForm>(key: K, value: JournalForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }, []);

  const addSuggestionsToTomorrowPlan = useCallback(() => {
    const currentPlan = localizeTomorrowPlanActions(form.tomorrowPlan, language).trim();
    const suggestionText = tomorrowSuggestions
      .map((suggestion, index) => `${index + 1}. ${suggestion.action}`)
      .join("\n");
    const nextPlan = [currentPlan, suggestionText].filter(Boolean).join("\n\n");

    updateForm("tomorrowPlan", nextPlan);
  }, [form.tomorrowPlan, language, tomorrowSuggestions, updateForm]);

  const saveJournal = useCallback(
    async (nextForm: JournalForm) => {
      const saveId = Date.now();
      latestSaveRef.current = saveId;
      setStatus("saving");
      setSaveError("");

      try {
        const response = await fetch("/api/daily-journal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...nextForm, date }),
        });
        const data = (await response.json()) as { success: boolean; message?: string; errors?: string[] };

        if (!response.ok || !data.success) {
          throw new Error(data.errors?.join(", ") || data.message || "Failed to save daily journal");
        }

        if (latestSaveRef.current === saveId) {
          setStatus("saved");
          setDirty(false);
          toast.success(text.saved, { position: "bottom-right" });
        }
      } catch (error) {
        if (latestSaveRef.current === saveId) {
          setSaveError(error instanceof Error ? error.message : text.errorSaving);
          setStatus("error");
        }
      }
    },
    [date, text.errorSaving, text.saved]
  );

  const completeDay = useCallback(async () => {
    setCompletingDay(true);
    setSaveError("");

    try {
      await saveJournal(form);
      const response = await fetch("/api/daily-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, accountId }),
      });
      const data = (await response.json()) as {
        success: boolean;
        message?: string;
        missingRequirements?: string[];
        requirements?: DailyJournalRequirements;
      };

      if (!response.ok || !data.success) {
        if (data.requirements) {
          setRequirements(data.requirements);
        }

        throw new Error(
          data.message ||
            data.missingRequirements?.join(", ") ||
            text.completionBlocked
        );
      }

      if (data.requirements) {
        setRequirements(data.requirements);
      }

      toast.success(text.completed, { position: "bottom-right" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : text.completionBlocked);
    } finally {
      setCompletingDay(false);
    }
  }, [accountId, date, form, saveJournal, text.completed, text.completionBlocked]);

  useEffect(() => {
    const nextDate = normalizeDate(searchParams?.get("date") || null);
    const nextAccountId = searchParams?.get("accountId") || "";
    setDate(nextDate);
    setAccountId(nextAccountId);
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/trading-accounts", { cache: "no-store" });
        const data = (await response.json()) as { success: boolean; data?: AccountOption[] };

        if (!cancelled && data.success) {
          setAccounts(data.data || []);
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
        }
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadJournal() {
      setHydrated(false);
      setStatus("loading");

      const params = new URLSearchParams({ date });
      if (accountId) {
        params.set("accountId", accountId);
      }

      try {
        const response = await fetch(`/api/daily-journal?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          success: boolean;
          journal: DailyJournalRecord | null;
          stats: DailyJournalStats;
          trades: DailyJournalTrade[];
          playbooks: PlaybookOption[];
          requirements?: DailyJournalRequirements;
          message?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load daily journal");
        }

        setForm(formFromJournal(data.journal));
        setStats(data.stats || null);
        setTrades(data.trades || []);
        setRequirements(data.requirements || null);
        setShowAllTrades(false);
        setPlaybooks(data.playbooks || []);
        setSaveError("");
        setStatus("idle");
        setDirty(false);
        setHydrated(true);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("error");
          setHydrated(false);
        }
      }
    }

    loadJournal();

    return () => controller.abort();
  }, [accountId, date]);

  useEffect(() => {
    if (!hydrated || !dirty) {
      return;
    }

    setStatus("saving");
    const timeout = window.setTimeout(() => {
      saveJournal(form);
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [dirty, form, hydrated, saveJournal]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const localizedTomorrowPlan = localizeTomorrowPlanActions(form.tomorrowPlan, language);

    if (localizedTomorrowPlan === form.tomorrowPlan) {
      return;
    }

    setForm((current) =>
      current.tomorrowPlan === form.tomorrowPlan
        ? { ...current, tomorrowPlan: localizedTomorrowPlan }
        : current
    );
    setDirty(true);
  }, [form.tomorrowPlan, hydrated, language]);

  return (
    <div className="space-y-5">
      <TradingWorkflowStrip />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">{text.title}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {text.subtitle}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end">
          <Field label={text.date}>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                updateUrl(event.target.value, accountId);
              }}
              className={inputClass}
            />
          </Field>
          <Field label={text.account}>
            <select
              value={accountId}
              onChange={(event) => {
                setAccountId(event.target.value);
                updateUrl(date, event.target.value);
              }}
              className={inputClass}
            >
              <option value="">{text.allAccounts}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={() => updateUrl(adjacentDate(date, -1), accountId)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowRight className="h-4 w-4" />
            {text.previousDay}
          </button>
          <button
            type="button"
            onClick={() => updateUrl(todayKey(), accountId)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <CalendarDays className="h-4 w-4" />
            {text.today}
          </button>
          <button
            type="button"
            onClick={() => updateUrl(adjacentDate(date, 1), accountId)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-800 px-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            {text.nextDay}
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label={text.netPnl}
          value={formatMoney(stats?.netPnl)}
          tone={(stats?.netPnl || 0) > 0 ? "profit" : (stats?.netPnl || 0) < 0 ? "loss" : "neutral"}
        />
        <StatTile label={text.totalTrades} value={formatNumber(stats?.totalTrades, 0)} tone="blue" />
        <StatTile label={text.winRate} value={`${formatNumber(stats?.winRate, 1)}%`} tone="profit" />
        <StatTile label={text.averageRr} value={formatNumber(stats?.averageRR, 2)} tone="amber" />
        <StatTile label={text.bestTrade} value={stats?.bestTrade ? `${stats.bestTrade.symbol} ${formatMoney(stats.bestTrade.pnl)}` : formatMoney(stats?.bestTradePnl)} tone="profit" />
        <StatTile label={text.worstTrade} value={stats?.worstTrade ? `${stats.worstTrade.symbol} ${formatMoney(stats.worstTrade.pnl)}` : formatMoney(stats?.worstTradePnl)} tone="loss" />
        <StatTile label="Checklist Completion" value={`${formatNumber(stats?.checklistCompletionRate, 1)}%`} tone="blue" />
        <StatTile label="Repeated Mistake" value={stats?.mostRepeatedMistake || "-"} tone="amber" />
      </div>

      <Section title={text.tomorrowSuggestions}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm leading-6 text-slate-400">{text.tomorrowSuggestionsSubtitle}</p>
            <button
              type="button"
              onClick={addSuggestionsToTomorrowPlan}
              disabled={!hasActionableTomorrowSuggestions}
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold",
                hasActionableTomorrowSuggestions
                  ? "border-blue-500/30 text-blue-200 hover:bg-blue-500/10"
                  : "cursor-not-allowed border-slate-700 text-slate-500",
              ].join(" ")}
            >
              <Target className="h-4 w-4" />
              {text.addSuggestionsToPlan}
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {tomorrowSuggestions.map((suggestion) => {
              const Icon = suggestionIcon(suggestion.category);

              return (
                <article
                  key={suggestion.id}
                  className="rounded-lg border border-slate-800 bg-[#111827] p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-blue-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{suggestion.title}</h3>
                        <span
                          className={[
                            "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                            suggestion.priority === "high" ? "border-red-500/40 text-red-200" : "",
                            suggestion.priority === "medium" ? "border-amber-500/40 text-amber-200" : "",
                            suggestion.priority === "low" ? "border-emerald-500/40 text-emerald-200" : "",
                          ].join(" ")}
                        >
                          {suggestionPriorityLabel(suggestion.priority, text)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{suggestion.detail}</p>
                      <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-sm leading-6 text-slate-200">
                        {suggestion.action}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title={text.linkedTrades}>
        {trades.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-slate-400">{text.linkedTradesSubtitle}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label={text.totalTrades} value={formatNumber(trades.length, 0)} tone="blue" />
              <StatTile label={text.missingChecklist} value={formatNumber(tradeEvidence.missingChecklistCount, 0)} tone={tradeEvidence.missingChecklistCount > 0 ? "amber" : "neutral"} />
              <StatTile label={text.noStopLoss} value={formatNumber(tradeEvidence.noStopLossCount, 0)} tone={tradeEvidence.noStopLossCount > 0 ? "loss" : "neutral"} />
              <StatTile label={text.reviewedTrades} value={formatNumber(tradeEvidence.reviewedTradesCount, 0)} tone="profit" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-3">{text.time}</th>
                    <th className="px-3 py-3">{text.symbol}</th>
                    <th className="px-3 py-3">{text.pnl}</th>
                    <th className="px-3 py-3">{text.rr}</th>
                    <th className="px-3 py-3">{text.checklistColumn}</th>
                    <th className="px-3 py-3">{text.stopLossLabel}</th>
                    <th className="px-3 py-3">{text.mistakeColumn}</th>
                    <th className="px-3 py-3">{text.openReview}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tradeEvidence.visibleTrades.map((trade) => (
                    <tr key={trade.id} className="text-slate-200">
                      <td className="whitespace-nowrap px-3 py-3 text-slate-400">{formatTime(trade.openTime)}</td>
                      <td className="px-3 py-3 font-semibold text-white">{trade.symbol}</td>
                      <td className={["px-3 py-3 font-semibold", Number(trade.pnl || 0) > 0 ? "text-emerald-300" : "", Number(trade.pnl || 0) < 0 ? "text-red-300" : ""].join(" ")}>
                        {formatMoney(trade.pnl)}
                      </td>
                      <td className="px-3 py-3">{formatNumber(trade.rMultiple, 2)}</td>
                      <td className="px-3 py-3">
                        {trade.checklistCompletionPercent === null
                          ? text.missingLabel
                          : `${formatNumber(trade.checklistCompletionPercent, 1)}%`}
                      </td>
                      <td className={["px-3 py-3", isPositiveNumber(trade.stopLoss) ? "text-emerald-300" : "text-red-300"].join(" ")}>
                        {isPositiveNumber(trade.stopLoss) ? text.setLabel : text.missingLabel}
                      </td>
                      <td className="px-3 py-3 text-slate-300">{trade.mistake || "-"}</td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/journal/${trade.id}`}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-blue-500/30 px-3 text-xs font-semibold text-blue-200 hover:bg-blue-500/10"
                        >
                          {text.openReview}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {trades.length > tradeEvidence.visibleTrades.length || showAllTrades ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                <span className="text-sm text-slate-400">
                  {text.showingTrades} {formatNumber(tradeEvidence.visibleTrades.length, 0)} {text.ofTrades} {formatNumber(trades.length, 0)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllTrades((current) => !current)}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
                >
                  {showAllTrades ? text.showLessTrades : text.showAllTrades}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-800 bg-[#111827] px-4 py-10 text-center text-sm text-slate-400">
            {text.noTrades}
          </div>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Section id="daily-plan" title={text.dailyPlan}>
          <div className="grid gap-3">
            <Field label={text.marketBias}>
              <select value={form.marketBias} onChange={(event) => updateForm("marketBias", event.target.value)} className={inputClass}>
                <option value="">{text.selectBias}</option>
                {biasValues.map((item, index) => (
                  <option key={item} value={item}>{text.biasOptions[index]}</option>
                ))}
              </select>
            </Field>
            <Field label={text.todayFocus}>
              <input value={form.todayFocus} onChange={(event) => updateForm("todayFocus", event.target.value)} className={inputClass} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={text.maxTradesAllowed}>
                <input type="number" min="0" value={form.maxTradesAllowed} onChange={(event) => updateForm("maxTradesAllowed", event.target.value)} className={inputClass} />
              </Field>
              <Field label={text.maxDailyLoss}>
                <input type="number" step="any" value={form.maxDailyLoss} onChange={(event) => updateForm("maxDailyLoss", event.target.value)} className={inputClass} />
              </Field>
            </div>
            <Field label={text.mainPlaybook}>
              <select value={form.mainPlaybookId} onChange={(event) => updateForm("mainPlaybookId", event.target.value)} className={inputClass}>
                <option value="">{text.noPlaybookSelected}</option>
                {playbooks.map((playbook) => (
                  <option key={playbook.id} value={playbook.id}>{playbook.name}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title={text.dailyPsychology}>
          <div className="grid gap-3">
            <Field label={text.mood}>
              <select value={form.mood} onChange={(event) => updateForm("mood", event.target.value)} className={inputClass}>
                <option value="">{text.selectMood}</option>
                {copy.en.moodOptions.map((item, index) => (
                  <option key={item} value={item}>{text.moodOptions[index]}</option>
                ))}
              </select>
            </Field>
            <Field label={text.sleepQuality}>
              <select value={form.sleepQuality} onChange={(event) => updateForm("sleepQuality", event.target.value)} className={inputClass}>
                <option value="">{text.selectSleepQuality}</option>
                {copy.en.sleepOptions.map((item, index) => (
                  <option key={item} value={item}>{text.sleepOptions[index]}</option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Field label={text.focusLevel}>
                <input type="number" min="1" max="10" value={form.focusLevel} onChange={(event) => updateForm("focusLevel", event.target.value)} className={inputClass} />
              </Field>
              <Field label={text.confidenceLevel}>
                <input type="number" min="1" max="10" value={form.confidenceLevel} onChange={(event) => updateForm("confidenceLevel", event.target.value)} className={inputClass} />
              </Field>
              <Field label={text.stressLevel}>
                <input type="number" min="1" max="10" value={form.stressLevel} onChange={(event) => updateForm("stressLevel", event.target.value)} className={inputClass} />
              </Field>
              <Field label={text.disciplineScore}>
                <input type="number" min="1" max="10" value={form.disciplineScore} onChange={(event) => updateForm("disciplineScore", event.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title={text.dailyChecklist}>
          <div className="grid gap-3">
            <CheckboxField label={text.respectedRisk} checked={form.respectedRisk} onChange={(checked) => updateForm("respectedRisk", checked)} />
            <CheckboxField label={text.waitedForConfirmation} checked={form.waitedForConfirmation} onChange={(checked) => updateForm("waitedForConfirmation", checked)} />
            <CheckboxField label={text.avoidedRevengeTrading} checked={form.avoidedRevengeTrading} onChange={(checked) => updateForm("avoidedRevengeTrading", checked)} />
            <CheckboxField label={text.followedPlaybook} checked={form.followedPlaybook} onChange={(checked) => updateForm("followedPlaybook", checked)} />
            <CheckboxField label={text.stoppedAfterDailyLimit} checked={form.stoppedAfterDailyLimit} onChange={(checked) => updateForm("stoppedAfterDailyLimit", checked)} />
            <CheckboxField label={text.avoidedOvertrading} checked={form.avoidedOvertrading} onChange={(checked) => updateForm("avoidedOvertrading", checked)} />
            <Field label={text.checklistNotes}>
              <textarea rows={3} value={form.checklistNotes} onChange={(event) => updateForm("checklistNotes", event.target.value)} className={textareaClass} />
            </Field>
          </div>
        </Section>
      </div>

      <Section title={text.endOfDayReview}>
        <div className="grid gap-3 lg:grid-cols-2">
          <Field label={text.whatWentWell}>
            <textarea rows={4} value={form.whatWentWell} onChange={(event) => updateForm("whatWentWell", event.target.value)} className={textareaClass} />
          </Field>
          <Field label={text.mistakesSummary}>
            <textarea rows={4} value={form.mistakesSummary} onChange={(event) => updateForm("mistakesSummary", event.target.value)} className={textareaClass} />
          </Field>
          <Field label={text.followedPlanReview}>
            <textarea rows={4} value={form.followedPlanReview} onChange={(event) => updateForm("followedPlanReview", event.target.value)} className={textareaClass} />
          </Field>
          <Field label={text.improvementPlan}>
            <textarea rows={4} value={form.improvementPlan} onChange={(event) => updateForm("improvementPlan", event.target.value)} className={textareaClass} />
          </Field>
          <Field label={text.tomorrowPlan}>
            <textarea rows={4} value={form.tomorrowPlan} onChange={(event) => updateForm("tomorrowPlan", event.target.value)} className={textareaClass} />
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-5">
        {requirements && !requirements.readyToComplete ? (
          <div className="mr-auto w-full rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100 lg:w-auto lg:max-w-2xl">
            <div className="font-semibold">{requirements.message || text.completionBlocked}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {requirements.missingItems.map((item) => (
                <Link
                  key={`${item.code}-${item.href}`}
                  href={item.href}
                  className="inline-flex h-8 items-center rounded-lg border border-amber-400/30 px-3 text-xs font-semibold text-amber-50 hover:bg-amber-400/10"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        {statusText ? (
          <span className="text-sm font-medium text-slate-400" aria-live="polite">
            {statusText}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => saveJournal(form)}
          disabled={status === "saving" || status === "loading"}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {text.save}
        </button>
        <button
          type="button"
          onClick={completeDay}
          disabled={status === "saving" || status === "loading" || completingDay || !requirements?.readyToComplete}
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          {completingDay ? text.saving : text.completeDay}
        </button>
      </div>
    </div>
  );
}
