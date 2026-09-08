"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gauge,
  ListChecks,
  Lock,
  PlaySquare,
  PlugZap,
  RefreshCw,
} from "lucide-react";
import { START_DASHBOARD_TOUR_EVENT } from "@/components/dashboard/DashboardTutorialButton";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const TRAINING_PROGRESS_REFRESH_MS = 7000;

type TrainingStep = {
  id: string;
  href: string;
  aliases?: string[];
  exact?: boolean;
  excludePrefixes?: string[];
  completionKey: TrainingCompletionKey;
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  icon: typeof Gauge;
};

type TrainingCompletionKey =
  | "dashboardVisited"
  | "accountConnected"
  | "playbookCreated"
  | "tradeCreated"
  | "tradeChecklistCompleted"
  | "dailyJournalCompleted"
  | "analyticsReady"
  | "reportReady";

type TrainingProgress = Record<TrainingCompletionKey, boolean> & {
  hrefs?: {
    firstTrade?: string;
    tradeChecklist?: string;
  };
};

type TrainingProgressResponse = {
  success?: boolean;
  data?: TrainingProgress;
};

const emptyProgress: TrainingProgress = {
  dashboardVisited: true,
  accountConnected: false,
  playbookCreated: false,
  tradeCreated: false,
  tradeChecklistCompleted: false,
  dailyJournalCompleted: false,
  analyticsReady: false,
  reportReady: false,
};

const trainingSteps: TrainingStep[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    exact: true,
    completionKey: "dashboardVisited",
    titleEn: "Dashboard overview",
    titleFa: "آشنایی با داشبورد",
    descriptionEn: "Start from the main workspace and understand today's status and next action.",
    descriptionFa: "از فضای اصلی شروع کنید و وضعیت امروز و اقدام بعدی را ببینید.",
    icon: Gauge,
  },
  {
    id: "accounts",
    href: "/dashboard/accounts",
    completionKey: "accountConnected",
    titleEn: "Trading account and MT5",
    titleFa: "حساب معاملاتی و MT5",
    descriptionEn:
      "Enter the connection key in MetaTrader, then place your first MT5 trade. The next step stays locked until that trade is imported.",
    descriptionFa:
      "کلید اتصال را داخل متاتریدر وارد کنید، سپس اولین معامله MT5 را انجام دهید. تا وقتی این معامله وارد ژورنال نشود، مرحله بعد باز نمی‌شود.",
    icon: PlugZap,
  },
  {
    id: "playbooks",
    href: "/journal/playbooks",
    completionKey: "playbookCreated",
    titleEn: "Playbook",
    titleFa: "پلی‌بوک",
    descriptionEn: "Define the strategy rules before trades are judged.",
    descriptionFa: "قبل از ارزیابی معاملات، قوانین استراتژی را مشخص کنید.",
    icon: PlaySquare,
  },
  {
    id: "trades",
    href: "/journal",
    aliases: ["/dashboard/trades"],
    excludePrefixes: ["/journal/analytics", "/journal/calendar", "/journal/checklists", "/journal/playbooks"],
    completionKey: "tradeCreated",
    titleEn: "Trades journal",
    titleFa: "ژورنال معاملات",
    descriptionEn: "Add or import at least one trade before checklist review starts.",
    descriptionFa: "حداقل یک معامله ثبت یا وارد کنید تا بررسی چک‌لیست شروع شود.",
    icon: ListChecks,
  },
  {
    id: "checklists",
    href: "/journal",
    completionKey: "tradeChecklistCompleted",
    titleEn: "Trade checklist",
    titleFa: "چک‌لیست معامله",
    descriptionEn: "Complete the checklist attached to a real trade.",
    descriptionFa: "چک‌لیست متصل به یک معامله واقعی را کامل کنید.",
    icon: ClipboardCheck,
  },
  {
    id: "daily-journal",
    href: "/dashboard/daily-journal",
    completionKey: "dailyJournalCompleted",
    titleEn: "Daily journal",
    titleFa: "ژورنال روزانه",
    descriptionEn: "Complete the daily notes that explain your decisions and mindset.",
    descriptionFa: "یادداشت‌های روزانه را برای توضیح تصمیم‌ها و وضعیت ذهنی کامل کنید.",
    icon: BookOpenCheck,
  },
  {
    id: "analytics",
    href: "/journal/analytics",
    completionKey: "analyticsReady",
    titleEn: "Analytics",
    titleFa: "تحلیل‌ها",
    descriptionEn: "Read the patterns, mistakes, and performance signals from your records.",
    descriptionFa: "الگوها، اشتباهات و نشانه‌های عملکرد را از روی داده‌ها بررسی کنید.",
    icon: BarChart3,
  },
  {
    id: "reports",
    href: "/dashboard/reports",
    completionKey: "reportReady",
    titleEn: "Reports",
    titleFa: "گزارش نهایی",
    descriptionEn: "Finish with the report page and export a complete review package.",
    descriptionFa: "در صفحه گزارش، خروجی نهایی و قابل ارائه را آماده کنید.",
    icon: FileText,
  },
];

