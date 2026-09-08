"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, ChevronDown, Layers3, Link2, ListChecks, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type ChecklistTemplate = {
  id: string;
  title: string;
  category: string | null;
  isActive: boolean;
  itemCount: number;
};

type TradeChecklistAnswer = {
  id: string;
  titleSnapshot: string;
  descriptionSnapshot: string | null;
  sectionSnapshot: string | null;
  isRequiredSnapshot: boolean;
  isCriticalSnapshot: boolean;
  checked: boolean;
  answeredAt: string | null;
  note: string | null;
  sortOrder: number;
};

type TradeChecklist = {
  id: string;
  checklistTemplateId: string | null;
  checklistTemplate: {
    id: string;
    title: string;
    category: string | null;
    isActive: boolean;
    itemCount: number;
  } | null;
  titleSnapshot: string;
  categorySnapshot: string | null;
  completedCount: number;
  totalCount: number;
  requiredCompletedCount: number;
  requiredTotalCount: number;
  completionPercent: number;
  requiredIncompleteCount: number;
  answers: TradeChecklistAnswer[];
};

type TradeChecklistPanelProps = {
  tradeId: string;
  onTradeUpdated?: (trade: PrismaTradeDto) => void;
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]";
const noteInputClass =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB] dark:placeholder:text-slate-500";

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
        : tone === "blue"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
          : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

  return (
    <span className={cn("inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold", toneClass)}>
      {children}
    </span>
  );
}

function progressTone(percent: number) {
  if (percent >= 80) {
    return "bg-emerald-500";
  }

  if (percent >= 50) {
    return "bg-blue-500";
  }

  return "bg-amber-500";
}

const faSnapshotTranslations: Record<string, string> = {
  "Pre Trade Checklist": "چک‌لیست قبل از معامله",
  "Risk Management Checklist": "چک‌لیست مدیریت ریسک",
  "Psychology Checklist": "چک‌لیست روانشناسی",
  "Pre Trade": "قبل از معامله",
  "Risk Management": "مدیریت ریسک",
  Psychology: "روانشناسی",
  "Market Context": "زمینه بازار",
  Setup: "ستاپ",
  Entry: "ورود",
  Risk: "ریسک",
  News: "اخبار",
  Management: "مدیریت",
  Exit: "خروج",
  Custom: "سفارشی",
  "Trend direction is clear": "جهت روند مشخص است",
  "Setup matches my strategy": "ستاپ با استراتژی من هماهنگ است",
  "Entry level is valid": "سطح ورود معتبر است",
  "Stop Loss is defined": "حد ضرر مشخص است",
  "Take Profit is defined": "حد سود مشخص است",
  "Risk/Reward is at least 1:2": "ریسک به ریوارد حداقل ۱:۲ است",
  "Lot size is calculated correctly": "حجم معامله درست محاسبه شده است",
  "No high-impact news nearby": "خبر مهم نزدیک معامله وجود ندارد",
  "I am not entering because of FOMO": "به خاطر ترس از جا ماندن وارد نمی‌شوم",
  "I accept the risk before entering": "قبل از ورود، ریسک معامله را پذیرفته‌ام",
  "Risk per trade is within my limit": "ریسک هر معامله داخل حد مجاز من است",
  "Daily loss limit is not reached": "حد ضرر روزانه پر نشده است",
  "No over-leveraging": "اهرم بیش از حد استفاده نشده است",
  "Stop Loss is placed before entry": "حد ضرر قبل از ورود ثبت شده است",
  "Trade does not violate my plan": "معامله خلاف پلن من نیست",
  "I feel calm": "آرام هستم",
  "I am not revenge trading": "در حال معامله انتقامی نیستم",
  "I am not chasing the market": "بازار را تعقیب نمی‌کنم",
  "I can accept a loss": "می‌توانم ضرر این معامله را بپذیرم",
  "This trade follows my plan": "این معامله مطابق پلن من است",
};

