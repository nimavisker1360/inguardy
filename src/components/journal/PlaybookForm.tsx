"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type {
  PlaybookChecklistItemDto,
  PlaybookRuleDto,
  PlaybookRuleSection,
  PlaybookStrategyDto,
} from "@/types/playbooks";

type FormState = {
  name: string;
  marketType: string;
  symbols: string;
  timeframes: string;
  direction: "BUY_ONLY" | "SELL_ONLY" | "BOTH";
  entryRules: string;
  exitRules: string;
  riskRules: string;
  setupRules: string;
  managementRules: string;
  psychologyRules: string;
  sessionFilter: string;
  newsFilter: string;
  htfBias: string;
  exampleWinningTrade: string;
  exampleLosingTrade: string;
  tags: string;
  isActive: boolean;
  checklistItems: PlaybookChecklistItemDto[];
};

const MARKET_TYPES = ["Forex", "Crypto", "Indices", "Stocks", "Futures", "Custom"];
const IMPORTANT_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "USDCHF",
  "USDCAD",
  "AUDUSD",
  "NZDUSD",
  "EURGBP",
  "EURJPY",
  "GBPJPY",
  "XAUUSD",
  "XAGUSD",
  "NAS100",
  "US30",
  "SPX500",
  "BTCUSD",
  "ETHUSD",
];
const CHART_TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"];

type PlaybookTemplate = Pick<
  FormState,
  | "name"
  | "marketType"
  | "symbols"
  | "timeframes"
  | "direction"
  | "entryRules"
  | "exitRules"
  | "riskRules"
  | "checklistItems"
>;

const PLAYBOOK_TEMPLATES: PlaybookTemplate[] = [
  {
    name: "EMA Pullback",
    marketType: "Forex",
    direction: "BOTH",
    symbols: "EURUSD, GBPUSD, XAUUSD",
    timeframes: "M15, H1",
    entryRules: [
      "Price is aligned with the higher-timeframe trend",
      "20 EMA and 50 EMA are sloping in trade direction",
      "Pullback holds near the EMA zone",
      "Enter after bullish/bearish confirmation candle",
    ].join("\n"),
    exitRules: [
      "Take partial profit at 1R",
      "Move stop to breakeven after structure confirms",
      "Exit if price closes beyond the EMA zone against the trade",
    ].join("\n"),
    riskRules: [
      "Risk maximum 1% per trade",
      "Minimum planned R:R is 1.5",
      "Stop goes beyond the pullback swing",
      "Do not enter within 15 minutes of high-impact news",
    ].join("\n"),
    checklistItems: [
      { title: "Higher-timeframe trend confirmed", description: "", isRequired: true, sortOrder: 0 },
      { title: "EMA pullback zone respected", description: "", isRequired: true, sortOrder: 1 },
      { title: "Confirmation candle printed", description: "", isRequired: true, sortOrder: 2 },
      { title: "Minimum R:R met", description: "", isRequired: true, sortOrder: 3 },
    ],
  },
  {
    name: "London Breakout",
    marketType: "Forex",
    direction: "BOTH",
    symbols: "GBPUSD, EURUSD, GBPJPY",
    timeframes: "M5, M15",
    entryRules: [
      "Mark the Asian session high and low",
      "Trade only during the London open window",
      "Enter after a clean break and retest or strong momentum break",
      "Avoid entries directly into nearby higher-timeframe resistance/support",
    ].join("\n"),
    exitRules: [
      "Target first liquidity level or 2R",
      "Trail after price makes a new structure point",
      "Exit if breakout fails back inside the range",
    ].join("\n"),
    riskRules: [
      "Risk maximum 0.5% to 1% per trade",
      "Maximum one breakout attempt per direction",
      "Stop goes inside or beyond the opposite side of the trigger structure",
      "No trade after the London window closes",
    ].join("\n"),
    checklistItems: [
      { title: "Asian range marked", description: "", isRequired: true, sortOrder: 0 },
      { title: "London window active", description: "", isRequired: true, sortOrder: 1 },
      { title: "Breakout has confirmation", description: "", isRequired: true, sortOrder: 2 },
      { title: "No high-impact news conflict", description: "", isRequired: true, sortOrder: 3 },
    ],
  },
  {
    name: "SMC / Order Block",
    marketType: "Forex",
    direction: "BOTH",
    symbols: "EURUSD, GBPUSD, XAUUSD, NAS100",
    timeframes: "M15, H1, H4",
    entryRules: [
      "Higher-timeframe bias is defined",
      "Liquidity sweep or displacement confirms intent",
      "Valid order block or fair value gap is identified",
      "Enter on mitigation with lower-timeframe confirmation",
    ].join("\n"),
    exitRules: [
      "Target opposing liquidity or imbalance",
      "Take partials at 1R or first reaction level",
      "Exit if market structure invalidates the idea",
    ].join("\n"),
    riskRules: [
      "Risk maximum 1% per trade",
      "Stop goes beyond the order block or invalidation point",
      "Minimum planned R:R is 2",
      "Skip if entry is too far from invalidation",
    ].join("\n"),
    checklistItems: [
      { title: "HTF bias documented", description: "", isRequired: true, sortOrder: 0 },
      { title: "Liquidity sweep or displacement present", description: "", isRequired: true, sortOrder: 1 },
      { title: "Valid order block selected", description: "", isRequired: true, sortOrder: 2 },
      { title: "Invalidation and target defined", description: "", isRequired: true, sortOrder: 3 },
    ],
  },
];

