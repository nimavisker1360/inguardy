"use client";

import { useState } from "react";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import type { Psychology } from "@/lib/journal/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

const EMOTIONS_BEFORE = [
  "Normal",
  "Fear",
  "Greed",
  "FOMO",
  "Revenge Trade",
  "Overconfident",
  "Hesitant",
];
const EMOTIONS_AFTER = [
  "Calm",
  "Regret",
  "Angry",
  "Happy",
  "Disappointed",
  "Neutral",
];
const MISTAKES = [
  "No Mistake",
  "Entered Early",
  "Entered Late",
  "No Confirmation",
  "Moved SL",
  "Closed Early",
  "Over Lot",
  "Revenge Trade",
];

const OPTION_LABELS = {
  fa: {
    Normal: "عادی",
    Fear: "ترس",
    Greed: "طمع",
    FOMO: "FOMO",
    "Revenge Trade": "معامله انتقامی",
    Overconfident: "اعتمادبه‌نفس زیاد",
    Hesitant: "مردد",
    Calm: "آرام",
    Regret: "پشیمان",
    Angry: "عصبانی",
    Happy: "راضی",
    Disappointed: "ناامید",
    Neutral: "خنثی",
    "No Mistake": "بدون اشتباه",
    "Entered Early": "ورود زودهنگام",
    "Entered Late": "ورود دیرهنگام",
    "No Confirmation": "بدون تأیید",
    "Moved SL": "جابه‌جایی حد ضرر",
    "Closed Early": "خروج زودهنگام",
    "Over Lot": "حجم بیش از حد",
  },
  en: {} as Record<string, string>,
};

const COPY = {
  fa: {
    title: "بررسی روانشناسی معامله",
    subtitle: "بعد از معامله احساس، خطای رفتاری و درس این معامله را ثبت کنید.",
    saveReview: "ذخیره بررسی",
    saving: "در حال ذخیره",
    saved: "بررسی روانشناسی ذخیره شد.",
    failed: "ذخیره بررسی روانشناسی ناموفق بود.",
    select: "انتخاب کنید",
    confidence: "امتیاز نظم ذهنی",
    followedPlan: "آیا طبق پلن عمل شد؟",
    yes: "بله",
    no: "خیر",
    partially: "نیمه‌کامل",
    emotionBefore: "احساس قبل از معامله",
    emotionAfter: "احساس بعد از معامله",
    mistakeTag: "خطای روانشناسی",
    entryReason: "دلیل ورود",
    personalNote: "یادداشت روانشناسی",
    lessonLearned: "درس این معامله",
    importedMt5Hint:
      "این معامله از MT5 وارد شده است. متن واردسازی، یادداشت روانشناسی نیست؛ احساس، دلیل ورود و درس معامله را اینجا با بررسی شخصی خودتان تکمیل کنید.",
    psychologyNotePlaceholder: "یادداشت شخصی خود را درباره وضعیت ذهنی، عجله، ترس، FOMO یا پایبندی به پلن بنویسید.",
  },
  en: {
    title: "Psychology Review",
    subtitle: "Record the trade emotion, behavior mistake, and lesson after execution.",
    saveReview: "Save Review",
    saving: "Saving",
    saved: "Psychology review saved.",
    failed: "Failed to save psychology review.",
    select: "Select",
    confidence: "Mental discipline score",
    followedPlan: "Followed Plan",
    yes: "Yes",
    no: "No",
    partially: "Partially",
    emotionBefore: "Emotion Before",
    emotionAfter: "Emotion After",
    mistakeTag: "Psychology Mistake",
    entryReason: "Entry Reason",
    personalNote: "Psychology Note",
    lessonLearned: "Lesson Learned",
    importedMt5Hint:
      "This trade was imported from MT5. The import marker is not a psychology note; add your own emotion, entry context, and lesson here.",
    psychologyNotePlaceholder: "Write your own note about mindset, hesitation, FOMO, discipline, or plan adherence.",
  },
};

function followedPlanToValue(value: Psychology["followedPlan"] | undefined) {
  if (value === true) {
    return "yes";
  }

  if (value === false) {
    return "no";
  }

  if (value === "partially") {
    return "partially";
  }

  return "";
}

function followedPlanFromValue(value: string) {
  if (value === "yes") {
    return true;
  }

  if (value === "no") {
    return false;
  }

  if (value === "partially") {
    return "partially";
  }

  return null;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{children}</label>;
}

