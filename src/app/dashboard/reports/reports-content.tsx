"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  Target,
} from "lucide-react";
import { ReportActions } from "@/app/dashboard/reports/report-actions";
import type {
  JournalReport,
  JournalReportFilterOptions,
  JournalReportFilters,
  LocalizedReportText,
} from "@/lib/reports/journal-report";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "profit" | "loss" | "blue" | "amber";
type Language = "en" | "fa";
type ReportType =
  | "monthly-performance"
  | "mistake-psychology"
  | "playbook-performance"
  | "prop-firm-summary"
  | "raw-trade-export"
  | "custom";
type ReportFilterModel = {
  filters: JournalReportFilters;
  filterOptions: JournalReportFilterOptions;
};

const COPY = {
  en: {
    badge: "Trading Performance Report",
    title: "Journal Reports",
    subtitle:
      "Customer-ready summary generated from journal trades, analytics, playbooks, checklists, and daily notes.",
    filters: {
      period: "Period",
      today: "Today",
      thisWeek: "This week",
      thisMonth: "This month",
      thisYear: "This year",
      all: "All",
      custom: "Custom",
      from: "From",
      to: "To",
      account: "Account",
      allAccounts: "All accounts",
      playbook: "Playbook",
      allPlaybooks: "All playbooks",
      symbol: "Symbol",
      side: "Side",
      buy: "Buy",
      sell: "Sell",
      strategy: "Strategy",
      strategyPlaceholder: "Setup",
      session: "Session",
      result: "Result",
      win: "Win",
      loss: "Loss",
      breakeven: "Breakeven",
      aiReview: "AI Review",
      humanReview: "Human Review",
      done: "Done",
      missing: "Missing",
      screenshots: "Screenshots",
      hasScreenshots: "Has screenshots",
      noScreenshots: "No screenshots",
      source: "Source",
      manual: "Manual",
      mt5: "MT5 Import",
      ctrader: "cTrader Import",
      minAi: "Min AI",
      maxAi: "Max AI",
      generate: "Generate Report",
      reset: "Reset",
    },
    stats: {
      netPnl: "Net PnL",
      winRate: "Win Rate",
      profitFactor: "Profit Factor",
      expectancy: "Expectancy",
      totalTrades: "Total Trades",
      closedOpen: "Closed / Open",
      averageRr: "Average RR",
    },
    executive: {
      title: "Executive Summary",
      generated: "Generated",
      for: "for",
      strengths: "Strengths",
      risks: "Risks",
      actionPlan: "Action Plan",
    },
    symbolPanel: {
      title: "Performance by Symbol",
      subtitle: "Top symbols ranked by net PnL.",
      empty: "No closed trades found for this report period.",
      symbol: "Symbol",
      trades: "Trades",
      winRate: "Win Rate",
      netPnl: "Net PnL",
      weight: "Weight",
    },
    behavior: {
      title: "Behavior and Setup",
      subtitle: "Most repeated tags from the closed-trade sample.",
      mistakes: "Mistakes",
      setups: "Setups",
      noMistakes: "No mistake tags yet.",
      noSetups: "No setup tags yet.",
    },
    trades: {
      title: "Recent Trades",
      subtitle: "Latest trades included in the report export.",
      empty: "No trades found for this report period.",
      date: "Date",
      symbol: "Symbol",
      side: "Side",
      pnl: "PnL",
      playbook: "Playbook",
      planCompliance: "Plan Compliance",
      reviewStatus: "Review Status",
      plan: "plan",
    },
    notes: {
      title: "Daily Journal Notes",
      subtitle: "Most recent notes from the selected period.",
      empty: "No daily journal notes found for this period.",
      discipline: "Discipline",
      worked: "Worked",
      mistakes: "Mistakes",
      plan: "Plan",
    },
    preTrade: {
      title: "Pre-Trade Readiness",
      subtitle: "Saved psychology, playbook, and entry checks from the dashboard.",
      empty: "No pre-trade checks saved for this period.",
      decision: "Decision",
      readiness: "Readiness",
      mindset: "Mindset",
      playbook: "Playbook",
      checklist: "Checklist",
      reason: "Reason",
      news: "High-impact news",
    },
  },
  fa: {
    badge: "گزارش عملکرد معاملاتی",
    title: "گزارش ژورنال",
    subtitle:
      "خلاصه آماده ارائه بر اساس معاملات ژورنال، آنالیتیکس، پلی‌بوک‌ها، چک‌لیست‌ها و یادداشت‌های روزانه.",
    filters: {
      period: "بازه زمانی",
      today: "امروز",
      thisWeek: "این هفته",
      thisMonth: "این ماه",
      thisYear: "امسال",
      all: "همه",
      custom: "دلخواه",
      from: "از تاریخ",
      to: "تا تاریخ",
      account: "حساب",
      allAccounts: "همه حساب‌ها",
      playbook: "پلی‌بوک",
      allPlaybooks: "همه پلی‌بوک‌ها",
      symbol: "نماد",
      side: "جهت",
      buy: "خرید",
      sell: "فروش",
      strategy: "استراتژی",
      strategyPlaceholder: "نام ستاپ",
      generate: "ساخت گزارش",
      reset: "پاک کردن",
    },
    stats: {
      netPnl: "سود/زیان خالص",
      winRate: "نرخ برد",
      profitFactor: "فاکتور سود",
      expectancy: "امید ریاضی",
      totalTrades: "کل معاملات",
      closedOpen: "بسته / باز",
      averageRr: "میانگین RR",
    },
    executive: {
      title: "خلاصه مدیریتی",
      generated: "تولید شده در",
      for: "برای",
      strengths: "نقاط قوت",
      risks: "ریسک‌ها",
      actionPlan: "برنامه اقدام",
    },
    symbolPanel: {
      title: "عملکرد بر اساس نماد",
      subtitle: "نمادهای برتر بر اساس سود/زیان خالص.",
      empty: "برای این بازه معامله بسته‌شده‌ای پیدا نشد.",
      symbol: "نماد",
      trades: "تعداد معاملات",
      winRate: "نرخ برد",
      netPnl: "سود/زیان خالص",
      weight: "وزن",
    },
    behavior: {
      title: "رفتار و ستاپ",
      subtitle: "تگ‌های پرتکرار در معاملات بسته‌شده.",
      mistakes: "اشتباهات",
      setups: "ستاپ‌ها",
      noMistakes: "هنوز تگ اشتباه ثبت نشده است.",
      noSetups: "هنوز ستاپی ثبت نشده است.",
    },
    trades: {
      title: "معاملات اخیر",
      subtitle: "آخرین معاملاتی که در خروجی گزارش آمده‌اند.",
      empty: "برای این بازه معامله‌ای پیدا نشد.",
      date: "تاریخ",
      symbol: "نماد",
      side: "جهت",
      pnl: "سود/زیان",
      playbook: "پلی بوک",
      planCompliance: "پایبندی به پلن",
      reviewStatus: "وضعیت بررسی",
      plan: "پایبندی به پلن",
    },
    notes: {
      title: "یادداشت‌های ژورنال روزانه",
      subtitle: "آخرین یادداشت‌های ثبت‌شده در بازه انتخابی.",
      empty: "برای این بازه یادداشت ژورنال روزانه‌ای پیدا نشد.",
      discipline: "نظم",
      worked: "نقاط مثبت",
      mistakes: "اشتباهات",
      plan: "برنامه",
    },
    preTrade: {
      title: "آمادگی قبل از معامله",
      subtitle: "چک روانشناسی، پلی‌بوک و چک‌لیست ورود ذخیره‌شده از داشبورد.",
      empty: "برای این بازه چک قبل از معامله‌ای ثبت نشده است.",
      decision: "تصمیم",
      readiness: "آمادگی",
      mindset: "روانشناسی",
      playbook: "پلی‌بوک",
      checklist: "چک‌لیست",
      reason: "دلیل",
      news: "خبر پراثر",
    },
  },
} as const;

