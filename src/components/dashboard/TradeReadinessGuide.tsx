"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ListChecks,
  ShieldCheck,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export type ScenarioId = "trend" | "range" | "news" | "wait";
type DecisionId = "ready" | "caution" | "wait";

type GuideState = {
  mindset: Record<string, boolean>;
  checklist: Record<string, boolean>;
  scenario: ScenarioId;
};

export type ReadinessSummary = {
  decision: DecisionId;
  decisionLabel: string;
  decisionHint: string;
  decisionToneClass: string;
  readinessScore: number;
  mindsetCompleted: number;
  mindsetTotal: number;
  checklistCompleted: number;
  checklistTotal: number;
  selectedPlaybook: string;
  selectedPlaybookDescription: string;
  mainReason: string;
};

const defaultState: GuideState = {
  mindset: {
    calm: false,
    noRevenge: false,
    focused: false,
    riskAccepted: false,
  },
  checklist: {
    direction: false,
    entry: false,
    stopLoss: false,
    takeProfit: false,
    rr: false,
    newsChecked: false,
  },
  scenario: "trend",
};

const enCopy = {
  title: "Today's Readiness",
  subtitle: "Set today's mindset, market scenario, and quick entry checks before taking risk.",
  close: "Close",
  previous: "Back",
  next: "Next",
  finish: "Finish",
  step: "Step",
  finalDecision: "Final decision",
  score: "Readiness",
  ready: "Trade allowed",
  caution: "Trade with reduced size",
  wait: "Wait, do not enter yet",
  readyHint: "Today's readiness and entry checks are aligned.",
  cautionHint: "Some checks need attention before full risk.",
  waitHint: "A required step is missing or risk is elevated.",
  missingMindset: "Today's mindset check is incomplete.",
  missingEntry: "Entry, stop loss, and news checks must be complete.",
  waitingPlaybook: "Today's playbook is set to wait.",
  newsRisk: "High-impact news is nearby.",
  aligned: "Core checks are aligned for today's plan.",
  mindsetTitle: "Today's Mindset",
  mindsetSubtitle: "Check your daily state before looking for an entry.",
  playbookTitle: "Today's Playbook",
  playbookSubtitle: "Choose one market scenario for now.",
  checklistTitle: "Quick Entry Check",
  checklistSubtitle: "Core items before accepting a signal or opening a trade.",
  mindsetItems: {
    calm: "I am calm, not rushing.",
    noRevenge: "I am not trying to recover a loss.",
    focused: "I can follow the plan without distraction.",
    riskAccepted: "I accept the risk before entry.",
  },
  scenarios: {
    trend: {
      title: "Trend setup",
      description: "Trade only with the main direction after confirmation.",
    },
    range: {
      title: "Range setup",
      description: "Trade only from clear support or resistance.",
    },
    news: {
      title: "News risk",
      description: "Avoid fresh entries or reduce size around major events.",
    },
    wait: {
      title: "No clear setup",
      description: "Stand aside until the plan becomes obvious.",
    },
  },
  checklistItems: {
    direction: "Market direction is clear.",
    entry: "Entry price is defined.",
    stopLoss: "Stop loss is defined.",
    takeProfit: "Take profit is defined.",
    rr: "Risk/reward is acceptable.",
    newsChecked: "News risk has been checked.",
  },
};