const copy = {
  en: {
    back: "Back to Playbooks",
    createTitle: "Create Playbook",
    editTitle: "Edit Playbook",
    subtitle:
      "Keep the plan simple: define when to trade, how to enter, how to exit, and what must be checked during review.",
    save: "Save",
    saving: "Saving...",
    useTemplate: "Use Template",
    templatePlaceholder: "Choose template",
    playbookName: "Playbook Name",
    playbookNamePlaceholder: "London breakout",
    market: "Market",
    direction: "Direction",
    buyOnly: "Buy only",
    sellOnly: "Sell only",
    both: "Both",
    symbols: "Symbols",
    symbolsPlaceholder: "EURUSD, GBPUSD",
    timeframes: "Timeframes",
    timeframesPlaceholder: "M15, H1",
    entryRules: "Entry Rules",
    exitRules: "Exit Rules",
    riskRules: "Risk Rules",
    oneRulePerLine: "One rule per line",
    riskPlaceholder: "Risk per trade, max loss, minimum R:R, invalidation rules",
    checklistItems: "Strategy Confirmation Rules",
    checklistSubtitle: "Keep only the must-pass conditions for this specific setup. General trade checks stay in Checklists.",
    addChecklistItem: "Add confirmation rule",
    item: "Rule",
    itemPlaceholder: "Waited for entry confirmation",
    optionalNote: "Optional Note",
    optionalNotePlaceholder: "What exactly counts as confirmation?",
    required: "Required",
    removeChecklistItem: "Remove confirmation rule",
    showAdvanced: "Show Advanced Fields",
    hideAdvanced: "Hide Advanced Fields",
    setupRules: "Setup Rules",
    managementRules: "Management Rules",
    psychologyRules: "Psychology Rules",
    sessionFilter: "Session Filter",
    newsFilter: "News Filter",
    htfBias: "HTF Bias",
    exampleWinningTrade: "Example Winning Trade",
    exampleLosingTrade: "Example Losing Trade",
    tags: "Tags",
    tagsPlaceholder: "breakout, london, momentum",
    activePlaybook: "Active Playbook",
    nameRequired: "Playbook name is required",
    rulesRequired: "Add at least one entry, exit, risk, or advanced rule.",
    created: "Playbook created",
    updated: "Playbook updated",
    saveFailed: "Failed to save playbook",
    marketLabels: {
      Forex: "Forex",
      Crypto: "Crypto",
      Indices: "Indices",
      Stocks: "Stocks",
      Futures: "Futures",
      Custom: "Custom",
    },
  },
  fa: {
    back: "بازگشت به پلی بوک ها",
    createTitle: "ساخت پلی بوک",
    editTitle: "ویرایش پلی بوک",
    subtitle:
      "پلن را ساده نگه دارید: مشخص کنید چه زمانی معامله می کنید، چطور وارد می شوید، چطور خارج می شوید و در زمان بررسی چه مواردی باید چک شوند.",
    save: "ذخیره",
    saving: "در حال ذخیره...",
    useTemplate: "استفاده از قالب",
    templatePlaceholder: "انتخاب قالب",
    playbookName: "نام پلی بوک",
    playbookNamePlaceholder: "بریک اوت لندن",
    market: "بازار",
    direction: "جهت معامله",
    buyOnly: "فقط خرید",
    sellOnly: "فقط فروش",
    both: "هر دو",
    symbols: "نمادها",
    symbolsPlaceholder: "EURUSD, GBPUSD",
    timeframes: "تایم فریم ها",
    timeframesPlaceholder: "M15, H1",
    entryRules: "قوانین ورود",
    exitRules: "قوانین خروج",
    riskRules: "قوانین ریسک",
    oneRulePerLine: "هر قانون در یک خط",
    riskPlaceholder: "ریسک هر معامله، حداکثر ضرر، حداقل R:R، قوانین بی اعتباری",
    checklistItems: "شرایط تایید این استراتژی",
    checklistSubtitle: "فقط شرط‌های ضروری همین ستاپ را بنویسید. چک‌های عمومی معامله در بخش چک‌لیست‌ها می‌مانند.",
    addChecklistItem: "افزودن شرط تایید",
    item: "شرط",
    itemPlaceholder: "برای تایید ورود صبر کردم",
    optionalNote: "یادداشت اختیاری",
    optionalNotePlaceholder: "دقیقا چه چیزی تایید محسوب می شود؟",
    required: "ضروری",
    removeChecklistItem: "حذف شرط تایید",
    showAdvanced: "نمایش فیلدهای پیشرفته",
    hideAdvanced: "مخفی کردن فیلدهای پیشرفته",
    setupRules: "قوانین ستاپ",
    managementRules: "قوانین مدیریت معامله",
    psychologyRules: "قوانین روانشناسی",
    sessionFilter: "فیلتر سشن",
    newsFilter: "فیلتر اخبار",
    htfBias: "جهت تایم فریم بالاتر",
    exampleWinningTrade: "نمونه معامله برنده",
    exampleLosingTrade: "نمونه معامله بازنده",
    tags: "برچسب ها",
    tagsPlaceholder: "breakout, london, momentum",
    activePlaybook: "پلی بوک فعال",
    nameRequired: "نام پلی بوک الزامی است",
    rulesRequired: "حداقل یک قانون ورود، خروج، ریسک یا قانون پیشرفته اضافه کنید.",
    created: "پلی بوک ساخته شد",
    updated: "پلی بوک به روز شد",
    saveFailed: "ذخیره پلی بوک ناموفق بود",
    marketLabels: {
      Forex: "فارکس",
      Crypto: "کریپتو",
      Indices: "شاخص ها",
      Stocks: "سهام",
      Futures: "فیوچرز",
      Custom: "سفارشی",
    },
  },
} as const;

