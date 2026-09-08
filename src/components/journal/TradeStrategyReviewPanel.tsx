"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpenCheck, ChevronDown, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type {
  FollowedPlanStatus,
  PlaybookStrategyDto,
  TradeStrategyReviewDto,
} from "@/types/playbooks";

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]";
const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#0F172A] dark:text-[#E5E7EB]";

const copy = {
  en: {
    title: "Trade Review",
    subtitle: "Select the playbook used for this trade, check the plan items, and let the system calculate compliance.",
    planCompliance: "Plan Compliance",
    followedPlan: "Followed Plan",
    yes: "Yes",
    partial: "Partially",
    no: "No",
    notReviewed: "Not Reviewed",
    loading: "Loading review...",
    playbook: "Playbook",
    noPlaybooksAvailable: "No playbooks available",
    selectPlaybook: "Select a playbook",
    saveReview: "Save Review",
    saving: "Saving...",
    emptyTitle: "No playbooks available",
    emptyDescription: "Create a playbook first, then return to review this trade.",
    selectedPlaybook: "Selected playbook",
    checklist: "Confirmation Rules",
    checked: "checked",
    planReview: "Plan Review",
    noChecklistItems: "This playbook has no confirmation rules yet.",
    reviewNotes: "Review Notes",
    removeReview: "Remove Review",
    confirmRemove: "Remove this trade review?",
    loadPlaybooksFailed: "Failed to load playbooks",
    loadReviewFailed: "Failed to load trade review",
    checklistLoaded: "Playbook confirmation rules loaded",
    loadChecklistFailed: "Failed to load playbook confirmation rules",
    reviewSaved: "Trade review saved",
    saveFailed: "Failed to save trade review",
    reviewRemoved: "Trade review removed",
    removeFailed: "Failed to remove trade review",
  },
  fa: {
    title: "بررسی معامله",
    subtitle: "پلی‌بوک این معامله را انتخاب کنید، آیتم‌های پلن را تیک بزنید و پایبندی به پلن را دقیق ثبت کنید.",
    planCompliance: "پایبندی به پلن",
    followedPlan: "وضعیت اجرای پلن",
    yes: "کامل",
    partial: "نسبی",
    no: "ضعیف",
    notReviewed: "بررسی نشده",
    loading: "در حال بارگذاری بررسی...",
    playbook: "پلی‌بوک",
    noPlaybooksAvailable: "پلی‌بوکی وجود ندارد",
    selectPlaybook: "انتخاب پلی‌بوک",
    saveReview: "ذخیره بررسی",
    saving: "در حال ذخیره...",
    emptyTitle: "هنوز پلی‌بوکی وجود ندارد",
    emptyDescription: "ابتدا یک پلی‌بوک بسازید و بعد برای بررسی این معامله برگردید.",
    selectedPlaybook: "پلی‌بوک انتخاب‌شده",
    checklist: "شرایط تایید",
    checked: "تیک خورده",
    planReview: "بررسی پلن",
    noChecklistItems: "این پلی‌بوک هنوز شرط تایید ندارد.",
    reviewNotes: "یادداشت بررسی",
    removeReview: "حذف بررسی",
    confirmRemove: "بررسی این معامله حذف شود؟",
    loadPlaybooksFailed: "بارگذاری پلی‌بوک‌ها ناموفق بود",
    loadReviewFailed: "بارگذاری بررسی معامله ناموفق بود",
    checklistLoaded: "شرایط تایید پلی‌بوک آماده شد",
    loadChecklistFailed: "بارگذاری شرایط تایید پلی‌بوک ناموفق بود",
    reviewSaved: "بررسی معامله ذخیره شد",
    saveFailed: "ذخیره بررسی معامله ناموفق بود",
    reviewRemoved: "بررسی معامله حذف شد",
    removeFailed: "حذف بررسی معامله ناموفق بود",
  },
} as const;

function followedPlanLabel(status: FollowedPlanStatus | null | undefined, labels: typeof copy.en | typeof copy.fa) {
  if (status === "YES") return labels.yes;
  if (status === "PARTIAL") return labels.partial;
  if (status === "NO") return labels.no;
  return labels.notReviewed;
}