const faCopy = {
  title: "آمادگی امروز",
  subtitle: "قبل از پذیرش ریسک، وضعیت ذهنی امروز، سناریوی بازار و چک سریع ورود را ثبت کنید.",
  close: "بستن",
  previous: "قبلی",
  next: "بعدی",
  finish: "پایان",
  step: "مرحله",
  finalDecision: "تصمیم نهایی",
  score: "آمادگی",
  ready: "معامله مجاز است",
  caution: "با حجم کمتر معامله کن",
  wait: "صبر کن، هنوز وارد نشو",
  readyHint: "آمادگی امروز و چک‌های ورود با برنامه هماهنگ هستند.",
  cautionHint: "قبل از ریسک کامل، چند مورد نیاز به توجه دارد.",
  waitHint: "یک مرحله ضروری ناقص است یا ریسک بالاست.",
  missingMindset: "وضعیت ذهنی امروز کامل نشده است.",
  missingEntry: "ورود، حد ضرر و بررسی خبر باید کامل باشند.",
  waitingPlaybook: "پلی‌بوک امروز روی حالت صبر تنظیم شده است.",
  newsRisk: "خبر پراثر نزدیک است.",
  aligned: "چک‌های اصلی با برنامه امروز هماهنگ هستند.",
  mindsetTitle: "وضعیت ذهنی امروز",
  mindsetSubtitle: "قبل از جست‌وجوی ورود، وضعیت ذهنی روزانه خود را بررسی کنید.",
  playbookTitle: "پلی‌بوک امروز",
  playbookSubtitle: "فعلاً فقط یک سناریوی بازار را انتخاب کنید.",
  checklistTitle: "چک سریع ورود",
  checklistSubtitle: "موارد اصلی قبل از قبول سیگنال یا باز کردن معامله.",
  mindsetItems: {
    calm: "آرام هستم و عجله ندارم.",
    noRevenge: "برای جبران ضرر وارد معامله نمی‌شوم.",
    focused: "می‌توانم بدون حواس‌پرتی طبق برنامه عمل کنم.",
    riskAccepted: "قبل از ورود، ریسک معامله را پذیرفته‌ام.",
  },
  scenarios: {
    trend: {
      title: "ستاپ روندی",
      description: "فقط هم‌جهت با روند اصلی و بعد از تایید معامله کن.",
    },
    range: {
      title: "ستاپ رنج",
      description: "فقط از حمایت یا مقاومت واضح معامله کن.",
    },
    news: {
      title: "ریسک خبر",
      description: "اطراف رویدادهای مهم، ورود جدید نزن یا حجم را کم کن.",
    },
    wait: {
      title: "ستاپ واضح نیست",
      description: "تا زمانی که برنامه واضح نشده، بیرون بازار بمان.",
    },
  },
  checklistItems: {
    direction: "جهت بازار مشخص است.",
    entry: "قیمت ورود مشخص است.",
    stopLoss: "حد ضرر مشخص است.",
    takeProfit: "حد سود مشخص است.",
    rr: "ریسک به ریوارد قابل قبول است.",
    newsChecked: "ریسک خبر بررسی شده است.",
  },
};

const copy = {
  en: enCopy,
  fa: faCopy,
} as const;

const mindsetIds = ["calm", "noRevenge", "focused", "riskAccepted"] as const;
const checklistIds = ["direction", "entry", "stopLoss", "takeProfit", "rr", "newsChecked"] as const;
const scenarioIds = ["trend", "range", "news", "wait"] as const;

function countComplete(values: Record<string, boolean>) {
  return Object.values(values).filter(Boolean).length;
}

function percentComplete(values: Record<string, boolean>) {
  const entries = Object.values(values);
  return entries.length > 0 ? Math.round((countComplete(values) / entries.length) * 100) : 0;
}

function todayStorageKey() {
  return `trade-readiness-guide:${new Date().toISOString().slice(0, 10)}`;
}

function todayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeGuideState(value: Partial<GuideState>) {
  return {
    mindset: { ...defaultState.mindset, ...value.mindset },
    checklist: { ...defaultState.checklist, ...value.checklist },
    scenario: value.scenario || defaultState.scenario,
  };
}