function getStepLabel(step: TrainingStep, language: "en" | "fa") {
  return language === "fa"
    ? { title: step.titleFa, description: step.descriptionFa }
    : { title: step.titleEn, description: step.descriptionEn };
}

function isStepPath(pathname: string, step: TrainingStep) {
  if (step.excludePrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }

  return [step.href, ...(step.aliases || [])].some((path) =>
    step.exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  );
}

function isTradeDetailPath(pathname: string) {
  return /^\/journal\/[^/]+/.test(pathname) && ![
    "/journal/analytics",
    "/journal/calendar",
    "/journal/checklists",
    "/journal/playbooks",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function hrefForStep(step: TrainingStep, progress: TrainingProgress) {
  if (step.id === "checklists") {
    return progress.hrefs?.tradeChecklist || step.href;
  }

  return step.href;
}

export function DashboardTrainingPath({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const shouldShowTrainingPath = normalizedPathname === "/dashboard";
  const isRtl = language === "fa";
  const containerRef = useRef<HTMLElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress>(emptyProgress);
  const activeStepIndex = trainingSteps.findIndex((step) => !progress[step.completionKey]);
  const hasFinished = activeStepIndex === -1;
  const currentStepIndex = hasFinished ? trainingSteps.length - 1 : activeStepIndex;
  const currentStep = trainingSteps[currentStepIndex];
  const currentPageStepIndex =
    currentStep.id === "checklists" && (pathname === "/journal" || isTradeDetailPath(pathname))
      ? currentStepIndex
      : trainingSteps.findIndex((step) => isStepPath(pathname, step));
  const isOnCurrentStepPage = currentPageStepIndex === currentStepIndex;
  const isOnLockedTrainingPage =
    currentPageStepIndex > -1 && currentPageStepIndex > currentStepIndex && !hasFinished;
  const isFinalStep = currentStep.id === "reports";
  const isOnFinalStepPage = isFinalStep && isOnCurrentStepPage;
  const trainingComplete = hasFinished || isOnFinalStepPage;
  const completedCount = trainingComplete ? trainingSteps.length : currentStepIndex;
  const progressPercent = Math.round((completedCount / trainingSteps.length) * 100);
  const currentHref = hrefForStep(currentStep, progress);

  const labels = useMemo(
    () =>
      language === "fa"
        ? {
            title: "مسیر آموزش داشبورد",
            subtitle: "مراحل باید به ترتیب انجام شوند؛ تا مرحله فعلی کامل نشود، مرحله بعدی در مسیر آموزش باز نمی‌شود.",
            step: "مرحله",
            of: "از",
            done: "انجام شد",
            current: "مرحله فعلی",
            locked: "قفل",
            lastStep: "آخرین مرحله",
            goToCurrent: "رفتن به مرحله فعلی",
            waiting: "بعد از تکمیل واقعی، مرحله بعد باز می‌شود",
            finishedTitle: "مسیر آموزش کامل شد",
            finishedBody: "گزارش نهایی آخر مسیر آموزش است؛ بعد از این مرحله اجباری دیگری باقی نمی‌ماند.",
            openReport: "باز کردن گزارش",
            startNextCycle: "شروع چرخه بعدی",
            afterFinalTitle: "بعد از گزارش نهایی",
            afterFinalBody: "حالا می‌توانید خروجی PDF یا CSV بگیرید، برنامه اقدام را مرور کنید، یا از داشبورد چرخه معاملاتی بعدی را شروع کنید.",
            saveReport: "خروجی گزارش",
            reviewInsights: "مرور تحلیل‌ها",
            refresh: "بررسی دوباره وضعیت",
            lockedPageNotice: "برای ادامه آموزش، اول مرحله فعلی را کامل کنید.",
            checking: "در حال بررسی...",
          }
        : {
            title: "Dashboard training path",
            subtitle: "Steps must be completed in order. The next page stays locked in training until the current step is done.",
            step: "Step",
            of: "of",
            done: "Done",
            current: "Current step",
            locked: "Locked",
            lastStep: "Last step",
            goToCurrent: "Go to current step",
            waiting: "The next step unlocks after the real task is completed",
            finishedTitle: "Training path complete",
            finishedBody: "Final reports are the end of the training path. No required step remains after this.",
            openReport: "Open report",
            startNextCycle: "Start next cycle",
            afterFinalTitle: "After the final report",
            afterFinalBody: "You can export PDF or CSV, review the action plan, or return to the dashboard to start the next trading cycle.",
            saveReport: "Report export",
            reviewInsights: "Review analytics",
            refresh: "Check status again",
            lockedPageNotice: "Complete the current step first to continue training.",
            checking: "Checking...",
          },
    [language]
  );

  const loadProgress = useCallback(async () => {
    if (!shouldShowTrainingPath) {
      setHydrated(true);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/dashboard/training-progress", {
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as TrainingProgressResponse;

      if (payload.success && payload.data) {
        setProgress({ ...emptyProgress, ...payload.data });
      }
    } catch {
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, [shouldShowTrainingPath]);

  useEffect(() => {
    if (!shouldShowTrainingPath) {
      setHydrated(true);
      return;
    }

    void loadProgress();
    setHydrated(true);
  }, [loadProgress, pathname, shouldShowTrainingPath, userId]);

  useEffect(() => {
    if (!shouldShowTrainingPath) {
      return;
    }

    const focusTrainingPath = () => {
      void loadProgress();
      containerRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      containerRef.current?.focus({ preventScroll: true });
    };

    window.addEventListener(START_DASHBOARD_TOUR_EVENT, focusTrainingPath);

    return () => window.removeEventListener(START_DASHBOARD_TOUR_EVENT, focusTrainingPath);
  }, [loadProgress, shouldShowTrainingPath]);

  useEffect(() => {
    if (!shouldShowTrainingPath) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadProgress();
      }
    }, TRAINING_PROGRESS_REFRESH_MS);
    const handleFocus = () => void loadProgress();

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadProgress, shouldShowTrainingPath]);

  if (!shouldShowTrainingPath || !hydrated) {
    return null;
  }

  return (
    <section
      ref={containerRef}
      tabIndex={-1}
      className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-slate-800 dark:bg-[#0F172A]"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className={cn("min-w-0", isRtl && "text-right")}>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-950 dark:text-white">{labels.title}</h2>
            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
              {labels.step} {trainingComplete ? trainingSteps.length : currentStepIndex + 1} {labels.of}{" "}
              {trainingSteps.length}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {trainingComplete ? labels.finishedBody : labels.subtitle}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {trainingComplete ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              <Gauge className="h-4 w-4" />
              {labels.startNextCycle}
            </Link>
          ) : isOnCurrentStepPage ? (
            <button
              type="button"
              onClick={loadProgress}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              {loading ? labels.checking : labels.waiting}
            </button>
          ) : (
            <Link
              href={currentHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              {isRtl ? <ArrowLeft className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {labels.goToCurrent}
            </Link>
          )}

          <button
            type="button"
            onClick={loadProgress}
            disabled={loading}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={labels.refresh}
            title={labels.refresh}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {isOnLockedTrainingPage ? (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
          {labels.lockedPageNotice}
        </div>
      ) : null}

      {trainingComplete ? (
        <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-50/80 p-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100">
          <div className={cn("font-extrabold", isRtl && "text-right")}>{labels.afterFinalTitle}</div>
          <p className={cn("mt-1 leading-6", isRtl && "text-right")}>{labels.afterFinalBody}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/dashboard/reports"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition hover:bg-blue-500"
            >
              <FileText className="h-4 w-4" />
              {labels.saveReport}
            </Link>
            <Link
              href="/journal/analytics"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-500/15"
            >
              <BarChart3 className="h-4 w-4" />
              {labels.reviewInsights}
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 px-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 dark:text-emerald-100 dark:hover:bg-emerald-500/15"
            >
              <Gauge className="h-4 w-4" />
              {labels.startNextCycle}
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2 lg:grid-cols-4">
        {trainingSteps.map((step, index) => {
          const Icon = step.icon;
          const copy = getStepLabel(step, language);
          const isLastStep = index === trainingSteps.length - 1;
          const completed = trainingComplete || index < currentStepIndex;
          const current = !trainingComplete && index === currentStepIndex;
          const finalCurrent = isOnFinalStepPage && isLastStep;
          const unlocked = completed || current || trainingComplete;
          const stepHref = hrefForStep(step, progress);
          const StepContent = (
            <>
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black",
                    completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : current
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-500"
                  )}
                >
                  {completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </span>
                <div className={cn("min-w-0 flex-1", isRtl && "text-right")}>
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        unlocked ? "text-blue-500 dark:text-blue-300" : "text-slate-400 dark:text-slate-600"
                      )}
                    />
                    <h3
                      className={cn(
                        "truncate text-sm font-bold",
                        unlocked ? "text-slate-950 dark:text-white" : "text-slate-400 dark:text-slate-600"
                      )}
                    >
                      {copy.title}
                    </h3>
                  </div>
                  <p
                    className={cn(
                      "mt-1 line-clamp-3 text-xs leading-5",
                      unlocked ? "text-slate-500 dark:text-slate-400" : "text-slate-400 dark:text-slate-600"
                    )}
                  >
                    {copy.description}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs font-bold">
                <span
                  className={cn(
                    "rounded-md px-2 py-1",
                    finalCurrent
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : completed
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                      : current
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {finalCurrent ? labels.lastStep : completed ? labels.done : current ? labels.current : labels.locked}
                </span>
                {!unlocked ? <Lock className="h-4 w-4 text-slate-400 dark:text-slate-600" /> : null}
              </div>
            </>
          );

          const className = cn(
            "rounded-lg border p-3 transition",
            current
              ? "border-blue-500/50 bg-blue-50/70 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:ring-blue-500/20"
              : completed
                ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10"
                : "border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-[#111827]",
            unlocked
              ? "hover:border-blue-400 hover:bg-blue-50 dark:hover:border-blue-500/50 dark:hover:bg-blue-500/10"
              : "cursor-not-allowed opacity-70"
          );

          return unlocked ? (
            <Link key={step.id} href={stepHref} className={className}>
              {StepContent}
            </Link>
          ) : (
            <div key={step.id} className={className} aria-disabled="true">
              {StepContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