function followedPlanTone(status: FollowedPlanStatus | null | undefined) {
  if (status === "YES") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (status === "PARTIAL") return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  if (status === "NO") return "border-red-500/30 bg-red-500/10 text-red-300";
  return "border-slate-700 bg-slate-900 text-slate-300";
}

function statusFromPercent(percent: number): FollowedPlanStatus {
  if (percent >= 80) return "YES";
  if (percent >= 50) return "PARTIAL";
  return "NO";
}

type TradeStrategyReviewPanelProps = {
  tradeId: string;
  onReviewUpdated?: (review: TradeStrategyReviewDto | null, trade?: PrismaTradeDto | null) => void;
};

export function TradeStrategyReviewPanel({
  tradeId,
  onReviewUpdated,
}: TradeStrategyReviewPanelProps) {
  const { language } = useLanguage();
  const text = copy[language];
  const isRtl = language === "fa";
  const [playbooks, setPlaybooks] = useState<PlaybookStrategyDto[]>([]);
  const [review, setReview] = useState<TradeStrategyReviewDto | null>(null);
  const [selectedStrategyId, setSelectedStrategyId] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const activePlaybooks = useMemo(
    () => playbooks.filter((playbook) => playbook.isActive || playbook.id === review?.strategyId),
    [playbooks, review?.strategyId]
  );

  const checkedCount = review?.ruleReviews.filter((item) => item.status === "FOLLOWED").length || 0;
  const totalCount = review?.ruleReviews.length || 0;
  const hasReviewedChecklist = Boolean(
    review?.ruleReviews.some((item) => item.status === "FOLLOWED" || item.status === "VIOLATED" || item.status === "NOT_APPLICABLE")
  );
  const compliance = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0;
  const followedPlan = totalCount > 0 && hasReviewedChecklist ? statusFromPercent(compliance) : "NOT_REVIEWED";

  const loadPanel = useCallback(async () => {
    setLoading(true);

    try {
      const [playbooksResponse, reviewResponse] = await Promise.all([
        fetch("/api/journal/playbooks?active=true"),
        fetch(`/api/journal/trades/${tradeId}/strategy-review`),
      ]);
      const [playbooksData, reviewData] = await Promise.all([
        playbooksResponse.json(),
        reviewResponse.json(),
      ]);

      if (!playbooksResponse.ok) {
        toast.error(playbooksData.message || text.loadPlaybooksFailed);
      } else {
        setPlaybooks(playbooksData.playbooks || []);
      }

      if (!reviewResponse.ok) {
        toast.error(reviewData.message || text.loadReviewFailed);
      } else {
        const nextReview = reviewData.review || null;
        setReview(nextReview);
        setSelectedStrategyId(nextReview?.strategyId || "");
        setNotes(nextReview?.notes || "");
      }
    } catch {
      toast.error(text.loadReviewFailed);
    } finally {
      setLoading(false);
    }
  }, [text.loadPlaybooksFailed, text.loadReviewFailed, tradeId]);

  useEffect(() => {
    void loadPanel();
  }, [loadPanel]);

  async function loadPlaybookChecklist(strategyId: string) {
    setSelectedStrategyId(strategyId);

    if (!strategyId) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/journal/trades/${tradeId}/strategy-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyId,
          followedPlan: "NO",
          notes,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(Array.isArray(data.errors) ? data.errors.join(", ") : data.message);
        return;
      }

      setReview(data.review);
      setNotes(data.review.notes || "");
      onReviewUpdated?.(data.review, data.trade);
      toast.success(text.checklistLoaded);
    } catch {
      toast.error(text.loadChecklistFailed);
    } finally {
      setSaving(false);
    }
  }

  function updateChecklistItem(id: string, checked: boolean) {
    setReview((current) =>
      current
        ? {
            ...current,
            ruleReviews: current.ruleReviews.map((item) =>
              item.id === id ? { ...item, status: checked ? "FOLLOWED" : "VIOLATED" } : item
            ),
          }
        : current
    );
  }

  async function saveReview() {
    if (!review) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/journal/trades/${tradeId}/strategy-review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          followedPlan,
          checklistItems: review.ruleReviews.map((item) => ({
            id: item.id,
            checked: item.status === "FOLLOWED",
            note: item.note,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(Array.isArray(data.errors) ? data.errors.join(", ") : data.message);
        return;
      }

      setReview(data.review);
      onReviewUpdated?.(data.review, data.trade);
      toast.success(text.reviewSaved);
    } catch {
      toast.error(text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  async function removeReview() {
    if (!review) {
      return;
    }

    const confirmed = window.confirm(text.confirmRemove);

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/journal/trades/${tradeId}/strategy-review`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || text.removeFailed);
        return;
      }

      setReview(null);
      setSelectedStrategyId("");
      setNotes("");
      onReviewUpdated?.(null, data.trade);
      toast.success(text.reviewRemoved);
    } catch {
      toast.error(text.removeFailed);
    }
  }

  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]", isRtl && "text-right")}>
      <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between", open && "mb-4")}>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={cn(
            "flex min-w-0 flex-1 items-start gap-3 rounded-md text-left outline-none transition hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300",
            isRtl && "text-right"
          )}
        >
          <ChevronDown
            className={cn("mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")}
          />
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-slate-950 dark:text-white">{text.title}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500 dark:text-slate-400">
              {open
                ? text.subtitle
                : review
                  ? `${review.strategyNameSnapshot || text.selectedPlaybook} / ${Math.round(compliance)}%`
                  : text.notReviewed}
            </span>
          </span>
        </button>
        {review ? (
          <div className={cn("grid gap-2 text-sm", isRtl ? "text-right" : "text-left lg:text-right")}>
            <div className="font-semibold text-slate-950 dark:text-white">{text.planCompliance}: {Math.round(compliance)}%</div>
            <div>
              <span className={cn("inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold", followedPlanTone(followedPlan))}>
                {text.followedPlan}: {followedPlanLabel(followedPlan, text)}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {open ? (
      <>
      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400">
          {text.loading}
        </div>
      ) : null}

      {!loading ? (
        <div className="space-y-4">
          <div className="grid gap-3">
            <label className="space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
              {text.playbook}
              <select
                value={selectedStrategyId}
                onChange={(event) => loadPlaybookChecklist(event.target.value)}
                className={cn(inputClass, isRtl && "text-right")}
                disabled={saving || activePlaybooks.length === 0}
              >
                <option value="">
                  {activePlaybooks.length === 0 ? text.noPlaybooksAvailable : text.selectPlaybook}
                </option>
                {activePlaybooks.map((playbook) => (
                  <option key={playbook.id} value={playbook.id}>
                    {playbook.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {activePlaybooks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-slate-800 dark:bg-[#111827]">
              <BookOpenCheck className="mx-auto h-8 w-8 text-slate-500" />
              <h3 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{text.emptyTitle}</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {text.emptyDescription}
              </p>
            </div>
          ) : null}

          {review ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#111827]">
                  <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{text.playbook}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {review.strategyNameSnapshot || text.selectedPlaybook}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#111827]">
                  <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{text.checklist}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {checkedCount}/{totalCount} {text.checked}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-[#111827]">
                  <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{text.followedPlan}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                    {followedPlanLabel(followedPlan, text)}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#111827]">
                <h3 className="text-sm font-semibold text-slate-950 dark:text-white">{text.planReview}</h3>
                <div className="mt-3 space-y-2">
                  {review.ruleReviews.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={item.status === "FOLLOWED"}
                        onChange={(event) => updateChecklistItem(item.id, event.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-[#111827] accent-blue-600"
                      />
                      <span>
                        <span className="block font-semibold text-slate-950 dark:text-white">{item.ruleTitleSnapshot}</span>
                        {item.ruleDescriptionSnapshot ? (
                          <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{item.ruleDescriptionSnapshot}</span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                  {review.ruleReviews.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#0F172A] dark:text-slate-400">
                      {text.noChecklistItems}
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                {text.reviewNotes}
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className={textareaClass}
                />
              </label>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={removeReview}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 text-sm font-semibold text-[#EF4444] hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  {text.removeReview}
                </button>
                <button
                  type="button"
                  onClick={saveReview}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? text.saving : text.saveReview}
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
      </>
      ) : null}
    </section>
  );
}