const REPORT_UI = {
  en: {
    filters: {
      session: "Session",
      result: "Result",
      win: "Win",
      loss: "Loss",
      breakeven: "Breakeven",
      aiReview: "AI Review",
      humanReview: "Human Review",
      done: "Done",
      missing: "Missing",
      screenshots: "Screenshots",
      hasScreenshots: "Has screenshots",
      noScreenshots: "No screenshots",
      source: "Source",
      manual: "Manual",
      mt5: "MT5 Import",
      ctrader: "cTrader Import",
      minAi: "Min AI",
      maxAi: "Max AI",
    },
    reportFiles: {
      title: "Trade Report Files",
      subtitle: "Each trade keeps its own AI, strategy, checklist, journal, and screenshot reports.",
      empty: "No trades found for this report period.",
      download: "Download",
      openTrade: "Open Trade",
      noSetup: "No setup label",
      data: "Data",
      strategy: "Strategy",
      checklists: "Checklists",
      journal: "Journal",
      screenshots: "Screenshots",
      missing: "missing",
      saved: "saved",
      execution: "Execution",
      entry: "Entry",
      exit: "Exit",
      tradeReports: "Trade Reports",
      plan: "Plan",
      media: "Media",
      noTradeNote: "No trade note saved.",
      details: "Journal, strategy, and media details",
      strategyChecklists: "Strategy and Checklists",
      rating: "Rating",
      exitReason: "Exit reason",
      entryScreenshot: "Entry screenshot",
      exitScreenshot: "Exit screenshot",
      totalScreenshots: "Total screenshots",
      none: "No items saved.",
    },
    performance: {
      sessionTitle: "Session Performance",
      sessionSubtitle: "Timing results grouped by actual trading session.",
      strategyTitle: "Strategy / Playbook Performance",
      strategySubtitle: "Only real selected strategies and playbooks are shown here.",
      noStrategy: "No strategy or playbook performance yet. Assign a strategy during trade review.",
      noSession: "No session performance yet.",
      strategyHeader: "Strategy / Playbook",
      sessionHeader: "Session",
      profitFactor: "Profit Factor",
      averagePnl: "Average PnL",
    },
    table: {
      ai: "AI",
      human: "Human",
    },
    status: {
      OPEN: "Open",
      CLOSED: "Closed",
      TEST: "Test",
      Done: "Done",
      Missing: "Missing",
      "Fully Reviewed": "Fully Reviewed",
      "AI Reviewed / Human Missing": "AI Reviewed / Human Missing",
      "AI Missing / Human Reviewed": "AI Missing / Human Reviewed",
      "Not Reviewed": "Not Reviewed",
      Good: "Good",
      Partial: "Partial",
      Low: "Low",
    },
  },
  fa: {
    filters: {
      session: "سشن",
      result: "نتیجه",
      win: "برد",
      loss: "باخت",
      breakeven: "سر به سر",
      aiReview: "بررسی AI",
      humanReview: "بررسی دستی",
      done: "انجام شده",
      missing: "ثبت نشده",
      screenshots: "اسکرین‌شات",
      hasScreenshots: "دارای اسکرین‌شات",
      noScreenshots: "بدون اسکرین‌شات",
      source: "منبع",
      manual: "دستی",
      mt5: "ورود از MT5",
      ctrader: "ورود از cTrader",
      minAi: "حداقل امتیاز AI",
      maxAi: "حداکثر امتیاز AI",
    },
    reportFiles: {
      title: "فایل‌های گزارش هر معامله",
      subtitle: "هر معامله گزارش‌های مربوط به خودش را جداگانه نگه می‌دارد.",
      empty: "برای این بازه معامله‌ای پیدا نشد.",
      download: "دانلود",
      openTrade: "باز کردن معامله",
      noSetup: "بدون برچسب ستاپ",
      data: "کیفیت داده",
      strategy: "استراتژی",
      checklists: "چک‌لیست‌ها",
      journal: "ژورنال",
      screenshots: "اسکرین‌شات‌ها",
      missing: "ثبت نشده",
      saved: "ثبت شده",
      execution: "اجرای معامله",
      entry: "ورود",
      exit: "خروج",
      tradeReports: "گزارش‌های معامله",
      plan: "پلن",
      media: "رسانه",
      noTradeNote: "یادداشت معامله ثبت نشده.",
      details: "جزئیات ژورنال، استراتژی و رسانه",
      strategyChecklists: "استراتژی و چک‌لیست‌ها",
      rating: "امتیاز",
      exitReason: "دلیل خروج",
      entryScreenshot: "اسکرین‌شات ورود",
      exitScreenshot: "اسکرین‌شات خروج",
      totalScreenshots: "کل اسکرین‌شات‌ها",
      none: "موردی ثبت نشده.",
    },
    performance: {
      sessionTitle: "عملکرد بر اساس سشن",
      sessionSubtitle: "نتایج زمانی بر اساس سشن واقعی معاملات.",
      strategyTitle: "عملکرد استراتژی / پلی‌بوک",
      strategySubtitle: "فقط استراتژی‌ها و پلی‌بوک‌های واقعی اینجا نمایش داده می‌شوند.",
      noStrategy: "هنوز عملکرد استراتژی یا پلی‌بوک ثبت نشده است.",
      noSession: "هنوز عملکرد سشن ثبت نشده است.",
      strategyHeader: "استراتژی / پلی‌بوک",
      sessionHeader: "سشن",
      profitFactor: "فاکتور سود",
      averagePnl: "میانگین سود/زیان",
    },
    table: {
      ai: "AI",
      human: "دستی",
    },
    status: {
      OPEN: "باز",
      CLOSED: "بسته",
      TEST: "تست",
      Done: "انجام شده",
      Missing: "ثبت نشده",
      "Fully Reviewed": "کاملا بررسی شده",
      "AI Reviewed / Human Missing": "AI انجام شده / دستی ثبت نشده",
      "AI Missing / Human Reviewed": "AI ثبت نشده / دستی انجام شده",
      "Not Reviewed": "بررسی نشده",
      Good: "خوب",
      Partial: "نسبی",
      Low: "ضعیف",
    },
  },
} as const;

const REPORT_TYPES: Array<{ id: ReportType; en: string; fa: string; descriptionEn: string; descriptionFa: string }> = [
  {
    id: "monthly-performance",
    en: "Monthly Performance Review",
    fa: "بررسی عملکرد ماهانه",
    descriptionEn: "Review the month by P&L, win rate, symbols, sessions, and execution notes.",
    descriptionFa: "بررسی ماه بر اساس سود/زیان، نرخ برد، نمادها، سشن‌ها و یادداشت‌های اجرا.",
  },
  {
    id: "mistake-psychology",
    en: "Mistake and Psychology Review",
    fa: "بررسی اشتباه و روانشناسی",
    descriptionEn: "Focus on repeated mistakes, review coverage, behavior tags, and psychology patterns.",
    descriptionFa: "تمرکز روی اشتباهات تکراری، پوشش بررسی، تگ‌های رفتاری و الگوهای روانشناسی.",
  },
  {
    id: "playbook-performance",
    en: "Playbook Performance",
    fa: "عملکرد Playbook",
    descriptionEn: "Compare Playbook and strategy performance with compliance context.",
    descriptionFa: "مقایسه عملکرد Playbook و استراتژی همراه با زمینه پایبندی.",
  },
  {
    id: "prop-firm-summary",
    en: "Prop Firm Summary",
    fa: "خلاصه پراپ فرم",
    descriptionEn: "Summarize account results, closed/open trades, drawdown context, and exportable records.",
    descriptionFa: "خلاصه نتایج حساب، معاملات بسته/باز، زمینه افت سرمایه و رکوردهای قابل خروجی.",
  },
  {
    id: "raw-trade-export",
    en: "Raw Trade Export",
    fa: "خروجی خام معاملات",
    descriptionEn: "Prepare filtered trade rows for CSV export, PDF, or print.",
    descriptionFa: "آماده‌سازی ردیف‌های فیلترشده معاملات برای CSV، PDF یا چاپ.",
  },
  {
    id: "custom",
    en: "Custom Report",
    fa: "گزارش سفارشی",
    descriptionEn: "Build a report with the full filter set available in Advanced filters.",
    descriptionFa: "ساخت گزارش با مجموعه کامل فیلترها در بخش فیلترهای پیشرفته.",
  },
];

function reportTypeLabel(type: ReportType, language: Language) {
  const reportType = REPORT_TYPES.find((item) => item.id === type);
  return reportType ? reportType[language] : type;
}