function displaySnapshot(value: string | null | undefined, isRtl: boolean) {
  if (!value) {
    return "";
  }

  return isRtl ? faSnapshotTranslations[value] || value : value;
}

function checklistProgress(checklist: TradeChecklist) {
  const totalCount = checklist.answers.length;
  const completedCount = checklist.answers.filter((answer) => answer.checked).length;
  const requiredAnswers = checklist.answers.filter(
    (answer) => answer.isRequiredSnapshot
  );
  const requiredTotalCount = requiredAnswers.length;
  const requiredCompletedCount = requiredAnswers.filter((answer) => answer.checked).length;
  const completionPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return {
    completedCount,
    totalCount,
    requiredCompletedCount,
    requiredTotalCount,
    completionPercent,
    requiredIncompleteCount: requiredTotalCount - requiredCompletedCount,
  };
}

export function TradeChecklistPanel({ tradeId, onTradeUpdated }: TradeChecklistPanelProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "fa";
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [checklists, setChecklists] = useState<TradeChecklist[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedChecklistIds, setExpandedChecklistIds] = useState<Set<string>>(new Set());
  const categoryLabel = (value: string | null | undefined) => {
    const key = String(value || "Custom").replace(/\s+/g, "");
    const translated = t(`journal.checklistsPage.categories.${key}`);
    return translated.startsWith("journal.") ? value || t("journal.checklistPanel.custom") : translated;
  };

  const attachedTemplateIds = useMemo(
    () =>
      new Set(
        checklists
          .map((checklist) => checklist.checklistTemplateId)
          .filter((id): id is string => Boolean(id))
      ),
    [checklists]
  );
  const selectedAttachedChecklist = useMemo(
    () =>
      checklists.find(
        (checklist) => checklist.checklistTemplateId === selectedTemplateId
      ) || null,
    [checklists, selectedTemplateId]
  );
  const selectPlaceholder =
    templates.length === 0
      ? t("journal.checklistPanel.noTemplatesAvailable")
      : t("journal.checklistPanel.selectChecklist");
  const loadTemplatesFailedText = t("journal.checklistPanel.loadTemplatesFailed");
  const loadTradeChecklistsFailedText = t("journal.checklistPanel.loadTradeChecklistsFailed");
  const loadChecklistsFailedText = t("journal.checklistPanel.loadChecklistsFailed");

  const loadPanelData = useCallback(async () => {
    setLoading(true);

    try {
      const [templatesResponse, tradeChecklistsResponse] = await Promise.all([
        fetch("/api/journal/checklists?includeInactive=true"),
        fetch(`/api/journal/trades/${tradeId}/checklists`),
      ]);
      const [templatesData, tradeChecklistsData] = await Promise.all([
        templatesResponse.json(),
        tradeChecklistsResponse.json(),
      ]);

      if (!templatesResponse.ok) {
        toast.error(templatesData.message || loadTemplatesFailedText);
      } else {
        setTemplates(templatesData.checklists || []);
      }

      if (!tradeChecklistsResponse.ok) {
        toast.error(tradeChecklistsData.message || loadTradeChecklistsFailedText);
      } else {
        setChecklists(tradeChecklistsData.checklists || []);
        setExpandedChecklistIds(new Set());
      }
    } catch {
      toast.error(loadChecklistsFailedText);
    } finally {
      setLoading(false);
    }
  }, [loadChecklistsFailedText, loadTemplatesFailedText, loadTradeChecklistsFailedText, tradeId]);

  useEffect(() => {
    void loadPanelData();
  }, [loadPanelData]);

  async function addChecklist() {
    if (!selectedTemplateId) {
      toast.error(t("journal.checklistPanel.selectTemplate"));
      return;
    }

    if (selectedAttachedChecklist) {
      setExpandedChecklistIds((current) => {
        const next = new Set(current);
        next.add(selectedAttachedChecklist.id);
        return next;
      });
      toast.info(t("journal.checklistPanel.alreadyAttached"));
      return;
    }

    setAdding(true);

    try {
      const response = await fetch(`/api/journal/trades/${tradeId}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistTemplateId: selectedTemplateId }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.checklistPanel.addFailed"));
        return;
      }

      setChecklists((current) => [...current, data.checklist]);
      setExpandedChecklistIds((current) => {
        const next = new Set(current);
        next.add(data.checklist.id);
        return next;
      });
      setSelectedTemplateId("");
      if (data.trade) {
        onTradeUpdated?.(data.trade);
      }
      toast.success(t("journal.checklistPanel.added"));
    } catch {
      toast.error(t("journal.checklistPanel.addFailed"));
    } finally {
      setAdding(false);
    }
  }

  function updateAnswer(
    checklistId: string,
    answerId: string,
    patch: Partial<TradeChecklistAnswer>
  ) {
    setChecklists((current) =>
      current.map((checklist) =>
        checklist.id === checklistId
          ? {
              ...checklist,
              answers: checklist.answers.map((answer) =>
                answer.id === answerId ? { ...answer, ...patch } : answer
              ),
            }
          : checklist
      )
    );
  }

  async function saveChecklist(checklist: TradeChecklist) {
    setSavingId(checklist.id);

    try {
      const response = await fetch(
        `/api/journal/trades/${tradeId}/checklists/${checklist.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            answers: checklist.answers.map((answer) => ({
              id: answer.id,
              checked: answer.checked,
              note: answer.note,
            })),
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.checklistPanel.saveFailed"));
        return;
      }

      setChecklists((current) =>
        current.map((item) => (item.id === checklist.id ? data.checklist : item))
      );
      if (data.trade) {
        onTradeUpdated?.(data.trade);
      }
      toast.success(t("journal.checklistPanel.saved"));
    } catch {
      toast.error(t("journal.checklistPanel.saveFailed"));
    } finally {
      setSavingId(null);
    }
  }

  function toggleChecklist(checklistId: string) {
    setExpandedChecklistIds((current) => {
      const next = new Set(current);

      if (next.has(checklistId)) {
        next.delete(checklistId);
      } else {
        next.add(checklistId);
      }

      return next;
    });
  }

  async function refreshChecklistFromTemplate(checklist: TradeChecklist) {
    const templateTitle = displaySnapshot(
      checklist.checklistTemplate?.title || checklist.titleSnapshot,
      isRtl
    );
    const confirmed = window.confirm(
      t("journal.checklistPanel.confirmRefreshFromTemplate").replace(
        "{title}",
        templateTitle
      )
    );

    if (!confirmed) {
      return;
    }

    setRefreshingId(checklist.id);

    try {
      const response = await fetch(
        `/api/journal/trades/${tradeId}/checklists/${checklist.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshFromTemplate: true }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.checklistPanel.refreshFailed"));
        return;
      }

      setChecklists((current) =>
        current.map((item) => (item.id === checklist.id ? data.checklist : item))
      );
      if (data.trade) {
        onTradeUpdated?.(data.trade);
      }
      toast.success(t("journal.checklistPanel.refreshed"));
    } catch {
      toast.error(t("journal.checklistPanel.refreshFailed"));
    } finally {
      setRefreshingId(null);
    }
  }

  async function removeChecklist(checklist: TradeChecklist) {
    const confirmed = window.confirm(
      t("journal.checklistPanel.confirmRemove").replace(
        "{title}",
        displaySnapshot(checklist.titleSnapshot, isRtl)
      )
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/journal/trades/${tradeId}/checklists/${checklist.id}`,
        { method: "DELETE" }
      );
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || t("journal.checklistPanel.removeFailed"));
        return;
      }

      setChecklists((current) =>
        current.filter((item) => item.id !== checklist.id)
      );
      if (data.trade) {
        onTradeUpdated?.(data.trade);
      }
      toast.success(t("journal.checklistPanel.removed"));
    } catch {
      toast.error(t("journal.checklistPanel.removeFailed"));
    }
  }

  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]", isRtl && "text-right")}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{t("journal.checklistPanel.title")}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {t("journal.checklistPanel.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedTemplateId}
            onChange={(event) => setSelectedTemplateId(event.target.value)}
            className={cn(inputClass, "min-w-[260px]", isRtl && "text-right")}
            disabled={loading || templates.length === 0}
          >
            <option value="">{selectPlaceholder}</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {displaySnapshot(template.title, isRtl)}
                {template.category ? ` / ${categoryLabel(template.category)}` : ""}
                {!template.isActive ? ` / ${t("journal.common.inactive")}` : ""}
                {attachedTemplateIds.has(template.id) ? ` / ${t("journal.checklistPanel.attached")}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={addChecklist}
            disabled={adding || !selectedTemplateId}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" />
            {adding
              ? t("journal.tradeDetail.adding")
              : selectedAttachedChecklist
                ? t("journal.checklistPanel.showChecklist")
                : t("journal.checklistPanel.addChecklist")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-400">
          {t("journal.checklistPanel.loading")}
        </div>
      ) : null}

      {!loading && checklists.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center dark:border-slate-800 dark:bg-[#111827]">
          <ListChecks className="mx-auto h-8 w-8 text-slate-500" />
          <h3 className="mt-3 text-base font-semibold text-slate-950 dark:text-white">{t("journal.checklistPanel.emptyTitle")}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("journal.checklistPanel.emptyDescription")}
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {checklists.map((checklist) => {
          const progress = checklistProgress(checklist);
          const currentTemplate = checklist.checklistTemplate;
          const checklistTitle = displaySnapshot(
            currentTemplate?.title || checklist.titleSnapshot,
            isRtl
          );
          const checklistCategory = displaySnapshot(
            categoryLabel(currentTemplate?.category || checklist.categorySnapshot),
            isRtl
          );
          const templateChanged = Boolean(
            currentTemplate &&
              (currentTemplate.title !== checklist.titleSnapshot ||
                currentTemplate.category !== checklist.categorySnapshot ||
                currentTemplate.itemCount !== checklist.answers.length)
          );
          const isExpanded = expandedChecklistIds.has(checklist.id);

          return (
            <article
              key={checklist.id}
              className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#111827]"
            >
              <div className={cn("bg-white p-4 dark:bg-[#0F172A]", isExpanded && "border-b border-slate-200 dark:border-slate-800")}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <button
                    type="button"
                    onClick={() => toggleChecklist(checklist.id)}
                    aria-expanded={isExpanded}
                    className={cn(
                      "flex min-w-0 flex-1 items-start gap-3 rounded-md text-left outline-none transition hover:text-blue-600 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:text-blue-300",
                      isRtl && "text-right"
                    )}
                  >
                    <ChevronDown
                      className={cn("mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform", isExpanded && "rotate-180")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-slate-950 dark:text-white">
                          {checklistTitle}
                        </span>
                        <Badge>{checklistCategory || t("journal.checklistPanel.custom")}</Badge>
                        {templateChanged ? (
                          <Badge tone="blue">{t("journal.checklistPanel.templateChanged")}</Badge>
                        ) : null}
                        {progress.requiredIncompleteCount > 0 ? (
                          <Badge tone="amber">
                            <AlertTriangle className={cn("h-3 w-3", isRtl ? "ml-1" : "mr-1")} />
                            {t("journal.checklistPanel.requiredMissing")}
                          </Badge>
                        ) : progress.requiredTotalCount > 0 ? (
                          <Badge tone="green">
                            <Check className={cn("h-3 w-3", isRtl ? "ml-1" : "mr-1")} />
                            {t("journal.checklistPanel.requiredComplete")}
                          </Badge>
                        ) : null}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="blue">
                          {t("journal.checklistPanel.completedCount")
                            .replace("{completed}", String(progress.completedCount))
                            .replace("{total}", String(progress.totalCount))}
                        </Badge>
                        <Badge>
                          {t("journal.checklistPanel.requiredCount")
                            .replace("{completed}", String(progress.requiredCompletedCount))
                            .replace("{total}", String(progress.requiredTotalCount))}
                        </Badge>
                        <Badge>{Math.round(progress.completionPercent)}%</Badge>
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center dark:border-slate-800 dark:bg-[#111827]">
                      <div className="text-base font-bold text-slate-950 dark:text-white">
                        {Math.round(progress.completionPercent)}%
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-900">
                  <div
                    className={cn("h-full rounded-full", progressTone(progress.completionPercent))}
                    style={{ width: `${Math.min(progress.completionPercent, 100)}%` }}
                  />
                </div>
              </div>

              {isExpanded ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {checklist.answers.map((answer, answerIndex) => {
                  const answerSection =
                    answer.sectionSnapshot || checklist.categorySnapshot || "Custom";
                  const previousSection =
                    checklist.answers[answerIndex - 1]?.sectionSnapshot ||
                    checklist.categorySnapshot ||
                    "";
                  const showSectionHeader =
                    answerIndex === 0 || previousSection !== answerSection;

                  return (
                    <div key={answer.id}>
                      {showSectionHeader ? (
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 sm:px-4">
                          <Layers3 className="h-4 w-4 text-blue-500 dark:text-blue-300" />
                          {displaySnapshot(answerSection, isRtl)}
                        </div>
                      ) : null}
                      <div
                        className={cn(
                          "bg-white p-3 transition dark:bg-[#111827] sm:p-4",
                          answer.checked && "bg-emerald-50/50 dark:bg-emerald-500/5"
                        )}
                      >
                        <label className="flex cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={answer.checked}
                            onChange={(event) =>
                              updateAnswer(checklist.id, answer.id, {
                                checked: event.target.checked,
                              })
                            }
                            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-[#2563EB] dark:border-slate-700"
                          />
                          <span className="min-w-0 flex-1">
                            <span
                              className={cn(
                                "flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300",
                                answer.checked && "text-slate-500 dark:text-slate-400"
                              )}
                            >
                              {displaySnapshot(answer.titleSnapshot, isRtl)}
                              {answer.isRequiredSnapshot ? (
                                <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                                  {t("journal.checklistPanel.required")}
                                </span>
                              ) : null}
                              {answer.isCriticalSnapshot ? (
                                <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                                  Critical
                                </span>
                              ) : null}
                            </span>
                            {answer.descriptionSnapshot ? (
                              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                                {answer.descriptionSnapshot}
                              </span>
                            ) : null}
                          </span>
                        </label>
                        <input
                          value={answer.note || ""}
                          onChange={(event) =>
                            updateAnswer(checklist.id, answer.id, {
                              note: event.target.value,
                            })
                          }
                          placeholder={t("journal.checklistPanel.optionalNote")}
                          className={cn(noteInputClass, "mt-3")}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : null}

              {isExpanded ? (
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0F172A]">
                {currentTemplate ? (
                  <button
                    type="button"
                    onClick={() => refreshChecklistFromTemplate(checklist)}
                    disabled={refreshingId === checklist.id}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshingId === checklist.id && "animate-spin")} />
                    {refreshingId === checklist.id
                      ? t("journal.checklistPanel.refreshing")
                      : t("journal.checklistPanel.refreshFromTemplate")}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => removeChecklist(checklist)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/30 text-[#EF4444] hover:bg-red-500/10"
                  aria-label={t("journal.checklistPanel.removeChecklist")}
                  title={t("journal.checklistPanel.removeChecklist")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => saveChecklist(checklist)}
                  disabled={savingId === checklist.id}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {savingId === checklist.id ? t("journal.tradeDetail.saving") : t("journal.tradeDetail.save")}
                </button>
              </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
