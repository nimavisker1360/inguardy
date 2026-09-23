"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Edit3,
  Info,
  ListChecks,
  MoreVertical,
  Save,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  PrismaTradeDto,
  PrismaTradingAccountDto,
} from "@/app/journal/_lib/journal-api";
import { JournalReviewForms } from "@/app/journal/[id]/journal-review-forms";
import { TradeAIReviewPanel } from "@/components/dashboard/TradeAIReviewPanel";
import type { TradeDto } from "@/components/dashboard/types";
import { TradeChecklistPanel } from "@/components/journal/TradeChecklistPanel";
import { TradeAIConversation } from "@/components/journal/TradeAIConversation";
import { TradeCoachPanel } from "@/components/journal/TradeCoachPanel";
import { TradeExecutionChart } from "@/components/journal/TradeExecutionChart";
import { TradeStrategyReviewPanel } from "@/components/journal/TradeStrategyReviewPanel";
import { isImportedTradeSource } from "@/lib/journal/trade-source";
import type { Psychology } from "@/lib/journal/types";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { TradeStrategyReviewDto } from "@/types/playbooks";

type TradeDetailClientProps = {
  initialTrade: PrismaTradeDto;
  accounts: PrismaTradingAccountDto[];
  aiAnalysisEnabled: boolean;
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]";
const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]";
const MT5_IMPORT_NOTE = "Imported from MT5 EA";
const MT5_IMPORT_SETUP = "MT5 Import";

function toDisplay(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatNumber(value: string | number | null | undefined, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return String(value);
  }

  return parsed.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateTimeLocalValue(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formValue(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function followedPlanFromStatus(value: string | null | undefined): Psychology["followedPlan"] {
  if (value === "followed_plan") {
    return true;
  }

  if (value === "broke_plan") {
    return false;
  }

  if (value === "partially_followed_plan") {
    return "partially";
  }

  return null;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
      {label}
      {children}
    </label>
  );
}

function Section({
  id,
  title,
  children,
  actions,
  collapsible = false,
  defaultOpen = true,
  summary,
  rtl = false,
  className,
  titleClassName,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  summary?: React.ReactNode;
  rtl?: boolean;
  className?: string;
  titleClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className={cn("scroll-mt-24 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]", rtl && "text-right", className)}>
      <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", open && "mb-4")}>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none transition hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300",
              rtl && "text-right"
            )}
          >
            <span className="min-w-0 flex-1">
              <span className={cn("block text-lg font-semibold text-slate-950 dark:text-white", titleClassName)}>{title}</span>
              {!open && summary ? (
                <span className="mt-1 block truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                  {summary}
                </span>
              ) : null}
            </span>
            <ChevronDown
              className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
            />
          </button>
        ) : (
          <h2 className={cn("text-lg font-semibold text-slate-950 dark:text-white", titleClassName)}>{title}</h2>
        )}
        {open ? actions : null}
      </div>
      {open ? children : null}
    </section>
  );
}

function Metric({
  label,
  value,
  className,
  tone = "default",
}: {
  label: string;
  value: string;
  className?: string;
  tone?: "default" | "blue" | "cyan" | "violet" | "rose" | "amber";
}) {
  const toneClass =
    tone === "blue"
      ? "border-blue-200 bg-blue-50/90 dark:border-blue-500/25 dark:bg-blue-500/10"
      : tone === "cyan"
        ? "border-cyan-200 bg-cyan-50/90 dark:border-cyan-500/25 dark:bg-cyan-500/10"
        : tone === "violet"
          ? "border-violet-200 bg-violet-50/90 dark:border-violet-500/25 dark:bg-violet-500/10"
          : tone === "rose"
            ? "border-rose-200 bg-rose-50/90 dark:border-rose-500/25 dark:bg-rose-500/10"
            : tone === "amber"
              ? "border-amber-200 bg-amber-50/90 dark:border-amber-500/25 dark:bg-amber-500/10"
              : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#111827]";

  return (
    <div className={cn("min-w-0 rounded-lg border p-3", toneClass)}>
      <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={cn("mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white", className)}>
        {value}
      </div>
    </div>
  );
}

type WorkspaceTab = "stats" | "strategy" | "executions" | "checklist" | "playbook" | "psychology";

function InspectorRow({ label, value, valueClassName }: { label: string; value: React.ReactNode; valueClassName?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] items-center gap-3 py-1.5 text-sm">
      <span className="truncate font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={cn("truncate font-semibold text-slate-900 dark:text-slate-100", valueClassName)}>{value}</span>
    </div>
  );
}

function sideClass(direction: PrismaTradeDto["direction"]) {
  return direction === "SELL"
    ? "border-red-500/30 bg-red-500/10 text-[#EF4444]"
    : "border-emerald-500/30 bg-emerald-500/10 text-[#10B981]";
}

function statusClass(status: PrismaTradeDto["status"]) {
  if (status === "CLOSED") {
    return "border-emerald-500/30 bg-emerald-500/10 text-[#10B981]";
  }

  if (status === "OPEN") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-300";
}

function tradeAccount(trade: PrismaTradeDto) {
  return trade.account || trade.tradingAccount || null;
}

function levelValue(
  trade: PrismaTradeDto,
  preferred: "initialStopLoss" | "initialTakeProfit" | "currentStopLoss" | "currentTakeProfit",
  fallback: "stopLoss" | "takeProfit"
) {
  return trade[preferred] ?? trade[fallback];
}

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function sourceLabel(trade: PrismaTradeDto, manualLabel: string) {
  if (trade.source?.trim().toUpperCase() === "CTRADER_DIRECT") return "cTrader";
  if (trade.source?.trim().toUpperCase() === "TRADELOCKER_DIRECT") return "TradeLocker";
  if (trade.source?.trim().toUpperCase() === "MT4") return "MT4";
  return isImportedTradeSource(trade.source, trade.setup) ? "MT5" : manualLabel;
}

function isMt5PlaceholderText(value: string | null | undefined) {
  return Boolean(value?.includes(MT5_IMPORT_NOTE));
}

function hasMt5PlaceholderNote(trade: PrismaTradeDto) {
  return isMt5PlaceholderText(trade.notes) || isMt5PlaceholderText(trade.journalMetadata?.tradeNote);
}

function journalUserNote(trade: PrismaTradeDto) {
  if (hasText(trade.journalMetadata?.psychologyNote) && !isMt5PlaceholderText(trade.journalMetadata?.psychologyNote)) {
    return trade.journalMetadata?.psychologyNote || null;
  }

  return null;
}

function journalEntryReason(trade: PrismaTradeDto) {
  if (!hasText(trade.setup) || trade.setup === MT5_IMPORT_SETUP) {
    return null;
  }

  return trade.setup || null;
}