export function useTradeReadinessGuideState({
  highImpactEventCount,
  enabled = true,
}: {
  highImpactEventCount: number;
  enabled?: boolean;
}) {
  const { language } = useLanguage();
  const text = copy[language];
  const [state, setState] = useState<GuideState>(defaultState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(todayStorageKey());

    try {
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<GuideState>;
        setState(normalizeGuideState(parsed));
      }
    } catch {
      window.localStorage.removeItem(todayStorageKey());
    }

    if (!enabled) {
      setHydrated(true);
      return;
    }

    const controller = new AbortController();

    fetch(`/api/pre-trade-check?date=${todayDateKey()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { success?: boolean; check?: Partial<GuideState> | null } | null) => {
        if (payload?.success && payload.check) {
          setState(normalizeGuideState(payload.check));
        }
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
        }
      })
      .finally(() => {
        setHydrated(true);
      });

    return () => controller.abort();
  }, [enabled]);

  useEffect(() => {
    window.localStorage.setItem(todayStorageKey(), JSON.stringify(state));
  }, [state]);

  const summary = useMemo<ReadinessSummary>(() => {
    const mindsetScore = percentComplete(state.mindset);
    const checklistScore = percentComplete(state.checklist);
    const missingRequired = !state.checklist.entry || !state.checklist.stopLoss || !state.checklist.newsChecked;
    const scenarioScore = state.scenario === "wait" ? 35 : state.scenario === "news" ? 60 : 85;
    const newsPenalty = highImpactEventCount > 0 && state.scenario !== "news" ? 10 : 0;
    const readinessScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(mindsetScore * 0.4 + checklistScore * 0.35 + scenarioScore * 0.25 - newsPenalty)
      )
    );
    const decision: DecisionId =
      state.scenario === "wait" || missingRequired || mindsetScore < 50
        ? "wait"
        : readinessScore >= 80 && highImpactEventCount === 0
          ? "ready"
          : "caution";
    const mainReason =
      mindsetScore < 50
        ? text.missingMindset
        : missingRequired
          ? text.missingEntry
          : state.scenario === "wait"
            ? text.waitingPlaybook
            : highImpactEventCount > 0 && state.scenario !== "news"
              ? text.newsRisk
              : text.aligned;

    return {
      decision,
      decisionLabel: decision === "ready" ? text.ready : decision === "caution" ? text.caution : text.wait,
      decisionHint: decision === "ready" ? text.readyHint : decision === "caution" ? text.cautionHint : text.waitHint,
      decisionToneClass:
        decision === "ready"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
          : decision === "caution"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200"
            : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-200",
      readinessScore,
      mindsetCompleted: countComplete(state.mindset),
      mindsetTotal: mindsetIds.length,
      checklistCompleted: countComplete(state.checklist),
      checklistTotal: checklistIds.length,
      selectedPlaybook: text.scenarios[state.scenario].title,
      selectedPlaybookDescription: text.scenarios[state.scenario].description,
      mainReason,
    };
  }, [highImpactEventCount, state, text]);

  useEffect(() => {
    if (!enabled || !hydrated) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      fetch("/api/pre-trade-check", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayDateKey(),
          mindset: state.mindset,
          checklist: state.checklist,
          scenario: state.scenario,
          decision: summary.decision,
          decisionLabel: summary.decisionLabel,
          readinessScore: summary.readinessScore,
          selectedPlaybook: summary.selectedPlaybook,
          selectedPlaybookDescription: summary.selectedPlaybookDescription,
          mainReason: summary.mainReason,
          highImpactEventCount,
        }),
        signal: controller.signal,
      }).catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
        }
      });
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled, highImpactEventCount, hydrated, state, summary]);

  function toggleMindset(id: (typeof mindsetIds)[number]) {
    setState((current) => ({
      ...current,
      mindset: { ...current.mindset, [id]: !current.mindset[id] },
    }));
  }

  function toggleChecklist(id: (typeof checklistIds)[number]) {
    setState((current) => ({
      ...current,
      checklist: { ...current.checklist, [id]: !current.checklist[id] },
    }));
  }

  function setScenario(id: ScenarioId) {
    setState((current) => ({ ...current, scenario: id }));
  }

  return {
    state,
    summary,
    text,
    mindsetIds,
    checklistIds,
    scenarioIds,
    toggleMindset,
    toggleChecklist,
    setScenario,
  };
}

function DecisionIcon({ decision }: { decision: DecisionId }) {
  if (decision === "ready") {
    return <CheckCircle2 className="h-5 w-5" />;
  }

  if (decision === "caution") {
    return <AlertTriangle className="h-5 w-5" />;
  }

  return <ShieldCheck className="h-5 w-5" />;
}

export function TradeReadinessGuide({
  open,
  onClose,
  guide,
}: {
  open: boolean;
  onClose: () => void;
  guide: ReturnType<typeof useTradeReadinessGuideState>;
}) {
  const { language } = useLanguage();
  const isRtl = language === "fa";
  const [step, setStep] = useState(0);
  const { state, summary, text } = guide;

  useEffect(() => {
    if (open) {
      setStep(0);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const steps = [
    { title: text.mindsetTitle, subtitle: text.mindsetSubtitle, icon: Brain },
    { title: text.playbookTitle, subtitle: text.playbookSubtitle, icon: BookOpenCheck },
    { title: text.checklistTitle, subtitle: text.checklistSubtitle, icon: ListChecks },
  ];
  const ActiveIcon = steps[step].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 px-4 py-6 backdrop-blur-sm sm:py-10">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pre-trade-check-title"
        className={cn(
          "w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0F172A]",
          isRtl && "text-right"
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-300">
              <Gauge className="h-4 w-4" />
              {text.title}
            </div>
            <h2 id="pre-trade-check-title" className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">
              {steps[step].title}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{steps[step].subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={text.close}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0">
            <div className="mb-5 grid grid-cols-3 gap-2">
              {steps.map((item, index) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setStep(index)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 text-center text-xs font-semibold transition",
                      step === index
                        ? "border-blue-500 bg-blue-500/10 text-blue-700 dark:text-blue-200"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400 dark:hover:bg-slate-800"
                    )}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    {text.step} {index + 1}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111827]">
              <div className="mb-4 flex items-center gap-2">
                <ActiveIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-base font-semibold text-slate-950 dark:text-white">{steps[step].title}</h3>
              </div>

              {step === 0 ? (
                <div className="grid gap-2">
                  {mindsetIds.map((id) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={state.mindset[id]}
                        onChange={() => guide.toggleMindset(id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      <span>{text.mindsetItems[id]}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {step === 1 ? (
                <div className="grid gap-2">
                  {scenarioIds.map((id) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={state.scenario === id}
                      onClick={() => guide.setScenario(id)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition dark:text-slate-200",
                        isRtl && "text-right",
                        state.scenario === id
                          ? "border-blue-500 bg-blue-500/10 text-blue-800 dark:text-blue-100"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#0F172A] dark:hover:bg-slate-800"
                      )}
                    >
                      <span className="block text-sm font-semibold">{text.scenarios[id].title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {text.scenarios[id].description}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}

              {step === 2 ? (
                <div className="grid gap-2">
                  {checklistIds.map((id) => (
                    <label
                      key={id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={state.checklist[id]}
                        onChange={() => guide.toggleChecklist(id)}
                        className="mt-1 h-4 w-4 rounded border-slate-300 accent-blue-600"
                      />
                      <span>{text.checklistItems[id]}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <aside className="space-y-3">
            <div className={cn("rounded-xl border p-4", summary.decisionToneClass)}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <DecisionIcon decision={summary.decision} />
                {text.finalDecision}
              </div>
              <div className="mt-2 text-lg font-bold">{summary.decisionLabel}</div>
              <p className="mt-1 text-xs leading-5">{summary.mainReason}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111827]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-950 dark:text-white">{text.score}</span>
                <span className="text-2xl font-bold text-slate-950 dark:text-white">{summary.readinessScore}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900">
                <div
                  className={cn(
                    "h-full rounded-full",
                    summary.decision === "ready"
                      ? "bg-emerald-500"
                      : summary.decision === "caution"
                        ? "bg-amber-500"
                        : "bg-red-500"
                  )}
                  style={{ width: `${summary.readinessScore}%` }}
                />
              </div>
            </div>
          </aside>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={step === 0}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            {text.previous}
          </button>
          <button
            type="button"
            onClick={() => (step === 2 ? onClose() : setStep((current) => Math.min(current + 1, 2)))}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {step === 2 ? text.finish : text.next}
            {step === 2 ? null : <ChevronRight className="h-4 w-4" />}
          </button>
        </footer>
      </section>
    </div>
  );
}
