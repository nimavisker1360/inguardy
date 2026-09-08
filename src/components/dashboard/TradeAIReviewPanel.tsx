"use client";

import { useState } from "react";
import { Brain, CheckCircle2, CircleDashed, Loader2, RefreshCw, Sparkles } from "lucide-react";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import type { TradeAIReviewDto, TradeDto } from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";

type ReviewResponse = {
  ok: boolean;
  review?: TradeAIReviewDto;
  trade?: PrismaTradeDto;
  error?: string;
  message?: string;
  upgradeRequired?: boolean;
};

function scoreClass(score: number) {
  if (score >= 80) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (score >= 60) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  return "border-red-500/30 bg-red-500/10 text-red-100";
}

function scoreTone(score: number) {
  if (score >= 80) {
    return {
      text: "text-emerald-200",
      ring: "#10B981",
      track: "rgba(16, 185, 129, 0.14)",
    };
  }

  if (score >= 60) {
    return {
      text: "text-amber-100",
      ring: "#F59E0B",
      track: "rgba(245, 158, 11, 0.14)",
    };
  }

  return {
    text: "text-red-100",
    ring: "#EF4444",
    track: "rgba(239, 68, 68, 0.14)",
  };
}

function CircleMetric({
  label,
  value,
  suffix = "",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  const normalized = Math.max(Math.min(Math.round(value), 100), 0);
  const tone = scoreTone(normalized);

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-slate-800 bg-[#111827] p-4 text-center">
      <div
        className="grid h-28 w-28 place-items-center rounded-full"
        style={{
          background: `conic-gradient(${tone.ring} ${normalized * 3.6}deg, ${tone.track} 0deg)`,
        }}
      >
        <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-[#0B1220]">
          <div>
            <div className={`text-2xl font-semibold ${tone.text}`}>
              {normalized}{suffix}
            </div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase text-slate-500">Score</div>
          </div>
        </div>
      </div>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
    </div>
  );
}

function ReviewInputStatus({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-[#111827] px-3 py-2 text-xs font-semibold text-slate-300">
      {ready ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
      ) : (
        <CircleDashed className="h-3.5 w-3.5 text-slate-500" />
      )}
      <span className={ready ? "text-slate-100" : "text-slate-500"}>{label}</span>
    </div>
  );
}

function ListBlock({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
      <div className="text-xs font-semibold uppercase text-slate-400">{title}</div>
      {items.length > 0 ? (
        <ul
          className="mt-2 list-disc space-y-1 pl-4 text-left text-sm text-slate-200"
          dir="ltr"
        >
          {items.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="mt-2 text-sm text-slate-500">{emptyLabel}</div>
      )}
    </div>
  );
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
      <div className="text-xs font-semibold uppercase text-slate-400">{title}</div>
      <p className="mt-2 whitespace-pre-wrap text-left text-sm leading-6 text-slate-200" dir="ltr">
        {text}
      </p>
    </div>
  );
}

export function TradeAIReviewPanel({
  trade,
  aiAnalysisEnabled,
  onReviewUpdated,
}: {
  trade: TradeDto;
  aiAnalysisEnabled: boolean;
  onReviewUpdated?: (trade?: PrismaTradeDto | null) => Promise<void> | void;
}) {
  const { t, language } = useLanguage();
  const [review, setReview] = useState<TradeAIReviewDto | null>(trade.aiReview || null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const hasReview = Boolean(review);
  const missingRequirements = trade.reviewRequirements?.missingRequirements || [];
  const requirementsReady = trade.reviewRequirements?.readyForAIReview ?? true;
  const canGenerate = (aiAnalysisEnabled || hasReview) && requirementsReady;
  const tradeWithReviewInputs = trade as TradeDto & { mistakes?: string | null };
  const inputLabels =
    language === "fa"
      ? {
          setup: "ستاپ",
          emotion: "احساس",
          mistake: "اشتباه",
          note: "یادداشت",
          plan: "بررسی پلن",
          screenshot: "اسکرین‌شات",
          inputTitle: "ورودی‌های پیشنهادی قبل از تحلیل",
          inputHint: "این موارد خروجی تحلیل نیستند؛ بهتر است تریدر قبل از تولید تحلیل آن‌ها را ثبت کند تا نتیجه دقیق‌تر شود.",
        }
      : {
          setup: "Setup",
          emotion: "Emotion",
          mistake: "Mistake",
          note: "Trade note",
          plan: "Plan review",
          screenshot: "Screenshot",
          inputTitle: "Suggested inputs before analysis",
          inputHint: "These are not analysis results. The trader should fill them before generating AI review for better context.",
        };
  const reviewInputs = [
    { label: inputLabels.setup, ready: Boolean(trade.setup) },
    { label: inputLabels.emotion, ready: Boolean(trade.emotion) },
    { label: inputLabels.mistake, ready: Boolean(tradeWithReviewInputs.mistakes || trade.mistake) },
    { label: inputLabels.note, ready: Boolean(trade.notes) },
    {
      label: inputLabels.plan,
      ready: Boolean(trade.strategyReview && trade.strategyReview.followedPlan !== "NOT_REVIEWED"),
    },
    { label: inputLabels.screenshot, ready: Boolean(trade.screenshots?.length) },
  ];

  async function requestReview(regenerate = false) {
    if (!aiAnalysisEnabled && !hasReview) {
      setStatus("error");
      setMessage(t("dashboard.aiReview.upgrade"));
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch(
        `/api/trades/${trade.id}/ai-review${regenerate ? "?regenerate=true" : ""}`,
        { method: "POST" }
      );
      const data = (await response.json()) as ReviewResponse;

      if (!response.ok || !data.ok || !data.review) {
        throw new Error(data.message || data.error || t("dashboard.aiReview.failed"));
      }

      setReview(data.review);
      setStatus("idle");
      await onReviewUpdated?.(data.trade);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : t("dashboard.aiReview.failed"));
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-slate-800 bg-[#0B1220] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase text-slate-200">
            <Brain className="h-4 w-4 text-violet-300" />
            {t("dashboard.aiReview.title")}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {t("dashboard.aiReview.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!hasReview ? (
            <button
              type="button"
              onClick={() => requestReview(false)}
              disabled={status === "loading" || !canGenerate}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {trade.aiReviewStatus === "FAILED"
                ? t("dashboard.aiReview.retry")
                : aiAnalysisEnabled
                  ? t("dashboard.aiReview.generate")
                  : t("dashboard.aiReview.upgrade")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => requestReview(true)}
              disabled={status === "loading" || !aiAnalysisEnabled}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-violet-500/30 px-3 text-xs font-semibold text-violet-200 hover:bg-violet-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {aiAnalysisEnabled ? t("dashboard.aiReview.regenerate") : t("dashboard.aiReview.upgradeRegenerate")}
            </button>
          )}
        </div>
      </div>

      {message ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {message}
        </div>
      ) : null}

      {!requirementsReady ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Complete the required steps before continuing.
          {missingRequirements.length > 0 ? (
            <div className="mt-1 text-xs font-semibold">
              {missingRequirements.join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-semibold uppercase text-slate-300">{inputLabels.inputTitle}</div>
          <div className="text-xs text-slate-500">{inputLabels.inputHint}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {reviewInputs.map((item) => (
            <ReviewInputStatus key={item.label} label={item.label} ready={item.ready} />
          ))}
        </div>
      </div>

      {review ? (
        <div className="space-y-3">
          <div className={`rounded-lg border p-4 ${scoreClass(review.score)}`}>
            <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-center">
              <CircleMetric label={t("dashboard.aiReview.score")} value={review.score} />
              <CircleMetric label={t("dashboard.aiReview.confidence")} value={review.confidence * 100} suffix="%" />
              <div className="rounded-lg border border-current/10 bg-black/10 p-3">
                <div className="text-xs font-semibold uppercase opacity-80">{t("dashboard.aiReview.summary")}</div>
                <p className="mt-2 whitespace-pre-wrap text-left text-sm leading-6" dir="ltr">
                  {review.summary}
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <ListBlock title={t("dashboard.aiReview.strengths")} items={review.strengths} emptyLabel={t("dashboard.aiReview.noItems")} />
            <ListBlock title={t("dashboard.aiReview.weaknesses")} items={review.weaknesses} emptyLabel={t("dashboard.aiReview.noItems")} />
            <ListBlock title={t("dashboard.aiReview.mistakes")} items={review.mistakes} emptyLabel={t("dashboard.aiReview.noItems")} />
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <TextBlock title={t("dashboard.aiReview.riskReview")} text={review.riskReview} />
            <TextBlock title={t("dashboard.aiReview.psychologyReview")} text={review.psychologyReview} />
            <TextBlock title={t("dashboard.aiReview.playbookReview")} text={review.playbookReview} />
          </div>
          <ListBlock title={t("dashboard.aiReview.improvementPlan")} items={review.improvementPlan} emptyLabel={t("dashboard.aiReview.noItems")} />
          <div className="flex flex-wrap gap-2">
            {review.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4 text-sm text-slate-400">
          {t("dashboard.aiReview.empty")}
        </div>
      )}
    </section>
  );
}