const inputClass =
  "h-10 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600";
const textareaClass =
  "w-full rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-sm leading-6 normal-case text-[#E5E7EB] outline-none focus:border-blue-600";

function sectionText(playbook: PlaybookStrategyDto | undefined, section: PlaybookRuleSection) {
  if (!playbook) {
    return "";
  }

  const direct =
    section === "ENTRY"
      ? playbook.entryRules
      : section === "EXIT"
        ? playbook.exitRules
        : section === "RISK"
          ? playbook.riskRules
          : section === "SETUP"
            ? playbook.setupRules
            : section === "MANAGEMENT"
              ? playbook.managementRules
              : playbook.psychologyRules;

  if (direct) {
    return direct;
  }

  return playbook.rules
    .filter((rule) => rule.section === section)
    .map((rule) => rule.description || rule.title)
    .filter(Boolean)
    .join("\n");
}

function initialForm(playbook?: PlaybookStrategyDto): FormState {
  return {
    name: playbook?.name || "",
    marketType: playbook?.marketType || "Forex",
    symbols: playbook?.symbols || "",
    timeframes: playbook?.timeframes || "",
    direction:
      playbook?.direction === "BUY_ONLY" || playbook?.direction === "SELL_ONLY"
        ? playbook.direction
        : "BOTH",
    entryRules: sectionText(playbook, "ENTRY"),
    exitRules: sectionText(playbook, "EXIT"),
    riskRules: sectionText(playbook, "RISK"),
    setupRules: sectionText(playbook, "SETUP"),
    managementRules: sectionText(playbook, "MANAGEMENT"),
    psychologyRules: sectionText(playbook, "PSYCHOLOGY"),
    sessionFilter: playbook?.sessionFilter || "",
    newsFilter: playbook?.newsFilter || "",
    htfBias: playbook?.htfBias || "",
    exampleWinningTrade: playbook?.exampleWinningTrade || "",
    exampleLosingTrade: playbook?.exampleLosingTrade || "",
    tags: playbook?.tags || "",
    isActive: playbook?.isActive ?? true,
    checklistItems:
      playbook?.checklistItems.length
        ? playbook.checklistItems.map((item, index) => ({
            id: item.id,
            title: item.title,
            description: item.description || "",
            isRequired: item.isRequired,
            sortOrder: index,
          }))
        : [{ title: "", description: "", isRequired: true, sortOrder: 0 }],
  };
}