const detailCopy = {
  en: {
    sections: {
      summary: "Summary",
      screenshots: "Screenshots",
      psychology: "Psychology",
      strategy: "Strategy and Checklist",
      ai: "AI Review",
      notes: "Notes and Tags",
    },
    progressTitle: "Review progress",
    progressHint: "Progress is based on existing journal data. Optional items improve context but are not required to use the journal.",
    required: "Required",
    recommended: "Recommended",
    optional: "Optional",
    complete: "Complete",
    incomplete: "Incomplete",
    ready: "Ready",
    notStarted: "Not started",
    source: "Source",
    importedTitle: "MT5 imported trade",
    importedDescription:
      "Market execution data was imported automatically from MT5. Add your own screenshots, psychology notes, playbook review, checklist answers, tags, and AI review when you are ready.",
    importedCompleteDescription:
      "MT5 imported the execution data automatically. This trade now has all the review context needed for a complete journal analysis.",
    importedRemainingDescription:
      "MT5 imported the execution data automatically. Based on the information currently saved, this trade still needs: {items}. Complete these items to get an accurate journal analysis.",
    importedNoteReplacement:
      "This trade was imported automatically from MT5. Add personal review context here instead of treating the import note as your journal analysis.",
    manualSourceDescription:
      "This is a manual journal trade. You can edit trade details and add review context from this page.",
    tradeInfoAvailable: "Trade information available",
    screenshotAttached: "Entry or exit screenshot attached",
    psychologyCompleted: "Psychology review completed",
    playbookSelected: "Playbook selected",
    checklistCompleted: "Checklist completed",
    strategyCompleted: "Strategy review completed",
    notesAdded: "Notes added",
    aiReviewGenerated: "AI review generated",
    completeRequirements: "Complete Requirements",
    completeReview: "Complete Review",
    reviewCompleted: "Review completed",
    blockedRequirements: "Complete the required steps before continuing.",
    locked: "Locked",
    manual: "Manual",
    initialStopLoss: "Initial SL",
    currentStopLoss: "Current SL",
    initialTakeProfit: "Initial TP",
    currentTakeProfit: "Current TP",
    profitLoss: "PnL",
    rr: "R:R",
    slTpTimeline: "SL/TP Timeline",
    updates: "updates",
    stopLossChanged: "Stop loss changed",
    takeProfitChanged: "Take profit changed",
    changedFromTo: "{oldValue} to {newValue}",
    noLevelUpdates: "No SL or TP modifications recorded for this trade.",
    requirementSteps: {
      "Select Playbook": "Select Playbook",
      "Complete Checklist": "Complete Checklist",
      "Trade Information": "Trade Information",
      "Psychology Review": "Psychology Review",
      "Strategy Review": "Strategy Review",
      "AI Review": "AI Review",
      "Complete Review": "Complete Review",
    },
    requirementReasons: {
      "Select a Playbook to continue.": "Select a Playbook to continue.",
      "Complete the Playbook and Pre-Trade Checklist to continue.": "Complete the Playbook and Pre-Trade Checklist to continue.",
      "Save the required trade information.": "Save the required trade information.",
      "Complete Psychology Review to continue.": "Complete Psychology Review to continue.",
      "Complete Strategy Review to continue.": "Complete Strategy Review to continue.",
      "Complete the required steps before continuing.": "Complete the required steps before continuing.",
    },
    missingRequirementLabels: {
      PLAYBOOK_REQUIRED: "Playbook required",
      CHECKLIST_REQUIRED: "Checklist required",
      CHECKLIST_INCOMPLETE: "Checklist incomplete",
      CRITICAL_CHECK_FAILED: "Critical check failed",
      PSYCHOLOGY_REVIEW_REQUIRED: "Psychology review required",
      STRATEGY_REVIEW_REQUIRED: "Strategy review required",
      TRADES_WAITING_FOR_REVIEW: "Trades waiting for review",
    },
    dangerTitle: "Danger section",
    dangerDescription: "Delete is kept separate from routine review actions.",
    deleteTitle: "Delete trade",
    deleteDescription: "This permanently removes this trade from the journal.",
    openDelete: "Delete trade",
    confirmDeleteTitle: "Delete {symbol}?",
    confirmDeleteBody:
      "Related screenshots, tags, checklist answers, strategy review, psychology review, and AI review may also be removed. This action cannot be undone.",
    confirmLabel: "Type DELETE to confirm",
    confirmPlaceholder: "DELETE",
    confirmDeleteButton: "Delete trade",
    keepTrade: "Keep trade",
  },
  fa: {
    sections: {
      summary: "خلاصه",
      screenshots: "اسکرین‌شات‌ها",
      psychology: "روانشناسی",
      strategy: "استراتژی و چک‌لیست",
      ai: "بررسی AI",
      notes: "یادداشت‌ها و تگ‌ها",
    },
    progressTitle: "پیشرفت بررسی",
    progressHint: "پیشرفت از داده‌های موجود ژورنال محاسبه می‌شود. موارد اختیاری فقط زمینه بررسی را بهتر می‌کنند و برای استفاده از ژورنال اجباری نیستند.",
    required: "ضروری",
    recommended: "پیشنهادی",
    optional: "اختیاری",
    complete: "کامل",
    incomplete: "ناقص",
    ready: "آماده",
    notStarted: "شروع نشده",
    source: "منبع",
    importedTitle: "معامله واردشده از MT5",
    importedDescription:
      "داده‌های اجرای بازار به صورت خودکار از MT5 وارد شده‌اند. هر زمان آماده بودید اسکرین‌شات، یادداشت روانشناسی، بررسی پلی‌بوک، پاسخ چک‌لیست، تگ و بررسی AI خودتان را اضافه کنید.",
    importedCompleteDescription:
      "اطلاعات اجرای معامله به‌صورت خودکار از MT5 دریافت شده و اکنون تمام اطلاعات لازم برای تحلیل کامل این معامله ثبت شده است.",
    importedRemainingDescription:
      "اطلاعات اجرای معامله به‌صورت خودکار از MT5 دریافت شده است. بر اساس اطلاعات فعلی، این موارد هنوز ناقص‌اند: {items}. برای تحلیل دقیق ژورنال، آن‌ها را تکمیل کنید.",
    importedNoteReplacement:
      "این معامله به صورت خودکار از MT5 وارد شده است. به جای یادداشت فنی واردسازی، زمینه بررسی شخصی خود را اینجا اضافه کنید.",
    manualSourceDescription:
      "این معامله دستی در ژورنال است. می‌توانید جزئیات معامله و زمینه بررسی را از همین صفحه ویرایش کنید.",
    tradeInfoAvailable: "اطلاعات معامله موجود است",
    screenshotAttached: "اسکرین‌شات ورود یا خروج پیوست شده است",
    psychologyCompleted: "بررسی روانشناسی تکمیل شده است",
    playbookSelected: "پلی‌بوک انتخاب شده است",
    checklistCompleted: "چک‌لیست تکمیل شده است",
    strategyCompleted: "بررسی استراتژی تکمیل شده است",
    notesAdded: "یادداشت اضافه شده است",
    aiReviewGenerated: "بررسی AI ساخته شده است",
    completeRequirements: "تکمیل موارد لازم",
    completeReview: "تکمیل بررسی",
    reviewCompleted: "بررسی تکمیل شد",
    blockedRequirements: "قبل از ادامه، موارد لازم را کامل کنید.",
    locked: "قفل‌شده",
    manual: "دستی",
    initialStopLoss: "حد ضرر اولیه",
    currentStopLoss: "حد ضرر فعلی",
    initialTakeProfit: "حد سود اولیه",
    currentTakeProfit: "حد سود فعلی",
    profitLoss: "سود/زیان",
    rr: "ریسک به ریوارد",
    slTpTimeline: "روند تغییرات حد ضرر/حد سود",
    updates: "به‌روزرسانی",
    stopLossChanged: "حد ضرر تغییر کرد",
    takeProfitChanged: "حد سود تغییر کرد",
    changedFromTo: "از {oldValue} به {newValue}",
    noLevelUpdates: "برای این معامله تغییری در حد ضرر یا حد سود ثبت نشده است.",
    requirementSteps: {
      "Select Playbook": "انتخاب پلی‌بوک",
      "Complete Checklist": "تکمیل چک‌لیست",
      "Trade Information": "اطلاعات معامله",
      "Psychology Review": "بررسی روانشناسی",
      "Strategy Review": "بررسی استراتژی",
      "AI Review": "بررسی AI",
      "Complete Review": "تکمیل بررسی",
    },
    requirementReasons: {
      "Select a Playbook to continue.": "برای ادامه، یک پلی‌بوک انتخاب کنید.",
      "Complete the Playbook and Pre-Trade Checklist to continue.": "برای ادامه، پلی‌بوک و چک‌لیست قبل از معامله را کامل کنید.",
      "Save the required trade information.": "اطلاعات ضروری معامله را ذخیره کنید.",
      "Complete Psychology Review to continue.": "برای ادامه، بررسی روانشناسی را کامل کنید.",
      "Complete Strategy Review to continue.": "برای ادامه، بررسی استراتژی را کامل کنید.",
      "Complete the required steps before continuing.": "قبل از ادامه، موارد لازم را کامل کنید.",
    },
    missingRequirementLabels: {
      PLAYBOOK_REQUIRED: "پلی‌بوک لازم است",
      CHECKLIST_REQUIRED: "چک‌لیست لازم است",
      CHECKLIST_INCOMPLETE: "چک‌لیست ناقص است",
      CRITICAL_CHECK_FAILED: "یک مورد حیاتی رد شده است",
      PSYCHOLOGY_REVIEW_REQUIRED: "بررسی روانشناسی لازم است",
      STRATEGY_REVIEW_REQUIRED: "بررسی استراتژی لازم است",
      TRADES_WAITING_FOR_REVIEW: "معاملات در انتظار بررسی هستند",
    },
    dangerTitle: "بخش خطر",
    dangerDescription: "حذف از عملیات روزمره بررسی جدا نگه داشته شده است.",
    deleteTitle: "حذف معامله",
    deleteDescription: "این معامله را برای همیشه از ژورنال حذف می‌کند.",
    openDelete: "حذف معامله",
    confirmDeleteTitle: "معامله {symbol} حذف شود؟",
    confirmDeleteBody:
      "اسکرین‌شات‌ها، تگ‌ها، پاسخ‌های چک‌لیست، بررسی استراتژی، بررسی روانشناسی و بررسی AI مرتبط نیز ممکن است حذف شوند. این عملیات قابل بازگشت نیست.",
    confirmLabel: "برای تایید DELETE را وارد کنید",
    confirmPlaceholder: "DELETE",
    confirmDeleteButton: "حذف معامله",
    keepTrade: "نگه داشتن معامله",
  },
} as const;