function reportTypeDescription(type: ReportType, language: Language) {
  const reportType = REPORT_TYPES.find((item) => item.id === type);
  return reportType ? (language === "fa" ? reportType.descriptionFa : reportType.descriptionEn) : "";
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

function formatPercent(value: number | null | undefined) {
  return `${formatNumber(value, 1)}%`;
}

function formatAiScore(value: number | null | undefined) {
  return value === null || value === undefined ? "-" : `${value}/100`;
}

function localizedDirection(direction: string, copy: typeof COPY[Language]) {
  return direction === "BUY" ? copy.filters.buy : direction === "SELL" ? copy.filters.sell : direction;
}

function localizedStatus(value: string | null | undefined, language: Language) {
  if (!value) {
    return "-";
  }

  const statuses = REPORT_UI[language].status as Record<string, string>;
  return statuses[value] || value;
}

function formatDate(value: string | null | undefined, language: Language) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(language === "fa" ? "fa-IR-u-ca-gregory" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toneClass(tone: Tone) {
  if (tone === "profit") {
    return "text-emerald-300";
  }

  if (tone === "loss") {
    return "text-red-300";
  }

  if (tone === "blue") {
    return "text-blue-200";
  }

  if (tone === "amber") {
    return "text-amber-200";
  }

  return "text-white";
}

function pnlTone(value: number | null | undefined): Tone {
  const number = Number(value || 0);
  return number > 0 ? "profit" : number < 0 ? "loss" : "neutral";
}

function Panel({
  title,
  subtitle,
  children,
  icon: Icon,
  tourId,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  icon?: LucideIcon;
  tourId?: string;
}) {
  return (
    <section
      data-dashboard-tour={tourId}
      className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm print:border-slate-200 print:bg-white print:text-slate-950"
    >
      <div className="mb-4 flex items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600/15 text-blue-300 print:bg-slate-100 print:text-slate-700">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold text-white print:text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-400 print:text-slate-600">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 print:border-slate-200 print:bg-slate-50">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 print:text-slate-500">{label}</div>
      <div className={cn("mt-2 text-2xl font-semibold", toneClass(tone), "print:text-slate-950")}>{value}</div>
    </div>
  );
}

function ProgressBar({ value, tone = "blue" }: { value: number; tone?: "blue" | "profit" | "loss" }) {
  const color =
    tone === "profit" ? "bg-emerald-400" : tone === "loss" ? "bg-red-400" : "bg-blue-400";

  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800 print:bg-slate-200">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 p-4 text-sm text-slate-400 print:border-slate-300 print:text-slate-600">
      {label}
    </div>
  );
}

export function ReportsIntentSelection() {
  const { language } = useLanguage();
  const isFa = language === "fa";

  return (
    <div
      dir={isFa ? "rtl" : "ltr"}
      className={cn("space-y-5", isFa ? "text-right" : "text-left")}
    >
      <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
          <FileText className="h-3.5 w-3.5" />
          {isFa ? "Reports" : "Reports"}
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          {isFa ? "چه گزارشی می‌خواهید؟" : "What report do you want?"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {isFa ? "ابتدا نوع گزارش را انتخاب کنید. پس از انتخاب، فقط فیلترهای مرتبط نمایش داده می‌شوند و گزارش تا زمان اعمال فیلترها ساخته نمی‌شود." : "Choose a report type first. After selection, only relevant filters are shown and no report is generated until filters are applied."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {REPORT_TYPES.map((reportType) => (
          <Link
            key={reportType.id}
            href={`/dashboard/reports?reportType=${reportType.id}`}
            className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 transition hover:border-blue-500/60 hover:bg-slate-900"
          >
            <div className="text-base font-semibold text-white">{language === "fa" ? reportType.fa : reportType.en}</div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {language === "fa" ? reportType.descriptionFa : reportType.descriptionEn}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ReportsSetupContent({
  selectedReportType,
  filters,
  filterOptions,
}: {
  selectedReportType: ReportType;
  filters: JournalReportFilters;
  filterOptions: JournalReportFilterOptions;
}) {
  const { language } = useLanguage();
  const copy = COPY[language];
  const isFa = language === "fa";
  const reportModel: ReportFilterModel = { filters, filterOptions };

  return (
    <div
      dir={isFa ? "rtl" : "ltr"}
      className={cn("w-full min-w-0 space-y-5", isFa ? "text-right" : "text-left")}
    >
      <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200">
          <FileText className="h-3.5 w-3.5" />
          Reports
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          {reportTypeLabel(selectedReportType, language)}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          {isFa ? "فیلترها را بررسی کنید و فقط زمانی که آماده هستید Apply filters را بزنید. هنوز گزارشی ساخته یا ذخیره نشده است." : "Review the filters and choose Apply filters when ready. No report has been generated or saved yet."}
        </p>
      </div>

      <ReportFilters
        report={reportModel}
        copy={copy}
        language={language}
        selectedReportType={selectedReportType}
      />
    </div>
  );
}

function ReportFilters({
  report,
  copy,
  language,
  selectedReportType,
  hasGeneratedReport = false,
}: {
  report: ReportFilterModel;
  copy: typeof COPY[Language];
  language: Language;
  selectedReportType: ReportType;
  hasGeneratedReport?: boolean;
}) {
  const [applying, setApplying] = useState(false);
  const filters = report.filters;
  const filterText = copy.filters as Record<string, string>;
  const ui = REPORT_UI[language].filters;
  const isFa = language === "fa";
  const selectedAccount =
    report.filterOptions.accounts.find((account) => account.id === filters.accountId)?.name ||
    copy.filters.allAccounts;
  const rangeLabel =
    filters.dateRange === "custom"
      ? `${filters.dateFrom || "?"} - ${filters.dateTo || "?"}`
      : filterText[filters.dateRange] || filters.dateRange;

  return (
    <form
      method="get"
      id="reports-filters"
      data-dashboard-tour="reports-filters"
      onSubmit={() => {
        setApplying(true);
      }}
      className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 print:hidden"
    >
      <input type="hidden" name="reportType" value={selectedReportType} />
      <input type="hidden" name="applied" value="1" />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-white">{reportTypeLabel(selectedReportType, language)}</div>
          <p className="mt-1 text-xs leading-5 text-slate-400">{reportTypeDescription(selectedReportType, language)}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
            {isFa ? `حساب فعال: ${selectedAccount} · بازه: ${rangeLabel}` : `Active account: ${selectedAccount} · Date range: ${rangeLabel}`}
          </div>
          <Link href="/dashboard/reports" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-blue-500 bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-500">
            <FileText className="h-4 w-4" />
            {isFa ? "انتخاب نوع دیگر" : "Select another report"}
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400 md:col-span-1">
        {copy.filters.period}
        <select name="dateRange" defaultValue={filters.dateRange} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="today">{copy.filters.today}</option>
          <option value="thisWeek">{copy.filters.thisWeek}</option>
          <option value="thisMonth">{copy.filters.thisMonth}</option>
          <option value="thisYear">{copy.filters.thisYear}</option>
          <option value="all">{copy.filters.all}</option>
          <option value="custom">{copy.filters.custom}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.from}
        <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.to}
        <input type="date" name="dateTo" defaultValue={filters.dateTo} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.account}
        <select name="accountId" defaultValue={filters.accountId} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.allAccounts}</option>
          {report.filterOptions.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      </div>

      <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/30 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">
          {isFa ? "فیلترهای پیشرفته" : "Advanced filters"}
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.symbol}
        <input name="symbol" defaultValue={filters.symbol} placeholder="EURUSD" className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm uppercase text-slate-100 outline-none focus:border-blue-500" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.side}
        <select name="direction" defaultValue={filters.direction} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.all}</option>
          <option value="BUY">{copy.filters.buy}</option>
          <option value="SELL">{copy.filters.sell}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.playbook}
        <select name="playbookId" defaultValue={filters.playbookId} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.allPlaybooks}</option>
          {report.filterOptions.playbooks.map((playbook) => (
            <option key={playbook.id} value={playbook.id}>
              {playbook.name}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {copy.filters.strategy}
        <input name="strategy" defaultValue={filters.strategy} list="report-strategy-options" placeholder={copy.filters.strategyPlaceholder} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
        <datalist id="report-strategy-options">
          {report.filterOptions.strategies.map((strategy) => (
            <option key={strategy} value={strategy} />
          ))}
        </datalist>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.session || ui.session}
        <input name="session" defaultValue={filters.session} placeholder="London" className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.result || ui.result}
        <select name="result" defaultValue={filters.result} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.all}</option>
          <option value="WIN">{filterText.win || ui.win}</option>
          <option value="LOSS">{filterText.loss || ui.loss}</option>
          <option value="BREAKEVEN">{filterText.breakeven || ui.breakeven}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.aiReview || ui.aiReview}
        <select name="aiReview" defaultValue={filters.aiReview} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.all}</option>
          <option value="DONE">{filterText.done || ui.done}</option>
          <option value="MISSING">{filterText.missing || ui.missing}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.humanReview || ui.humanReview}
        <select name="humanReview" defaultValue={filters.humanReview} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.all}</option>
          <option value="DONE">{filterText.done || ui.done}</option>
          <option value="MISSING">{filterText.missing || ui.missing}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.screenshots || ui.screenshots}
        <select name="screenshots" defaultValue={filters.screenshots} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.all}</option>
          <option value="HAS">{filterText.hasScreenshots || ui.hasScreenshots}</option>
          <option value="NONE">{filterText.noScreenshots || ui.noScreenshots}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.source || ui.source}
        <select name="source" defaultValue={filters.source} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm normal-case text-slate-100 outline-none focus:border-blue-500">
          <option value="">{copy.filters.all}</option>
          <option value="MANUAL">{filterText.manual || ui.manual}</option>
          <option value="MT5">{filterText.mt5 || ui.mt5}</option>
          <option value="CTRADER">{filterText.ctrader || ui.ctrader}</option>
        </select>
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.minAi || ui.minAi}
        <input name="minAiScore" type="number" min="0" max="100" defaultValue={filters.minAiScore} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </label>
      <label className="space-y-1 text-xs font-semibold uppercase text-slate-400">
        {filterText.maxAi || ui.maxAi}
        <input name="maxAiScore" type="number" min="0" max="100" defaultValue={filters.maxAiScore} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-blue-500" />
      </label>
        </div>
      </details>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500">
          {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          {applying ? (isFa ? "در حال اعمال..." : "Applying...") : (isFa ? "اعمال فیلترها" : "Apply filters")}
        </button>
        <Link href={`/dashboard/reports?reportType=${selectedReportType}`} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800">
          <RotateCcw className="h-4 w-4" />
          {isFa ? "بازنشانی فیلترها" : "Reset filters"}
        </Link>
        {hasGeneratedReport ? (
          <span className="text-xs text-slate-500">
            {isFa
              ? "نتایج فعلی تا زمان اعمال فیلترهای جدید باقی می‌مانند."
              : "Current results stay visible until new filters are applied."}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function InsightList({
  items,
  tone,
  language,
}: {
  items: LocalizedReportText[];
  tone: "profit" | "loss" | "blue";
  language: Language;
}) {
  const Icon = tone === "loss" ? AlertTriangle : tone === "profit" ? CheckCircle2 : Target;

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.en} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-3 print:border-slate-200 print:bg-slate-50">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", toneClass(tone))} />
          <p className="text-sm text-slate-300 print:text-slate-700">{item[language]}</p>
        </div>
      ))}
    </div>
  );
}