export function JournalReviewForms({
  tradeId,
  psychology,
  showImportedMt5ReviewHint = false,
  onTradeUpdated,
}: {
  tradeId: string;
  psychology: Psychology | null;
  showImportedMt5ReviewHint?: boolean;
  onTradeUpdated?: (trade: PrismaTradeDto) => void;
}) {
  const { language } = useLanguage();
  const isRtl = language === "fa";
  const text = isRtl ? COPY.fa : COPY.en;
  const [confidenceScore, setConfidenceScore] = useState(
    psychology?.confidenceScore ?? 5
  );
  const [savingPsychology, setSavingPsychology] = useState(false);
  const [message, setMessage] = useState("");
  const selectClass =
    "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]";
  const textareaClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-950 outline-none transition focus:border-blue-500 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]";
  const optionText = (value: string) =>
    isRtl ? OPTION_LABELS.fa[value as keyof typeof OPTION_LABELS.fa] || value : value;

  async function submitPsychology(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPsychology(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      confidenceScore,
      emotionBefore: String(formData.get("emotionBefore") || "") || null,
      emotionAfter: String(formData.get("emotionAfter") || "") || null,
      followedPlan: followedPlanFromValue(String(formData.get("followedPlan") || "")),
      mistakeTag: String(formData.get("mistakeTag") || "") || null,
      entryReason: String(formData.get("entryReason") || "") || null,
      personalNote: String(formData.get("personalNote") || "") || null,
      lessonLearned: String(formData.get("lessonLearned") || "") || null,
    };
    const response = await fetch(`/api/journal/trades/${tradeId}/psychology`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      if (data.trade) {
        onTradeUpdated?.(data.trade);
      }

      setMessage(text.saved);
    } else {
      setMessage(text.failed);
    }

    setSavingPsychology(false);
  }

  return (
    <section className={cn("rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]", isRtl && "text-right")}>
      <form onSubmit={submitPsychology}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{text.title}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{text.subtitle}</p>
          </div>
          <button
            type="submit"
            disabled={savingPsychology}
            className="h-10 shrink-0 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {savingPsychology ? text.saving : text.saveReview}
          </button>
        </div>

        {showImportedMt5ReviewHint ? (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm normal-case text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            {text.importedMt5Hint}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <FieldLabel>
            {text.confidence}: {confidenceScore}
            <input
              type="range"
              min="1"
              max="5"
              value={confidenceScore}
              onChange={(event) => setConfidenceScore(Number(event.target.value))}
              className="block h-10 w-full accent-blue-600"
            />
          </FieldLabel>
          <FieldLabel>
            {text.followedPlan}
            <select
              name="followedPlan"
              defaultValue={followedPlanToValue(psychology?.followedPlan)}
              className={selectClass}
            >
              <option value="">{text.select}</option>
              <option value="yes">{text.yes}</option>
              <option value="no">{text.no}</option>
              <option value="partially">{text.partially}</option>
            </select>
          </FieldLabel>
          <FieldLabel>
            {text.emotionBefore}
            <select
              name="emotionBefore"
              defaultValue={psychology?.emotionBefore || ""}
              className={selectClass}
            >
              <option value="">{text.select}</option>
              {EMOTIONS_BEFORE.map((emotion) => (
                <option key={emotion} value={emotion}>
                  {optionText(emotion)}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel>
            {text.emotionAfter}
            <select
              name="emotionAfter"
              defaultValue={psychology?.emotionAfter || ""}
              className={selectClass}
            >
              <option value="">{text.select}</option>
              {EMOTIONS_AFTER.map((emotion) => (
                <option key={emotion} value={emotion}>
                  {optionText(emotion)}
                </option>
              ))}
            </select>
          </FieldLabel>
          <FieldLabel>
            {text.mistakeTag}
            <select
              name="mistakeTag"
              defaultValue={psychology?.mistakeTag || ""}
              className={selectClass}
            >
              <option value="">{text.select}</option>
              {MISTAKES.map((mistake) => (
                <option key={mistake} value={mistake}>
                  {optionText(mistake)}
                </option>
              ))}
            </select>
          </FieldLabel>
        </div>

        <div className="mt-4 grid gap-4">
          <FieldLabel>
            {text.entryReason}
            <textarea
              name="entryReason"
              defaultValue={psychology?.entryReason || ""}
              rows={3}
              className={textareaClass}
            />
          </FieldLabel>
          <FieldLabel>
            {text.personalNote}
            <textarea
              name="personalNote"
              defaultValue={psychology?.personalNote || ""}
              placeholder={text.psychologyNotePlaceholder}
              rows={3}
              className={textareaClass}
            />
          </FieldLabel>
          <FieldLabel>
            {text.lessonLearned}
            <textarea
              name="lessonLearned"
              defaultValue={psychology?.lessonLearned || ""}
              rows={3}
              className={textareaClass}
            />
          </FieldLabel>
        </div>
      </form>

      {message ? (
        <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-200">
          {message}
        </div>
      ) : null}
    </section>
  );
}