function progressTone(complete: boolean, optional: boolean) {
  if (complete) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300";
  }

  return optional
    ? "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300";
}

export function TradeDetailClient({
  initialTrade,
  accounts,
  aiAnalysisEnabled,
}: TradeDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, language } = useLanguage();
  const isRtl = language === "fa";
  const copy = detailCopy[language];
  const [trade, setTrade] = useState(initialTrade);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [completingReview, setCompletingReview] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [progressHighlighted, setProgressHighlighted] = useState(false);
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("stats");
  const legacySectionsVisible = false;
  const account = tradeAccount(trade);
  const activeAccountId = searchParams.get("accountId") || "";
  const backToTradesHref = activeAccountId
    ? `/journal?accountId=${encodeURIComponent(activeAccountId)}`
    : "/journal";
  const accountNumber = account?.mt5AccountNumber || account?.name || trade.accountId;
  const tags = useMemo(
    () => trade.tags?.map((item) => item.tag.name).join(", ") || "",
    [trade.tags]
  );
  const selectedTagNames = useMemo(() => trade.tags?.map((item) => item.tag.name) || [], [trade.tags]);
  useEffect(() => {
    let active = true;
    void fetch("/api/tags").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json();
      if (active && Array.isArray(result.data)) {
        setAvailableTags(result.data.map((tag: { name: string }) => tag.name));
      }
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const screenshots = trade.screenshots || [];
  const updateLogs = trade.updateLogs || [];
  const importedTrade = isImportedTradeSource(trade.source, trade.setup);
  const journalPsychology = useMemo<Psychology | null>(() => {
    const personalNote = journalUserNote(trade);
    const entryReason = journalEntryReason(trade);

    if (!trade.emotion && !trade.mistake && !trade.mistakes && !personalNote && !entryReason) {
      return null;
    }

    return {
      confidenceScore: trade.journalMetadata?.rating ?? null,
      emotionBefore: trade.emotion,
      emotionAfter: trade.emotion,
      followedPlan: followedPlanFromStatus(trade.journalMetadata?.psychologyStatus),
      mistakeTag: trade.mistakes || trade.mistake,
      entryReason,
      personalNote,
      lessonLearned: trade.journalMetadata?.lessonLearned || null,
    };
  }, [trade]);
  const displayedNotes = hasMt5PlaceholderNote(trade)
    ? copy.importedNoteReplacement
    : trade.notes || "-";
  const displayedPsychologyNotes = journalPsychology?.personalNote || "-";
  const checklistTotalCount = trade.checklistTotalCount || trade.checklistResult?.totalCount || 0;
  const checklistCompletedCount = trade.checklistCompletedCount || trade.checklistResult?.completedCount || 0;
  const checklistComplete =
    checklistTotalCount > 0 && checklistCompletedCount >= checklistTotalCount;
  const strategyReviewed = Boolean(
    trade.strategyReview && trade.strategyReview.followedPlan !== "NOT_REVIEWED"
  );
  const reviewItems = [
    {
      label: copy.tradeInfoAvailable,
      missingLabel: language === "fa" ? "اطلاعات اصلی معامله" : "core trade details",
      complete: hasText(trade.symbol) && Boolean(trade.direction) && Boolean(trade.status),
      importance: copy.required,
      optional: false,
    },
    {
      label: copy.screenshotAttached,
      missingLabel: language === "fa" ? "اسکرین‌شات ورود یا خروج" : "an entry or exit screenshot",
      complete: screenshots.length > 0,
      importance: copy.optional,
      optional: true,
    },
    {
      label: copy.psychologyCompleted,
      missingLabel: language === "fa" ? "بررسی روانشناسی" : "psychology review",
      complete: Boolean(
        journalPsychology?.emotionBefore ||
          journalPsychology?.emotionAfter ||
          journalPsychology?.mistakeTag ||
          journalPsychology?.personalNote ||
          journalPsychology?.lessonLearned
      ),
      importance: copy.recommended,
      optional: false,
    },
    {
      label: copy.playbookSelected,
      missingLabel: language === "fa" ? "انتخاب پلی‌بوک" : "a selected playbook",
      complete: Boolean(trade.strategyReview?.strategyId || trade.strategyReview?.strategyNameSnapshot),
      importance: copy.recommended,
      optional: false,
    },
    {
      label: copy.checklistCompleted,
      missingLabel: language === "fa" ? "پاسخ کامل چک‌لیست" : "completed checklist answers",
      complete: checklistComplete,
      importance: copy.recommended,
      optional: false,
    },
    {
      label: copy.strategyCompleted,
      missingLabel: language === "fa" ? "بررسی استراتژی" : "strategy review",
      complete: strategyReviewed,
      importance: copy.recommended,
      optional: false,
    },
    {
      label: copy.notesAdded,
      missingLabel: language === "fa" ? "یادداشت معامله" : "trade notes",
      complete: hasText(trade.notes) && !hasMt5PlaceholderNote(trade),
      importance: copy.optional,
      optional: true,
    },
  ];
  const requirementSteps =
    trade.reviewRequirements?.steps.map((step) => ({
      label: step.label,
      complete: step.complete,
      importance: step.locked ? copy.locked : copy.required,
      optional: false,
      locked: step.locked,
      reason: step.reason,
      href: step.href,
    })) ||
    reviewItems.map((item) => ({
      ...item,
      locked: false,
      reason: null,
      href: "#strategy-checklist",
    }));
  const completedReviewItems = reviewItems.filter((item) => item.complete).length;
  const reviewProgressPercent =
    trade.reviewRequirements?.progressPercent ??
    Math.round((completedReviewItems / reviewItems.length) * 100);
  const missingRequirements = trade.reviewRequirements?.missingRequirements || [];
  const canCompleteReview = Boolean(trade.reviewRequirements?.readyForCompleteReview);
  const firstIncompleteHref =
    trade.reviewRequirements?.steps.find((step) => !step.complete)?.href ||
    "#strategy-checklist";
  const sectionLinks = [
    { id: "execution-chart", label: language === "fa" ? "داستان معامله" : "Trade story" },
    { id: "summary", label: copy.sections.summary },
    { id: "psychology", label: copy.sections.psychology },
    { id: "strategy-checklist", label: copy.sections.strategy },
    { id: "ai-review", label: copy.sections.ai },
    { id: "notes-tags", label: copy.sections.notes },
  ];
  const missingContextItems = reviewItems
    .filter((item) => !item.complete)
    .map((item) => item.missingLabel);
  const importedSourceDescription = missingContextItems.length === 0
    ? copy.importedCompleteDescription
    : copy.importedRemainingDescription.replace(
        "{items}",
        language === "fa"
          ? missingContextItems.join("، ")
          : missingContextItems.length === 1
            ? missingContextItems[0]
            : `${missingContextItems.slice(0, -1).join(", ")}, and ${missingContextItems.at(-1)}`
      );
  const directionLabel = (direction: string | null | undefined) => {
    if (direction === "BUY") {
      return t("journal.tradeDetail.buy");
    }

    if (direction === "SELL") {
      return t("journal.tradeDetail.sell");
    }

    return direction || "-";
  };
  const statusLabel = (status: string | null | undefined) => {
    if (status === "OPEN") {
      return t("journal.tradeDetail.open");
    }

    if (status === "CLOSED") {
      return t("journal.tradeDetail.closed");
    }

    if (status === "CANCELLED") {
      return t("journal.tradeDetail.cancelled");
    }

    return status || "-";
  };
  const requirementStepLabel = (label: string) =>
    (copy.requirementSteps as Record<string, string>)[label] || label;
  const requirementReasonLabel = (reason: string | null) =>
    reason ? (copy.requirementReasons as Record<string, string>)[reason] || reason : null;
  const missingRequirementLabel = (code: string) =>
    (copy.missingRequirementLabels as Record<string, string>)[code] || code;
  const changedFromToLabel = (oldValue: string, newValue: string) =>
    copy.changedFromTo.replace("{oldValue}", oldValue).replace("{newValue}", newValue);

  function showReviewProgress(nextTrade?: PrismaTradeDto | null) {
    if (nextTrade) {
      setTrade(nextTrade);
    }

    setProgressHighlighted(true);
    window.setTimeout(() => setProgressHighlighted(false), 2200);
    window.requestAnimationFrame(() => {
      document
        .getElementById("review-progress")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function completeRequirements() {
    const targetTab: WorkspaceTab = firstIncompleteHref.includes("psychology")
      ? "psychology"
      : firstIncompleteHref.includes("checklist")
        ? "checklist"
        : firstIncompleteHref.includes("playbook") || firstIncompleteHref.includes("strategy")
          ? "playbook"
          : "stats";
    setWorkspaceTab(targetTab);
  }

  async function completeReview() {
    setCompletingReview(true);

    try {
      const response = await fetch(`/api/journal/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "COMPLETE_REVIEW" }),
      });
      const data = await response.json();

      if (!response.ok) {
        const missing = Array.isArray(data.missingRequirements)
          ? data.missingRequirements.map(missingRequirementLabel).join(", ")
          : "";
        toast.error(missing || data.message || copy.blockedRequirements);
        return;
      }

      if (data.trade) {
        showReviewProgress(data.trade);
      } else {
        showReviewProgress();
      }

      toast.success(copy.reviewCompleted);
    } catch {
      toast.error(copy.blockedRequirements);
    } finally {
      setCompletingReview(false);
    }
  }

  function handleStrategyReviewUpdated(review: TradeStrategyReviewDto | null, updatedTrade?: PrismaTradeDto | null) {
    if (updatedTrade) {
      showReviewProgress(updatedTrade);
      return;
    }

    setTrade((currentTrade) => ({
      ...currentTrade,
      session: review?.strategyNameSnapshot || currentTrade.session,
      strategyReview: review,
    }));
    showReviewProgress();
  }

  async function saveTrade(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      symbol: formValue(formData.get("symbol")),
      side: formValue(formData.get("side")),
      entryPrice: formValue(formData.get("entryPrice")),
      exitPrice: formValue(formData.get("exitPrice")),
      stopLoss: formValue(formData.get("stopLoss")),
      takeProfit: formValue(formData.get("takeProfit")),
      lotSize: formValue(formData.get("lotSize")),
      riskAmount: formValue(formData.get("riskAmount")),
      profitLoss: formValue(formData.get("profitLoss")),
      status: formValue(formData.get("status")),
      strategy: formValue(formData.get("strategy")),
      setup: formValue(formData.get("setup")),
      emotion: formValue(formData.get("emotion")),
      mistakes: formValue(formData.get("mistakes")),
      notes: formValue(formData.get("notes")),
      entryTime: formValue(formData.get("entryTime")),
      exitTime: formValue(formData.get("exitTime")),
      accountId: formValue(formData.get("accountId")),
    };

    try {
      const response = await fetch(`/api/journal/trades/${trade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(
          Array.isArray(data.errors) ? data.errors.join(", ") : data.message
        );
        return;
      }

      if (data.trade) {
        showReviewProgress(data.trade);
      }

      toast.success(t("journal.tradeDetail.tradeSaved"));
      setEditing(false);
    } catch {
      toast.error(t("journal.tradeDetail.saveTradeFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function persistTags(names: string[]) {
    if (savingTags) return false;
    setSavingTags(true);
    const normalizedTags = Array.from(new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean)));

    try {
      const response = await fetch(`/api/journal/trades/${trade.id}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: normalizedTags }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.tradeDetail.saveTagsFailed"));
        return false;
      }

      if (Array.isArray(data.tags)) {
        const now = new Date().toISOString();

        setTrade((currentTrade) => ({
          ...currentTrade,
          tags: data.tags.map((name: string) => ({
            tradeId: currentTrade.id,
            tagId: name,
            tag: {
              id: name,
              userId: currentTrade.userId,
              name,
              color: null,
              createdAt: now,
            },
          })),
        }));
        setAvailableTags((current) => Array.from(new Set([...current, ...data.tags])));
      }

      toast.success(t("journal.tradeDetail.tagsSaved"));
      return true;
    } catch {
      toast.error(t("journal.tradeDetail.saveTagsFailed"));
      return false;
    } finally {
      setSavingTags(false);
    }
  }

  async function saveTags(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await persistTags(String(formData.get("tags") || "").split(","));
  }

  async function addTag(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTag.trim();
    if (!name) return;
    if (await persistTags([...selectedTagNames, name])) setNewTag("");
  }

  async function deleteTrade() {
    try {
      const response = await fetch(`/api/journal/trades/${trade.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.tradeDetail.deleteTradeFailed"));
        return;
      }

      toast.success(t("journal.tradeDetail.tradeDeleted"));
      setDeleteConfirmOpen(false);
      router.replace(backToTradesHref);
      router.refresh();
    } catch {
      toast.error(t("journal.tradeDetail.deleteTradeFailed"));
    }
  }

  const workspaceTabs: Array<{ id: WorkspaceTab; label: string; icon: typeof BarChart3 }> = [
    { id: "stats", label: "Stats", icon: BarChart3 },
    { id: "strategy", label: "Strategy", icon: Star },
    { id: "executions", label: "Executions", icon: Clock3 },
    { id: "checklist", label: "Trade Checklist", icon: ListChecks },
    { id: "playbook", label: "Playbook", icon: BookOpenCheck },
    { id: "psychology", label: "Psychology Review", icon: Brain },
  ];
  const pnlValue = Number(trade.profitLoss || 0);
  const commissionValue = Number(trade.commission || 0);
  const swapValue = Number(trade.swap || 0);
  const riskValue = Number(trade.riskAmount || 0);
  const entryValue = Number(trade.entryPrice || 0);
  const exitValue = Number(trade.exitPrice || 0);
  const signedMove = entryValue && exitValue
    ? (trade.direction === "BUY" ? exitValue - entryValue : entryValue - exitValue)
    : 0;
  const estimatedPips = signedMove * (trade.symbol.toUpperCase().includes("JPY") ? 100 : 10000);

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-10">
      <Link
        href={backToTradesHref}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:text-slate-950 dark:border-slate-800 dark:bg-[#0F172A] dark:text-gray-300 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("journal.tradeDetail.backToTrades")}
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
        <div className={cn("flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between", isRtl && "text-right")}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-slate-950 dark:text-white">{trade.symbol}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                  sideClass(trade.direction)
                )}
              >
                {trade.direction === "SELL" ? (
                  <ArrowDown className="h-3 w-3" />
                ) : (
                  <ArrowUp className="h-3 w-3" />
                )}
                {directionLabel(trade.direction)}
              </span>
              <span
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                  statusClass(trade.status)
                )}
              >
                {statusLabel(trade.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {language === "fa" ? "شماره حساب" : "Account"} {accountNumber} /{" "}
              {account?.broker || "-"} / {account?.platform || "-"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing((value) => !value);
                setWorkspaceTab("executions");
              }}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md bg-[#6946b8] px-3 text-xs font-semibold text-white hover:bg-[#5c3da5]"
            >
              {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {editing ? t("journal.tradeDetail.cancel") : t("journal.tradeDetail.edit")}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmation("");
                setDeleteConfirmOpen(true);
              }}
              className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-slate-200 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label={copy.dangerTitle}
              title={copy.dangerTitle}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-[690px] gap-3 xl:grid-cols-[440px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
          <nav className="grid shrink-0 grid-cols-3 gap-1 border-b border-slate-200 p-2 dark:border-slate-800" aria-label="Trade detail categories">
            {workspaceTabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setWorkspaceTab(id)}
                title={label}
                aria-pressed={workspaceTab === id}
                className={cn(
                  "flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-md px-2 text-[10px] font-semibold transition",
                  workspaceTab === id
                    ? "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  ["checklist", "playbook", "psychology"].includes(id) && "border border-violet-200 dark:border-violet-500/30"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto p-4" dir={isRtl ? "rtl" : "ltr"}>
            {workspaceTab === "stats" ? (
              <>
                <div className="border-s-4 border-red-500 ps-4">
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Net P&amp;L</div>
                  <div className={cn("mt-1 text-3xl font-medium", pnlValue >= 0 ? "text-emerald-500" : "text-red-500")} dir="ltr">
                    {pnlValue >= 0 ? "+" : "-"}${Math.abs(pnlValue).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="mt-6">
                  <InspectorRow label="Side" value={directionLabel(trade.direction)} valueClassName={trade.direction === "BUY" ? "text-emerald-500" : "text-red-500"} />
                  <InspectorRow label="Account" value={account?.name || accountNumber || "-"} />
                  <InspectorRow label="Volume traded" value={formatNumber(trade.lotSize, 2)} />
                  <InspectorRow label="Pips" value={estimatedPips ? estimatedPips.toFixed(1) : "-"} valueClassName={estimatedPips >= 0 ? "text-emerald-500" : "text-red-500"} />
                  <InspectorRow label="Return / Pip" value={estimatedPips ? `$${Math.abs(pnlValue / estimatedPips).toFixed(2)}` : "-"} />
                  <InspectorRow label="Commissions & Fees" value={`$${Math.abs(commissionValue).toFixed(2)}`} />
                  <InspectorRow label="Total Swap" value={`$${swapValue.toFixed(2)}`} />
                  <InspectorRow label="Net ROI" value={riskValue ? `${((pnlValue / riskValue) * 100).toFixed(2)}%` : "-"} />
                  <InspectorRow label="Gross P&L" value={`$${(pnlValue + Math.abs(commissionValue) + Math.abs(swapValue)).toFixed(2)}`} />
                  <InspectorRow label="Risk Amount" value={riskValue ? `$${riskValue.toLocaleString("en-US")}` : "-"} />
                  <InspectorRow label="Strategy" value={trade.strategyReview?.strategyNameSnapshot || trade.strategy || "Select Strategy"} valueClassName={!trade.strategyReview?.strategyNameSnapshot ? "text-violet-500" : undefined} />
                </div>
                <section id="notes-tags" className="mt-4 scroll-mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{isRtl ? "تگ‌های این معامله" : "Trade tags"}</h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{isRtl ? "تگ انتخاب کن یا تگ جدید بساز؛ تغییرات همان لحظه ذخیره می‌شوند." : "Choose an existing tag or add a new one. Changes save immediately."}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selectedTagNames.length ? selectedTagNames.map((name) => (
                      <span key={name} className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200">
                        {name}
                        <button type="button" onClick={() => void persistTags(selectedTagNames.filter((tag) => tag !== name))} disabled={savingTags} aria-label={isRtl ? `حذف تگ ${name}` : `Remove tag ${name}`} className="rounded-full p-0.5 hover:bg-violet-100 disabled:opacity-50 dark:hover:bg-violet-500/20"><X className="h-3 w-3" /></button>
                      </span>
                    )) : <span className="text-xs text-slate-500">{isRtl ? "هنوز تگی ثبت نشده است." : "No tags yet."}</span>}
                  </div>
                  <div className="mt-3 space-y-2">
                    <select value="" onChange={(event) => { if (event.target.value) void persistTags([...selectedTagNames, event.target.value]); }} disabled={savingTags || availableTags.every((name) => selectedTagNames.includes(name))} className={inputClass} aria-label={isRtl ? "انتخاب تگ موجود" : "Choose an existing tag"}>
                      <option value="">{isRtl ? "انتخاب تگ موجود" : "Choose an existing tag"}</option>
                      {availableTags.filter((name) => !selectedTagNames.includes(name)).map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <form onSubmit={addTag} className="flex gap-2">
                      <input value={newTag} onChange={(event) => setNewTag(event.target.value)} maxLength={80} placeholder={isRtl ? "نام تگ جدید" : "New tag name"} className={inputClass} aria-label={isRtl ? "نام تگ جدید" : "New tag name"} />
                      <button type="submit" disabled={savingTags || !newTag.trim()} className="shrink-0 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-50">{isRtl ? "افزودن" : "Add tag"}</button>
                    </form>
                  </div>
                </section>

                <div
                  id="review-progress"
                  className={cn(
                    "mt-5 rounded-lg border border-blue-200 bg-blue-50 p-3 transition dark:border-blue-500/30 dark:bg-blue-500/10",
                    progressHighlighted && "ring-2 ring-blue-400"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-slate-950 dark:text-white">{copy.progressTitle}</div>
                    <div className="text-sm font-bold text-blue-700 dark:text-blue-200">{reviewProgressPercent}%</div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-900">
                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${reviewProgressPercent}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {requirementSteps.map((item) => (
                      <span key={item.label} className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold", progressTone(item.complete, item.optional))}>
                        {item.complete ? <CheckCircle2 className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
                        {requirementStepLabel(item.label)}
                      </span>
                    ))}
                  </div>
                  {missingRequirements.length ? <p className="mt-2 text-[11px] font-medium text-amber-700 dark:text-amber-200">{missingRequirements.map(missingRequirementLabel).join(", ")}</p> : null}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={completeRequirements} className="h-9 rounded-md border border-blue-300 text-xs font-semibold text-blue-700 dark:border-blue-500/40 dark:text-blue-200">{copy.completeRequirements}</button>
                    <button type="button" onClick={completeReview} disabled={!canCompleteReview || completingReview} className="h-9 rounded-md bg-blue-600 text-xs font-semibold text-white disabled:opacity-50">{completingReview ? t("journal.tradeDetail.saving") : copy.completeReview}</button>
                  </div>
                </div>

                <TradeCoachPanel trade={trade} enabled={aiAnalysisEnabled} />
                <TradeAIConversation trade={trade} enabled={aiAnalysisEnabled} />

              </>
            ) : workspaceTab === "strategy" ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-violet-50 text-violet-600 dark:bg-violet-500/10"><Star className="h-6 w-6" /></div>
                  <h2 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{trade.strategyReview?.strategyNameSnapshot || "Add a Strategy"}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">Connect this trade to a repeatable setup and track what works.</p>
                  <button type="button" onClick={() => setWorkspaceTab("playbook")} className="mt-3 h-9 rounded-md bg-violet-600 px-4 text-xs font-semibold text-white">Pick from your strategy library</button>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-500/25 dark:bg-blue-500/10">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">{t("journal.tradeDetail.tradeReview")}</h3>
                  <div className="mt-3 space-y-1">
                    <InspectorRow label={t("journal.tradeDetail.strategy")} value={toDisplay(trade.strategyReview?.strategyNameSnapshot)} />
                    <InspectorRow label={t("journal.tradeDetail.setup")} value={toDisplay(trade.setup)} />
                    <InspectorRow label={t("journal.tradeDetail.mistakes")} value={toDisplay(trade.mistakes || trade.mistake)} />
                  </div>
                  <div className="mt-3 rounded-md border border-indigo-200 bg-white/70 p-3 text-sm text-indigo-950 dark:border-indigo-500/25 dark:bg-slate-900/50 dark:text-indigo-100">
                    <div className="text-[10px] font-semibold uppercase text-indigo-600 dark:text-indigo-300">{t("journal.tradeDetail.notes")}</div>
                    <p className="mt-1 whitespace-pre-wrap leading-6">{displayedNotes}</p>
                  </div>
                </div>
                <TradeAIReviewPanel trade={trade as unknown as TradeDto} aiAnalysisEnabled={aiAnalysisEnabled} onReviewUpdated={showReviewProgress} />
              </div>
            ) : workspaceTab === "executions" ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-950 dark:text-white">Execution details</h2>
                  <div className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <InspectorRow label="Entry" value={formatNumber(trade.entryPrice, 5)} />
                    <InspectorRow label="Exit" value={formatNumber(trade.exitPrice, 5)} />
                    <InspectorRow label="Stop loss" value={formatNumber(levelValue(trade, "initialStopLoss", "stopLoss"), 5)} />
                    <InspectorRow label="Profit target" value={formatNumber(levelValue(trade, "initialTakeProfit", "takeProfit"), 5)} />
                    <InspectorRow label="Entry time" value={formatDate(trade.openedAt || trade.entryTime)} />
                    <InspectorRow label="Exit time" value={formatDate(trade.closedAt || trade.exitTime)} />
                  </div>
                </div>
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-500/30 dark:bg-blue-500/10">
                  <div className="text-xs font-semibold text-slate-950 dark:text-white">{copy.source}: {sourceLabel(trade, copy.manual)}</div>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{importedTrade ? importedSourceDescription : copy.manualSourceDescription}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{copy.slTpTimeline}</h3>
                  <div className="mt-2 space-y-2">
                    {updateLogs.length ? updateLogs.map((log) => (
                      <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                        <div className="font-semibold text-slate-900 dark:text-white">{log.type === "SL_CHANGED" ? copy.stopLossChanged : copy.takeProfitChanged}</div>
                        <div className="mt-1 text-slate-500">{changedFromToLabel(formatNumber(log.oldValue, 5), formatNumber(log.newValue, 5))}</div>
                        <div className="mt-1 text-[10px] text-slate-400">{formatDate(log.createdAt)}</div>
                      </div>
                    )) : <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700">{copy.noLevelUpdates}</div>}
                  </div>
                </div>
                {editing ? (
                  <form id="journal-trade-edit-form" onSubmit={saveTrade} className="space-y-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-500/25 dark:bg-violet-500/10">
                    <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{t("journal.tradeDetail.editTrade")}</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t("journal.tradeDetail.symbol")}><input name="symbol" defaultValue={trade.symbol} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.side")}><select name="side" defaultValue={trade.direction} className={inputClass}><option value="BUY">{t("journal.tradeDetail.buy")}</option><option value="SELL">{t("journal.tradeDetail.sell")}</option></select></Field>
                      <Field label={t("journal.tradeDetail.status")}><select name="status" defaultValue={trade.status} className={inputClass}><option value="OPEN">{t("journal.tradeDetail.open")}</option><option value="CLOSED">{t("journal.tradeDetail.closed")}</option><option value="CANCELLED">{t("journal.tradeDetail.cancelled")}</option></select></Field>
                      <Field label={t("journal.tradeDetail.account")}><select name="accountId" defaultValue={trade.accountId} className={inputClass}>{accounts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                      <Field label={t("journal.tradeDetail.entryPrice")}><input name="entryPrice" type="number" step="any" defaultValue={toDisplay(trade.entryPrice) === "-" ? "" : toDisplay(trade.entryPrice)} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.exitPrice")}><input name="exitPrice" type="number" step="any" defaultValue={toDisplay(trade.exitPrice) === "-" ? "" : toDisplay(trade.exitPrice)} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.stopLoss")}><input name="stopLoss" type="number" step="any" defaultValue={toDisplay(levelValue(trade, "currentStopLoss", "stopLoss")) === "-" ? "" : toDisplay(levelValue(trade, "currentStopLoss", "stopLoss"))} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.takeProfit")}><input name="takeProfit" type="number" step="any" defaultValue={toDisplay(levelValue(trade, "currentTakeProfit", "takeProfit")) === "-" ? "" : toDisplay(levelValue(trade, "currentTakeProfit", "takeProfit"))} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.lotSize")}><input name="lotSize" type="number" step="any" defaultValue={toDisplay(trade.lotSize) === "-" ? "" : toDisplay(trade.lotSize)} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.riskAmount")}><input name="riskAmount" type="number" step="any" defaultValue={toDisplay(trade.riskAmount) === "-" ? "" : toDisplay(trade.riskAmount)} className={inputClass} /></Field>
                      <Field label={copy.profitLoss}><input name="profitLoss" type="number" step="any" defaultValue={toDisplay(trade.profitLoss) === "-" ? "" : toDisplay(trade.profitLoss)} className={inputClass} /></Field>
                      <Field label={t("journal.tradeDetail.setup")}><input name="setup" defaultValue={trade.setup || ""} className={inputClass} /></Field>
                    </div>
                    <Field label={t("journal.tradeDetail.notes")}><textarea name="notes" rows={3} defaultValue={trade.notes || ""} className={textareaClass} /></Field>
                    <button type="submit" disabled={saving} className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-violet-600 text-xs font-semibold text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" />{saving ? t("journal.tradeDetail.saving") : t("journal.tradeDetail.save")}</button>
                  </form>
                ) : null}
              </div>
            ) : workspaceTab === "checklist" ? (
              <div id="trade-checklist-panel" className="space-y-4">
                <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10"><ListChecks className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-950 dark:text-white">Trade Checklist</h2><p className="text-xs text-slate-500">{checklistCompletedCount} of {checklistTotalCount} complete</p></div></div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-500" style={{ width: `${checklistTotalCount ? Math.round((checklistCompletedCount / checklistTotalCount) * 100) : 0}%` }} /></div>
                <TradeChecklistPanel tradeId={trade.id} onTradeUpdated={showReviewProgress} compact />
              </div>
            ) : workspaceTab === "playbook" ? (
              <div id="playbook-review-panel" className="space-y-4">
                <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10"><BookOpenCheck className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-950 dark:text-white">Playbook</h2><p className="text-xs text-slate-500">{trade.strategyReview?.strategyNameSnapshot || "Not selected"}</p></div></div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><InspectorRow label="Plan status" value={trade.strategyReview?.followedPlan || "Not reviewed"} /><InspectorRow label="Compliance" value={trade.strategyReview ? `${trade.strategyReview.compliancePercent}%` : "-"} /><InspectorRow label="Rules followed" value={trade.strategyReview ? `${trade.strategyReview.followedRules}/${trade.strategyReview.totalRules}` : "-"} /></div>
                <TradeStrategyReviewPanel tradeId={trade.id} onReviewUpdated={handleStrategyReviewUpdated} />
              </div>
            ) : (
              <div id="psychology-review-panel" className="space-y-4">
                <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/10"><Brain className="h-5 w-5" /></div><div><h2 className="font-semibold text-slate-950 dark:text-white">Psychology Review</h2><p className="text-xs text-slate-500">Review emotion, discipline and mistakes</p></div></div>
                <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"><InspectorRow label="Emotion" value={trade.emotion || "-"} /><InspectorRow label="Mistake" value={trade.mistakes || trade.mistake || "-"} /><InspectorRow label="Followed plan" value={journalPsychology?.followedPlan === true ? "Yes" : journalPsychology?.followedPlan === false ? "No" : journalPsychology?.followedPlan === "partially" ? "Partially" : "-"} /></div>
                <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/80 p-3 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/10">
                  <div className="text-[10px] font-semibold uppercase text-fuchsia-600 dark:text-fuchsia-300">{t("journal.tradeDetail.psychologyNotes")}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-fuchsia-950 dark:text-fuchsia-100">{displayedPsychologyNotes}</p>
                </div>
                <JournalReviewForms tradeId={trade.id} psychology={journalPsychology} showImportedMt5ReviewHint={importedTrade && hasMt5PlaceholderNote(trade)} onTradeUpdated={showReviewProgress} />
              </div>
            )}
          </div>
        </aside>

        <TradeExecutionChart
          tradeId={trade.id}
          symbol={trade.symbol}
          direction={trade.direction}
          status={trade.status}
          entryPrice={trade.entryPrice}
          exitPrice={trade.exitPrice}
          stopLoss={levelValue(trade, "initialStopLoss", "stopLoss")}
          takeProfit={levelValue(trade, "initialTakeProfit", "takeProfit")}
          profitLoss={trade.profitLoss}
          riskReward={trade.rr}
          openedAt={trade.openedAt || trade.entryTime || null}
          closedAt={trade.closedAt || trade.exitTime || null}
          language={language}
          notes={hasMt5PlaceholderNote(trade) ? "" : trade.notes}
          commission={trade.commission}
          swap={trade.swap}
          onNotesSaved={(nextNotes) => setTrade((current) => ({ ...current, notes: nextNotes }))}
        />
      </div>

      {legacySectionsVisible ? (
        <>
      <div
        id="review-progress"
        className={cn(
          "scroll-mt-24 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-[#0F172A]",
          progressHighlighted && "ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-50 dark:ring-blue-300 dark:ring-offset-[#0B1220]",
          isRtl && "text-right"
        )}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <nav className="flex min-w-0 flex-wrap gap-2" aria-label="Trade review sections">
            {sectionLinks.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {section.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2 dark:border-blue-500/30 dark:bg-blue-500/10">
            <div className="min-w-[150px] flex-1">
              <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-950 dark:text-white">{copy.progressTitle}</div>
              <div className="text-sm font-bold text-blue-700 dark:text-blue-200">{reviewProgressPercent}%</div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-900">
                <div
                  className="h-full rounded-full bg-[#2563EB]"
                  style={{ width: `${reviewProgressPercent}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={completeRequirements}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-blue-500/30 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-500/10 dark:text-blue-200"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {copy.completeRequirements}
            </button>
            <button
              type="button"
              onClick={completeReview}
              disabled={!canCompleteReview || completingReview}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-3 text-xs font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completingReview ? t("journal.tradeDetail.saving") : copy.completeReview}
            </button>
          </div>
        </div>

        {missingRequirements.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-300/60 bg-amber-100/70 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <span>{copy.blockedRequirements}</span>
            <span className="font-medium">{missingRequirements.map(missingRequirementLabel).join(", ")}</span>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          {requirementSteps.map((item) => (
            <div
              key={item.label}
              title={item.reason && !item.complete ? requirementReasonLabel(item.reason) || undefined : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold",
                progressTone(item.complete, item.optional),
                item.locked && "opacity-70"
              )}
            >
              {item.complete ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{requirementStepLabel(item.label)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={cn("rounded-lg border p-4 shadow-sm", importedTrade ? "border-blue-200 bg-blue-50 dark:border-blue-500/30 dark:bg-blue-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0F172A]", isRtl && "text-right")}>
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500 dark:text-blue-300" />
          <div>
            <div className="text-sm font-semibold text-slate-950 dark:text-white">
              {copy.source}: {sourceLabel(trade, copy.manual)}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {importedTrade ? importedSourceDescription : copy.manualSourceDescription}
            </p>
          </div>
        </div>
      </div>

      {editing ? (
        <Section
          id="edit-trade"
          title={t("journal.tradeDetail.editTrade")}
          rtl={isRtl}
          actions={
            <button
              type="submit"
              form="journal-trade-edit-form"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? t("journal.tradeDetail.saving") : t("journal.tradeDetail.save")}
            </button>
          }
        >
          <form id="journal-trade-edit-form" onSubmit={saveTrade} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Field label={t("journal.tradeDetail.symbol")}>
                <input name="symbol" defaultValue={trade.symbol} className={inputClass} />
              </Field>
              <Field label={t("journal.tradeDetail.side")}>
                <select name="side" defaultValue={trade.direction} className={inputClass}>
                  <option value="BUY">{t("journal.tradeDetail.buy")}</option>
                  <option value="SELL">{t("journal.tradeDetail.sell")}</option>
                </select>
              </Field>
              <Field label={t("journal.tradeDetail.status")}>
                <select name="status" defaultValue={trade.status} className={inputClass}>
                  <option value="OPEN">{t("journal.tradeDetail.open")}</option>
                  <option value="CLOSED">{t("journal.tradeDetail.closed")}</option>
                  <option value="CANCELLED">{t("journal.tradeDetail.cancelled")}</option>
                </select>
              </Field>
              <Field label={t("journal.tradeDetail.account")}>
                {accounts.length > 0 ? (
                  <select name="accountId" defaultValue={trade.accountId} className={inputClass}>
                    {accounts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input name="accountId" defaultValue={trade.accountId} className={inputClass} />
                )}
              </Field>
              <Field label={t("journal.tradeDetail.entryPrice")}>
                <input
                  name="entryPrice"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(trade.entryPrice) === "-" ? "" : toDisplay(trade.entryPrice)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.exitPrice")}>
                <input
                  name="exitPrice"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(trade.exitPrice) === "-" ? "" : toDisplay(trade.exitPrice)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.stopLoss")}>
                <input
                  name="stopLoss"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(levelValue(trade, "currentStopLoss", "stopLoss")) === "-" ? "" : toDisplay(levelValue(trade, "currentStopLoss", "stopLoss"))}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.takeProfit")}>
                <input
                  name="takeProfit"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(levelValue(trade, "currentTakeProfit", "takeProfit")) === "-" ? "" : toDisplay(levelValue(trade, "currentTakeProfit", "takeProfit"))}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.lotSize")}>
                <input
                  name="lotSize"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(trade.lotSize) === "-" ? "" : toDisplay(trade.lotSize)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.riskAmount")}>
                <input
                  name="riskAmount"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(trade.riskAmount) === "-" ? "" : toDisplay(trade.riskAmount)}
                  className={inputClass}
                />
              </Field>
              <Field label={copy.profitLoss}>
                <input
                  name="profitLoss"
                  type="number"
                  step="any"
                  defaultValue={toDisplay(trade.profitLoss) === "-" ? "" : toDisplay(trade.profitLoss)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.entryTime")}>
                <input
                  name="entryTime"
                  type="datetime-local"
                  defaultValue={dateTimeLocalValue(trade.openedAt || trade.entryTime)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.exitTime")}>
                <input
                  name="exitTime"
                  type="datetime-local"
                  defaultValue={dateTimeLocalValue(trade.closedAt || trade.exitTime)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("journal.tradeDetail.setup")}>
                <input name="setup" defaultValue={trade.setup || ""} className={inputClass} />
              </Field>
              <Field label={t("journal.tradeDetail.emotion")}>
                <input name="emotion" defaultValue={trade.emotion || ""} className={inputClass} />
              </Field>
              <Field label={t("journal.tradeDetail.mistakes")}>
                <input
                  name="mistakes"
                  defaultValue={trade.mistakes || trade.mistake || ""}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label={t("journal.tradeDetail.notes")}>
              <textarea
                name="notes"
                rows={4}
                defaultValue={trade.notes || ""}
                className={textareaClass}
              />
            </Field>
          </form>
        </Section>
      ) : null}

      <Section
        id="summary"
        title={t("journal.tradeDetail.tradeOverview")}
        rtl={isRtl}
        collapsible
        defaultOpen={false}
        summary={`${directionLabel(trade.direction)} · ${formatNumber(trade.entryPrice, 5)} → ${formatNumber(trade.exitPrice, 5)}`}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label={t("journal.tradeDetail.symbol")} value={trade.symbol} />
          <Metric label={t("journal.tradeDetail.directionSide")} value={directionLabel(trade.direction)} />
          <Metric label={t("journal.tradeDetail.account")} value={account?.name || trade.accountId} />
          <Metric label={t("journal.tradeDetail.status")} value={statusLabel(trade.status)} />
          <Metric label={copy.source} value={sourceLabel(trade, copy.manual)} />
          <Metric label={t("journal.tradeDetail.entryPrice")} value={formatNumber(trade.entryPrice, 5)} />
          <Metric label={t("journal.tradeDetail.exitPrice")} value={formatNumber(trade.exitPrice, 5)} />
          <Metric label={copy.initialStopLoss} value={formatNumber(levelValue(trade, "initialStopLoss", "stopLoss"), 5)} className="text-red-300" />
          <Metric label={copy.currentStopLoss} value={formatNumber(levelValue(trade, "currentStopLoss", "stopLoss"), 5)} className="text-red-300" />
          <Metric label={copy.initialTakeProfit} value={formatNumber(levelValue(trade, "initialTakeProfit", "takeProfit"), 5)} className="text-emerald-300" />
          <Metric label={copy.currentTakeProfit} value={formatNumber(levelValue(trade, "currentTakeProfit", "takeProfit"), 5)} className="text-emerald-300" />
          <Metric label={t("journal.tradeDetail.lotSize")} value={formatNumber(trade.lotSize, 3)} />
          <Metric label={t("journal.tradeDetail.riskAmount")} value={formatNumber(trade.riskAmount, 2)} />
          <Metric
            label={copy.profitLoss}
            value={formatNumber(trade.profitLoss, 2)}
            className={Number(trade.profitLoss || 0) >= 0 ? "text-emerald-300" : "text-red-300"}
          />
          <Metric label={copy.rr} value={formatNumber(trade.rr, 2)} />
          <Metric label={t("journal.tradeDetail.entryTime")} value={formatDate(trade.openedAt || trade.entryTime)} />
          <Metric label={t("journal.tradeDetail.exitTime")} value={formatDate(trade.closedAt || trade.exitTime)} />
        </div>
      </Section>

      <Section
        title={copy.slTpTimeline}
        rtl={isRtl}
        collapsible
        defaultOpen={false}
        summary={`${updateLogs.length} ${copy.updates}`}
      >
        {updateLogs.length > 0 ? (
          <div className="space-y-3">
            {updateLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-[#111827] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                    log.type === "SL_CHANGED"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  )}>
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-semibold text-slate-950 dark:text-white">
                      {log.type === "SL_CHANGED" ? copy.stopLossChanged : copy.takeProfitChanged}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">
                      {changedFromToLabel(formatNumber(log.oldValue, 5), formatNumber(log.newValue, 5))}
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {formatDate(log.createdAt)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400">
            {copy.noLevelUpdates}
          </div>
        )}
      </Section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Section
          title={t("journal.tradeDetail.tradeReview")}
          rtl={isRtl}
          className="border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50/70 to-cyan-50 dark:border-blue-500/25 dark:from-blue-950/45 dark:via-slate-900 dark:to-cyan-950/30"
          titleClassName="text-blue-900 dark:text-blue-100"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Metric
              label={t("journal.tradeDetail.strategy")}
              value={toDisplay(trade.strategyReview?.strategyNameSnapshot)}
              tone="blue"
              className="text-blue-800 dark:text-blue-200"
            />
            <Metric
              label={t("journal.tradeDetail.setup")}
              value={toDisplay(trade.setup)}
              tone="cyan"
              className="text-cyan-800 dark:text-cyan-200"
            />
            <Metric
              label={t("journal.tradeDetail.mistakes")}
              value={toDisplay(trade.mistakes || trade.mistake)}
              tone="amber"
              className="text-amber-800 dark:text-amber-200"
            />
            <Metric
              label={t("journal.tradeDetail.emotionPsychologyState")}
              value={toDisplay(trade.emotion)}
              tone="rose"
              className="text-rose-800 dark:text-rose-200"
            />
          </div>
          <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/90 p-3 dark:border-indigo-500/25 dark:bg-indigo-500/10">
            <div className="text-xs font-medium uppercase text-indigo-600 dark:text-indigo-300">{t("journal.tradeDetail.notes")}</div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-indigo-950 dark:text-indigo-100">
              {displayedNotes}
            </p>
          </div>
        </Section>

        <Section
          id="psychology"
          title={t("journal.tradeDetail.psychology")}
          rtl={isRtl}
          className="border-violet-200 bg-gradient-to-br from-violet-50 via-fuchsia-50/60 to-rose-50 dark:border-violet-500/25 dark:from-violet-950/40 dark:via-slate-900 dark:to-rose-950/30"
          titleClassName="text-violet-900 dark:text-violet-100"
        >
          <div className="grid gap-3">
            <Metric
              label={t("journal.tradeDetail.emotion")}
              value={toDisplay(trade.emotion)}
              tone="violet"
              className="text-violet-800 dark:text-violet-200"
            />
            <Metric
              label={t("journal.tradeDetail.mistakeType")}
              value={toDisplay(trade.mistakes || trade.mistake)}
              tone="amber"
              className="text-amber-800 dark:text-amber-200"
            />
            <div className="rounded-lg border border-fuchsia-200 bg-fuchsia-50/90 p-3 dark:border-fuchsia-500/25 dark:bg-fuchsia-500/10">
              <div className="text-xs font-medium uppercase text-fuchsia-600 dark:text-fuchsia-300">{t("journal.tradeDetail.psychologyNotes")}</div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-fuchsia-950 dark:text-fuchsia-100">
                {displayedPsychologyNotes}
              </p>
            </div>
          </div>
        </Section>
      </div>

      <div id="psychology-review-panel" className="scroll-mt-24">
        <JournalReviewForms
          tradeId={trade.id}
          psychology={journalPsychology}
          showImportedMt5ReviewHint={importedTrade && hasMt5PlaceholderNote(trade)}
          onTradeUpdated={showReviewProgress}
        />
      </div>

      <div id="strategy-checklist" className="scroll-mt-24 space-y-5">
        <div
          dir="ltr"
          className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-left shadow-sm dark:border-blue-500/30 dark:bg-blue-500/10"
        >
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
            <div>
              <h2 className="text-base font-semibold text-slate-950 dark:text-white">
                Complete every section for a full journal analysis
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Fill in all the details on this page—including your psychology, playbook, checklist,
                strategy review, and notes. Complete trade records help your journal identify real
                patterns, measure your discipline, and show exactly what to improve in your next trade.
              </p>
            </div>
          </div>
        </div>

        <div id="trade-checklist-panel" className="scroll-mt-24">
          <TradeChecklistPanel tradeId={trade.id} onTradeUpdated={showReviewProgress} />
        </div>

        <div id="playbook-review-panel" className="scroll-mt-24">
          <TradeStrategyReviewPanel
            tradeId={trade.id}
            onReviewUpdated={handleStrategyReviewUpdated}
          />
        </div>
      </div>

      <div id="ai-review" className="scroll-mt-24">
        <TradeAIReviewPanel
          trade={trade as unknown as TradeDto}
          aiAnalysisEnabled={aiAnalysisEnabled}
          onReviewUpdated={showReviewProgress}
        />
      </div>

      <Section
        id="notes-tags"
        title={t("journal.tradeDetail.tags")}
        rtl={isRtl}
        collapsible
        defaultOpen={false}
        summary={tags || "-"}
      >
        <form onSubmit={saveTags} className="flex flex-col gap-3 md:flex-row md:items-end">
          <Field label={t("journal.tradeDetail.connectedTags")}>
            <input
              name="tags"
              defaultValue={tags}
              placeholder="breakout, london, clean setup"
              className={inputClass}
            />
          </Field>
          <button
            type="submit"
            disabled={savingTags}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {savingTags ? t("journal.tradeDetail.saving") : t("journal.tradeDetail.saveTags")}
          </button>
        </form>
      </Section>

      <Section
        id="danger-zone"
        title={copy.dangerTitle}
        rtl={isRtl}
        collapsible
        defaultOpen={false}
        summary={copy.dangerDescription}
      >
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500 dark:text-red-300" />
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-200">{copy.deleteTitle}</h3>
                <p className="mt-1 text-sm leading-6 text-red-700/80 dark:text-red-100/80">
                  {copy.deleteDescription}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmation("");
                setDeleteConfirmOpen(true);
              }}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 text-sm font-semibold text-[#EF4444] hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              {copy.openDelete}
            </button>
          </div>
        </div>
      </Section>

        </>
      ) : null}

      {deleteConfirmOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-trade-title"
            className={cn(
              "w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]",
              isRtl && "text-right"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-[#EF4444]">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 id="delete-trade-title" className="text-lg font-semibold text-slate-950 dark:text-white">
                  {copy.confirmDeleteTitle.replace("{symbol}", trade.symbol)}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {copy.confirmDeleteBody}
                </p>
              </div>
            </div>

            <label className="mt-4 block space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              {copy.confirmLabel}
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={copy.confirmPlaceholder}
                className={inputClass}
                autoFocus
              />
            </label>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmation("");
                }}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {copy.keepTrade}
              </button>
              <button
                type="button"
                onClick={deleteTrade}
                disabled={deleteConfirmation !== "DELETE"}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {copy.confirmDeleteButton}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