function rulesFromText(form: FormState): PlaybookRuleDto[] {
  const sections: Array<[PlaybookRuleSection, string]> = [
    ["ENTRY", form.entryRules],
    ["EXIT", form.exitRules],
    ["RISK", form.riskRules],
    ["SETUP", form.setupRules],
    ["MANAGEMENT", form.managementRules],
    ["PSYCHOLOGY", form.psychologyRules],
  ];

  return sections.flatMap(([section, text]) =>
    text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({
        title: line,
        description: line,
        section,
        isRequired: section === "ENTRY" || section === "EXIT" || section === "RISK",
        sortOrder: 0,
      }))
  ).map((rule, index) => ({ ...rule, sortOrder: index }));
}

function cleanChecklistItems(items: PlaybookChecklistItemDto[]) {
  return items
    .map((item) => ({
      ...item,
      title: item.title.trim(),
      description: item.description?.trim() || null,
    }))
    .filter((item) => item.title)
    .map((item, index) => ({ ...item, sortOrder: index }));
}

function csvValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesCsvValue(currentValue: string, nextValue: string) {
  return csvValues(currentValue).some((item) => item.toLowerCase() === nextValue.toLowerCase());
}

function toggleCsvValue(currentValue: string, nextValue: string) {
  const values = csvValues(currentValue);

  if (includesCsvValue(currentValue, nextValue)) {
    return values.filter((item) => item.toLowerCase() !== nextValue.toLowerCase()).join(", ");
  }

  return [...values, nextValue].join(", ");
}

function ChoiceChips({
  options,
  value,
  onToggle,
}: {
  options: string[];
  value: string;
  onToggle: (nextValue: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = includesCsvValue(value, option);

        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(option)}
            className={cn(
              "h-8 rounded-md border px-2.5 text-xs font-semibold normal-case transition focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:ring-offset-[#0F172A]",
              selected
                ? "border-blue-500 bg-blue-600 text-white shadow-sm shadow-blue-950/40"
                : "border-slate-700 bg-[#111827] text-slate-300 hover:border-blue-500 hover:text-white"
            )}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1 text-xs font-medium uppercase text-slate-400", className)}>
      <span>{label}</span>
      {children}
    </div>
  );
}