function TopTable({ report, copy }: { report: JournalReport; copy: typeof COPY[Language] }) {
  const rows = report.analytics.bySymbol.slice(0, 6);

  if (rows.length === 0) {
    return <EmptyLine label={copy.symbolPanel.empty} />;
  }

  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.netPnl)), 1);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-sm print:divide-slate-200">
        <thead>
          <tr className="text-start text-xs uppercase text-slate-500">
            <th className="py-2 pe-4">{copy.symbolPanel.symbol}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.trades}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.winRate}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.netPnl}</th>
            <th className="py-2">{copy.symbolPanel.weight}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 print:divide-slate-200">
          {rows.map((row) => (
            <tr key={row.symbol} className="text-slate-300 print:text-slate-700">
              <td className="py-3 pe-4 font-semibold text-white print:text-slate-950">{row.symbol}</td>
              <td className="py-3 pe-4">{row.totalTrades}</td>
              <td className="py-3 pe-4">{formatPercent(row.winRate)}</td>
              <td className={cn("py-3 pe-4 font-semibold", toneClass(pnlTone(row.netPnl)), "print:text-slate-950")}>
                {formatMoney(row.netPnl)}
              </td>
              <td className="min-w-40 py-3">
                <ProgressBar value={(Math.abs(row.netPnl) / maxAbs) * 100} tone={row.netPnl < 0 ? "loss" : "profit"} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlaybookPerformanceTable({
  report,
  copy,
  language,
}: {
  report: JournalReport;
  copy: typeof COPY[Language];
  language: Language;
}) {
  const rows = report.analytics.byStrategy.slice(0, 8);
  const ui = REPORT_UI[language].performance;

  if (rows.length === 0) {
    return <EmptyLine label={ui.noStrategy} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-sm print:divide-slate-200">
        <thead>
          <tr className="text-start text-xs uppercase text-slate-500">
            <th className="py-2 pe-4">{ui.strategyHeader}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.trades}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.winRate}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.netPnl}</th>
            <th className="py-2">{ui.profitFactor}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 print:divide-slate-200">
          {rows.map((row) => (
            <tr key={row.strategy} className="text-slate-300 print:text-slate-700">
              <td className="py-3 pe-4 font-semibold text-white print:text-slate-950">{row.strategy}</td>
              <td className="py-3 pe-4">{row.totalTrades}</td>
              <td className="py-3 pe-4">{formatPercent(row.winRate)}</td>
              <td className={cn("py-3 pe-4 font-semibold", toneClass(pnlTone(row.netPnl)), "print:text-slate-950")}>
                {formatMoney(row.netPnl)}
              </td>
              <td className="py-3">{formatNumber(row.profitFactor, 2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionPerformanceTable({
  report,
  copy,
  language,
}: {
  report: JournalReport;
  copy: typeof COPY[Language];
  language: Language;
}) {
  const rows = report.analytics.bySession.filter((row) => row.totalTrades > 0);
  const ui = REPORT_UI[language].performance;

  if (rows.length === 0) {
    return <EmptyLine label={ui.noSession} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-800 text-sm print:divide-slate-200">
        <thead>
          <tr className="text-start text-xs uppercase text-slate-500">
            <th className="py-2 pe-4">{ui.sessionHeader}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.trades}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.winRate}</th>
            <th className="py-2 pe-4">{copy.symbolPanel.netPnl}</th>
            <th className="py-2">{ui.averagePnl}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 print:divide-slate-200">
          {rows.map((row) => (
            <tr key={row.session} className="text-slate-300 print:text-slate-700">
              <td className="py-3 pe-4 font-semibold text-white print:text-slate-950">{row.session}</td>
              <td className="py-3 pe-4">{row.totalTrades}</td>
              <td className="py-3 pe-4">{formatPercent(row.winRate)}</td>
              <td className={cn("py-3 pe-4 font-semibold", toneClass(pnlTone(row.netPnl)), "print:text-slate-950")}>
                {formatMoney(row.netPnl)}
              </td>
              <td className="py-3">{formatMoney(row.averagePnl)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function planComplianceLabel(trade: JournalReport["recentTrades"][number]) {
  if (!trade.followedPlan || trade.followedPlan === "NOT_REVIEWED" || trade.compliancePercent === null) {
    return "-";
  }

  return formatPercent(trade.compliancePercent);
}

type RecentTrade = JournalReport["recentTrades"][number];

function tradeSetupLabel(trade: RecentTrade) {
  return trade.strategyName || trade.setup || "-";
}

function groupRecentTradesByDate(trades: RecentTrade[], language: Language) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      trades: RecentTrade[];
      totalPnl: number;
      rrValues: number[];
    }
  >();

  trades.forEach((trade) => {
    const key = trade.openedAt?.slice(0, 10) || "undated";
    const group = groups.get(key) || {
      key,
      label: formatDate(trade.openedAt, language),
      trades: [],
      totalPnl: 0,
      rrValues: [],
    };

    group.trades.push(trade);
    group.totalPnl += Number(trade.pnl || 0);

    if (typeof trade.rr === "number" && Number.isFinite(trade.rr)) {
      group.rrValues.push(trade.rr);
    }

    groups.set(key, group);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    averageRr:
      group.rrValues.length > 0
        ? group.rrValues.reduce((sum, value) => sum + value, 0) / group.rrValues.length
        : null,
  }));
}

function groupRecentTradesBySymbol(trades: RecentTrade[]) {
  const groups = new Map<
    string,
    {
      symbol: string;
      trades: RecentTrade[];
      totalPnl: number;
      rrValues: number[];
    }
  >();

  trades.forEach((trade) => {
    const group = groups.get(trade.symbol) || {
      symbol: trade.symbol,
      trades: [],
      totalPnl: 0,
      rrValues: [],
    };

    group.trades.push(trade);
    group.totalPnl += Number(trade.pnl || 0);

    if (typeof trade.rr === "number" && Number.isFinite(trade.rr)) {
      group.rrValues.push(trade.rr);
    }

    groups.set(trade.symbol, group);
  });

  return Array.from(groups.values()).map((group) => ({
    ...group,
    averageRr:
      group.rrValues.length > 0
        ? group.rrValues.reduce((sum, value) => sum + value, 0) / group.rrValues.length
        : null,
  }));
}

function TradeMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 rounded-md border border-slate-800 bg-slate-950/45 px-3 py-2 print:border-slate-200 print:bg-slate-50">
      <div className="text-[11px] font-semibold uppercase text-slate-500 print:text-slate-500">{label}</div>
      <div className={cn("mt-1 truncate text-sm font-semibold", toneClass(tone), "print:text-slate-950")}>{value}</div>
    </div>
  );
}

function RecentTradesTable({
  report,
  copy,
  language,
}: {
  report: JournalReport;
  copy: typeof COPY[Language];
  language: Language;
}) {
  const rows = report.recentTrades.slice(0, 12);

  if (rows.length === 0) {
    return <EmptyLine label={copy.trades.empty} />;
  }

  const ui = REPORT_UI[language].table;
  const groupedRows = groupRecentTradesByDate(rows, language);

  return (
    <div className="space-y-4">
      {groupedRows.map((group, groupIndex) => {
        const symbolGroups = groupRecentTradesBySymbol(group.trades);

        return (
          <details
            key={group.key}
            open={groupIndex === 0}
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/25 print:border-slate-200 print:bg-white [&[open]>summary_.recent-date-chevron]:rotate-180"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 border-b border-slate-800 bg-[#111827] p-3 marker:hidden print:border-slate-200 print:bg-slate-50 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-200 print:bg-slate-100 print:text-slate-700">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-slate-500 print:text-slate-500">{copy.trades.date}</div>
                  <h3 className="mt-1 text-base font-semibold text-white print:text-slate-950">{group.label}</h3>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                <TradeMetric label={copy.symbolPanel.trades} value={formatNumber(group.trades.length, 0)} tone="blue" />
                <TradeMetric label={copy.trades.pnl} value={formatMoney(group.totalPnl)} tone={pnlTone(group.totalPnl)} />
                <TradeMetric label="RR" value={formatNumber(group.averageRr, 2)} tone="amber" />
              </div>
              <ChevronDown className="recent-date-chevron hidden h-4 w-4 shrink-0 text-slate-400 transition-transform print:hidden sm:block" />
            </summary>

            <div className="space-y-3 p-3">
              {symbolGroups.map((symbolGroup) => (
                <details
                  key={symbolGroup.symbol}
                  className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/45 print:border-slate-200 print:bg-slate-50 [&[open]>summary_.recent-symbol-chevron]:rotate-180"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-3 p-3 marker:hidden sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
                    <div className="flex min-w-0 items-center gap-3">
                      <ChevronDown className="recent-symbol-chevron h-4 w-4 shrink-0 text-slate-400 transition-transform print:hidden" />
                      <div>
                        <h4 className="text-base font-semibold text-white print:text-slate-950">{symbolGroup.symbol}</h4>
                        <p className="mt-1 text-xs text-slate-400 print:text-slate-600">
                          {formatNumber(symbolGroup.trades.length, 0)} {copy.symbolPanel.trades}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
                      <TradeMetric label={copy.symbolPanel.trades} value={formatNumber(symbolGroup.trades.length, 0)} tone="blue" />
                      <TradeMetric label={copy.trades.pnl} value={formatMoney(symbolGroup.totalPnl)} tone={pnlTone(symbolGroup.totalPnl)} />
                      <TradeMetric label="RR" value={formatNumber(symbolGroup.averageRr, 2)} tone="amber" />
                    </div>
                  </summary>

                  <div className="grid gap-3 border-t border-slate-800 p-3 lg:grid-cols-2 print:border-slate-200 print:grid-cols-1">
                    {symbolGroup.trades.map((trade) => (
                      <article key={trade.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 print:border-slate-200 print:bg-white">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md border border-blue-500/25 bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-200 print:border-slate-300 print:bg-white print:text-slate-700">
                                {localizedDirection(trade.direction, copy)}
                              </span>
                              <span className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-300 print:border-slate-300 print:bg-white print:text-slate-700">
                                RR {formatNumber(trade.rr, 2)}
                              </span>
                            </div>
                            <p className="mt-2 truncate text-sm text-slate-400 print:text-slate-600">
                              {copy.trades.playbook}: <span className="text-slate-200 print:text-slate-800">{tradeSetupLabel(trade)}</span>
                            </p>
                          </div>

                          <div className={cn("shrink-0 text-lg font-semibold", toneClass(pnlTone(trade.pnl)), "print:text-slate-950")}>
                            {formatMoney(trade.pnl)}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          <TradeMetric label={copy.trades.planCompliance} value={planComplianceLabel(trade)} />
                          <TradeMetric label={ui.ai} value={formatAiScore(trade.aiReviewScore)} tone={trade.aiReviewScore === null ? "neutral" : "blue"} />
                          <TradeMetric label={ui.human} value={localizedStatus(trade.humanReviewLabel, language)} />
                          <TradeMetric label={copy.trades.reviewStatus} value={localizedStatus(trade.combinedReviewStatus, language)} />
                        </div>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function DailyNotes({
  report,
  copy,
  language,
}: {
  report: JournalReport;
  copy: typeof COPY[Language];
  language: Language;
}) {
  if (report.dailyNotes.length === 0) {
    return <EmptyLine label={copy.notes.empty} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {report.dailyNotes.slice(0, 4).map((note) => (
        <article key={note.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 print:border-slate-200 print:bg-slate-50">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white print:text-slate-950">{formatDate(note.date, language)}</h3>
            <span className="text-xs text-slate-400 print:text-slate-500">
              {copy.notes.discipline} {formatNumber(note.disciplineScore, 0)}
            </span>
          </div>
          <div className="mt-3 space-y-2 text-sm text-slate-300 print:text-slate-700">
            {note.whatWentWell && <p><span className="font-semibold">{copy.notes.worked}:</span> {note.whatWentWell}</p>}
            {note.mistakesSummary && <p><span className="font-semibold">{copy.notes.mistakes}:</span> {note.mistakesSummary}</p>}
            {note.improvementPlan && <p><span className="font-semibold">{copy.notes.plan}:</span> {note.improvementPlan}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}

function PreTradeChecks({
  report,
  copy,
  language,
}: {
  report: JournalReport;
  copy: typeof COPY[Language];
  language: Language;
}) {
  if (report.preTradeChecks.length === 0) {
    return <EmptyLine label={copy.preTrade.empty} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {report.preTradeChecks.slice(0, 6).map((check) => (
        <article key={check.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 print:border-slate-200 print:bg-slate-50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-white print:text-slate-950">{formatDate(check.date, language)}</h3>
              <p className="mt-1 text-xs text-slate-400 print:text-slate-500">
                {copy.preTrade.decision}: {check.decisionLabel || check.decision}
              </p>
            </div>
            <span className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", check.readinessScore >= 80 ? "border-emerald-500/30 text-emerald-300 print:text-emerald-700" : check.readinessScore >= 60 ? "border-amber-500/30 text-amber-300 print:text-amber-700" : "border-red-500/30 text-red-300 print:text-red-700")}>
              {copy.preTrade.readiness} {formatNumber(check.readinessScore, 0)}%
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-slate-300 print:text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <span>{copy.preTrade.mindset}</span>
              <strong>{check.mindsetCompleted}/{check.mindsetTotal}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{copy.preTrade.playbook}</span>
              <strong className="text-right">{check.selectedPlaybook || check.scenario}</strong>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{copy.preTrade.checklist}</span>
              <strong>{check.checklistCompleted}/{check.checklistTotal}</strong>
            </div>
            {check.highImpactEventCount > 0 ? (
              <div className="flex items-center justify-between gap-3 text-red-300 print:text-red-700">
                <span>{copy.preTrade.news}</span>
                <strong>{check.highImpactEventCount}</strong>
              </div>
            ) : null}
            {check.mainReason ? (
              <p className="pt-2 text-xs leading-5 text-slate-400 print:text-slate-600">
                <span className="font-semibold">{copy.preTrade.reason}:</span> {check.mainReason}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

function FrequencyList({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: JournalReport["aiSummary"]["topStrengths"];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 print:border-slate-200 print:bg-slate-50">
      <h3 className="text-sm font-semibold text-white print:text-slate-950">{title}</h3>
      {rows.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3 text-sm text-slate-300 print:text-slate-700">
              <span>{row.label}</span>
              <span className="shrink-0 rounded-lg border border-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-200 print:border-slate-300 print:text-slate-700">
                {row.count}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 text-sm text-slate-500 print:text-slate-600">{emptyLabel}</div>
      )}
    </div>
  );
}

function AITradeHighlights({
  title,
  rows,
  language,
}: {
  title: string;
  rows: JournalReport["aiSummary"]["strongestTrades"];
  language: Language;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-white print:text-slate-950">{title}</h3>
      <div className="space-y-3">
        {rows.map((trade) => (
          <a
            key={trade.id}
            href={`/journal/${trade.id}`}
            className="block rounded-lg border border-slate-800 bg-slate-950/50 p-3 transition hover:border-slate-600 print:border-slate-200 print:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white print:text-slate-950">
                {trade.symbol} {trade.direction}
              </div>
              <div className={cn("text-sm font-semibold", toneClass(trade.score >= 70 ? "profit" : trade.score >= 50 ? "amber" : "loss"), "print:text-slate-950")}>
                {formatAiScore(trade.score)}
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 print:text-slate-600">
              <span>{formatDate(trade.openedAt, language)}</span>
              <span>{formatMoney(trade.pnl)}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-slate-300 print:text-slate-700">{trade.summary}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

function AIReviewSummaryPanel({
  report,
  language,
}: {
  report: JournalReport;
  language: Language;
}) {
  const ai = report.aiSummary;
  const copy =
    language === "fa"
      ? {
          title: "خلاصه هوش مصنوعی",
          subtitle: "جمع‌بندی از بررسی‌های AI ذخیره‌شده برای معاملات همین گزارش.",
          reviewed: "بررسی‌شده",
          coverage: "پوشش AI",
          averageScore: "میانگین امتیاز AI",
          confidence: "میانگین اطمینان",
          empty: "هنوز برای معاملات این بازه بررسی AI ذخیره نشده است.",
          strengths: "نقاط قوت پرتکرار",
          weaknesses: "ضعف‌های پرتکرار",
          mistakes: "اشتباهات پرتکرار",
          actions: "اقدام‌های پیشنهادی",
          strongest: "بهترین معاملات از نظر AI",
          weakest: "ضعیف‌ترین معاملات از نظر AI",
          noItems: "موردی ثبت نشده است.",
        }
      : {
          title: "AI Review Summary",
          subtitle: "Summary from saved AI reviews for the trades in this report.",
          reviewed: "Reviewed",
          coverage: "AI Coverage",
          averageScore: "Average AI Score",
          confidence: "Average Confidence",
          empty: "No saved AI reviews found for this report period.",
          strengths: "Repeated Strengths",
          weaknesses: "Repeated Weaknesses",
          mistakes: "Repeated Mistakes",
          actions: "Suggested Actions",
          strongest: "Strongest AI-Rated Trades",
          weakest: "Weakest AI-Rated Trades",
          noItems: "No items recorded.",
        };

  return (
    <Panel title={copy.title} subtitle={copy.subtitle} icon={Brain}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={copy.reviewed} value={`${ai.reviewedTrades} / ${report.summary.totalTrades}`} tone="blue" />
        <StatCard label={copy.coverage} value={formatPercent(ai.reviewCoveragePercent)} tone="blue" />
        <StatCard label={copy.averageScore} value={formatAiScore(ai.averageScore)} tone={ai.averageScore === null ? "neutral" : ai.averageScore >= 70 ? "profit" : ai.averageScore >= 50 ? "amber" : "loss"} />
        <StatCard label={copy.confidence} value={ai.averageConfidence === null ? "N/A" : formatPercent(ai.averageConfidence * 100)} tone="amber" />
      </div>

      {ai.reviewedTrades === 0 ? (
        <div className="mt-4">
          <EmptyLine label={copy.empty} />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <FrequencyList title={copy.strengths} rows={ai.topStrengths} emptyLabel={copy.noItems} />
            <FrequencyList title={copy.weaknesses} rows={ai.topWeaknesses} emptyLabel={copy.noItems} />
            <FrequencyList title={copy.mistakes} rows={ai.topMistakes} emptyLabel={copy.noItems} />
            <FrequencyList title={copy.actions} rows={ai.improvementPlan} emptyLabel={copy.noItems} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <AITradeHighlights title={copy.strongest} rows={ai.strongestTrades} language={language} />
            <AITradeHighlights title={copy.weakest} rows={ai.weakestTrades} language={language} />
          </div>
        </div>
      )}
    </Panel>
  );
}

function listBlock(label: string, items: string[]) {
  return items.length > 0
    ? [`${label}:`, ...items.map((item) => `- ${item}`)]
    : [`${label}: -`];
}

function buildTradeReportText(tradeReport: JournalReport["tradeReports"][number]) {
  const { trade, aiReview, strategyReview, checklists, journal, screenshots, dataQuality } = tradeReport;
  const lines = [
    `Trade Report - ${trade.symbol} ${trade.direction}`,
    `Trade ID: ${trade.id}`,
    `Account: ${trade.accountName}${trade.accountNumber ? ` / ${trade.accountNumber}` : ""}${trade.broker ? ` / ${trade.broker}` : ""}`,
    `Source: ${trade.source}`,
    `Status: ${trade.status}`,
    `Opened At: ${trade.openedAt || "-"}`,
    `Closed At: ${trade.closedAt || "-"}`,
    `PnL: ${trade.pnl}`,
    `RR: ${trade.rr ?? "-"}`,
    `Setup: ${trade.setup || "-"}`,
    `Session: ${trade.session || "-"}`,
    `Emotion: ${trade.emotion || "-"}`,
    `Mistake: ${trade.mistake || "-"}`,
    `Tags: ${trade.tags.join(", ") || "-"}`,
    "",
    "AI Review",
    aiReview ? `Score: ${aiReview.score}/100` : "No AI review saved.",
    `Data Quality: ${dataQuality.level}`,
  ];

  if (aiReview) {
    lines.push(
      `Confidence: ${aiReview.confidenceLabel} (${Math.round(aiReview.confidence * 100)}%)`,
      `Confidence Reason: ${aiReview.confidenceReason}`,
      `Summary: ${aiReview.fullSummary}`,
      `Risk Management: ${aiReview.breakdown.riskManagement}/30`,
      `Execution Quality: ${aiReview.breakdown.executionQuality}/30`,
      `Plan Compliance: ${aiReview.breakdown.planCompliance}/20`,
      `Documentation Quality: ${aiReview.breakdown.documentationQuality}/20`,
      ...listBlock("Strengths", aiReview.strengths),
      ...listBlock("Weaknesses", aiReview.weaknesses),
      ...listBlock("Mistakes", aiReview.mistakes),
      `Risk Review: ${aiReview.riskReview}`,
      `Psychology Review: ${aiReview.psychologyReview}`,
      `Playbook Review: ${aiReview.playbookReview}`,
      ...listBlock("Improvement Plan", aiReview.improvementPlan),
      `AI Tags: ${aiReview.tags.join(", ") || "-"}`
    );
  }

  if (dataQuality.missing.length > 0) {
    lines.push(
      "",
      "Data Quality Notes",
      ...listBlock("Missing", dataQuality.missing),
      `Reason: ${dataQuality.reason}`
    );
  }

  lines.push(
    "",
    "Strategy Review",
    strategyReview
      ? `Strategy: ${strategyReview.strategyName || "-"}`
      : "No strategy review saved."
  );

  if (strategyReview) {
    lines.push(
      `Followed Plan: ${strategyReview.followedPlan}`,
      `Compliance: ${strategyReview.compliancePercent}%`,
      `Required Compliance: ${strategyReview.requiredCompliancePercent}%`,
      `Rules: ${strategyReview.followedRules}/${strategyReview.totalRules} followed, ${strategyReview.violatedRules} violated`,
      `Notes: ${strategyReview.notes || "-"}`
    );

    if (strategyReview.ruleReviews.length > 0) {
      lines.push("Rule Reviews:");
      strategyReview.ruleReviews.forEach((rule) => {
        lines.push(
          `- ${rule.title} [${rule.status}]${rule.required ? " required" : ""}${rule.note ? ` - ${rule.note}` : ""}`
        );
      });
    }
  }

  lines.push("", "Checklists");
  if (checklists.length === 0) {
    lines.push("No checklists saved.");
  } else {
    checklists.forEach((checklist) => {
      lines.push(
        `${checklist.title}: ${checklist.completionPercent}% (${checklist.completedCount}/${checklist.totalCount})`
      );
      checklist.answers.forEach((answer) => {
        lines.push(
          `- ${answer.checked ? "Done" : "Open"}${answer.required ? " / Required" : ""}: ${answer.title}${answer.note ? ` - ${answer.note}` : ""}`
        );
      });
    });
  }

  lines.push("", "Journal");
  if (!journal) {
    lines.push("No journal metadata saved.");
  } else {
    lines.push(
      `Rating: ${journal.rating ?? "-"}`,
      `Exit Reason: ${journal.exitReason || "-"}`,
      `Psychology Status: ${journal.psychologyStatus || "-"}`,
      `Trade Note: ${journal.tradeNote || "-"}`,
      `Daily Journal: ${journal.dailyJournal || "-"}`,
      `Mistakes: ${journal.mistakes.join(", ") || "-"}`,
      `Setups: ${journal.setups.join(", ") || "-"}`,
      `Emotions: ${journal.emotions.join(", ") || "-"}`,
      `Custom Tags: ${journal.customTags.join(", ") || "-"}`
    );
  }

  lines.push("", "Screenshots");
  if (screenshots.length === 0) {
    lines.push("No screenshots saved.");
  } else {
    screenshots.forEach((screenshot) => {
      lines.push(`- ${screenshot.type}: ${screenshot.url}`);
    });
  }

  return lines.join("\n");
}

function reportFileName(tradeReport: JournalReport["tradeReports"][number]) {
  const { trade } = tradeReport;
  const date = trade.openedAt?.slice(0, 10) || "undated";
  return `${date}-${trade.symbol}-${trade.direction}-${trade.id.slice(0, 8)}.txt`;
}

function tradeReportDateKey(tradeReport: JournalReport["tradeReports"][number]) {
  return tradeReport.trade.openedAt?.slice(0, 10) || "undated";
}

function tradeReportCountLabel(count: number, language: Language) {
  if (language === "fa") {
    return `${count} گزارش`;
  }

  return `${count} ${count === 1 ? "report" : "reports"}`;
}

function groupTradeReportsByDate(
  tradeReports: JournalReport["tradeReports"],
  language: Language
) {
  const groups = new Map<
    string,
    {
      key: string;
      label: string;
      reports: JournalReport["tradeReports"];
      totalPnl: number;
    }
  >();

  tradeReports.forEach((tradeReport) => {
    const key = tradeReportDateKey(tradeReport);
    const group = groups.get(key) || {
      key,
      label: key === "undated" ? (language === "fa" ? "بدون تاریخ" : "Undated") : formatDate(tradeReport.trade.openedAt, language),
      reports: [],
      totalPnl: 0,
    };

    group.reports.push(tradeReport);
    group.totalPnl += Number(tradeReport.trade.pnl || 0);
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

function ReportBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold leading-5 text-slate-200 print:border-slate-300 print:bg-white print:text-slate-700">
      {children}
    </span>
  );
}

function ReportMetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5 print:border-slate-200 print:bg-slate-50">
      <div className="truncate text-[11px] font-semibold uppercase leading-5 text-slate-500 print:text-slate-500">
        {label}
      </div>
      <div className={cn("mt-1 truncate text-sm font-semibold leading-6", toneClass(tone), "print:text-slate-950")}>
        {value}
      </div>
    </div>
  );
}

function ReportInfoPanel({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: ReactNode; tone?: Tone }>;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 text-sm text-slate-300 print:border-slate-200 print:bg-slate-50 print:text-slate-700">
      <div className="font-semibold text-white print:text-slate-950">{title}</div>
      <dl className="mt-3 divide-y divide-slate-800 print:divide-slate-200">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-3 py-2 first:pt-0 last:pb-0">
            <dt className="min-w-0 truncate text-slate-500">{row.label}</dt>
            <dd className={cn("min-w-0 text-end font-medium", row.tone ? toneClass(row.tone) : "text-slate-200", "print:text-slate-950")}>
              <span className="break-words">{row.value}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function ReportListBlock({
  title,
  items,
  limit = 4,
}: {
  title: string;
  items: string[];
  limit?: number;
}) {
  const visibleItems = items.slice(0, limit);

  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-500 print:text-slate-500">{title}</div>
      {visibleItems.length > 0 ? (
        <ul className="mt-2 space-y-2 text-sm text-slate-300 print:text-slate-700">
          {visibleItems.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-sm text-slate-500 print:text-slate-600">No items saved.</div>
      )}
      {items.length > visibleItems.length && (
        <div className="mt-2 text-xs text-slate-500 print:text-slate-500">
          +{items.length - visibleItems.length} more
        </div>
      )}
    </div>
  );
}

function TradeReportFilesPanel({
  report,
  language,
}: {
  report: JournalReport;
  language: Language;
}) {
  const copy = COPY[language];
  const ui = REPORT_UI[language].reportFiles;
  const groupedTradeReports = groupTradeReportsByDate(report.tradeReports, language);

  if (report.tradeReports.length === 0) {
    return (
      <Panel title={ui.title} subtitle={ui.subtitle} icon={FileText}>
        <EmptyLine label={ui.empty} />
      </Panel>
    );
  }

  return (
    <Panel title={ui.title} subtitle={ui.subtitle} icon={FileText}>
      <div className="space-y-3">
        {groupedTradeReports.map((group, groupIndex) => (
          <details
            key={group.key}
            open={groupIndex === 0}
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/30 print:border-slate-200 print:bg-white [&[open]>summary_.date-chevron]:rotate-180"
          >
            <summary className="flex cursor-pointer list-none flex-col gap-3 bg-[#111827] p-4 text-white marker:hidden print:bg-slate-50 print:text-slate-950 sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-200 print:bg-slate-100 print:text-slate-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold">{group.label}</h3>
                  <p className="mt-1 text-xs text-slate-400 print:text-slate-600">
                    {tradeReportCountLabel(group.reports.length, language)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn("text-sm font-semibold", toneClass(pnlTone(group.totalPnl)), "print:text-slate-950")}>
                  {formatMoney(group.totalPnl)}
                </div>
                <ChevronDown className="date-chevron h-4 w-4 text-slate-400 transition-transform print:hidden" />
              </div>
            </summary>

            <div className="space-y-4 border-t border-slate-800 p-3 print:border-slate-200 sm:p-4">
              {group.reports.map((tradeReport) => {
                const { trade, aiReview, strategyReview, checklists, journal, screenshots } = tradeReport;
                const text = buildTradeReportText(tradeReport);
                const fileHref = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
                const dataQualityTone: Tone =
                  tradeReport.dataQuality.level === "Good"
                    ? "profit"
                    : tradeReport.dataQuality.level === "Partial"
                      ? "amber"
                      : "loss";

                return (
                  <article
                    key={trade.id}
                    className="overflow-hidden rounded-lg border border-slate-800 bg-[#0B1220] shadow-sm print:border-slate-200 print:bg-white"
                  >
                    <div className="grid gap-4 border-b border-slate-800 bg-[#111827] p-4 print:border-slate-200 print:bg-slate-50 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="min-w-0 text-lg font-semibold leading-7 text-white print:text-slate-950">
                            <span className="break-words">{trade.symbol} {localizedDirection(trade.direction, copy)}</span>
                          </h3>
                          <span className={cn("inline-flex min-h-7 items-center rounded-md px-2.5 py-1 text-xs font-semibold leading-5", trade.status === "CLOSED" ? "bg-emerald-500/10 text-emerald-200" : "bg-blue-500/10 text-blue-200", "print:bg-white print:text-slate-700")}>
                            {localizedStatus(trade.status, language)}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-2 text-xs text-slate-400 print:text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
                          <span className="min-w-0 truncate">{formatDate(trade.openedAt, language)}</span>
                          <span className="min-w-0 truncate">{trade.accountNumber || trade.accountName}</span>
                          <span className="min-w-0 truncate">RR {formatNumber(trade.rr, 2)}</span>
                          <span className="min-w-0 truncate">{trade.setup || trade.session || ui.noSetup}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <div className={cn("min-w-28 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-end text-base font-semibold", toneClass(pnlTone(trade.pnl)), "print:border-slate-200 print:bg-white print:text-slate-950")}>
                          {formatMoney(trade.pnl)}
                        </div>
                        <a
                          href={fileHref}
                          download={reportFileName(tradeReport)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-blue-500/30 px-3 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/10 print:hidden"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {ui.download}
                        </a>
                        <a
                          href={`/journal/${trade.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-700 px-3 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 print:hidden"
                        >
                          {ui.openTrade}
                        </a>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                        <ReportMetricTile label="AI" value={aiReview ? formatAiScore(aiReview.score) : ui.missing} tone={aiReview ? (aiReview.score >= 70 ? "profit" : aiReview.score >= 50 ? "amber" : "loss") : "neutral"} />
                        <ReportMetricTile label={ui.data} value={localizedStatus(tradeReport.dataQuality.level, language)} tone={dataQualityTone} />
                        <ReportMetricTile label={ui.strategy} value={strategyReview ? `${strategyReview.compliancePercent}%` : ui.missing} tone={strategyReview ? "blue" : "neutral"} />
                        <ReportMetricTile label={ui.checklists} value={checklists.length} tone={checklists.length > 0 ? "blue" : "neutral"} />
                        <ReportMetricTile label={ui.journal} value={journal ? ui.saved : ui.missing} tone={journal ? "profit" : "neutral"} />
                        <ReportMetricTile label={ui.screenshots} value={screenshots.length} tone={screenshots.length > 0 ? "blue" : "neutral"} />
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.95fr)]">
                        {aiReview ? (
                          <section className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4 text-sm text-slate-300 print:border-slate-200 print:bg-slate-50 print:text-slate-700">
                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(140px,auto)]">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white print:text-slate-950">
                                  <Brain className="h-4 w-4 text-violet-300" />
                                  AI Analysis
                                </div>
                                <p className="mt-2 leading-6 text-slate-300 print:text-slate-700">{aiReview.summary}</p>
                                <div className="mt-2 text-xs leading-5 text-slate-400 print:text-slate-500">
                                  Confidence: {aiReview.confidenceLabel}. {aiReview.confidenceReason}
                                </div>
                              </div>
                              <div className="rounded-lg border border-violet-500/20 bg-slate-950/60 px-4 py-3 text-end print:border-slate-200 print:bg-white">
                                <div className={cn("text-2xl font-semibold leading-8", toneClass(aiReview.score >= 70 ? "profit" : aiReview.score >= 50 ? "amber" : "loss"), "print:text-slate-950")}>
                                  {formatAiScore(aiReview.score)}
                                </div>
                                <div className="mt-1 text-xs text-slate-400 print:text-slate-500">
                                  {formatPercent(aiReview.confidence * 100)} confidence
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <ReportBadge>Risk {aiReview.breakdown.riskManagement}/30</ReportBadge>
                              <ReportBadge>Execution {aiReview.breakdown.executionQuality}/30</ReportBadge>
                              <ReportBadge>Plan {aiReview.breakdown.planCompliance}/20</ReportBadge>
                              <ReportBadge>Docs {aiReview.breakdown.documentationQuality}/20</ReportBadge>
                            </div>

                            {tradeReport.dataQuality.missing.length > 0 && (
                              <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100 print:border-slate-200 print:bg-white print:text-slate-700">
                                Data quality: {tradeReport.dataQuality.reason}
                              </div>
                            )}

                            <details className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 print:hidden">
                              <summary className="cursor-pointer text-sm font-semibold text-white print:text-slate-950">
                                Full AI review
                              </summary>
                              <p className="mt-3 leading-6 text-slate-300">{aiReview.fullSummary}</p>
                              <div className="mt-4 grid gap-4 md:grid-cols-3">
                                <ReportListBlock title="Strengths" items={aiReview.strengths} />
                                <ReportListBlock title="Weaknesses" items={aiReview.weaknesses} />
                                <ReportListBlock title="Mistakes" items={aiReview.mistakes} />
                              </div>
                              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                <div>
                                  <div className="text-xs font-semibold uppercase text-slate-400 print:text-slate-500">Risk Review</div>
                                  <p className="mt-2 leading-6">{aiReview.riskReview}</p>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold uppercase text-slate-400 print:text-slate-500">Psychology Review</div>
                                  <p className="mt-2 leading-6">{aiReview.psychologyReview}</p>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold uppercase text-slate-400 print:text-slate-500">Playbook Review</div>
                                  <p className="mt-2 leading-6">{aiReview.playbookReview}</p>
                                </div>
                              </div>
                              <div className="mt-4 border-t border-violet-500/10 pt-4">
                                <ReportListBlock title="Improvement Plan" items={aiReview.improvementPlan} />
                              </div>
                            </details>
                            {aiReview.tags.length > 0 && (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {aiReview.tags.map((tag) => (
                                  <ReportBadge key={tag}>{tag}</ReportBadge>
                                ))}
                              </div>
                            )}
                          </section>
                        ) : (
                          <section className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm leading-6 text-slate-500 print:border-slate-200 print:bg-slate-50 print:text-slate-600">
                            No AI analysis saved for this trade.
                            {tradeReport.dataQuality.missing.length > 0 && (
                              <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-100 print:border-slate-200 print:bg-white print:text-slate-700">
                                Data quality: {tradeReport.dataQuality.reason}
                              </div>
                            )}
                          </section>
                        )}

                        <aside className="grid content-start gap-3 md:grid-cols-2 xl:grid-cols-1">
                          <ReportInfoPanel
                            title={ui.execution}
                            rows={[
                              { label: ui.entry, value: trade.openedAt ? formatDate(trade.openedAt, language) : "-" },
                              { label: ui.exit, value: trade.closedAt ? formatDate(trade.closedAt, language) : "-" },
                              { label: "PnL", value: formatMoney(trade.pnl), tone: pnlTone(trade.pnl) },
                              { label: "RR", value: formatNumber(trade.rr, 2) },
                            ]}
                          />
                          <ReportInfoPanel
                            title={ui.tradeReports}
                            rows={[
                              { label: ui.strategy, value: strategyReview?.strategyName || trade.strategyName || "-" },
                              { label: ui.plan, value: strategyReview?.followedPlan || trade.followedPlan || "-" },
                              {
                                label: ui.checklists,
                                value: checklists.length > 0 ? checklists.map((item) => `${item.title} ${item.completionPercent}%`).join("; ") : "-",
                              },
                              { label: ui.journal, value: journal?.tradeNote || trade.notes || ui.noTradeNote },
                              { label: ui.media, value: screenshots.length },
                            ]}
                          />
                        </aside>
                      </div>

                      <details className="mt-4 rounded-lg border border-slate-800 bg-[#0F172A] p-4 text-sm text-slate-300 print:border-slate-200 print:bg-white print:text-slate-700">
                        <summary className="cursor-pointer font-semibold text-white print:text-slate-950">
                          {ui.details}
                        </summary>
                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                          <ReportInfoPanel
                            title={ui.strategyChecklists}
                            rows={[
                              { label: ui.strategy, value: strategyReview?.strategyName || trade.strategyName || "-" },
                              { label: ui.plan, value: strategyReview?.followedPlan || trade.followedPlan || "-" },
                              {
                                label: ui.checklists,
                                value: checklists.length > 0 ? checklists.map((item) => `${item.title} ${item.completionPercent}%`).join("; ") : "-",
                              },
                            ]}
                          />
                          <ReportInfoPanel
                            title={ui.journal}
                            rows={[
                              { label: ui.rating, value: journal?.rating ?? "-" },
                              { label: ui.exitReason, value: journal?.exitReason || trade.exitReason || "-" },
                              { label: ui.journal, value: journal?.tradeNote || trade.notes || ui.noTradeNote },
                            ]}
                          />
                          <ReportInfoPanel
                            title={ui.media}
                            rows={[
                              { label: ui.entryScreenshot, value: trade.entryScreenshotUrl ? ui.saved : "-" },
                              { label: ui.exitScreenshot, value: trade.exitScreenshotUrl ? ui.saved : "-" },
                              { label: ui.totalScreenshots, value: screenshots.length },
                            ]}
                          />
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </Panel>
  );
}

export function ReportsContent({
  report,
  selectedReportType,
  csvHref,
  rawSymbol,
}: {
  report: JournalReport;
  selectedReportType: ReportType;
  csvHref: string;
  rawSymbol: string;
}) {
  const { language } = useLanguage();
  const copy = COPY[language];
  const ui = REPORT_UI[language];
  const summary = report.summary;
  const showAccountAiSummary = false;

  return (
    <div
      dir={language === "fa" ? "rtl" : "ltr"}
      className={cn(
        "w-full min-w-0 space-y-5 print:bg-white print:text-slate-950",
        language === "fa" ? "text-right" : "text-left"
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div data-dashboard-tour="reports-title">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-200 print:border-slate-300 print:bg-white print:text-slate-600">
            <FileText className="h-3.5 w-3.5" />
            {copy.badge}
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-white print:text-slate-950">{copy.title}</h1>
          <p className="mt-1 text-sm text-slate-400 print:text-slate-600">{copy.subtitle}</p>
        </div>
        <div data-dashboard-tour="reports-actions">
          <ReportActions csvHref={csvHref} />
        </div>
      </div>

      <ReportFilters
        report={report}
        copy={copy}
        language={language}
        selectedReportType={selectedReportType}
        hasGeneratedReport
      />

      <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300 print:hidden">
        {summary.totalTrades > 0
          ? language === "fa"
            ? `گزارش آماده است. ${formatNumber(summary.totalTrades, 0)} معامله با فیلترهای اعمال‌شده نمایش داده می‌شود.`
            : `Ready. ${formatNumber(summary.totalTrades, 0)} trades match the applied filters.`
          : language === "fa"
            ? "هیچ معامله‌ای با فیلترهای انتخاب‌شده مطابقت ندارد."
            : "No trades match the selected filters."}
      </div>

      {summary.totalTrades === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-700 bg-[#0F172A] p-5 text-sm text-slate-300 print:hidden">
          <h2 className="text-base font-semibold text-white">
            {language === "fa" ? "نتیجه‌ای برای این گزارش پیدا نشد" : "No matching report results"}
          </h2>
          <p className="mt-2 text-slate-400">
            {language === "fa" ? "هیچ معامله‌ای با فیلترهای انتخاب‌شده مطابقت ندارد. فیلترها را بازنشانی کنید، بازه تاریخ را تغییر دهید یا حساب دیگری انتخاب کنید." : "No trades match the selected filters. Reset filters, change the date range, or select another account."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/dashboard/reports?reportType=${selectedReportType}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500">
              {language === "fa" ? "بازنشانی فیلترها" : "Reset filters"}
            </Link>
            <a href="#reports-filters" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">
              {language === "fa" ? "تغییر بازه تاریخ" : "Change date range"}
            </a>
            <a href="#reports-filters" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-700 px-4 text-sm font-semibold text-slate-200 hover:bg-slate-800">
              {language === "fa" ? "انتخاب حساب دیگر" : "Select another account"}
            </a>
          </div>
        </div>
      ) : null}

      <div data-dashboard-tour="reports-stats" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={copy.stats.netPnl} value={formatMoney(summary.totalPnl)} tone={pnlTone(summary.totalPnl)} />
        <StatCard label={copy.stats.winRate} value={formatPercent(summary.winRate)} tone="profit" />
        <StatCard label={copy.stats.profitFactor} value={formatNumber(summary.profitFactor, 2)} tone="blue" />
        <StatCard label={copy.stats.expectancy} value={formatMoney(summary.expectancy)} tone={pnlTone(summary.expectancy)} />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard label={copy.stats.totalTrades} value={formatNumber(summary.totalTrades, 0)} tone="blue" />
        <StatCard label={copy.stats.closedOpen} value={`${summary.closedTrades} / ${summary.openTrades}`} />
        <StatCard label={copy.stats.averageRr} value={formatNumber(summary.averageRR, 2)} tone="amber" />
      </div>

      <Panel
        title={copy.executive.title}
        subtitle={`${copy.executive.generated} ${formatDate(report.generatedAt, language)}${rawSymbol ? ` ${copy.executive.for} ${rawSymbol.toUpperCase()}` : ""}`}
        icon={BarChart3}
        tourId="reports-executive"
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-emerald-200 print:text-slate-950">{copy.executive.strengths}</h3>
            <InsightList items={report.insights.strengths} tone="profit" language={language} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-red-200 print:text-slate-950">{copy.executive.risks}</h3>
            <InsightList items={report.insights.risks} tone="loss" language={language} />
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-blue-200 print:text-slate-950">{copy.executive.actionPlan}</h3>
            <InsightList items={report.insights.actionPlan} tone="blue" language={language} />
          </div>
        </div>
      </Panel>

      {showAccountAiSummary ? <AIReviewSummaryPanel report={report} language={language} /> : null}
      <div data-dashboard-tour="reports-files">
        <TradeReportFilesPanel report={report} language={language} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title={ui.performance.sessionTitle} subtitle={ui.performance.sessionSubtitle} icon={CalendarDays}>
          <SessionPerformanceTable report={report} copy={copy} language={language} />
        </Panel>
        <Panel title={ui.performance.strategyTitle} subtitle={ui.performance.strategySubtitle} icon={Target}>
          <PlaybookPerformanceTable report={report} copy={copy} language={language} />
        </Panel>
        <Panel title={copy.symbolPanel.title} subtitle={copy.symbolPanel.subtitle} icon={Target}>
          <TopTable report={report} copy={copy} />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={copy.behavior.title} subtitle={copy.behavior.subtitle} icon={Brain}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white print:text-slate-950">{copy.behavior.mistakes}</h3>
              <div className="space-y-3">
                {report.analytics.byMistake.slice(0, 5).map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-400 print:text-slate-600">
                      <span>{row.label}</span>
                      <span>{formatMoney(row.netPnl)}</span>
                    </div>
                    <ProgressBar value={row.shareOfTrades} tone={row.netPnl < 0 ? "loss" : "profit"} />
                  </div>
                ))}
                {report.analytics.byMistake.length === 0 && <EmptyLine label={copy.behavior.noMistakes} />}
              </div>
            </div>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-white print:text-slate-950">{copy.behavior.setups}</h3>
              <div className="space-y-3">
                {report.analytics.bySetup.slice(0, 5).map((row) => (
                  <div key={row.label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-400 print:text-slate-600">
                      <span>{row.label}</span>
                      <span>{formatPercent(row.winRate)}</span>
                    </div>
                    <ProgressBar value={row.winRate} tone={row.netPnl < 0 ? "loss" : "profit"} />
                  </div>
                ))}
                {report.analytics.bySetup.length === 0 && <EmptyLine label={copy.behavior.noSetups} />}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title={copy.trades.title} subtitle={copy.trades.subtitle} icon={FileText}>
        <RecentTradesTable report={report} copy={copy} language={language} />
      </Panel>

      <Panel title={copy.preTrade.title} subtitle={copy.preTrade.subtitle} icon={CheckCircle2}>
        <PreTradeChecks report={report} copy={copy} language={language} />
      </Panel>

      <Panel title={copy.notes.title} subtitle={copy.notes.subtitle} icon={CalendarDays} tourId="reports-final">
        <DailyNotes report={report} copy={copy} language={language} />
      </Panel>
    </div>
  );
}
