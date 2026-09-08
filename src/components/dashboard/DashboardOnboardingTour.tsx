"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, GraduationCap, X } from "lucide-react";
import { START_DASHBOARD_TOUR_EVENT } from "@/components/dashboard/DashboardTutorialButton";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const STORAGE_PREFIX = "tradivix.dashboard.onboarding.v1";

type TourText = {
  title: string;
  body: string;
};

type TourStep = {
  target: string;
  en: TourText;
  fa: TourText;
};

type TourDefinition = {
  id: string;
  paths: string[];
  enIntro: string;
  faIntro: string;
  steps: TourStep[];
};

type RectSnapshot = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const tours: TourDefinition[] = [
  {
    id: "dashboard",
    paths: ["/dashboard"],
    enIntro: "Dashboard tutorial",
    faIntro: "آموزش داشبورد",
    steps: [
      {
        target: '[data-dashboard-tour="workspace"]',
        en: {
          title: "Welcome to your workspace",
          body: "This is the control area for your trading journal, account status, tools, and daily workflow.",
        },
        fa: {
          title: "به فضای کاری خوش آمدید",
          body: "اینجا مرکز کنترل ژورنال معاملاتی، وضعیت حساب، ابزارها و روند روزانه شماست.",
        },
      },
      {
        target: '[data-dashboard-tour="nav"]',
        en: {
          title: "Main dashboard tools",
          body: "Use this menu to move between signals, accounts, journal, analytics, reports, settings, and AI tools.",
        },
        fa: {
          title: "ابزارهای اصلی داشبورد",
          body: "از این منو برای رفتن به سیگنال‌ها، حساب‌ها، ژورنال، تحلیل‌ها، گزارش‌ها، تنظیمات و ابزارهای هوش مصنوعی استفاده کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="workflow"]',
        en: {
          title: "Trading workflow",
          body: "Follow this strip as your daily routine: playbook, checklist, trade journal, daily journal, analytics, and reports.",
        },
        fa: {
          title: "روند کاری معامله‌گری",
          body: "این نوار مسیر روزانه شماست: پلی‌بوک، چک‌لیست، ژورنال معاملات، ژورنال روزانه، تحلیل‌ها و گزارش‌ها.",
        },
      },
      {
        target: '[data-dashboard-tour="readiness"]',
        en: {
          title: "Start with readiness",
          body: "Before managing trades, check your daily readiness, mindset, selected playbook, and entry checklist.",
        },
        fa: {
          title: "از آمادگی روزانه شروع کنید",
          body: "قبل از مدیریت معاملات، آمادگی روزانه، وضعیت ذهنی، پلی‌بوک انتخابی و چک ورود را بررسی کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="actions"]',
        en: {
          title: "Action center",
          body: "Important next actions appear here, such as reviewing trades, completing the daily journal, connecting MT5, or checking high-impact news.",
        },
        fa: {
          title: "مرکز اقدام",
          body: "کارهای مهم بعدی اینجا نمایش داده می‌شوند؛ مثل بررسی معاملات، تکمیل ژورنال روزانه، اتصال MT5 یا بررسی اخبار پراثر.",
        },
      },
      {
        target: '[data-dashboard-tour="performance"]',
        en: {
          title: "Performance snapshot",
          body: "Use these cards to quickly read total PnL, win rate, open trades, and trades that still need review.",
        },
        fa: {
          title: "خلاصه عملکرد",
          body: "از این کارت‌ها برای دیدن سریع سود و زیان، نرخ برد، معاملات باز و معاملات نیازمند بررسی استفاده کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="mt5"]',
        en: {
          title: "MT5 connection package",
          body: "Download the MT5 package here when you want to connect your platform and import trades automatically.",
        },
        fa: {
          title: "پکیج اتصال MT5",
          body: "برای اتصال پلتفرم و ورود خودکار معاملات، پکیج MT5 را از این بخش دانلود کنید.",
        },
      },
    ],
  },
  {
    id: "journal-trades",
    paths: ["/journal"],
    enIntro: "Trade journal tutorial",
    faIntro: "آموزش ژورنال معاملات",
    steps: [
      {
        target: '[data-dashboard-tour="journal-title"]',
        en: {
          title: "Trade journal purpose",
          body: "This page is where every manual or MT5 trade becomes structured data for review, analytics, and reporting.",
        },
        fa: {
          title: "هدف ژورنال معاملات",
          body: "اینجا هر معامله دستی یا واردشده از MT5 به داده منظم برای بررسی، تحلیل و گزارش‌گیری تبدیل می‌شود.",
        },
      },
      {
        target: '[data-dashboard-tour="journal-manual-entry"]',
        en: {
          title: "Add or import trades",
          body: "Use this form to add a manual trade. Trades imported from MT5 also appear in the same journal list after sync.",
        },
        fa: {
          title: "ثبت یا ورود معامله",
          body: "از این فرم معامله دستی ثبت می‌کنید. معاملات واردشده از MT5 هم بعد از همگام‌سازی در همین لیست نمایش داده می‌شوند.",
        },
      },
      {
        target: '[data-dashboard-tour="journal-summary"]',
        en: {
          title: "Quick result snapshot",
          body: "These cards summarize total trades, win rate, net PnL, and profit factor for the current filter.",
        },
        fa: {
          title: "خلاصه سریع نتیجه",
          body: "این کارت‌ها تعداد معاملات، نرخ برد، سود و زیان خالص و فاکتور سود را برای فیلتر فعلی نشان می‌دهند.",
        },
      },
      {
        target: '[data-dashboard-tour="journal-filters"]',
        en: {
          title: "Find the exact sample",
          body: "Filter by symbol, status, result, review state, source, direction, and date before you analyze or export.",
        },
        fa: {
          title: "پیدا کردن نمونه دقیق",
          body: "قبل از تحلیل یا خروجی گرفتن، معاملات را بر اساس نماد، وضعیت، نتیجه، بررسی، منبع، جهت و تاریخ فیلتر کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="journal-trade-list"]',
        en: {
          title: "Open a trade to complete the story",
          body: "Open each trade to complete screenshots, strategy review, checklist results, emotions, mistakes, notes, and AI review.",
        },
        fa: {
          title: "معامله را باز کنید تا داستان کامل شود",
          body: "هر معامله را باز کنید تا اسکرین‌شات، بررسی استراتژی، چک‌لیست، احساسات، اشتباهات، یادداشت و بررسی AI را تکمیل کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="workflow"]',
        en: {
          title: "Where this goes next",
          body: "After trades are completed and reviewed, the data feeds Analytics and Reports so you can see patterns and export results.",
        },
        fa: {
          title: "مرحله بعدی چیست؟",
          body: "بعد از تکمیل و بررسی معاملات، داده‌ها وارد تحلیل‌ها و گزارش‌ها می‌شوند تا الگوها را ببینید و خروجی بگیرید.",
        },
      },
    ],
  },
  {
    id: "journal-analytics",
    paths: ["/journal/analytics"],
    enIntro: "Analytics tutorial",
    faIntro: "آموزش تحلیل‌ها",
    steps: [
      {
        target: '[data-dashboard-tour="analytics-title"]',
        en: {
          title: "Analytics turns records into decisions",
          body: "This page answers what is working, what is hurting performance, and which habits should change next.",
        },
        fa: {
          title: "تحلیل‌ها داده را به تصمیم تبدیل می‌کند",
          body: "این صفحه نشان می‌دهد چه چیزی جواب می‌دهد، چه چیزی به عملکرد آسیب می‌زند و عادت بعدی که باید اصلاح شود چیست.",
        },
      },
      {
        target: '[data-dashboard-tour="analytics-filters"]',
        en: {
          title: "Filter the analysis sample",
          body: "Choose the period, symbol, direction, strategy, setup, mistake, emotion, session, review state, or checklist status.",
        },
        fa: {
          title: "نمونه تحلیل را فیلتر کنید",
          body: "بازه زمانی، نماد، جهت، استراتژی، ستاپ، اشتباه، احساس، سشن، وضعیت بررسی یا وضعیت چک‌لیست را انتخاب کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="analytics-tabs"]',
        en: {
          title: "Three analysis levels",
          body: "Overview shows performance, Behavior shows repeated mistakes and emotions, and Advanced shows deeper timing, drawdown, and review tools.",
        },
        fa: {
          title: "سه سطح تحلیل",
          body: "Overview عملکرد را نشان می‌دهد، Behavior اشتباهات و احساسات تکراری را، و Advanced زمان‌بندی، افت سرمایه و ابزارهای بررسی عمیق‌تر را.",
        },
      },
      {
        target: '[data-dashboard-tour="analytics-stats"]',
        en: {
          title: "Core metrics",
          body: "Start with net PnL, win rate, profit factor, expectancy, drawdown, and average RR before judging a strategy.",
        },
        fa: {
          title: "شاخص‌های اصلی",
          body: "قبل از قضاوت درباره استراتژی، سود خالص، نرخ برد، فاکتور سود، امید ریاضی، افت سرمایه و میانگین RR را ببینید.",
        },
      },
      {
        target: '[data-dashboard-tour="analytics-equity"]',
        en: {
          title: "Equity curve",
          body: "The equity curve shows whether performance is improving smoothly or being damaged by specific periods or trade clusters.",
        },
        fa: {
          title: "منحنی سرمایه",
          body: "منحنی سرمایه نشان می‌دهد عملکرد آرام رشد می‌کند یا در دوره‌ها و خوشه‌های خاصی از معاملات آسیب می‌بیند.",
        },
      },
      {
        target: '[data-dashboard-tour="analytics-playbook"]',
        en: {
          title: "Find the best playbook",
          body: "Compare symbols and playbooks to see which setups deserve more focus and which ones should be paused or revised.",
        },
        fa: {
          title: "بهترین پلی‌بوک را پیدا کنید",
          body: "نمادها و پلی‌بوک‌ها را مقایسه کنید تا ببینید کدام ستاپ ارزش تمرکز بیشتر دارد و کدام باید متوقف یا اصلاح شود.",
        },
      },
    ],
  },
  {
    id: "journal-reports",
    paths: ["/dashboard/reports"],
    enIntro: "Reports tutorial",
    faIntro: "آموزش گزارش‌گیری",
    steps: [
      {
        target: '[data-dashboard-tour="reports-title"]',
        en: {
          title: "Final output of your tools",
          body: "Reports combine trades, analytics, playbooks, checklists, screenshots, AI reviews, and daily notes into one exportable view.",
        },
        fa: {
          title: "خروجی نهایی ابزارها",
          body: "گزارش‌ها معاملات، تحلیل‌ها، پلی‌بوک‌ها، چک‌لیست‌ها، اسکرین‌شات‌ها، بررسی AI و یادداشت‌های روزانه را در یک خروجی جمع می‌کنند.",
        },
      },
      {
        target: '[data-dashboard-tour="reports-actions"]',
        en: {
          title: "Export and print",
          body: "Use these actions to print, save PDF from the browser, or download CSV for Excel and external analysis.",
        },
        fa: {
          title: "خروجی و چاپ",
          body: "از این دکمه‌ها برای چاپ، ذخیره PDF از مرورگر یا دانلود CSV برای Excel و تحلیل بیرونی استفاده کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="reports-filters"]',
        en: {
          title: "Build the report sample",
          body: "Select period, account, playbook, symbol, side, session, result, review status, screenshots, source, and AI score range.",
        },
        fa: {
          title: "نمونه گزارش را بسازید",
          body: "بازه، حساب، پلی‌بوک، نماد، جهت، سشن، نتیجه، وضعیت بررسی، اسکرین‌شات، منبع و بازه امتیاز AI را انتخاب کنید.",
        },
      },
      {
        target: '[data-dashboard-tour="reports-stats"]',
        en: {
          title: "Report headline metrics",
          body: "These numbers are the high-level story: net PnL, win rate, profit factor, expectancy, total trades, and average RR.",
        },
        fa: {
          title: "شاخص‌های اصلی گزارش",
          body: "این اعداد داستان کلی را نشان می‌دهند: سود خالص، نرخ برد، فاکتور سود، امید ریاضی، تعداد معاملات و میانگین RR.",
        },
      },
      {
        target: '[data-dashboard-tour="reports-executive"]',
        en: {
          title: "Executive summary",
          body: "This section turns the report into strengths, risks, and a practical action plan for the next trading cycle.",
        },
        fa: {
          title: "خلاصه مدیریتی",
          body: "این بخش گزارش را به نقاط قوت، ریسک‌ها و برنامه اقدام عملی برای چرخه معاملاتی بعدی تبدیل می‌کند.",
        },
      },
      {
        target: '[data-dashboard-tour="reports-files"]',
        en: {
          title: "Per-trade report files",
          body: "Each trade keeps its own report details: execution, plan, checklist, journal notes, screenshots, and AI analysis.",
        },
        fa: {
          title: "فایل گزارش هر معامله",
          body: "هر معامله جزئیات گزارش خودش را دارد: اجرا، پلن، چک‌لیست، یادداشت ژورنال، اسکرین‌شات و تحلیل AI.",
        },
      },
      {
        target: '[data-dashboard-tour="reports-final"]',
        en: {
          title: "The final destination",
          body: "The end result is a clean review package you can present, archive, compare across periods, and use to improve the next plan.",
        },
        fa: {
          title: "مقصد نهایی",
          body: "نتیجه نهایی یک پکیج مرور تمیز است که می‌توانید ارائه دهید، آرشیو کنید، بین بازه‌ها مقایسه کنید و برای اصلاح پلن بعدی استفاده کنید.",
        },
      },
    ],
  },
];

function findTour(pathname: string) {
  return tours.find((tour) => tour.paths.includes(pathname)) || null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function snapshotElement(selector: string): RectSnapshot | null {
  const element = document.querySelector(selector);

  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function isTourBlockedByActiveUi() {
  const activeElement = document.activeElement;
  const activeSelectors =
    "form, [role='dialog'], [aria-modal='true'], dialog, [data-tutorial-blocker='true'], [data-primary-action='true']";

  if (activeElement instanceof HTMLElement && activeElement.closest(activeSelectors)) {
    return true;
  }

  return Boolean(
    document.querySelector(
      "[role='dialog'], [aria-modal='true'], dialog[open], [data-tutorial-blocker='true']"
    )
  );
}

export function DashboardOnboardingTour({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const activeTour = findTour(pathname);
  const storageUser = userId || "guest";
  const isRtl = language === "fa";
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<RectSnapshot | null>(null);
  // Completion belongs to the user, not to an individual sidebar page.
  // The tutorial button still opens the tour for whichever page is active.
  const storageKey = `${STORAGE_PREFIX}:${storageUser}`;
  const tourSteps = activeTour?.steps || [];
  const step = tourSteps[stepIndex];
  const copy = step?.[language];

  const labels = useMemo(
    () =>
      language === "fa"
        ? {
            intro: activeTour?.faIntro || "آموزش",
            skip: "رد کردن",
            previous: "قبلی",
            next: "بعدی",
            finish: "پایان آموزش",
            progress: "مرحله",
          }
        : {
            intro: activeTour?.enIntro || "Tutorial",
            skip: "Skip",
            previous: "Back",
            next: "Next",
            finish: "Finish",
            progress: "Step",
          },
    [activeTour, language]
  );

  const completeTour = useCallback(() => {
    try {
      window.localStorage.setItem(storageKey, "completed");
    } catch {}

    setOpen(false);
  }, [storageKey]);

  const refreshTarget = useCallback(() => {
    if (!step) {
      return;
    }

    setTargetRect(snapshotElement(step.target));
  }, [step]);

  useEffect(() => {
    if (!activeTour) {
      setOpen(false);
      return;
    }

    setStepIndex(0);
    setTargetRect(null);

    try {
      const isCompleted = window.localStorage.getItem(storageKey) === "completed";
      const hasLegacyCompletion = tours.some(
        (tour) =>
          window.localStorage.getItem(`${STORAGE_PREFIX}:${tour.id}:${storageUser}`) === "completed"
      );

      if (!isCompleted && hasLegacyCompletion) {
        window.localStorage.setItem(storageKey, "completed");
      }
    } catch {}
  }, [activeTour, pathname, storageKey, storageUser]);

  useEffect(() => {
    if (!activeTour) {
      return;
    }

    const startTour = () => {
      if (isTourBlockedByActiveUi()) {
        return;
      }

      setStepIndex(0);
      setTargetRect(null);
      setOpen(true);
    };

    window.addEventListener(START_DASHBOARD_TOUR_EVENT, startTour);

    return () => window.removeEventListener(START_DASHBOARD_TOUR_EVENT, startTour);
  }, [activeTour]);

  useEffect(() => {
    if (!open || !step) {
      return;
    }

    const target = document.querySelector(step.target);
    target?.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
    refreshTarget();

    const lateRefreshId = window.setTimeout(refreshTarget, 420);
    window.addEventListener("resize", refreshTarget);
    window.addEventListener("scroll", refreshTarget, true);

    return () => {
      window.clearTimeout(lateRefreshId);
      window.removeEventListener("resize", refreshTarget);
      window.removeEventListener("scroll", refreshTarget, true);
    };
  }, [open, refreshTarget, step]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        completeTour();
      }

      if (event.key === "ArrowRight") {
        setStepIndex((current) => Math.min(current + 1, tourSteps.length - 1));
      }

      if (event.key === "ArrowLeft") {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [completeTour, open, tourSteps.length]);

  if (!open || !activeTour || !step || !copy) {
    return null;
  }

  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const cardWidth = Math.min(390, viewportWidth - 32);
  const isLastStep = stepIndex === tourSteps.length - 1;
  const tooltipTop = targetRect
    ? targetRect.top + targetRect.height + 18 > viewportHeight - 220
      ? clamp(targetRect.top - 236, 16, viewportHeight - 236)
      : clamp(targetRect.top + targetRect.height + 18, 16, viewportHeight - 236)
    : clamp(viewportHeight / 2 - 130, 16, viewportHeight - 236);
  const tooltipLeft = targetRect
    ? clamp(isRtl ? targetRect.left + targetRect.width - cardWidth : targetRect.left, 16, viewportWidth - cardWidth - 16)
    : clamp(viewportWidth / 2 - cardWidth / 2, 16, viewportWidth - cardWidth - 16);

  return (
    <div className="fixed inset-0 z-[80]" dir={isRtl ? "rtl" : "ltr"}>
      {targetRect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-blue-300 ring-offset-2 ring-offset-blue-950/20 transition-all"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.68)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-slate-950/70" />
      )}

      <section
        aria-live="polite"
        className="fixed rounded-xl border border-blue-500/30 bg-white p-4 text-slate-950 shadow-2xl dark:bg-[#0F172A] dark:text-white"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: cardWidth,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              <GraduationCap className="h-4 w-4" />
              {labels.intro}
            </div>
            <h2 className="mt-3 text-lg font-bold leading-7">{copy.title}</h2>
          </div>
          <button
            type="button"
            onClick={completeTour}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={labels.skip}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{copy.body}</p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {labels.progress} {stepIndex + 1} / {tourSteps.length}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={stepIndex === 0}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold transition dark:border-slate-800",
                stepIndex === 0
                  ? "cursor-not-allowed text-slate-300 dark:text-slate-700"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              )}
            >
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {labels.previous}
            </button>
            <button
              type="button"
              onClick={completeTour}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              {labels.skip}
            </button>
            <button
              type="button"
              onClick={() => (isLastStep ? completeTour() : setStepIndex((current) => current + 1))}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {isLastStep ? labels.finish : labels.next}
              {isLastStep ? (
                <Check className="h-4 w-4" />
              ) : isRtl ? (
                <ArrowLeft className="h-4 w-4" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