export function PlaybookForm({ playbook }: { playbook?: PlaybookStrategyDto }) {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language];
  const [form, setForm] = useState<FormState>(() => initialForm(playbook));
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const rules = useMemo(() => rulesFromText(form), [form]);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateChecklistItem(index: number, patch: Partial<PlaybookChecklistItemDto>) {
    setField(
      "checklistItems",
      form.checklistItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function addChecklistItem() {
    setField("checklistItems", [
      ...form.checklistItems,
      { title: "", description: "", isRequired: true, sortOrder: form.checklistItems.length },
    ]);
  }

  function applyTemplate() {
    const template = PLAYBOOK_TEMPLATES.find((item) => item.name === selectedTemplateName);

    if (!template) {
      return;
    }

    setForm((current) => ({
      ...current,
      ...template,
      checklistItems: template.checklistItems.map((item, index) => ({
        ...item,
        sortOrder: index,
      })),
    }));
  }

  function removeChecklistItem(index: number) {
    setField(
      "checklistItems",
      form.checklistItems
        .filter((_, itemIndex) => itemIndex !== index)
        .map((item, itemIndex) => ({ ...item, sortOrder: itemIndex }))
    );
  }

  async function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      toast.error(text.nameRequired);
      return;
    }

    if (rules.length === 0) {
      toast.error(text.rulesRequired);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        playbook ? `/api/journal/playbooks/${playbook.id}` : "/api/journal/playbooks",
        {
          method: playbook ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: "",
            marketType: form.marketType,
            symbols: form.symbols,
            timeframes: form.timeframes,
            direction: form.direction,
            entryRules: form.entryRules,
            exitRules: form.exitRules,
            riskRules: form.riskRules,
            setupRules: form.setupRules,
            managementRules: form.managementRules,
            psychologyRules: form.psychologyRules,
            sessionFilter: form.sessionFilter,
            newsFilter: form.newsFilter,
            htfBias: form.htfBias,
            exampleWinningTrade: form.exampleWinningTrade,
            exampleLosingTrade: form.exampleLosingTrade,
            tags: form.tags,
            isActive: form.isActive,
            rules,
            checklistItems: cleanChecklistItems(form.checklistItems),
            checklistTemplateIds: [],
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        toast.error(Array.isArray(data.errors) ? data.errors.join(", ") : data.message);
        return;
      }

      toast.success(playbook ? text.updated : text.created);
      router.push(`/journal/playbooks/${data.playbook.id}`);
      router.refresh();
    } catch {
      toast.error(text.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={() => router.push("/journal/playbooks")}
        className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {text.back}
      </button>

      <form onSubmit={submitForm} className="space-y-5">
        <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-white">
                {playbook ? text.editTitle : text.createTitle}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {text.subtitle}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedTemplateName}
                onChange={(event) => setSelectedTemplateName(event.target.value)}
                className="h-10 rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-blue-600"
              >
                <option value="">{text.templatePlaceholder}</option>
                {PLAYBOOK_TEMPLATES.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyTemplate}
                disabled={!selectedTemplateName}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text.useTemplate}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {saving ? text.saving : text.save}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label={text.playbookName} className="md:col-span-2">
              <input
                value={form.name}
                onChange={(event) => setField("name", event.target.value)}
                required
                placeholder={text.playbookNamePlaceholder}
                className={inputClass}
              />
            </Field>
            <Field label={text.market}>
              <select
                value={form.marketType}
                onChange={(event) => setField("marketType", event.target.value)}
                className={inputClass}
              >
                {MARKET_TYPES.map((market) => (
                  <option key={market} value={market}>
                    {text.marketLabels[market as keyof typeof text.marketLabels]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={text.direction}>
              <select
                value={form.direction}
                onChange={(event) => setField("direction", event.target.value as FormState["direction"])}
                className={inputClass}
              >
                <option value="BUY_ONLY">{text.buyOnly}</option>
                <option value="SELL_ONLY">{text.sellOnly}</option>
                <option value="BOTH">{text.both}</option>
              </select>
            </Field>
            <Field label={text.symbols} className="md:col-span-2">
              <input
                value={form.symbols}
                onChange={(event) => setField("symbols", event.target.value)}
                placeholder={text.symbolsPlaceholder}
                className={inputClass}
              />
              <ChoiceChips
                options={IMPORTANT_SYMBOLS}
                value={form.symbols}
                onToggle={(value) => setField("symbols", toggleCsvValue(form.symbols, value))}
              />
            </Field>
            <Field label={text.timeframes} className="md:col-span-2">
              <input
                value={form.timeframes}
                onChange={(event) => setField("timeframes", event.target.value)}
                placeholder={text.timeframesPlaceholder}
                className={inputClass}
              />
              <ChoiceChips
                options={CHART_TIMEFRAMES}
                value={form.timeframes}
                onToggle={(value) => setField("timeframes", toggleCsvValue(form.timeframes, value))}
              />
            </Field>
            <Field label={text.entryRules} className="md:col-span-2">
              <textarea
                value={form.entryRules}
                onChange={(event) => setField("entryRules", event.target.value)}
                rows={5}
                placeholder={text.oneRulePerLine}
                className={textareaClass}
              />
            </Field>
            <Field label={text.exitRules} className="md:col-span-2">
              <textarea
                value={form.exitRules}
                onChange={(event) => setField("exitRules", event.target.value)}
                rows={5}
                placeholder={text.oneRulePerLine}
                className={textareaClass}
              />
            </Field>
            <Field label={text.riskRules} className="md:col-span-4">
              <textarea
                value={form.riskRules}
                onChange={(event) => setField("riskRules", event.target.value)}
                rows={4}
                placeholder={text.riskPlaceholder}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">{text.checklistItems}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {text.checklistSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={addChecklistItem}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              {text.addChecklistItem}
            </button>
          </div>

          <div className="space-y-3">
            {form.checklistItems.map((item, index) => (
              <div key={`${item.id || "new"}-${index}`} className="grid gap-3 rounded-lg border border-slate-800 bg-[#111827] p-3 md:grid-cols-[1fr_auto]">
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label={`${text.item} ${index + 1}`}>
                    <input
                      value={item.title}
                      onChange={(event) => updateChecklistItem(index, { title: event.target.value })}
                      placeholder={text.itemPlaceholder}
                      className={inputClass}
                    />
                  </Field>
                  <Field label={text.optionalNote}>
                    <input
                      value={item.description || ""}
                      onChange={(event) => updateChecklistItem(index, { description: event.target.value })}
                      placeholder={text.optionalNotePlaceholder}
                      className={inputClass}
                    />
                  </Field>
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                    <input
                      type="checkbox"
                      checked={item.isRequired}
                      onChange={(event) => updateChecklistItem(index, { isRequired: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-700 bg-[#0F172A]"
                    />
                    {text.required}
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(index)}
                  className="inline-flex h-10 w-10 items-center justify-center self-end rounded-lg border border-red-500/30 text-[#EF4444] hover:bg-red-500/10"
                  aria-label={text.removeChecklistItem}
                  title={text.removeChecklistItem}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
          >
            {showAdvanced ? text.hideAdvanced : text.showAdvanced}
          </button>

          {showAdvanced ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label={text.setupRules}>
                <textarea value={form.setupRules} onChange={(event) => setField("setupRules", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.managementRules}>
                <textarea value={form.managementRules} onChange={(event) => setField("managementRules", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.psychologyRules}>
                <textarea value={form.psychologyRules} onChange={(event) => setField("psychologyRules", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.sessionFilter}>
                <textarea value={form.sessionFilter} onChange={(event) => setField("sessionFilter", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.newsFilter}>
                <textarea value={form.newsFilter} onChange={(event) => setField("newsFilter", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.htfBias}>
                <textarea value={form.htfBias} onChange={(event) => setField("htfBias", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.exampleWinningTrade}>
                <textarea value={form.exampleWinningTrade} onChange={(event) => setField("exampleWinningTrade", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.exampleLosingTrade}>
                <textarea value={form.exampleLosingTrade} onChange={(event) => setField("exampleLosingTrade", event.target.value)} rows={4} className={textareaClass} />
              </Field>
              <Field label={text.tags}>
                <input value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder={text.tagsPlaceholder} className={inputClass} />
              </Field>
              <label className="inline-flex items-center gap-2 self-end text-sm font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setField("isActive", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-[#111827]"
                />
                {text.activePlaybook}
              </label>
            </div>
          ) : null}
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? text.saving : text.save}
          </button>
        </div>
      </form>
    </div>
  );
}
