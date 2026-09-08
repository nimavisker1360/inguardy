"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  AlertTriangle,
  Activity,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Brain,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Filter,
  LineChart as LineChartIcon,
  Loader2,
  RotateCcw,
  Search,
  Star,
  Tags,
  Target,
  X,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SubscriptionLockedFeature } from "@/components/subscription/SubscriptionLockedFeature";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type {
  AnalyticsDirectionalStats,
  HourlyAnalyticsRow,
  JournalAnalyticsResponse,
  PsychologyAnalyticsRow,
  StrategyAnalyticsRow,
  SymbolAnalyticsRow,
  TagAnalyticsRow,
} from "@/types/analytics";

type DateRange = "all" | "today" | "thisWeek" | "thisMonth" | "thisYear" | "custom";
type DirectionFilter = "" | "BUY" | "SELL";
type SortKey = keyof Pick<
  SymbolAnalyticsRow,
  "symbol" | "totalTrades" | "winRate" | "netPnl" | "averagePnl" | "profitFactor" | "bestTrade" | "worstTrade"
>;

type Filters = {
  dateRange: DateRange;
  dateFrom: string;
  dateTo: string;
  accountId: string;
  symbol: string;
  direction: DirectionFilter;
  strategy: string;
  setup: string;
  mistake: string;
  emotion: string;
  session: string;
  reviewStatus: string;
  checklistStatus: string;
};

type ChartPayloadItem = {
  name?: string;
  value?: number;
  color?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: string;
};

type ReviewTone = "neutral" | "profit" | "loss";

type ReviewListItem = {
  label: string;
  detail: string;
  tone: ReviewTone;
};

type EditableMetric = {
  id: string;
  label: string;
  value: string;
  tone: "neutral" | "profit" | "loss" | "blue" | "amber";
};

type BehaviorPatternRow = {
  kind: "mistake" | "psychology";
  label: string;
  totalTrades: number;
  winRate: number;
  netPnl: number;
  averagePnl: number;
};

type JournalTradeOption = {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  profitLoss: number | string | null;
  rr: number | string | null;
  setup: string | null;
  emotion: string | null;
  mistake: string | null;
  notes: string | null;
  openedAt: string | null;
  closedAt: string | null;
  entryScreenshotUrl?: string | null;
  exitScreenshotUrl?: string | null;
  status?: string | null;
  tags?: Array<{ tag?: { name?: string | null }; name?: string | null }>;
  screenshots?: Array<{ id?: string; type: string; url: string }>;
};

type TradeMetadata = {
  rating: number | null;
  mistakes: string[];
  setups: string[];
  emotions: string[];
  customTags: string[];
  tradeNote: string;
  dailyJournal: string;
  checklistResults: string[];
  psychologyStatus: string;
  exitReason: string;
};

type SaveStatus = "idle" | "loading" | "saving" | "saved" | "error";
type ReviewPanelTab = "entry" | "exit" | "trade" | "daily";
type AnalyticsTab = "overview" | "behavior" | "advanced";
type PageError = {
  message: string;
  upgradeRequired?: boolean;
};

function localizedApiMessage({
  isFa,
  message,
  messageFa,
  fallback,
}: {
  isFa: boolean;
  message?: string;
  messageFa?: string;
  fallback: string;
}) {
  if (isFa) {
    return messageFa || message || fallback;
  }

  return message || fallback;
}

type AnalyticsAccountOption = {
  id: string;
  name: string;
  broker?: string | null;
  mt5AccountNumber?: string | null;
};

type WeeklyAIReport = {
  success: true;
  source: "ai" | "computed";
  generatedAt: string;
  periodLabel: string;
  verdict: {
    status: "profitable" | "losing" | "flat" | "insufficient_data";
    label: string;
    tone: "profit" | "loss" | "neutral" | "amber";
    confidence: number;
    summary: string;
  };
  score: number;
  stats: {
    totalTrades: number;
    netPnl: number;
    winRate: number;
    profitFactor: number | null;
    expectancyPerTrade: number;
    maxDrawdown: number;
  };
  strategyRead: string;
  strengths: string[];
  weaknesses: string[];
  riskWarnings: string[];
  nextWeekPlan: string[];
  bestContexts: string[];
  weakestContexts: string[];
  questions: string[];
  breakdown: {
    strategies: WeeklyBreakdownRow[];
    setups: WeeklyBreakdownRow[];
    symbols: WeeklyBreakdownRow[];
    directions: WeeklyBreakdownRow[];
  };
  ready: boolean;
  requirements: {
    minimumClosedTrades: number;
    currentClosedTrades: number;
    remainingClosedTrades: number;
    fullWeek: boolean;
    message: string;
  };
};

type WeeklyBreakdownRow = {
  label: string;
  type: "strategy" | "setup" | "symbol" | "direction";
  totalTrades: number;
  netPnl: number;
  winRate: number;
  averagePnl: number;
  profitFactor: number | null;
  verdict: "profitable" | "losing" | "flat" | "insufficient_data";
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const EMPTY_FILTERS: Filters = {
  dateRange: "all",
  dateFrom: "",
  dateTo: "",
  accountId: "",
  symbol: "",
  direction: "",
  strategy: "",
  setup: "",
  mistake: "",
  emotion: "",
  session: "",
  reviewStatus: "",
  checklistStatus: "",
};

const EMPTY_ANALYTICS: JournalAnalyticsResponse = {
  success: true,
  overview: {
    totalNetPnl: 0,
    grossProfit: 0,
    grossLoss: 0,
    winRate: 0,
    lossRate: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: null,
    averageRR: 0,
    bestTrade: null,
    worstTrade: null,
    maxDrawdown: 0,
    currentDrawdown: 0,
    expectancyPerTrade: 0,
  },
  longShort: {
    buy: {
      direction: "BUY",
      totalTrades: 0,
      winRate: 0,
      netPnl: 0,
      averagePnl: 0,
      bestTrade: 0,
      worstTrade: 0,
    },
    sell: {
      direction: "SELL",
      totalTrades: 0,
      winRate: 0,
      netPnl: 0,
      averagePnl: 0,
      bestTrade: 0,
      worstTrade: 0,
    },
  },
  bySymbol: [],
  bySession: [],
  byWeekday: [],
  byHour: [],
  byStrategy: [],
  byPsychology: [],
  byMistake: [],
  byEmotion: [],
  bySetup: [],
  byTag: [],
  byChecklistCompletion: [],
  equityCurve: [],
  drawdownCurve: [],
  metadata: {
    symbols: [],
    strategies: [],
    setups: [],
    mistakes: [],
    emotions: [],
    sessions: [],
    hasStrategyData: false,
    hasPsychologyData: false,
    hasTagData: false,
  },
};

function formatMoney(value: number | null | undefined) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return value.toLocaleString("en-US", {
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined) {
  return `${formatNumber(value, 1)}%`;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function dateValueFromParts(year: number, month: number, day: number) {
  return `${year}-${padDatePart(month + 1)}-${padDatePart(day)}`;
}

function parseDateValue(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, month, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function formatCalendarDisplay(value: string) {
  const parsed = parseDateValue(value);

  if (!parsed) {
    return "";
  }

  return `${padDatePart(parsed.getMonth() + 1)}/${padDatePart(parsed.getDate())}/${parsed.getFullYear()}`;
}

function valueTone(value: number | null | undefined): "profit" | "loss" | "neutral" {
  const number = Number(value || 0);
  return number > 0 ? "profit" : number < 0 ? "loss" : "neutral";
}

function buildQuery(filters: Filters) {
  const params = new URLSearchParams();
  params.set("dateRange", filters.dateRange);

  if (filters.dateRange === "custom") {
    if (filters.dateFrom) {
      params.set("dateFrom", filters.dateFrom);
    }

    if (filters.dateTo) {
      params.set("dateTo", filters.dateTo);
    }
  }

  if (filters.accountId) {
    params.set("accountId", filters.accountId);
  }

  if (filters.symbol) {
    params.set("symbol", filters.symbol);
  }

  if (filters.direction) {
    params.set("direction", filters.direction);
  }

  if (filters.strategy) {
    params.set("strategy", filters.strategy);
  }

  if (filters.setup) {
    params.set("setup", filters.setup);
  }

  if (filters.mistake) {
    params.set("mistake", filters.mistake);
  }

  if (filters.emotion) {
    params.set("emotion", filters.emotion);
  }

  if (filters.session) {
    params.set("session", filters.session);
  }

  if (filters.reviewStatus) {
    params.set("reviewStatus", filters.reviewStatus);
  }

  if (filters.checklistStatus) {
    params.set("checklistStatus", filters.checklistStatus);
  }

  return params.toString();
}

function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase text-slate-400">{label}</span>
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-slate-500",
            tone === "profit" && "text-emerald-300",
            tone === "loss" && "text-red-300",
            tone === "blue" && "text-blue-500",
            tone === "amber" && "text-amber-300"
          )}
        >
          {icon}
        </span>
      </div>
      <div
        className={cn(
          "mt-4 text-2xl font-semibold text-white",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "blue" && "font-bold text-blue-600",
          tone === "amber" && "text-amber-200"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  icon,
  children,
  tourId,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  tourId?: string;
}) {
  return (
    <section data-dashboard-tour={tourId} className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
        </div>
        <span className="text-slate-500">{icon}</span>
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-800 bg-[#111827] px-4 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}

function LoadingPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="h-32 animate-pulse rounded-lg border border-slate-800 bg-[#0F172A]"
        />
      ))}
    </div>
  );
}

function CalendarDateField({
  label,
  value,
  disabled,
  isFa,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  isFa: boolean;
  onChange: (value: string) => void;
}) {
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate || new Date());
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();
  const monthStart = new Date(viewYear, viewMonth, 1);
  const gridStart = new Date(viewYear, viewMonth, 1 - monthStart.getDay());
  const displayValue = formatCalendarDisplay(value);
  const placeholder = isFa ? "سال-ماه-روز" : "yyyy-mm-dd";
  const todayValue = dateValueFromParts(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  useEffect(() => {
    const parsed = parseDateValue(value);

    if (parsed) {
      setViewDate(parsed);
    }
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  function moveMonth(offset: number) {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  return (
    <label className="relative space-y-1 text-xs font-medium uppercase text-slate-400">
      {label}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border border-slate-800 bg-[#111827] px-3 text-left text-sm normal-case text-[#E5E7EB] outline-none transition focus:border-sky-600",
          disabled && "cursor-not-allowed opacity-40"
        )}
      >
        <span className={cn(!displayValue && "text-slate-500")}>{displayValue || placeholder}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-300" />
      </button>

      {open && !disabled ? (
        <div
          className={cn(
            "absolute top-[calc(100%+6px)] z-40 w-[272px] rounded-md border border-slate-700 bg-white p-3 text-slate-950 shadow-xl",
            isFa ? "right-0" : "left-0"
          )}
          dir="ltr"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-sm font-bold">
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {WEEKDAY_LABELS.map((day) => (
              <div key={day} className="py-1 font-medium text-slate-950">
                {day}
              </div>
            ))}
            {days.map((date) => {
              const dateValue = dateValueFromParts(date.getFullYear(), date.getMonth(), date.getDate());
              const currentMonth = date.getMonth() === viewMonth;
              const selected = value === dateValue;
              const today = todayValue === dateValue;

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => {
                    onChange(dateValue);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-sm border border-transparent text-sm transition hover:border-slate-400",
                    currentMonth ? "text-slate-950" : "text-slate-400",
                    today && "border-slate-400",
                    selected && "border-blue-700 bg-blue-600 font-semibold text-white hover:border-blue-700"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </label>
  );
}

function LowSampleNotice() {
  const { language } = useLanguage();
  const isFa = language === "fa";

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-medium text-amber-100",
        isFa && "text-right"
      )}
      dir={isFa ? "rtl" : "ltr"}
    >
      <div>{isFa ? "این بینش‌ها بر اساس سابقه معاملاتی محدود هستند. برای الگوهای قابل‌اعتمادتر حداقل ۲۰ معامله بسته‌شده اضافه کنید." : "These insights are based on limited trade history. Add at least 20 closed trades for more reliable patterns."}</div>
    </div>
  );
}

function SampleSizeNotice({ count }: { count: number }) {
  const { language } = useLanguage();
  const isFa = language === "fa";

  if (count === 0 || count >= 20) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100 sm:flex-row sm:items-center sm:justify-between",
        isFa && "text-right"
      )}
      dir={isFa ? "rtl" : "ltr"}
    >
      <span className="font-medium">
        {isFa ? "این بینش‌ها بر اساس سابقه معاملاتی محدود هستند. برای الگوهای قابل‌اعتمادتر حداقل ۲۰ معامله بسته‌شده اضافه کنید." : "These insights are based on limited trade history. Add at least 20 closed trades for more reliable patterns."}
      </span>
      <span className="shrink-0 text-xs font-semibold uppercase text-amber-200">
        {isFa ? `اندازه نمونه: ${formatNumber(count, 0)}` : `Sample size: ${formatNumber(count, 0)}`}
      </span>
    </div>
  );
}

function AnalyticsEmptyState() {
  const { language } = useLanguage();
  const isFa = language === "fa";

  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]",
        isFa && "text-right"
      )}
      dir={isFa ? "rtl" : "ltr"}
    >
      <div className="max-w-2xl">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          {isFa ? "Analytics به معاملات بسته‌شده نیاز دارد" : "Analytics requires closed trades"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {isFa ? "وقتی معامله بسته‌شده‌ای وجود نداشته باشد، روند عملکرد، نرخ برد، فاکتور سود و الگوهای رفتاری فقط به صورت خالی نمایش داده می‌شوند." : "When there are no closed trades, performance trends, win rate, profit factor, and behavior patterns can only show empty results."}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/dashboard/accounts" className="inline-flex h-10 items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500">
          {isFa ? "اتصال MT5" : "Connect MT5"}
        </Link>
        <Link href="/journal" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          {isFa ? "افزودن معامله دستی" : "Add a manual trade"}
        </Link>
        <Link href="/journal" className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
          {isFa ? "باز کردن ژورنال معاملات" : "Open Trade Journal"}
        </Link>
      </div>
    </div>
  );
}

function CollapsibleAnalyticsSection({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  if (!collapsed) {
    return <>{children}</>;
  }

  return (
    <details className="rounded-lg border border-slate-800 bg-[#0F172A] p-4">
      <summary className="cursor-pointer text-sm font-semibold text-white">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function MoneyTooltip(props: ChartTooltipProps) {
  if (!props.active || !props.payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-[#020617] px-3 py-2 text-xs shadow-xl">
      <div className="mb-1 font-semibold text-white">{props.label}</div>
      <div className="space-y-1">
        {props.payload.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-5 text-slate-300">
            <span>{item.name}</span>
            <span style={{ color: item.color }}>{formatMoney(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PnlBarChart({
  data,
  xKey,
  height = 260,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  height?: number;
}) {
  const { t } = useLanguage();

  if (data.length === 0) {
    return <EmptyPanel message={t("journal.analytics.noTradesForReport")} />;
  }

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1E293B" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94A3B8" tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} width={70} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "#1E293B", opacity: 0.35 }} />
          <Bar dataKey="netPnl" name={t("journal.analytics.netPnl")} radius={[4, 4, 0, 0]}>
            {data.map((item, index) => (
              <Cell
                key={index}
                fill={Number(item.netPnl || 0) >= 0 ? "#10B981" : "#EF4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildPeriodPnlData(data: JournalAnalyticsResponse["equityCurve"]) {
  const days = new Map<string, number>();

  for (const point of data) {
    const day = point.label || (point.date ? point.date.slice(0, 10) : String(point.index));
    days.set(day, roundForChart((days.get(day) || 0) + Number(point.pnl || 0)));
  }

  if (days.size <= 60) {
    return {
      mode: "daily" as const,
      rows: Array.from(days.entries()).map(([label, netPnl]) => ({
        label,
        netPnl,
      })),
    };
  }

  const months = new Map<string, number>();

  for (const [day, pnl] of days.entries()) {
    const month = day.slice(0, 7);
    months.set(month, roundForChart((months.get(month) || 0) + pnl));
  }

  return {
    mode: "monthly" as const,
    rows: Array.from(months.entries()).map(([label, netPnl]) => ({
      label,
      netPnl,
    })),
  };
}

function roundForChart(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(2));
}

function WinLossDistribution({ overview }: { overview: JournalAnalyticsResponse["overview"] }) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const total = Math.max(overview.totalTrades, 1);
  const rows = [
    {
      label: isFa ? "برد" : "Wins",
      value: overview.winningTrades,
      color: "bg-emerald-400",
      text: "text-emerald-300",
    },
    {
      label: isFa ? "باخت" : "Losses",
      value: overview.losingTrades,
      color: "bg-red-400",
      text: "text-red-300",
    },
    {
      label: isFa ? "سر به سر" : "Breakeven",
      value: overview.breakEvenTrades,
      color: "bg-slate-400",
      text: "text-slate-300",
    },
  ];

  return (
    <div className="space-y-4">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-300">{row.label}</span>
            <span className={cn("font-semibold", row.text)}>{formatNumber(row.value, 0)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-800">
            <div className={cn("h-full rounded-full", row.color)} style={{ width: `${(row.value / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function withEquityStartingPoint(
  data: JournalAnalyticsResponse["equityCurve"],
  startingLabel: string
) {
  if (data.length !== 1) {
    return data;
  }

  const firstPoint = data[0];

  return [
    {
      ...firstPoint,
      index: 0,
      date: "",
      label: startingLabel,
      equity: 0,
      pnl: 0,
      tradeId: `${firstPoint.tradeId}-starting-point`,
    },
    firstPoint,
  ];
}

function EquityChart({ data }: { data: JournalAnalyticsResponse["equityCurve"] }) {
  const { t } = useLanguage();

  if (data.length === 0) {
    return <EmptyPanel message={t("journal.analytics.noEquityCurve")} />;
  }

  const chartData = withEquityStartingPoint(data, "0");

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1E293B" vertical={false} />
          <XAxis dataKey="label" stroke="#94A3B8" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} width={72} />
          <Tooltip content={<MoneyTooltip />} />
          <Line
            type="monotone"
            dataKey="equity"
            name={t("journal.analytics.equity")}
            stroke="#38BDF8"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#38BDF8" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DrawdownChart({ data }: { data: JournalAnalyticsResponse["drawdownCurve"] }) {
  const { t } = useLanguage();

  if (data.length === 0) {
    return <EmptyPanel message={t("journal.analytics.noDrawdownData")} />;
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#1E293B" vertical={false} />
          <XAxis dataKey="label" stroke="#94A3B8" tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis stroke="#94A3B8" tickLine={false} axisLine={false} width={72} />
          <Tooltip content={<MoneyTooltip />} />
          <Area
            type="monotone"
            dataKey="drawdown"
            name={t("journal.analytics.drawdown")}
            stroke="#F97316"
            fill="#F97316"
            fillOpacity={0.2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DirectionChart({ data }: { data: AnalyticsDirectionalStats[] }) {
  return <PnlBarChart data={data} xKey="direction" height={230} />;
}

function CircularMetric({
  label,
  value,
  display,
  tone = "neutral",
}: {
  label: string;
  value: number;
  display: string;
  tone?: "neutral" | "profit" | "loss";
}) {
  const normalized = Math.max(Math.min(Math.round(value), 100), 0);
  const color =
    tone === "profit" ? "#10B981" : tone === "loss" ? "#EF4444" : "#38BDF8";
  const track =
    tone === "profit"
      ? "rgba(16, 185, 129, 0.14)"
      : tone === "loss"
        ? "rgba(239, 68, 68, 0.14)"
        : "rgba(56, 189, 248, 0.14)";

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div
        className="grid h-[82px] w-[82px] shrink-0 place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(148,163,184,0.10)]"
        style={{
          background: `conic-gradient(${color} ${normalized * 3.6}deg, ${track} 0deg)`,
        }}
      >
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[#111827] shadow-[inset_0_0_18px_rgba(2,6,23,0.45)]">
          <div>
            <div
              className={cn(
                "text-[11px] font-bold leading-tight tabular-nums",
                tone === "profit" && "text-emerald-300",
                tone === "loss" && "text-red-300",
                tone === "neutral" && "text-sky-300"
              )}
            >
              {display}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-full truncate text-[11px] font-semibold text-slate-500">
        {label}
      </div>
    </div>
  );
}

function DirectionStats({ items }: { items: AnalyticsDirectionalStats[] }) {
  const { t } = useLanguage();
  const maxTrades = Math.max(...items.map((item) => item.totalTrades), 1);
  const maxAbsPnl = Math.max(...items.map((item) => Math.abs(item.netPnl)), 1);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div key={item.direction} className="rounded-lg border border-slate-800 bg-[#111827] p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              {item.direction === "BUY" ? t("journal.analytics.longBuy") : t("journal.analytics.shortSell")}
            </span>
            <span
              className={cn(
                "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
                item.direction === "BUY"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-red-500/30 bg-red-500/10 text-red-300"
              )}
            >
              {item.direction}
            </span>
          </div>
          <div className="mt-5 grid grid-cols-3 items-start gap-2">
            <CircularMetric
              label={t("journal.analytics.winRate")}
              value={item.winRate}
              display={formatPercent(item.winRate)}
              tone={item.winRate >= 50 ? "profit" : "loss"}
            />
            <CircularMetric
              label={t("journal.analytics.netPnl")}
              value={(Math.abs(item.netPnl) / maxAbsPnl) * 100}
              display={formatMoney(item.netPnl)}
              tone={valueTone(item.netPnl)}
            />
            <CircularMetric
              label={t("journal.analytics.trades")}
              value={(item.totalTrades / maxTrades) * 100}
              display={formatNumber(item.totalTrades, 0)}
              tone="neutral"
            />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-800/70 pt-4 text-sm">
            <Metric label={t("journal.analytics.average")} value={formatMoney(item.averagePnl)} tone={valueTone(item.averagePnl)} />
            <Metric label={t("journal.analytics.best")} value={formatMoney(item.bestTrade)} tone={valueTone(item.bestTrade)} />
            <Metric label={t("journal.analytics.worst")} value={formatMoney(item.worstTrade)} tone={valueTone(item.worstTrade)} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit" | "loss";
}) {
  return (
    <div>
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-1 font-semibold text-slate-200",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function valueToneClass(value: number | null | undefined) {
  const tone = valueTone(value);
  return cn(tone === "profit" && "text-emerald-300", tone === "loss" && "text-red-300");
}

function toFiniteNumber(value: number | string | null | undefined) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
}

function tagNamesFromTrade(trade: JournalTradeOption | null) {
  if (!trade?.tags) {
    return [];
  }

  return Array.from(
    new Set(
      trade.tags
        .map((item) => item.tag?.name || item.name || "")
        .map((name) => String(name).trim())
        .filter(Boolean)
    )
  );
}

function screenshotUrlFromTrade(
  trade: JournalTradeOption | null,
  type: "entry" | "exit"
) {
  if (!trade) {
    return null;
  }

  const directUrl =
    type === "entry" ? trade.entryScreenshotUrl : trade.exitScreenshotUrl;

  if (directUrl) {
    return directUrl;
  }

  return (
    trade.screenshots?.find(
      (screenshot) => screenshot.type.toLowerCase() === type
    )?.url || null
  );
}

function tradeDateKey(trade: JournalTradeOption | null) {
  const value = trade?.openedAt || trade?.closedAt;

  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstString(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text ? [text] : [];
}

function normalizeMetadataPayload(value: Partial<TradeMetadata> | null | undefined): TradeMetadata {
  return {
    rating: typeof value?.rating === "number" ? value.rating : null,
    mistakes: normalizeStringArray(value?.mistakes),
    setups: normalizeStringArray(value?.setups),
    emotions: normalizeStringArray(value?.emotions),
    customTags: normalizeStringArray(value?.customTags),
    tradeNote: String(value?.tradeNote || ""),
    dailyJournal: String(value?.dailyJournal || ""),
    checklistResults: normalizeStringArray(value?.checklistResults),
    psychologyStatus: String(value?.psychologyStatus || ""),
    exitReason: String(value?.exitReason || ""),
  };
}

function metadataFromTrade(trade: JournalTradeOption | null): TradeMetadata {
  return {
    rating: null,
    mistakes: firstString(trade?.mistake),
    setups: firstString(trade?.setup),
    emotions: firstString(trade?.emotion),
    customTags: tagNamesFromTrade(trade),
    tradeNote: trade?.notes || "",
    dailyJournal: "",
    checklistResults: [],
    psychologyStatus: "",
    exitReason: "",
  };
}

function mergeMetadataWithTrade(
  savedMetadata: Partial<TradeMetadata> | null | undefined,
  trade: JournalTradeOption | null
) {
  const fallback = metadataFromTrade(trade);
  const saved = normalizeMetadataPayload(savedMetadata);

  return {
    rating: saved.rating ?? fallback.rating,
    mistakes: saved.mistakes.length > 0 ? saved.mistakes : fallback.mistakes,
    setups: saved.setups.length > 0 ? saved.setups : fallback.setups,
    emotions: saved.emotions.length > 0 ? saved.emotions : fallback.emotions,
    customTags: saved.customTags.length > 0 ? saved.customTags : fallback.customTags,
    tradeNote: saved.tradeNote || fallback.tradeNote,
    dailyJournal: saved.dailyJournal,
    checklistResults: saved.checklistResults,
    psychologyStatus: saved.psychologyStatus,
    exitReason: saved.exitReason,
  };
}

function bestPnlRow(rows: TagAnalyticsRow[]) {
  return rows
    .filter((row) => row.totalTrades > 0)
    .sort((a, b) => b.netPnl - a.netPnl)[0] || null;
}

function worstPnlRow(rows: TagAnalyticsRow[]) {
  return rows
    .filter((row) => row.totalTrades > 0)
    .sort((a, b) => a.netPnl - b.netPnl)[0] || null;
}

function behaviorRowsFromAnalytics(analytics: JournalAnalyticsResponse): BehaviorPatternRow[] {
  const mistakes = analytics.byMistake.map((row) => ({
    kind: "mistake" as const,
    label: row.label,
    totalTrades: row.totalTrades,
    winRate: row.winRate,
    netPnl: row.netPnl,
    averagePnl: row.averagePnl,
  }));

  const psychology = analytics.byPsychology.map((row: PsychologyAnalyticsRow) => ({
    kind: "psychology" as const,
    label: row.psychologyStatus,
    totalTrades: row.totalTrades,
    winRate: row.winRate,
    netPnl: row.netPnl,
    averagePnl: row.averagePnl,
  }));

  return [...mistakes, ...psychology].filter((row) => row.totalTrades > 0 && row.label.trim());
}

function mostExpensiveBehaviorRow(rows: BehaviorPatternRow[]) {
  return rows
    .filter((row) => row.netPnl < 0)
    .sort((a, b) => a.netPnl - b.netPnl || b.totalTrades - a.totalTrades)[0] || null;
}

function bestBehaviorRow(rows: BehaviorPatternRow[]) {
  return rows
    .filter((row) => row.netPnl > 0)
    .sort((a, b) => b.netPnl - a.netPnl || b.winRate - a.winRate)[0] || null;
}

function reliableBehaviorRows(rows: BehaviorPatternRow[]) {
  return rows
    .filter((row) => row.totalTrades >= 2)
    .sort((a, b) => a.netPnl - b.netPnl || b.totalTrades - a.totalTrades)
    .slice(0, 3);
}

function behaviorSampleTone(totalTrades: number) {
  if (totalTrades >= 20) {
    return "profit";
  }

  if (totalTrades >= 8) {
    return "amber";
  }

  return "loss";
}

function behaviorKindLabel(kind: BehaviorPatternRow["kind"], isFa: boolean) {
  if (kind === "mistake") {
    return isFa ? "اشتباه" : "Mistake";
  }

  return isFa ? "روانشناسی" : "Psychology";
}

function behaviorSampleLabel(totalTrades: number, isFa: boolean) {
  if (totalTrades >= 20) {
    return isFa ? "نمونه قابل اتکا" : "Reliable sample";
  }

  if (totalTrades >= 8) {
    return isFa ? "نمونه در حال شکل‌گیری" : "Building sample";
  }

  return isFa ? "نمونه خیلی کم" : "Very small sample";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function AnalyticsHero({
  analytics,
  loading,
}: {
  analytics: JournalAnalyticsResponse;
  loading: boolean;
}) {
  const { t, language } = useLanguage();
  const isRtl = language === "fa";
  const overview = analytics.overview;
  const costlyMistake = worstPnlRow(analytics.byMistake) || worstPnlRow(analytics.byTag);
  const bestSetup = bestPnlRow(analytics.bySetup) || bestPnlRow(analytics.byTag);
  const activeHours = analytics.byHour.filter((row) => row.totalTrades > 0);
  const weakHour = activeHours.sort((a, b) => a.netPnl - b.netPnl)[0] || null;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0B1020]">
      <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
        <div
          className={cn(
            "bg-gradient-to-br from-slate-50 via-white to-violet-50 p-5 sm:p-6 lg:p-7 dark:bg-none",
            isRtl && "text-right"
          )}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200",
              isRtl && "tracking-normal"
            )}
          >
            <Activity className="h-3.5 w-3.5" />
            {t("journal.analytics.tradeAnalysis")}
          </div>
          <h1 className={cn("mt-5 max-w-3xl text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl dark:text-white", isRtl && "mr-0 ml-auto")}>
            {t("journal.analytics.heroTitlePrefix")} <span className="text-violet-600 dark:text-violet-300">{t("journal.analytics.heroTitleHighlight")}</span> {t("journal.analytics.heroTitleSuffix")}
          </h1>
          <p className={cn("mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400", isRtl && "mr-0 ml-auto text-right")}>
            {t("journal.analytics.heroDescription")}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label={t("journal.analytics.netPnl")} value={formatMoney(overview.totalNetPnl)} tone={valueTone(overview.totalNetPnl)} />
            <MetricTile label={t("journal.analytics.winRate")} value={formatPercent(overview.winRate)} tone="blue" />
            <MetricTile label={t("journal.analytics.profitFactor")} value={formatNumber(overview.profitFactor, 2)} tone="amber" />
            <MetricTile label={t("journal.analytics.expectancy")} value={formatMoney(overview.expectancyPerTrade)} tone={valueTone(overview.expectancyPerTrade)} />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-white p-5 sm:p-6 xl:border-l xl:border-t-0 dark:border-slate-800 dark:bg-[#111827]" dir={isRtl ? "rtl" : "ltr"}>
          <div className={cn("mb-4 flex items-center justify-between gap-3", isRtl && "text-right")}>
            <div>
              <div className="text-sm font-semibold text-slate-950 dark:text-white">{t("journal.analytics.keyInsights")}</div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {loading ? t("journal.analytics.updatingReport") : t("journal.analytics.closedTradesAnalyzed").replace("{count}", formatNumber(overview.totalTrades, 0))}
              </div>
            </div>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-violet-500 dark:text-violet-300" />
            ) : (
              <Zap className="h-4 w-4 text-violet-500 dark:text-violet-300" />
            )}
          </div>
          <div className="space-y-3">
            <InsightLine
              icon={<AlertTriangle className="h-4 w-4" />}
              label={t("journal.analytics.costliestMistake")}
              value={costlyMistake ? costlyMistake.label : t("journal.analytics.noMistakeTags")}
              detail={costlyMistake ? t("journal.analytics.moneyAcrossTrades").replace("{money}", formatMoney(costlyMistake.netPnl)).replace("{count}", formatNumber(costlyMistake.totalTrades, 0)) : t("journal.analytics.tagLosingTrades")}
              tone="loss"
            />
            <InsightLine
              icon={<ClipboardCheck className="h-4 w-4" />}
              label={t("journal.analytics.bestSetup")}
              value={bestSetup ? bestSetup.label : t("journal.analytics.noSetupData")}
              detail={bestSetup ? t("journal.analytics.moneyWinRate").replace("{money}", formatMoney(bestSetup.netPnl)).replace("{rate}", formatPercent(bestSetup.winRate)) : t("journal.analytics.addSetupNames")}
              tone="profit"
            />
            <InsightLine
              icon={<CalendarDays className="h-4 w-4" />}
              label={t("journal.analytics.weakTimeWindow")}
              value={weakHour ? weakHour.label : t("journal.analytics.noHourData")}
              detail={weakHour ? t("journal.analytics.moneyFromOpenedTrades").replace("{money}", formatMoney(weakHour.netPnl)) : t("journal.analytics.closedTradesNeeded")}
              tone="amber"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
      <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-lg font-semibold text-slate-950 dark:text-white",
          tone === "profit" && "text-emerald-600 dark:text-emerald-300",
          tone === "loss" && "text-red-500 dark:text-red-300",
          tone === "blue" && "text-sky-500 dark:text-sky-300",
          tone === "amber" && "text-amber-500 dark:text-amber-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function InsightLine({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "profit" | "loss" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-[#0B1020]">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            tone === "profit" && "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
            tone === "loss" && "border-red-200 bg-red-50 text-red-600 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
            tone === "amber" && "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-500">{label}</div>
          <div className="mt-1 truncate text-sm font-semibold text-slate-950 dark:text-white">{value}</div>
          <div className="mt-1 text-xs text-slate-600 dark:text-slate-400">{detail}</div>
        </div>
      </div>
    </div>
  );
}

function BehaviorInsightPanel({ analytics }: { analytics: JournalAnalyticsResponse }) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const rows = behaviorRowsFromAnalytics(analytics);
  const worst = mostExpensiveBehaviorRow(rows);
  const best = bestBehaviorRow(rows);
  const riskRows = reliableBehaviorRows(rows);
  const totalTrades = analytics.overview.totalTrades;
  const sampleTone = behaviorSampleTone(totalTrades);
  const patternCount = rows.length;

  if (rows.length === 0) {
    return (
      <EmptyPanel
        message={
          isFa
            ? "هنوز داده رفتاری کافی نداریم. در بررسی معامله، اشتباه، احساس یا وضعیت روانشناسی را ثبت کنید تا این کارت به شما بگوید کدام رفتار پول از حساب خارج می‌کند."
            : "No behavior data yet. Add mistake, emotion, or psychology tags during trade review so this card can show which behavior is costing the account."
        }
      />
    );
  }

  const actionText = worst
    ? isFa
      ? worst.totalTrades >= 3
        ? `قانون معامله بعدی: وقتی "${worst.label}" رخ می‌دهد، قبل از ورود توقف کن و فقط با تایید پلن وارد شو. این الگو فعلا ${formatMoney(worst.netPnl)} هزینه داشته است.`
        : `این نشانه هنوز فقط ${formatNumber(worst.totalTrades, 0)} بار دیده شده؛ در ۵ معامله بسته‌شده بعدی، صفحه جزئیات معامله را باز کن و اگر دوباره رخ داد، آن را در بخش بررسی روانشناسی و فیلد «خطای روانشناسی» ثبت کن.`
      : worst.totalTrades >= 3
        ? `Next-trade rule: when "${worst.label}" appears, pause before entry and only continue with playbook confirmation. It has cost ${formatMoney(worst.netPnl)} so far.`
        : `This signal only appeared ${formatNumber(worst.totalTrades, 0)} time(s). For the next 5 closed trades, open the trade detail page and record it in the psychology review's Mistake Tag field if it happens again.`
    : best
      ? isFa
        ? `فعلا نشتی رفتاری واضح دیده نمی‌شود. شرایطی را که باعث "${best.label}" شده یادداشت کن و همان چک‌لیست را تکرار کن.`
        : `No clear behavior leak is visible yet. Note what created "${best.label}" and repeat that checklist.`
      : isFa
        ? "فعلا اثر مالی الگوها خنثی است. برچسب‌گذاری را ادامه بده تا کارت بتواند رفتارهای پرهزینه را جدا کند."
        : "Behavior impact is flat so far. Keep tagging trades so this card can separate costly patterns from noise.";

  return (
    <div className={cn("space-y-4", isFa && "text-right")} dir={isFa ? "rtl" : "ltr"}>
      <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-sky-300 bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-100">
              <Brain className="h-3.5 w-3.5" />
              {isFa ? "تحلیل رفتار معاملاتی" : "Trading behavior analysis"}
            </div>
            <h3 className="mt-3 text-base font-semibold text-white">
              {worst
                ? isFa
                  ? "بزرگ‌ترین نشتی فعلی حساب"
                  : "Current biggest account leak"
                : isFa
                  ? "رفتار قابل تکرار فعلی"
                  : "Current repeatable behavior"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{actionText}</p>
          </div>

          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-sm font-semibold",
              sampleTone === "profit" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
              sampleTone === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
              sampleTone === "loss" && "border-red-500/30 bg-red-500/10 text-red-300"
            )}
          >
            {behaviorSampleLabel(totalTrades, isFa)}
            <div className="mt-1 text-xs font-normal text-slate-400">
              {isFa
                ? `${formatNumber(totalTrades, 0)} معامله بسته / ${formatNumber(patternCount, 0)} الگو`
                : `${formatNumber(totalTrades, 0)} closed trades / ${formatNumber(patternCount, 0)} patterns`}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <BehaviorSummaryTile
            label={isFa ? "نشتی پول" : "Money leak"}
            title={worst ? worst.label : isFa ? "نامشخص" : "None yet"}
            value={worst ? formatMoney(worst.netPnl) : formatMoney(0)}
            helper={
              worst
                ? `${behaviorKindLabel(worst.kind, isFa)} / ${formatNumber(worst.totalTrades, 0)} ${isFa ? "معامله" : "trades"}`
                : isFa
                  ? "هنوز الگوی زیان‌ده نداریم"
                  : "No losing pattern yet"
            }
            tone={worst ? "loss" : "neutral"}
          />
          <BehaviorSummaryTile
            label={isFa ? "رفتار سودساز" : "Repeat winner"}
            title={best ? best.label : isFa ? "نامشخص" : "None yet"}
            value={best ? formatMoney(best.netPnl) : formatMoney(0)}
            helper={
              best
                ? `${behaviorKindLabel(best.kind, isFa)} / ${formatPercent(best.winRate)} ${isFa ? "برد" : "win rate"}`
                : isFa
                  ? "برای پیدا شدن به داده بیشتر نیاز است"
                  : "Needs more data"
            }
            tone={best ? "profit" : "neutral"}
          />
          <BehaviorSummaryTile
            label={isFa ? "اثر متوسط" : "Average impact"}
            title={worst || best ? (worst || best)?.label || "" : isFa ? "داده کم" : "Low data"}
            value={worst || best ? formatMoney((worst || best)?.averagePnl || 0) : formatMoney(0)}
            helper={
              isFa
                ? "میانگین سود یا ضرر هر بار تکرار"
                : "Average PnL each time it appears"
            }
            tone={valueTone((worst || best)?.averagePnl || 0)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">
              {isFa ? "اولویت‌های بررسی بعدی" : "Next review priorities"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {isFa
                ? "ردیف‌هایی که حداقل ۲ بار دیده شده‌اند بالاتر آمده‌اند، چون برای تصمیم‌گیری قابل اتکاتر از نمونه‌های تک‌معامله‌ای هستند."
                : "Rows seen at least twice are prioritized because they are more useful than one-trade samples."}
            </p>
          </div>
          <Search className="h-4 w-4 shrink-0 text-slate-500" />
        </div>

        <div className="space-y-2">
          {(riskRows.length > 0 ? riskRows : rows.slice(0, 3)).map((row) => (
            <BehaviorRiskRow key={`${row.kind}-${row.label}`} row={row} isFa={isFa} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BehaviorSummaryTile({
  label,
  title,
  value,
  helper,
  tone,
}: {
  label: string;
  title: string;
  value: string;
  helper: string;
  tone: "neutral" | "profit" | "loss";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-2 truncate text-sm font-semibold text-white">{title}</div>
      <div className={cn("mt-1 text-lg font-semibold", tone === "profit" && "text-emerald-300", tone === "loss" && "text-red-300")}>
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{helper}</div>
    </div>
  );
}

function BehaviorRiskRow({ row, isFa }: { row: BehaviorPatternRow; isFa: boolean }) {
  const tone = valueTone(row.netPnl);

  return (
    <div className="grid gap-3 rounded-md border border-slate-800 bg-[#0F172A] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
            {behaviorKindLabel(row.kind, isFa)}
          </span>
          <span className="truncate text-sm font-semibold text-white">{row.label}</span>
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {formatNumber(row.totalTrades, 0)} {isFa ? "معامله" : "trades"} / {formatPercent(row.winRate)} {isFa ? "برد" : "win rate"} / {isFa ? "میانگین" : "avg"} {formatMoney(row.averagePnl)}
        </div>
      </div>
      <div className={cn("text-sm font-semibold", tone === "profit" && "text-emerald-300", tone === "loss" && "text-red-300", tone === "neutral" && "text-slate-300")}>
        {formatMoney(row.netPnl)}
      </div>
    </div>
  );
}

function StrategyTable({ rows }: { rows: StrategyAnalyticsRow[] }) {
  const { t } = useLanguage();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="text-xs uppercase text-slate-500">
          <tr>
            <th className="py-2 pr-3">{t("journal.analytics.strategy")}</th>
            <th className="py-2 pr-3">{t("journal.analytics.trades")}</th>
            <th className="py-2 pr-3">{t("journal.analytics.winRate")}</th>
            <th className="py-2 pr-3">{t("journal.analytics.netPnl")}</th>
            <th className="py-2 pr-3">{t("journal.analytics.profitFactor")}</th>
            <th className="py-2">{t("journal.analytics.average")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((row) => (
            <tr key={row.strategy} className="text-slate-300">
              <td className="py-3 pr-3 font-semibold text-white">{row.strategy}</td>
              <td className="py-3 pr-3">{formatNumber(row.totalTrades, 0)}</td>
              <td className="py-3 pr-3">{formatPercent(row.winRate)}</td>
              <td className={cn("py-3 pr-3 font-semibold", valueToneClass(row.netPnl))}>
                {formatMoney(row.netPnl)}
              </td>
              <td className="py-3 pr-3">{formatNumber(row.profitFactor, 2)}</td>
              <td className={cn("py-3", valueToneClass(row.averagePnl))}>
                {formatMoney(row.averagePnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <EmptyPanel message={t("journal.analytics.noStrategyFilter")} />
      )}
    </div>
  );
}

function TradeZellaMetricRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-[#0F172A] px-3 py-2 text-xs">
      <span className="text-slate-400">{label}</span>
      <span
        className={cn(
          "font-semibold text-slate-100",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "blue" && "text-sky-700 dark:text-sky-300",
          tone === "amber" && "text-amber-300"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function AnalysisStatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-xs font-semibold",
        tone === "profit" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
        tone === "loss" && "border-red-500/30 bg-red-500/10 text-red-300",
        tone === "blue" && "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-100",
        tone === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-300",
        tone === "neutral" && "border-slate-700 bg-slate-800 text-slate-300"
      )}
    >
      {label}
    </span>
  );
}

function AnalysisSummaryCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#0F172A] p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-xl font-semibold text-white",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "blue" && "text-sky-700 dark:text-sky-300",
          tone === "amber" && "text-amber-300"
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{helper}</div>
    </div>
  );
}

function AnalysisTableRow({
  topic,
  value,
  meaning,
  tone = "neutral",
}: {
  topic: string;
  value: string;
  meaning: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <tr className="border-t border-slate-800 text-sm">
      <td className="py-3 pr-3 font-semibold text-slate-200">{topic}</td>
      <td className="py-3 pr-3">
        <AnalysisStatusPill label={value} tone={tone} />
      </td>
      <td className="py-3 text-slate-400">{meaning}</td>
    </tr>
  );
}

function TradeAnalysisTable({
  analytics,
  selectedTrade,
  tradeNote,
  entryScreenshotUrl,
  exitScreenshotUrl,
  selectedTradeDate,
}: {
  analytics: JournalAnalyticsResponse;
  selectedTrade: JournalTradeOption | null;
  tradeNote: string;
  entryScreenshotUrl: string | null;
  exitScreenshotUrl: string | null;
  selectedTradeDate: string | null;
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const labels = isFa
    ? {
        title: "جدول تحلیل معامله",
        subtitle: "خلاصه قابل فهم از معامله انتخاب‌شده و وضعیت کلی حساب.",
        result: "نتیجه معامله",
        rr: "ریسک به ریوارد",
        timing: "زمان معامله",
        context: "اطلاعات رفتاری",
        evidence: "مدارک ثبت‌شده",
        account: "وضعیت حساب",
        missingTrade: "هنوز معامله‌ای انتخاب نشده",
        positive: "مثبت",
        negative: "منفی",
        flat: "خنثی",
        good: "کامل",
        partial: "نسبی",
        weak: "ناقص",
        tableTopic: "بخش",
        tableValue: "وضعیت",
        tableMeaning: "برداشت",
        next: "برداشت سریع",
      }
    : {
        title: "Trade Analysis Table",
        subtitle: "Readable summary of the selected trade and account context.",
        result: "Trade result",
        rr: "Risk to reward",
        timing: "Trade timing",
        context: "Behavior context",
        evidence: "Saved evidence",
        account: "Account state",
        missingTrade: "No trade selected yet",
        positive: "Positive",
        negative: "Negative",
        flat: "Flat",
        good: "Complete",
        partial: "Partial",
        weak: "Missing",
        tableTopic: "Area",
        tableValue: "Status",
        tableMeaning: "Meaning",
        next: "Quick read",
      };
  const pnl = selectedTrade ? toFiniteNumber(selectedTrade.profitLoss) : analytics.overview.totalNetPnl;
  const rr = selectedTrade ? toFiniteNumber(selectedTrade.rr) : analytics.overview.averageRR;
  const resultTone = valueTone(pnl);
  const resultLabel =
    resultTone === "profit" ? labels.positive : resultTone === "loss" ? labels.negative : labels.flat;
  const tags = tagNamesFromTrade(selectedTrade);
  const contextCount = [
    selectedTrade?.setup,
    selectedTrade?.emotion,
    selectedTrade?.mistake,
    tags.length > 0 ? tags.join(", ") : "",
  ].filter(Boolean).length;
  const evidenceCount = [
    entryScreenshotUrl,
    exitScreenshotUrl,
    tradeNote.trim(),
    selectedTradeDate,
  ].filter(Boolean).length;
  const evidenceTone = evidenceCount >= 3 ? "profit" : evidenceCount >= 1 ? "amber" : "loss";
  const contextTone = contextCount >= 3 ? "profit" : contextCount >= 1 ? "amber" : "loss";
  const rrTone = rr >= 1.5 ? "profit" : rr > 0 ? "amber" : "neutral";
  const sampleTone = analytics.overview.totalTrades >= 20 ? "profit" : analytics.overview.totalTrades > 0 ? "amber" : "neutral";
  const quickRead =
    resultTone === "profit"
      ? isFa
        ? "این معامله سودده بوده؛ حالا بررسی کن آیا طبق پلن اجرا شده یا فقط نتیجه مثبت بوده."
        : "This trade was profitable. Now check whether the execution followed the plan."
      : resultTone === "loss"
        ? isFa
          ? "این معامله ضررده بوده؛ برای تصمیم بعدی علت ورود، اسکرین‌شات و احساسات را بررسی کن."
          : "This trade lost money. Review entry reason, screenshots, and emotion before the next decision."
        : isFa
          ? "نتیجه مالی خنثی است؛ کیفیت اجرای پلن مهم‌تر از سود و ضرر این معامله است."
          : "Financial result is flat. Execution quality matters more than this trade's P&L.";

  return (
    <div className="border-b border-slate-800 bg-[#020617] p-4">
      <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">{labels.title}</h3>
            <p className="mt-1 text-sm text-slate-400">{labels.subtitle}</p>
          </div>
          <AnalysisStatusPill
            label={selectedTrade ? `${selectedTrade.symbol} / ${selectedTrade.direction}` : labels.missingTrade}
            tone={selectedTrade?.direction === "SELL" ? "loss" : selectedTrade ? "profit" : "neutral"}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <AnalysisSummaryCard
            label={labels.result}
            value={formatMoney(pnl)}
            helper={selectedTrade ? resultLabel : `${formatNumber(analytics.overview.totalTrades, 0)} trades in this view`}
            tone={resultTone}
          />
          <AnalysisSummaryCard
            label={labels.rr}
            value={formatNumber(rr, 2)}
            helper={rr >= 1.5 ? (isFa ? "ریسک/ریوارد قابل قبول" : "Healthy reward profile") : (isFa ? "نیازمند بررسی ریسک" : "Risk profile needs review")}
            tone={rrTone}
          />
          <AnalysisSummaryCard
            label={labels.account}
            value={formatPercent(analytics.overview.winRate)}
            helper={`${formatNumber(analytics.overview.totalTrades, 0)} trades / PF ${formatNumber(analytics.overview.profitFactor, 2)}`}
            tone={sampleTone}
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 pr-3">{labels.tableTopic}</th>
                <th className="py-2 pr-3">{labels.tableValue}</th>
                <th className="py-2">{labels.tableMeaning}</th>
              </tr>
            </thead>
            <tbody>
              <AnalysisTableRow
                topic={labels.result}
                value={`${formatMoney(pnl)} / ${resultLabel}`}
                meaning={selectedTrade ? (isFa ? "نتیجه همین معامله انتخاب‌شده." : "Outcome for the selected trade.") : (isFa ? "نتیجه کل معاملات فیلترشده." : "Result for the filtered trade set.")}
                tone={resultTone}
              />
              <AnalysisTableRow
                topic={labels.rr}
                value={formatNumber(rr, 2)}
                meaning={isFa ? "هرچه بالاتر باشد، پاداش نسبت به ریسک بهتر بوده است." : "Higher values mean better reward compared with risk."}
                tone={rrTone}
              />
              <AnalysisTableRow
                topic={labels.timing}
                value={`${formatDateTime(selectedTrade?.openedAt)} - ${formatDateTime(selectedTrade?.closedAt)}`}
                meaning={isFa ? "برای پیدا کردن ساعت‌های قوی و ضعیف معامله استفاده می‌شود." : "Use this to compare strong and weak trading windows."}
                tone="blue"
              />
              <AnalysisTableRow
                topic={labels.context}
                value={contextCount >= 3 ? labels.good : contextCount >= 1 ? labels.partial : labels.weak}
                meaning={`${selectedTrade?.setup || (isFa ? "بدون ستاپ" : "No setup")} / ${selectedTrade?.emotion || (isFa ? "بدون احساس" : "No emotion")} / ${selectedTrade?.mistake || (isFa ? "بدون اشتباه" : "No mistake")}${tags.length ? ` / ${tags.join(", ")}` : ""}`}
                tone={contextTone}
              />
              <AnalysisTableRow
                topic={labels.evidence}
                value={evidenceCount >= 3 ? labels.good : evidenceCount >= 1 ? labels.partial : labels.weak}
                meaning={`${entryScreenshotUrl ? (isFa ? "اسکرین‌شات ورود" : "Entry screenshot") : (isFa ? "بدون اسکرین‌شات ورود" : "No entry screenshot")} / ${exitScreenshotUrl ? (isFa ? "اسکرین‌شات خروج" : "Exit screenshot") : (isFa ? "بدون اسکرین‌شات خروج" : "No exit screenshot")} / ${tradeNote.trim() ? (isFa ? "یادداشت معامله ذخیره شده" : "Trade note saved") : (isFa ? "بدون یادداشت معامله" : "No trade note")}`}
                tone={evidenceTone}
              />
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg border border-slate-800 bg-[#0F172A] p-3">
          <div className="text-xs font-semibold uppercase text-slate-500">{labels.next}</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{quickRead}</p>
        </div>
      </div>
    </div>
  );
}

function TradeZellaChartPanel({
  analytics,
  selectedTrade,
  tradeNote,
  activeNoteTab,
  onActiveNoteTabChange,
}: {
  analytics: JournalAnalyticsResponse;
  selectedTrade: JournalTradeOption | null;
  tradeNote: string;
  activeNoteTab: ReviewPanelTab;
  onActiveNoteTabChange: (tab: ReviewPanelTab) => void;
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const [expandedScreenshotUrl, setExpandedScreenshotUrl] = useState<string | null>(null);
  const entryScreenshotUrl = screenshotUrlFromTrade(selectedTrade, "entry");
  const exitScreenshotUrl = screenshotUrlFromTrade(selectedTrade, "exit");
  const selectedTradeDate = tradeDateKey(selectedTrade);
  const selectedTradeIsOpen = selectedTrade?.status === "OPEN";
  const reviewCopy = {
    entry: isFa ? "اسکرین‌شات ورود" : "Entry Screenshot",
    exit: isFa ? "اسکرین‌شات خروج" : "Exit Screenshot",
    trade: isFa ? "یادداشت معامله" : "Trade Note",
    daily: isFa ? "ژورنال روزانه" : "Daily Journal",
    openReview: isFa ? "باز کردن بررسی معامله" : "Open Trade Review",
    openScreenshotPreview: isFa ? "باز کردن پیش‌نمایش اسکرین‌شات" : "Open screenshot preview",
    closeScreenshotPreview: isFa ? "بستن پیش‌نمایش اسکرین‌شات" : "Close screenshot preview",
    noScreenshot:
      isFa
        ? selectedTradeIsOpen && activeNoteTab === "exit"
          ? "اسکرین‌شات خروج هنوز ثبت نشده است، چون رویداد بسته‌شدن معامله از MT5 به سایت نرسیده است."
          : "هنوز برای این معامله اسکرین‌شاتی ذخیره نشده است."
        : selectedTradeIsOpen && activeNoteTab === "exit"
          ? "Exit screenshot is not saved yet because the MT5 close event has not reached the site."
          : "No screenshot saved for this trade yet.",
    dailyTitle: isFa ? "ژورنال روزانه" : "Daily Journal",
    dailyDescription: isFa
      ? `این معامله به ژورنال روزانه ${selectedTradeDate || "تاریخ انتخاب‌شده"} مربوط است.`
      : `This trade belongs to the daily journal for ${selectedTradeDate || "the selected trade date"}.`,
    openDaily: isFa ? "باز کردن ژورنال روزانه این روز" : "Open Daily Journal for this day",
    noTradeNote: isFa
      ? "هنوز یادداشت معامله ذخیره نشده است. برای ویرایش یا بررسی این معامله، بررسی معامله را باز کنید."
      : "No trade note saved yet. Open Trade Review to edit or review this trade.",
  };
  const activeScreenshotUrl =
    activeNoteTab === "entry"
      ? entryScreenshotUrl
      : activeNoteTab === "exit"
        ? exitScreenshotUrl
        : null;
  const activeScreenshotAlt =
    activeNoteTab === "entry" ? reviewCopy.entry : reviewCopy.exit;
  const reviewTabs: Array<{ id: ReviewPanelTab; label: string }> = [
    { id: "entry", label: reviewCopy.entry },
    { id: "exit", label: reviewCopy.exit },
    { id: "trade", label: reviewCopy.trade },
    { id: "daily", label: reviewCopy.daily },
  ];

  return (
    <div className="min-w-0 flex-1 bg-[#020617]">
      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0F172A] px-4 py-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold text-slate-400">
          {["1m", "5m", "1h", "Indicators"].map((label) => (
            <span key={label} className="shrink-0 rounded-md border border-slate-800 bg-[#111827] px-2 py-1">
              {label}
            </span>
          ))}
        </div>
        <div className={cn("text-xs font-semibold", valueToneClass(analytics.overview.totalNetPnl))}>
          {formatMoney(analytics.overview.totalNetPnl)}
        </div>
      </div>

      <div className="flex min-h-[640px] flex-col">
        <TradeAnalysisTable
          analytics={analytics}
          selectedTrade={selectedTrade}
          tradeNote={tradeNote}
          entryScreenshotUrl={entryScreenshotUrl}
          exitScreenshotUrl={exitScreenshotUrl}
          selectedTradeDate={selectedTradeDate}
        />

        <div className="border-b border-slate-800 bg-[#0F172A]">
          <div className={cn("flex min-h-14 items-center gap-2 overflow-x-auto px-4 py-2", isFa && "justify-start text-left")}>
            {reviewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onActiveNoteTabChange(tab.id)}
                className={cn(
                  "h-9 shrink-0 rounded-md border px-3 text-xs font-semibold transition",
                  activeNoteTab === tab.id
                    ? "border-violet-500/60 bg-violet-600 text-white shadow-sm shadow-violet-950/30"
                    : "border-slate-800 bg-[#111827] text-slate-400 hover:border-slate-700 hover:text-slate-100"
                )}
              >
                {tab.label}
              </button>
            ))}
            {selectedTrade ? (
              <Link
                href={`/journal/${selectedTrade.id}`}
                className="ml-auto inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-500"
              >
                {reviewCopy.openReview}
              </Link>
            ) : null}
          </div>
        </div>

        <div className="bg-[#020617] p-4">
          {activeNoteTab === "entry" || activeNoteTab === "exit" ? (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-slate-800 bg-[#0F172A] p-3 shadow-lg shadow-black/20 sm:h-[360px] xl:h-[480px] 2xl:h-[540px]">
              {activeScreenshotUrl ? (
                <button
                  type="button"
                  onClick={() => setExpandedScreenshotUrl(activeScreenshotUrl)}
                  className="flex h-full w-full items-center justify-center rounded-md border border-slate-700 bg-[#020617] p-2 shadow-inner shadow-black/30 outline-none transition hover:border-violet-500/60 focus:border-violet-500"
                  title={reviewCopy.openScreenshotPreview}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeScreenshotUrl}
                    alt={activeScreenshotAlt}
                    className="h-full w-full object-contain"
                  />
                </button>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-slate-700 bg-[#111827] px-4 text-center text-sm text-slate-400">
                  {reviewCopy.noScreenshot}
                </div>
              )}
            </div>
          ) : activeNoteTab === "daily" ? (
            <div className={cn("rounded-lg border border-slate-800 bg-[#0F172A] p-5", isFa && "text-left")} dir={isFa ? "rtl" : "ltr"}>
              <div className={cn("flex items-start gap-3", isFa && "flex-row-reverse justify-start")}>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-[#111827] text-blue-300">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white">{reviewCopy.dailyTitle}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {reviewCopy.dailyDescription}
                  </p>
                </div>
              </div>
              {selectedTradeDate ? (
                <Link
                  href={`/dashboard/daily-journal?date=${selectedTradeDate}`}
                  className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  <CalendarDays className="h-4 w-4" />
                  {reviewCopy.openDaily}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className={cn("min-h-[280px] rounded-lg border border-slate-800 bg-[#0F172A] px-4 py-3 text-sm leading-6 text-slate-300 sm:min-h-[340px]", isFa && "text-left")} dir={isFa ? "rtl" : "ltr"}>
              {tradeNote.trim() || reviewCopy.noTradeNote}
            </div>
          )}
        </div>
      </div>

      {expandedScreenshotUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setExpandedScreenshotUrl(null)}
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-7xl items-center justify-center rounded-lg border border-slate-700 bg-[#020617] p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setExpandedScreenshotUrl(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-700 bg-[#111827] text-slate-300 hover:border-violet-500 hover:text-white"
              aria-label={reviewCopy.closeScreenshotPreview}
            >
              <X className="h-4 w-4" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={expandedScreenshotUrl}
              alt={activeScreenshotAlt}
              className="max-h-[86vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function buildWorkspaceMetrics(
  overview: JournalAnalyticsResponse["overview"],
  trade: JournalTradeOption | null,
  t: (key: string) => string
): EditableMetric[] {
  const tradePnl = trade ? toFiniteNumber(trade.profitLoss) : overview.totalNetPnl;
  const tradeRR = trade ? toFiniteNumber(trade.rr) : overview.averageRR;

  return [
    { id: "netPnl", label: t("journal.analytics.netPnl"), value: formatMoney(tradePnl), tone: valueTone(tradePnl) },
    {
      id: "side",
      label: t("journal.analytics.side"),
      value: trade?.direction === "SELL"
        ? t("journal.analytics.short")
        : trade?.direction === "BUY"
          ? t("journal.analytics.long")
          : t("journal.analytics.allTrades"),
      tone: trade?.direction === "SELL" ? "loss" : "profit",
    },
    { id: "grossProfit", label: t("journal.analytics.grossProfit"), value: formatMoney(Math.max(tradePnl, 0) || overview.grossProfit), tone: "profit" },
    { id: "grossLoss", label: t("journal.analytics.grossLoss"), value: formatMoney(trade ? Math.abs(Math.min(tradePnl, 0)) : overview.grossLoss), tone: "loss" },
    { id: "winRate", label: t("journal.analytics.winRate"), value: formatPercent(overview.winRate), tone: "blue" },
    { id: "profitFactor", label: t("journal.analytics.profitFactor"), value: formatNumber(overview.profitFactor, 2), tone: "amber" },
    { id: "plannedR", label: t("journal.analytics.plannedRMultiple"), value: formatNumber(overview.averageRR, 2), tone: "amber" },
    { id: "realizedR", label: t("journal.analytics.realizedRMultiple"), value: formatNumber(tradeRR, 2), tone: valueTone(tradeRR) },
    { id: "maxDrawdown", label: t("journal.analytics.maxDrawdown"), value: formatMoney(overview.maxDrawdown), tone: "loss" },
  ];
}

function TradeZellaAnalysisWorkspace({ analytics }: { analytics: JournalAnalyticsResponse }) {
  const { t, language } = useLanguage();
  const isFa = language === "fa";
  const overview = analytics.overview;
  const [closedTrades, setClosedTrades] = useState<JournalTradeOption[]>([]);
  const [selectedTradeId, setSelectedTradeId] = useState("");
  const [selectedTradeDetail, setSelectedTradeDetail] = useState<JournalTradeOption | null>(null);
  const selectedTrade =
    selectedTradeDetail ||
    closedTrades.find((trade) => trade.id === selectedTradeId) ||
    null;
  const selectedTradeIsOpen = selectedTrade?.status === "OPEN";
  const calculatedRating = Math.max(1, Math.min(5, Math.round((overview.winRate || 0) / 20)));
  const [tradeRating, setTradeRating] = useState<number | null>(null);
  const [activeNoteTab, setActiveNoteTab] = useState<ReviewPanelTab>("entry");
  const [tradeNote, setTradeNote] = useState("");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const editableMetrics = buildWorkspaceMetrics(overview, selectedTrade, t);
  const [reviewItems, setReviewItems] = useState<{
    mistakes: ReviewListItem[];
    setups: ReviewListItem[];
    emotions: ReviewListItem[];
    tags: ReviewListItem[];
    checklist: ReviewListItem[];
  }>(() => ({
    mistakes: [],
    setups: [],
    emotions: [],
    tags: [],
    checklist: [],
  }));
  const [psychologyStatus, setPsychologyStatus] = useState("");
  const [exitReason, setExitReason] = useState("");
  const loadClosedTradesFailedText = t("journal.analytics.loadClosedTradesFailed");
  const loadingJournalMetadataText = t("journal.analytics.loadingJournalMetadata");
  const loadSelectedTradeFailedText = t("journal.analytics.loadSelectedTradeFailed");
  const loadJournalMetadataFailedText = t("journal.analytics.loadJournalMetadataFailed");
  const savedMetadataText = t("journal.analytics.savedMetadata");
  const checklistResultText = t("journal.analytics.checklistResult");
  const openTradeWaitingText = isFa
    ? "این معامله هنوز در سایت باز است. تا وقتی رویداد بسته‌شدن از MT5 نرسد، سود/زیان نهایی و اسکرین‌شات خروج نمایش داده نمی‌شود."
    : "This trade is still open on the site. Final P&L and the exit screenshot will appear after the MT5 close event arrives.";
  const readonlyReviewText = isFa
    ? "تحلیل‌ها فقط خواندنی است. برای ویرایش، بررسی معامله را باز کنید."
    : "Analytics is read-only. Open Trade Review to edit this trade.";

  useEffect(() => {
    let cancelled = false;

    async function loadClosedTrades() {
      try {
        const response = await fetch("/api/journal/trades?limit=100", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          success: boolean;
          trades?: JournalTradeOption[];
          message?: string;
        };

        if (!response.ok || !data.success) {
          throw new Error(data.message || loadClosedTradesFailedText);
        }

        if (!cancelled) {
          const trades = data.trades || [];
          setClosedTrades(trades);
          setSelectedTradeId((current) => current || trades[0]?.id || "");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setStatusMessage((error as Error).message || loadClosedTradesFailedText);
        }
      }
    }

    loadClosedTrades();

    return () => {
      cancelled = true;
    };
  }, [loadClosedTradesFailedText]);

  useEffect(() => {
    if (!selectedTradeId) {
      return;
    }

    const controller = new AbortController();

    async function loadSelectedTradeAndMetadata() {
      setHydrated(false);
      setStatus("loading");
      setStatusMessage(loadingJournalMetadataText);

      try {
        const [tradeResponse, metadataResponse] = await Promise.all([
          fetch(`/api/journal/trades/${selectedTradeId}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/journal/trades/${selectedTradeId}/metadata`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const tradeData = (await tradeResponse.json()) as {
          success: boolean;
          trade?: JournalTradeOption;
          message?: string;
        };
        const metadataData = (await metadataResponse.json()) as {
          success: boolean;
          metadata?: Partial<TradeMetadata>;
          message?: string;
        };

        if (!tradeResponse.ok || !tradeData.success || !tradeData.trade) {
          throw new Error(tradeData.message || loadSelectedTradeFailedText);
        }

        if (!metadataResponse.ok || !metadataData.success) {
          throw new Error(metadataData.message || loadJournalMetadataFailedText);
        }

        setSelectedTradeDetail(tradeData.trade);
        const merged = mergeMetadataWithTrade(metadataData.metadata, tradeData.trade);
        setTradeRating(merged.rating ?? calculatedRating);
        setReviewItems({
          mistakes: merged.mistakes.map((label) => ({ label, detail: savedMetadataText, tone: "neutral" })),
          setups: merged.setups.map((label) => ({ label, detail: savedMetadataText, tone: "neutral" })),
          emotions: merged.emotions.map((label) => ({ label, detail: savedMetadataText, tone: "neutral" })),
          tags: merged.customTags.map((label) => ({ label, detail: savedMetadataText, tone: "neutral" })),
          checklist: merged.checklistResults.map((label) => ({ label, detail: checklistResultText, tone: "neutral" })),
        });
        setTradeNote(merged.tradeNote);
        setPsychologyStatus(merged.psychologyStatus);
        setExitReason(merged.exitReason);
        setHydrated(true);
        setStatus("idle");
        setStatusMessage("");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("error");
          setStatusMessage((error as Error).message || loadJournalMetadataFailedText);
        }
      }
    }

    loadSelectedTradeAndMetadata();

    return () => controller.abort();
  }, [
    calculatedRating,
    checklistResultText,
    loadJournalMetadataFailedText,
    loadSelectedTradeFailedText,
    loadingJournalMetadataText,
    savedMetadataText,
    selectedTradeId,
  ]);

  useEffect(() => {
    // Analytics is read-only. Trade edits belong in the Trade Review detail page.
  }, [tradeRating, reviewItems, psychologyStatus, exitReason, hydrated, selectedTradeId]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-800 bg-[#111827] shadow-xl">
      <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex min-h-[640px] bg-[#0F172A] text-slate-100">
          <div className="flex w-14 shrink-0 flex-col items-center justify-between border-r border-slate-800 bg-gradient-to-b from-violet-700 via-indigo-950 to-slate-950 py-5">
            <div className="space-y-4 text-white/75">
              <BarChart3 className="h-4 w-4" />
              <Tags className="h-4 w-4" />
              <Brain className="h-4 w-4" />
              <Target className="h-4 w-4" />
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="h-8 w-8 rounded-full border border-white/20 bg-white/10" />
          </div>

          <div className="min-w-0 flex-1 overflow-y-auto border-r border-slate-800 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-400">{t("journal.analytics.tradeReview")}</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {selectedTrade
                    ? `${selectedTrade.symbol} / ${selectedTrade.direction}`
                    : t("journal.analytics.closedTradesCount").replace("{count}", formatNumber(overview.totalTrades, 0))}
                </div>
              </div>
              <div className="flex gap-1 text-amber-400">
                {Array.from({ length: 5 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    disabled
                    className="cursor-default rounded p-0.5"
                    title={t("journal.analytics.rateTrade").replace("{rating}", String(index + 1))}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        index < Number(tradeRating || 0) ? "fill-amber-400 text-amber-400" : "text-slate-600"
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-4 block text-xs font-semibold uppercase text-slate-400">
              {t("journal.analytics.selectedTrade")}
              <select
                value={selectedTradeId}
                onChange={(event) => {
                  setSelectedTradeDetail(null);
                  setSelectedTradeId(event.target.value);
                }}
                className="mt-1 h-10 w-full rounded-md border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-slate-100 outline-none focus:border-violet-500"
              >
                {closedTrades.map((trade) => (
                  <option key={trade.id} value={trade.id}>
                    {trade.symbol} / {trade.direction} / {trade.status === "OPEN" ? (isFa ? "باز" : "Open") : formatMoney(toFiniteNumber(trade.profitLoss))}
                  </option>
                ))}
              </select>
            </label>

            <div className="mb-4 max-h-28 space-y-2 overflow-y-auto pr-1">
              {closedTrades.slice(0, 8).map((trade) => (
                <button
                  type="button"
                  key={trade.id}
                  onClick={() => {
                    setSelectedTradeDetail(null);
                    setSelectedTradeId(trade.id);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-xs",
                    trade.id === selectedTradeId
                      ? "border-violet-500/60 bg-violet-500/15 text-violet-100"
                      : "border-slate-800 bg-[#111827] text-slate-300 hover:border-violet-500/40"
                  )}
                >
                  <span className="min-w-0 truncate font-semibold">
                    {trade.symbol} / {trade.direction}
                  </span>
                  <span className={cn("shrink-0 font-semibold", trade.status === "OPEN" ? "text-amber-300" : valueToneClass(toFiniteNumber(trade.profitLoss)))}>
                    {trade.status === "OPEN" ? (isFa ? "باز" : "Open") : formatMoney(toFiniteNumber(trade.profitLoss))}
                  </span>
                </button>
              ))}
            </div>

            <div className="mb-4 rounded-md border border-slate-800 bg-[#111827] px-3 py-2 text-xs text-slate-400">
              {status === "loading" && t("journal.analytics.loadingMetadata")}
              {status === "saving" && t("journal.analytics.savingChanges")}
              {status === "saved" && t("journal.analytics.savedPermanently")}
              {status === "error" && <span className="text-red-300">{statusMessage}</span>}
              {status === "idle" && (selectedTradeIsOpen ? openTradeWaitingText : readonlyReviewText)}
            </div>

            {selectedTrade ? (
              <Link
                href={`/journal/${selectedTrade.id}`}
                className="mb-4 inline-flex h-10 w-full items-center justify-center rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 text-sm font-semibold text-violet-100 hover:bg-violet-500/20"
              >
                {isFa ? "باز کردن بررسی معامله" : "Open Trade Review"}
              </Link>
            ) : null}

            <div className="space-y-2">
              {editableMetrics.map((metric) => (
                <TradeZellaMetricRow
                  key={metric.id}
                  label={metric.label}
                  value={metric.value}
                  tone={metric.tone}
                />
              ))}
            </div>
          </div>
        </div>

        <TradeZellaChartPanel
          analytics={analytics}
          selectedTrade={selectedTrade}
          tradeNote={tradeNote}
          activeNoteTab={activeNoteTab}
          onActiveNoteTabChange={setActiveNoteTab}
        />
      </div>
    </section>
  );
}

function HourlyHighlightCard({
  label,
  title,
  row,
  helper,
  tone,
}: {
  label: string;
  title: string;
  row: HourlyAnalyticsRow | null;
  helper: string;
  tone: "profit" | "loss" | "neutral";
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
          <div className="mt-1 text-sm font-semibold text-white">{title}</div>
        </div>
        <span
          className={cn(
            "rounded-md border px-2 py-1 text-xs font-semibold",
            tone === "profit" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
            tone === "loss" && "border-red-500/30 bg-red-500/10 text-red-300",
            tone === "neutral" && "border-slate-700 bg-slate-800 text-slate-300"
          )}
        >
          {row ? row.label : "N/A"}
        </span>
      </div>
      {row ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Metric label={t("journal.analytics.trades")} value={formatNumber(row.totalTrades, 0)} />
          <Metric label={t("journal.analytics.winRate")} value={formatPercent(row.winRate)} />
          <Metric label={t("journal.analytics.netPnl")} value={formatMoney(row.netPnl)} tone={valueTone(row.netPnl)} />
        </div>
      ) : (
        <div className="mt-4 text-sm text-slate-400">{t("journal.analytics.noClosedTradesInBucket")}</div>
      )}
      <p className="mt-4 text-xs leading-5 text-slate-400">{helper}</p>
    </div>
  );
}

function HourlyMiniList({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: HourlyAnalyticsRow[];
  emptyMessage: string;
}) {
  const { t } = useLanguage();

  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-semibold text-slate-200">{row.label}</div>
              <div className="text-xs text-slate-500">
                {t("journal.analytics.tradesCount").replace("{count}", formatNumber(row.totalTrades, 0))} / {formatPercent(row.winRate)}
              </div>
            </div>
            <div className={cn("shrink-0 font-semibold", valueToneClass(row.netPnl))}>
              {formatMoney(row.netPnl)}
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="text-sm text-slate-400">{emptyMessage}</div>}
      </div>
    </div>
  );
}

function getHourlyTileClass(row: HourlyAnalyticsRow) {
  if (row.totalTrades === 0) {
    return "border-slate-800 bg-slate-900/50 text-slate-500";
  }

  if (row.netPnl > 0) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }

  if (row.netPnl < 0) {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-slate-700 bg-slate-800/70 text-slate-300";
}

function HourlyDecisionPanel({
  rows,
  defaultCollapsed = false,
}: {
  rows: HourlyAnalyticsRow[];
  defaultCollapsed?: boolean;
}) {
  const { t } = useLanguage();
  const activeRows = rows.filter((row) => row.totalTrades > 0);
  const totalTrades = activeRows.reduce((sum, row) => sum + row.totalTrades, 0);
  const bestHour = activeRows.reduce<HourlyAnalyticsRow | null>(
    (best, row) => (!best || row.netPnl > best.netPnl ? row : best),
    null
  );
  const worstHour = activeRows.reduce<HourlyAnalyticsRow | null>(
    (worst, row) => (!worst || row.netPnl < worst.netPnl ? row : worst),
    null
  );
  const volumeHour = activeRows.reduce<HourlyAnalyticsRow | null>(
    (largest, row) => (!largest || row.totalTrades > largest.totalTrades ? row : largest),
    null
  );
  const opportunityRows = activeRows
    .filter((row) => row.netPnl > 0)
    .sort((a, b) => b.netPnl - a.netPnl)
    .slice(0, 3);
  const riskRows = activeRows
    .filter((row) => row.netPnl < 0)
    .sort((a, b) => a.netPnl - b.netPnl)
    .slice(0, 3);
  const sampleLabel =
    totalTrades >= 50
      ? t("journal.analytics.strongSample")
      : totalTrades >= 20
        ? t("journal.analytics.buildingSample")
        : t("journal.analytics.earlySample");
  const sampleTone = totalTrades >= 20 ? "text-sky-300" : "text-amber-300";

  if (activeRows.length === 0) {
    return <EmptyPanel message={t("journal.analytics.noOpeningHourTrades")} />;
  }

  return (
    <div className="space-y-4">
      <CollapsibleAnalyticsSection title="Best and weak windows" collapsed={defaultCollapsed}>
        <div className="grid gap-3 lg:grid-cols-3">
          <HourlyHighlightCard
            label={t("journal.analytics.bestWindow")}
            title={t("journal.analytics.focusCandidate")}
            row={bestHour}
            helper={t("journal.analytics.highestHourlyPnl")}
            tone={bestHour && bestHour.netPnl > 0 ? "profit" : "neutral"}
          />
          <HourlyHighlightCard
            label={t("journal.analytics.weakWindow")}
            title={t("journal.analytics.reviewOrReduceSize")}
            row={worstHour}
            helper={t("journal.analytics.lowestHourlyPnl")}
            tone={worstHour && worstHour.netPnl < 0 ? "loss" : "neutral"}
          />
          <HourlyHighlightCard
            label={t("journal.analytics.mostActivity")}
            title={t("journal.analytics.behaviorHotspot")}
            row={volumeHour}
            helper={t("journal.analytics.largestTradeShare")}
            tone="neutral"
          />
        </div>
      </CollapsibleAnalyticsSection>

      <CollapsibleAnalyticsSection title={t("journal.analytics.hourHeatmap24")} collapsed={defaultCollapsed}>
        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">{t("journal.analytics.hourHeatmap24")}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  {t("journal.analytics.profitable")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-400" />
                  {t("journal.analytics.losing")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-600" />
                  {t("journal.analytics.noTrades")}
                </span>
              </div>
            </div>
            <div className={cn("text-xs font-semibold uppercase", sampleTone)}>
              {sampleLabel}: {t("journal.analytics.tradesCount").replace("{count}", formatNumber(totalTrades, 0))}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {rows.map((row) => (
              <div
                key={row.label}
                className={cn("min-h-[82px] rounded-lg border p-2", getHourlyTileClass(row))}
                title={`${row.label}: ${formatNumber(row.totalTrades, 0)} trades, ${formatMoney(
                  row.netPnl
                )}`}
              >
                <div className="text-xs font-semibold">{row.label}</div>
                <div className="mt-2 text-sm font-semibold">{formatMoney(row.netPnl)}</div>
                <div className="mt-1 text-[11px] text-slate-400">
                  {t("journal.analytics.tradesCount").replace("{count}", formatNumber(row.totalTrades, 0))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CollapsibleAnalyticsSection>

      <div className="grid gap-3 lg:grid-cols-3">
        <HourlyMiniList
          title={t("journal.analytics.opportunityShortlist")}
          rows={opportunityRows}
          emptyMessage={t("journal.analytics.noProfitableHourYet")}
        />
        <HourlyMiniList title={t("journal.analytics.riskShortlist")} rows={riskRows} emptyMessage={t("journal.analytics.noLosingHourYet")} />
        <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
          <div className="text-sm font-semibold text-white">{t("journal.analytics.decisionRule")}</div>
          <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
            <p>
              {t("journal.analytics.decisionRuleDescription")}
            </p>
            {bestHour && worstHour && (
              <p>
                {t("journal.analytics.currentRead")
                  .replace("{bestHour}", bestHour.label)
                  .replace("{worstHour}", worstHour.label)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactTable<T>({
  rows,
  labelHeader,
  getLabel,
  emptyMessage,
}: {
  rows: T[];
  labelHeader: string;
  getLabel: (row: T) => string;
  emptyMessage: string;
}) {
  const { t, language } = useLanguage();
  const isFa = language === "fa";

  return (
    <div className={cn("space-y-3", isFa && "text-right")} dir={isFa ? "rtl" : "ltr"}>
      {rows.length > 0 ? (
        <p className="text-xs leading-5 text-slate-400">
          {isFa
            ? `هر ردیف نشان می‌دهد این ${labelHeader} چند بار تکرار شده، چند درصد آن‌ها برد بوده و در مجموع چه اثری روی حساب داشته است.`
            : `Each row shows how often this ${labelHeader} appeared, how often it won, and its overall account impact.`}
        </p>
      ) : null}

      <div className="space-y-3">
        {rows.map((row) => {
          const data = row as {
            totalTrades: number;
            winRate: number;
            netPnl: number;
            averagePnl: number;
          };
          const label = getLabel(row);
          const pnlTone = valueTone(data.netPnl);
          const pnlMeaning = isFa
            ? data.netPnl > 0
              ? "این الگو فعلا با سود همراه بوده؛ بررسی کن آیا اجرای درست پلن باعث آن شده است."
              : data.netPnl < 0
                ? "این الگو برای حساب هزینه‌ساز بوده؛ قبل از معامله بعدی علت تکرارش را پیدا کن."
                : "اثر مالی این الگو فعلا خنثی است؛ با معاملات بیشتر تصویر دقیق‌تر می‌شود."
            : data.netPnl > 0
              ? "This pattern is currently profitable. Check whether disciplined execution caused it."
              : data.netPnl < 0
                ? "This pattern has cost the account money. Identify why it repeats before the next trade."
                : "This pattern is financially flat so far. More closed trades will clarify the signal.";

          return (
            <article
              key={label}
              className={cn(
                "rounded-lg border bg-[#111827] p-3",
                pnlTone === "profit" && "border-emerald-500/25",
                pnlTone === "loss" && "border-red-500/25",
                pnlTone === "neutral" && "border-slate-800"
              )}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-medium text-slate-500">{labelHeader}</div>
                  <h3 className="mt-1 text-sm font-semibold text-white">{label}</h3>
                </div>
                <div className={cn("text-lg font-semibold", valueToneClass(data.netPnl))}>
                  {formatMoney(data.netPnl)}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-md border border-slate-800 bg-[#0F172A] p-2">
                  <div className="text-[11px] text-slate-500">{t("journal.analytics.trades")}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{formatNumber(data.totalTrades, 0)}</div>
                </div>
                <div className="rounded-md border border-slate-800 bg-[#0F172A] p-2">
                  <div className="text-[11px] text-slate-500">{t("journal.analytics.winRate")}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">{formatPercent(data.winRate)}</div>
                </div>
                <div className="rounded-md border border-slate-800 bg-[#0F172A] p-2">
                  <div className="text-[11px] text-slate-500">{t("journal.analytics.average")}</div>
                  <div className={cn("mt-1 text-sm font-semibold", valueToneClass(data.averagePnl))}>
                    {formatMoney(data.averagePnl)}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-slate-400">{pnlMeaning}</p>
            </article>
          );
        })}
      </div>
      {rows.length === 0 && <EmptyPanel message={emptyMessage} />}
    </div>
  );
}

function buildWeeklyReportQuery(filters: Filters, language: string) {
  const params = new URLSearchParams(buildQuery(filters));
  params.delete("dateRange");
  params.delete("dateFrom");
  params.delete("dateTo");
  params.set("language", language === "en" ? "en" : "fa");
  return params.toString();
}

function ReportStat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "profit" | "loss" | "blue" | "amber";
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div
        className={cn(
          "mt-2 text-lg font-semibold text-slate-100",
          tone === "profit" && "text-emerald-300",
          tone === "loss" && "text-red-300",
          tone === "blue" && "text-sky-300",
          tone === "amber" && "text-amber-300"
        )}
      >
        {value}
      </div>
    </div>
  );
}

function ReportList({
  title,
  items,
  tone,
  empty,
}: {
  title: string;
  items: string[];
  tone: "profit" | "loss" | "amber" | "blue";
  empty: string;
}) {
  const dotClass =
    tone === "profit"
      ? "bg-emerald-400"
      : tone === "loss"
        ? "bg-red-400"
        : tone === "amber"
          ? "bg-amber-400"
          : "bg-sky-400";

  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-3 space-y-2">
        {(items.length > 0 ? items : [empty]).map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-start gap-2 text-sm leading-6 text-slate-300">
            <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyBreakdownTable({
  title,
  rows,
  labelHeader,
  empty,
  isFa,
}: {
  title: string;
  rows: WeeklyBreakdownRow[];
  labelHeader: string;
  empty: string;
  isFa: boolean;
}) {
  const verdictLabel = (verdict: WeeklyBreakdownRow["verdict"]) => {
    if (isFa) {
      return {
        profitable: "سودده",
        losing: "ضررده",
        flat: "خنثی",
        insufficient_data: "داده کم",
      }[verdict];
    }

    return {
      profitable: "Profitable",
      losing: "Losing",
      flat: "Flat",
      insufficient_data: "Small sample",
    }[verdict];
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
      <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-slate-500">
          {isFa ? "بر اساس معاملات بسته‌شده همین هفته" : "Based on this week's closed trades"}
        </span>
      </div>
      {rows.length === 0 ? (
        <EmptyPanel message={empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className={cn("py-2 pr-3", isFa && "text-right")}>{labelHeader}</th>
                <th className="py-2 pr-3">{isFa ? "نتیجه" : "Verdict"}</th>
                <th className="py-2 pr-3">{isFa ? "معاملات" : "Trades"}</th>
                <th className="py-2 pr-3">{isFa ? "نرخ برد" : "Win rate"}</th>
                <th className="py-2 pr-3">{isFa ? "سود/زیان" : "Net P&L"}</th>
                <th className="py-2 pr-3">{isFa ? "میانگین" : "Average"}</th>
                <th className="py-2">{isFa ? "فاکتور سود" : "Profit factor"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row) => (
                <tr key={`${row.type}-${row.label}`} className="text-slate-300">
                  <td className={cn("py-3 pr-3 font-semibold text-white", isFa && "text-right")}>{row.label}</td>
                  <td className="py-3 pr-3">
                    <AnalysisStatusPill label={verdictLabel(row.verdict)} tone={row.verdict === "profitable" ? "profit" : row.verdict === "losing" ? "loss" : row.verdict === "insufficient_data" ? "amber" : "neutral"} />
                  </td>
                  <td className="py-3 pr-3">{formatNumber(row.totalTrades, 0)}</td>
                  <td className="py-3 pr-3">{formatPercent(row.winRate)}</td>
                  <td className={cn("py-3 pr-3 font-semibold", valueToneClass(row.netPnl))}>{formatMoney(row.netPnl)}</td>
                  <td className={cn("py-3 pr-3", valueToneClass(row.averagePnl))}>{formatMoney(row.averagePnl)}</td>
                  <td className="py-3">{formatNumber(row.profitFactor, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function WeeklyAIReportPanel({ filters }: { filters: Filters }) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const [report, setReport] = useState<WeeklyAIReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const query = useMemo(() => buildWeeklyReportQuery(filters, language), [filters, language]);
  const copy = {
    title: isFa ? "تحلیل پیشرفته هفتگی" : "Advanced weekly analysis",
    subtitle: isFa
      ? "این گزارش روزانه نیست؛ بعد از پایان هر هفته کامل و فقط وقتی حداقل ۲۰ معامله بسته‌شده ثبت شده باشد، نتیجه هفتگی استراتژی را نمایش می‌دهد."
      : "This is not a daily report; it appears after a full week ends and only when at least 20 closed trades are logged for that week.",
    refresh: isFa ? "بررسی گزارش هفته" : "Check weekly report",
    error: isFa ? "تحلیل هفتگی بارگذاری نشد." : "Weekly report could not be loaded.",
    ai: isFa ? "خروجی AI" : "AI output",
    computed: isFa ? "تحلیل محاسباتی" : "Computed analysis",
    waitingTitle: isFa ? "گزارش هفتگی هنوز آماده نیست" : "Weekly report is not ready yet",
    weekRequirement: isFa ? "هفته کامل" : "Full week",
    tradeRequirement: isFa ? "حداقل معامله" : "Minimum trades",
    currentTrades: isFa ? "معاملات ثبت‌شده" : "Logged trades",
    remainingTrades: isFa ? "مانده تا گزارش" : "Trades remaining",
    ready: isFa ? "تکمیل" : "Ready",
    pending: isFa ? "در انتظار" : "Pending",
    score: isFa ? "امتیاز هفته" : "Weekly score",
    confidence: isFa ? "اطمینان" : "Confidence",
    trades: isFa ? "معاملات" : "Trades",
    pnl: isFa ? "سود و زیان" : "P&L",
    winRate: isFa ? "نرخ برد" : "Win rate",
    profitFactor: isFa ? "فاکتور سود" : "Profit factor",
    expectancy: isFa ? "امید ریاضی" : "Expectancy",
    drawdown: isFa ? "افت سرمایه" : "Drawdown",
    strategyRead: isFa ? "برداشت از استراتژی" : "Strategy read",
    strengths: isFa ? "چه چیزی جواب داده" : "What worked",
    weaknesses: isFa ? "چه چیزی آسیب زده" : "What hurt",
    risks: isFa ? "هشدارهای ریسک" : "Risk warnings",
    plan: isFa ? "برنامه هفته بعد" : "Next week plan",
    questions: isFa ? "سوال‌های مرور" : "Review questions",
    bestContexts: isFa ? "زمینه‌های قوی" : "Strong contexts",
    weakContexts: isFa ? "زمینه‌های ضعیف" : "Weak contexts",
    strategyTable: isFa ? "آمار هفتگی بر اساس استراتژی" : "Weekly stats by strategy",
    setupTable: isFa ? "آمار هفتگی بر اساس ستاپ" : "Weekly stats by setup",
    symbolTable: isFa ? "آمار هفتگی بر اساس نماد" : "Weekly stats by symbol",
    directionTable: isFa ? "آمار هفتگی خرید/فروش" : "Weekly long/short stats",
    strategyName: isFa ? "استراتژی" : "Strategy",
    setupName: isFa ? "ستاپ" : "Setup",
    symbolName: isFa ? "نماد" : "Symbol",
    directionName: isFa ? "جهت" : "Direction",
    noStrategyRows: isFa
      ? "برای معاملات این هفته هنوز استراتژی/پلی‌بوک ثبت نشده است. اگر پلی‌بوک انتخاب نشود، تحلیل استراتژی از ستاپ‌ها کمک می‌گیرد."
      : "No strategy or playbook was assigned to this week's trades. Use setup rows as the strategy proxy.",
    empty: isFa ? "برای این بخش داده کافی ثبت نشده است." : "No clear data is available for this part yet.",
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadReport() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/journal/analytics/weekly-report?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as WeeklyAIReport & {
          success?: boolean;
          message?: string;
          messageFa?: string;
          errors?: string[];
        };

        if (!response.ok || !data.success) {
          setReport(null);
          setError(
            data.errors?.join(", ") ||
              localizedApiMessage({
                isFa,
                message: data.message,
                messageFa: data.messageFa,
                fallback: copy.error,
              })
          );
          return;
        }

        setReport(data);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setReport(null);
          setError((loadError as Error).message || copy.error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadReport();

    return () => controller.abort();
  }, [copy.error, isFa, query, refreshKey]);

  const verdictTone = report?.verdict.tone || "neutral";

  return (
    <section className={cn("rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm", isFa && "text-right")} dir={isFa ? "rtl" : "ltr"}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-sky-400/10 text-sky-200">
            <Brain className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">{copy.title}</h2>
              {report ? (
                <AnalysisStatusPill label={report.source === "ai" ? copy.ai : copy.computed} tone={report.source === "ai" ? "blue" : "amber"} />
              ) : null}
            </div>
            <p className="mt-1 text-sm leading-6 text-slate-400">{copy.subtitle}</p>
            {report ? <p className="mt-1 text-xs text-slate-500">{report.periodLabel}</p> : null}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((current) => current + 1)}
          disabled={loading}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 transition hover:border-sky-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          {copy.refresh}
        </button>
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-lg border border-slate-800 bg-[#111827]" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : report && !report.ready ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-semibold text-amber-50">{copy.waitingTitle}</div>
              <p className="mt-1 leading-7 text-amber-100/85">{report.requirements.message}</p>
              <p className="mt-2 text-xs text-amber-100/65">{report.periodLabel}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportStat
              label={copy.weekRequirement}
              value={report.requirements.fullWeek ? copy.ready : copy.pending}
              tone={report.requirements.fullWeek ? "profit" : "amber"}
            />
            <ReportStat
              label={copy.tradeRequirement}
              value={formatNumber(report.requirements.minimumClosedTrades, 0)}
              tone="blue"
            />
            <ReportStat
              label={copy.currentTrades}
              value={formatNumber(report.requirements.currentClosedTrades, 0)}
              tone="amber"
            />
            <ReportStat
              label={copy.remainingTrades}
              value={formatNumber(report.requirements.remainingClosedTrades, 0)}
              tone={report.requirements.remainingClosedTrades === 0 ? "profit" : "loss"}
            />
          </div>
        </div>
      ) : report ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-slate-800 bg-[#111827] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <AnalysisStatusPill label={report.verdict.label} tone={verdictTone} />
                  <p className="mt-3 text-sm leading-7 text-slate-300">{report.verdict.summary}</p>
                </div>
                <div className="shrink-0 rounded-lg border border-slate-800 bg-[#0F172A] px-4 py-3 text-center">
                  <div className="text-xs font-semibold uppercase text-slate-500">{copy.score}</div>
                  <div className={cn("mt-1 text-3xl font-bold", report.score >= 65 ? "text-emerald-300" : report.score <= 40 ? "text-red-300" : "text-amber-300")}>
                    {formatNumber(report.score, 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {copy.confidence}: {formatPercent(report.verdict.confidence * 100)}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-slate-800 bg-[#0F172A] p-3">
                <div className="text-xs font-semibold uppercase text-slate-500">{copy.strategyRead}</div>
                <p className="mt-2 text-sm leading-7 text-slate-300">{report.strategyRead}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ReportStat label={copy.trades} value={formatNumber(report.stats.totalTrades, 0)} tone="blue" />
              <ReportStat label={copy.pnl} value={formatMoney(report.stats.netPnl)} tone={valueTone(report.stats.netPnl)} />
              <ReportStat label={copy.winRate} value={formatPercent(report.stats.winRate)} tone="blue" />
              <ReportStat label={copy.profitFactor} value={formatNumber(report.stats.profitFactor, 2)} tone="amber" />
              <ReportStat label={copy.expectancy} value={formatMoney(report.stats.expectancyPerTrade)} tone={valueTone(report.stats.expectancyPerTrade)} />
              <ReportStat label={copy.drawdown} value={formatMoney(report.stats.maxDrawdown)} tone="loss" />
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ReportList title={copy.strengths} items={report.strengths} tone="profit" empty={copy.empty} />
            <ReportList title={copy.weaknesses} items={report.weaknesses} tone="loss" empty={copy.empty} />
            <ReportList title={copy.risks} items={report.riskWarnings} tone="amber" empty={copy.empty} />
            <ReportList title={copy.plan} items={report.nextWeekPlan} tone="blue" empty={copy.empty} />
          </div>

          <WeeklyBreakdownTable
            title={copy.strategyTable}
            rows={report.breakdown.strategies}
            labelHeader={copy.strategyName}
            empty={copy.noStrategyRows}
            isFa={isFa}
          />

          <div className="grid gap-4 xl:grid-cols-2">
            <WeeklyBreakdownTable
              title={copy.setupTable}
              rows={report.breakdown.setups}
              labelHeader={copy.setupName}
              empty={copy.empty}
              isFa={isFa}
            />
            <WeeklyBreakdownTable
              title={copy.symbolTable}
              rows={report.breakdown.symbols}
              labelHeader={copy.symbolName}
              empty={copy.empty}
              isFa={isFa}
            />
          </div>

          <WeeklyBreakdownTable
            title={copy.directionTable}
            rows={report.breakdown.directions}
            labelHeader={copy.directionName}
            empty={copy.empty}
            isFa={isFa}
          />

          <div className="grid gap-4 xl:grid-cols-3">
            <ReportList title={copy.bestContexts} items={report.bestContexts} tone="profit" empty={copy.empty} />
            <ReportList title={copy.weakContexts} items={report.weakestContexts} tone="loss" empty={copy.empty} />
            <ReportList title={copy.questions} items={report.questions} tone="blue" empty={copy.empty} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default function JournalAnalyticsPage() {
  const { t, language } = useLanguage();
  const isFa = language === "fa";
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(EMPTY_FILTERS);
  const [analytics, setAnalytics] = useState<JournalAnalyticsResponse>(EMPTY_ANALYTICS);
  const [accounts, setAccounts] = useState<AnalyticsAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PageError | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("netPnl");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("overview");
  const loadFailedText = t("journal.analytics.loadFailed");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAnalytics() {
      setLoading(true);
      setError(null);

      try {
        const query = buildQuery(appliedFilters);
        const response = await fetch(`/api/journal/analytics?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = (await response.json()) as JournalAnalyticsResponse & {
          message?: string;
          messageFa?: string;
          errors?: string[];
          upgradeRequired?: boolean;
        };

        if (!response.ok || !data.success) {
          setError({
            message:
              data.errors?.join(", ") ||
              localizedApiMessage({
                isFa,
                message: data.message,
                messageFa: data.messageFa,
                fallback: loadFailedText,
              }),
            upgradeRequired: data.upgradeRequired,
          });
          setAnalytics(EMPTY_ANALYTICS);
          return;
        }

        setAnalytics(data);
      } catch (loadError) {
        if ((loadError as Error).name !== "AbortError") {
          setError({ message: (loadError as Error).message || loadFailedText });
          setAnalytics(EMPTY_ANALYTICS);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => controller.abort();
  }, [appliedFilters, isFa, loadFailedText]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        const response = await fetch("/api/trading-accounts", { cache: "no-store" });
        const data = (await response.json()) as {
          success?: boolean;
          data?: AnalyticsAccountOption[];
        };

        if (!cancelled && response.ok && data.success && Array.isArray(data.data)) {
          setAccounts(data.data);
        }
      } catch {
        if (!cancelled) {
          setAccounts([]);
        }
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

  const overview = analytics.overview;
  const directionData = [analytics.longShort.buy, analytics.longShort.sell];
  const sortedSymbols = useMemo(() => {
    return [...analytics.bySymbol].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const multiplier = sortDirection === "asc" ? 1 : -1;

      if (typeof aValue === "string" || typeof bValue === "string") {
        return String(aValue).localeCompare(String(bValue)) * multiplier;
      }

      return (Number(aValue || 0) - Number(bValue || 0)) * multiplier;
    });
  }, [analytics.bySymbol, sortDirection, sortKey]);
  const hourlyChartData = analytics.byHour.filter((row) => row.totalTrades > 0);
  const periodPnl = useMemo(() => buildPeriodPnlData(analytics.equityCurve), [analytics.equityCurve]);
  const periodPnlTitle =
    periodPnl.mode === "daily"
      ? isFa
        ? "سود/زیان روزانه"
        : "Daily P&L"
      : isFa
        ? "سود/زیان ماهانه"
        : "Monthly P&L";
  const periodPnlDescription =
    periodPnl.mode === "daily"
      ? isFa
        ? "جمع سود و زیان معاملات بسته‌شده در هر روز."
        : "Total closed-trade P&L grouped by day."
      : isFa
        ? "به دلیل زیاد بودن روزها، سود و زیان بر اساس ماه جمع شده است."
        : "Grouped by month because the selected range contains many trading days.";
  const hasTrades = overview.totalTrades > 0;
  const advancedInsightsUnlocked = overview.totalTrades >= 20;
  const selectedAccountLabel =
    accounts.find((account) => account.id === appliedFilters.accountId)?.name ||
    (isFa ? "همه حساب‌ها" : "All accounts");
  const selectedRangeLabel =
    appliedFilters.dateRange === "custom"
      ? `${appliedFilters.dateFrom || "?"} - ${appliedFilters.dateTo || "?"}`
      : {
          all: isFa ? "همه زمان‌ها" : "All time",
          today: t("today"),
          thisWeek: t("thisWeek"),
          thisMonth: t("journal.analytics.thisMonth"),
          thisYear: t("journal.analytics.thisYear"),
          custom: t("journal.analytics.custom"),
        }[appliedFilters.dateRange];

  function updateFilter<K extends keyof Filters>(name: K, value: Filters[K]) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function submitFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }

  function toggleSymbolSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection(key === "symbol" ? "asc" : "desc");
  }

  const overviewCards: Array<{
    label: string;
    value: string;
    icon: ReactNode;
    tone: "neutral" | "profit" | "loss" | "blue" | "amber";
  }> = [
    { label: t("journal.analytics.totalNetPnl"), value: formatMoney(overview.totalNetPnl), icon: <CircleDollarSign className="h-4 w-4" />, tone: valueTone(overview.totalNetPnl) },
    { label: t("journal.analytics.winRate"), value: formatPercent(overview.winRate), icon: <Target className="h-4 w-4" />, tone: "blue" },
    { label: t("journal.analytics.profitFactor"), value: formatNumber(overview.profitFactor, 2), icon: <BarChart3 className="h-4 w-4" />, tone: "blue" },
    { label: isFa ? "کل معاملات بسته‌شده" : "Total closed trades", value: formatNumber(overview.totalTrades, 0), icon: <BarChart3 className="h-4 w-4" />, tone: "blue" },
    { label: t("journal.analytics.averageRr"), value: formatNumber(overview.averageRR, 2), icon: <Target className="h-4 w-4" />, tone: "amber" },
    { label: t("journal.analytics.maxDrawdown"), value: formatMoney(overview.maxDrawdown), icon: <ArrowDown className="h-4 w-4" />, tone: "loss" },
  ];

  const advancedMetricCards: Array<{
    label: string;
    value: string;
    icon: ReactNode;
    tone: "neutral" | "profit" | "loss" | "blue" | "amber";
  }> = [
    { label: t("journal.analytics.grossProfit"), value: formatMoney(overview.grossProfit), icon: <ArrowUp className="h-4 w-4" />, tone: "profit" },
    { label: t("journal.analytics.grossLoss"), value: formatMoney(overview.grossLoss), icon: <ArrowDown className="h-4 w-4" />, tone: "loss" },
    { label: t("journal.analytics.averageWin"), value: formatMoney(overview.averageWin), icon: <ArrowUp className="h-4 w-4" />, tone: "profit" },
    { label: t("journal.analytics.averageLoss"), value: formatMoney(overview.averageLoss), icon: <ArrowDown className="h-4 w-4" />, tone: "loss" },
    { label: t("journal.analytics.bestTrade"), value: overview.bestTrade ? formatMoney(overview.bestTrade.pnl) : "$0.00", icon: <ArrowUp className="h-4 w-4" />, tone: "profit" },
    { label: t("journal.analytics.worstTrade"), value: overview.worstTrade ? formatMoney(overview.worstTrade.pnl) : "$0.00", icon: <ArrowDown className="h-4 w-4" />, tone: "loss" },
    { label: t("journal.analytics.lossRate"), value: formatPercent(overview.lossRate), icon: <Target className="h-4 w-4" />, tone: "amber" },
    { label: t("journal.analytics.breakEvenTrades"), value: formatNumber(overview.breakEvenTrades, 0), icon: <Target className="h-4 w-4" />, tone: "neutral" },
    { label: t("journal.analytics.expectancyPerTrade"), value: formatMoney(overview.expectancyPerTrade), icon: <CircleDollarSign className="h-4 w-4" />, tone: valueTone(overview.expectancyPerTrade) },
  ];

  return (
    <div className="space-y-5">
      <section data-dashboard-tour="analytics-title" className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
        <form className="space-y-4" onSubmit={submitFilters}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950 dark:text-white">Analytics</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                {isFa ? `حساب فعال: ${selectedAccountLabel} · بازه: ${selectedRangeLabel}` : `Active account: ${selectedAccountLabel} · Date range: ${selectedRangeLabel}`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[520px]">
              <label className="space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                {isFa ? "حساب" : "Account"}
                <select
                  value={filters.accountId}
                  onChange={(event) => updateFilter("accountId", event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none focus:border-sky-600 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]"
                >
                  <option value="">{isFa ? "همه حساب‌ها" : "All accounts"}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium uppercase text-slate-500 dark:text-slate-400">
                {t("journal.analytics.dateRange")}
                <select
                  value={filters.dateRange}
                  onChange={(event) => updateFilter("dateRange", event.target.value as DateRange)}
                  className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm normal-case text-slate-950 outline-none focus:border-sky-600 dark:border-slate-800 dark:bg-[#111827] dark:text-[#E5E7EB]"
                >
                  <option value="all">{t("journal.analytics.allTime")}</option>
                  <option value="today">{t("today")}</option>
                  <option value="thisWeek">{t("thisWeek")}</option>
                  <option value="thisMonth">{t("journal.analytics.thisMonth")}</option>
                  <option value="thisYear">{t("journal.analytics.thisYear")}</option>
                  <option value="custom">{t("journal.analytics.custom")}</option>
                </select>
              </label>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CalendarDateField
              label={t("dashboard.filters.from")}
              value={filters.dateFrom}
              disabled={false}
              isFa={isFa}
              onChange={(date) => {
                updateFilter("dateRange", "custom");
                updateFilter("dateFrom", date);
              }}
            />
            <CalendarDateField
              label={t("dashboard.filters.to")}
              value={filters.dateTo}
              disabled={false}
              isFa={isFa}
              onChange={(date) => {
                updateFilter("dateRange", "custom");
                updateFilter("dateTo", date);
              }}
            />
            <div className="flex items-end gap-2 md:col-span-2">
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
              >
                <Search className="h-4 w-4" />
                {t("journal.analytics.applyFilters")}
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                {t("dashboard.actions.reset")}
              </button>
            </div>
          </div>
        </form>
        <div data-dashboard-tour="analytics-stats" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {overviewCards.map(({ label, value, icon, tone }) => (
            <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />
          ))}
        </div>
      </section>

      <details data-dashboard-tour="analytics-filters" className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-white">
          {isFa ? "فیلترهای پیشرفته" : "Advanced filters"}
        </summary>
        <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={submitFilters}>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "حساب" : "Account"}
            <select
              value={filters.accountId}
              onChange={(event) => updateFilter("accountId", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="">{isFa ? "همه حساب‌ها" : "All accounts"}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {t("journal.analytics.dateRange")}
            <select
              value={filters.dateRange}
              onChange={(event) => updateFilter("dateRange", event.target.value as DateRange)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="all">{t("journal.analytics.allTime")}</option>
              <option value="today">{t("today")}</option>
              <option value="thisWeek">{t("thisWeek")}</option>
              <option value="thisMonth">{t("journal.analytics.thisMonth")}</option>
              <option value="thisYear">{t("journal.analytics.thisYear")}</option>
              <option value="custom">{t("journal.analytics.custom")}</option>
            </select>
          </label>
          <CalendarDateField
            label={t("dashboard.filters.from")}
            value={filters.dateFrom}
            disabled={false}
            isFa={isFa}
            onChange={(date) => {
              updateFilter("dateRange", "custom");
              updateFilter("dateFrom", date);
            }}
          />
          <CalendarDateField
            label={t("dashboard.filters.to")}
            value={filters.dateTo}
            disabled={false}
            isFa={isFa}
            onChange={(date) => {
              updateFilter("dateRange", "custom");
              updateFilter("dateTo", date);
            }}
          />
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {t("dashboard.table.symbol")}
            <select
              value={filters.symbol}
              onChange={(event) => updateFilter("symbol", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="">{t("journal.playbooks.allSymbols")}</option>
              {analytics.metadata.symbols.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {t("dashboard.table.direction")}
            <select
              value={filters.direction}
              onChange={(event) => updateFilter("direction", event.target.value as DirectionFilter)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="">{t("dashboard.common.all")}</option>
              <option value="BUY">{t("dashboard.common.buy")}</option>
              <option value="SELL">{t("dashboard.common.sell")}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {t("journal.analytics.strategy")}
            <select
              value={filters.strategy}
              disabled={!analytics.metadata.hasStrategyData}
              onChange={(event) => updateFilter("strategy", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600 disabled:opacity-40"
            >
              <option value="">{t("journal.analytics.allStrategies")}</option>
              {analytics.metadata.strategies.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "ستاپ" : "Setup"}
            <input
              value={filters.setup}
              onChange={(event) => updateFilter("setup", event.target.value)}
              placeholder={isFa ? "بریک‌اوت، پولبک..." : "Breakout, pullback..."}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-sky-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "اشتباه" : "Mistake"}
            <input
              value={filters.mistake}
              onChange={(event) => updateFilter("mistake", event.target.value)}
              placeholder={isFa ? "ورود زودهنگام، انتقام..." : "Early entry, revenge..."}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-sky-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "احساس" : "Emotion"}
            <input
              value={filters.emotion}
              onChange={(event) => updateFilter("emotion", event.target.value)}
              placeholder={isFa ? "آرامش، ترس، فومو..." : "Calm, fear, FOMO..."}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm text-[#E5E7EB] outline-none focus:border-sky-600"
            />
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "سشن" : "Session"}
            <select
              value={filters.session}
              onChange={(event) => updateFilter("session", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="">{isFa ? "همه سشن‌ها" : "All sessions"}</option>
              <option value="Asia Session">{isFa ? "سشن آسیا" : "Asia Session"}</option>
              <option value="London Session">{isFa ? "سشن لندن" : "London Session"}</option>
              <option value="New York Session">{isFa ? "سشن نیویورک" : "New York Session"}</option>
              <option value="Other">{isFa ? "سایر" : "Other"}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "وضعیت بررسی" : "Review Status"}
            <select
              value={filters.reviewStatus}
              onChange={(event) => updateFilter("reviewStatus", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="">{t("dashboard.common.all")}</option>
              <option value="reviewed">{isFa ? "بررسی شده" : "Reviewed"}</option>
              <option value="notReviewed">{isFa ? "بررسی نشده" : "Not Reviewed"}</option>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {isFa ? "چک‌لیست" : "Checklist"}
            <select
              value={filters.checklistStatus}
              onChange={(event) => updateFilter("checklistStatus", event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-sky-600"
            >
              <option value="">{t("dashboard.common.all")}</option>
              <option value="completed">{isFa ? "تکمیل شده" : "Completed"}</option>
              <option value="incomplete">{isFa ? "ناقص / ثبت نشده" : "Incomplete / Missing"}</option>
            </select>
          </label>
          <div className="flex gap-2 xl:col-span-4">
            <button
              type="submit"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <Search className="h-4 w-4" />
              {t("journal.analytics.applyFilters")}
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              {t("dashboard.actions.reset")}
            </button>
          </div>
        </form>
      </details>

      {error?.upgradeRequired ? (
        <SubscriptionLockedFeature
          title={t("journal.analytics.lockedTitle")}
          description={error.message}
          requiredPlan={isFa ? "پرو" : "Pro"}
          buttonText={t("journal.analytics.upgradeToPro")}
          href="/pricing"
        />
      ) : error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold text-red-100">{t("journal.analytics.failedTitle")}</div>
            <div className="mt-1">{error.message}</div>
          </div>
        </div>
      ) : null}

      {!loading && !error ? <SampleSizeNotice count={overview.totalTrades} /> : null}

      <div data-dashboard-tour="analytics-tabs" className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-[#0F172A] p-2 shadow-sm">
        {[
          ["overview", t("journal.analytics.tabs.overview")],
          ["behavior", t("journal.analytics.tabs.behavior")],
          ["advanced", t("journal.analytics.tabs.advanced")],
        ].map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab as AnalyticsTab)}
            className={cn(
              "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold transition",
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingPanel />
      ) : (
        <>
          {!hasTrades && <AnalyticsEmptyState />}

          {activeTab === "overview" ? (
            <>
              <Section
                title={t("journal.analytics.equityCurve")}
                description={t("journal.analytics.equityDescription")}
                icon={<LineChartIcon className="h-4 w-4" />}
                tourId="analytics-equity"
              >
                <EquityChart data={analytics.equityCurve} />
              </Section>

              <div className="grid gap-5 xl:grid-cols-2">
                <Section
                  title={periodPnlTitle}
                  description={periodPnlDescription}
                  icon={<BarChart3 className="h-4 w-4" />}
                >
                  <PnlBarChart data={periodPnl.rows} xKey="label" height={280} />
                </Section>
                <Section
                  title={isFa ? "توزیع برد و باخت" : "Win/loss distribution"}
                  icon={<Target className="h-4 w-4" />}
                >
                  <WinLossDistribution overview={overview} />
                </Section>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Section
                  title={t("journal.analytics.symbolAnalytics")}
                  description={t("journal.analytics.symbolAnalyticsDescription")}
                  icon={<ArrowUpDown className="h-4 w-4" />}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          {[
                            ["symbol", t("dashboard.table.symbol")],
                            ["totalTrades", t("journal.analytics.trades")],
                            ["winRate", t("journal.analytics.winRate")],
                            ["netPnl", t("journal.analytics.netPnl")],
                            ["profitFactor", t("journal.analytics.profitFactor")],
                          ].map(([key, label]) => (
                            <th key={key} className="py-2 pr-3">
                              <button type="button" onClick={() => toggleSymbolSort(key as SortKey)} className="inline-flex items-center gap-1 hover:text-white">
                                {label}
                                <ArrowUpDown className="h-3 w-3" />
                              </button>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {sortedSymbols.map((row) => (
                          <tr key={row.symbol} className="text-slate-300">
                            <td className="py-3 pr-3 font-semibold text-white">{row.symbol}</td>
                            <td className="py-3 pr-3">{formatNumber(row.totalTrades, 0)}</td>
                            <td className="py-3 pr-3">{formatPercent(row.winRate)}</td>
                            <td className={cn("py-3 pr-3 font-semibold", valueToneClass(row.netPnl))}>{formatMoney(row.netPnl)}</td>
                            <td className="py-3 pr-3">{formatNumber(row.profitFactor, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {sortedSymbols.length === 0 && <EmptyPanel message={t("journal.analytics.noSymbolAnalytics")} />}
                  </div>
                </Section>

                <Section title={isFa ? "عملکرد پلی‌بوک" : "Playbook Performance"} icon={<Target className="h-4 w-4" />} tourId="analytics-playbook">
                  {analytics.metadata.hasStrategyData ? (
                    <StrategyTable rows={analytics.byStrategy} />
                  ) : (
                    <EmptyPanel message={isFa ? "هنوز پلی‌بوکی اختصاص داده نشده است. معاملات را بررسی کنید و یک پلی‌بوک انتخاب کنید تا عملکرد پلی‌بوک فعال شود." : "No playbook assigned yet. Review your trades and select a playbook to unlock playbook performance."} />
                  )}
                </Section>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <Section title={t("journal.analytics.sessionPerformance")} description={t("journal.analytics.sessionPerformanceDescription")} icon={<CalendarDays className="h-4 w-4" />}>
                  <PnlBarChart data={analytics.bySession} xKey="session" height={280} />
                </Section>
                <Section title={isFa ? "الگوهای اشتباه و روانشناسی" : "Mistakes and psychology patterns"} icon={<Brain className="h-4 w-4" />}>
                  <BehaviorInsightPanel analytics={analytics} />
                </Section>
              </div>
            </>
          ) : null}

          {activeTab === "behavior" ? (
            <>
              {!advancedInsightsUnlocked ? <LowSampleNotice /> : null}
              <Section title={isFa ? "بینش رفتاری" : "Behavior Insight"} icon={<Brain className="h-4 w-4" />}>
                <BehaviorInsightPanel analytics={analytics} />
              </Section>
              <div className="grid gap-5 xl:grid-cols-2">
                <Section title={t("journal.analytics.mistakes")} icon={<AlertTriangle className="h-4 w-4" />}>
                  <CompactTable rows={analytics.byMistake} labelHeader={t("journal.analytics.mistakes")} getLabel={(row) => row.label} emptyMessage={isFa ? "هنوز تگ اشتباهی ثبت نشده است. بررسی معامله را باز کنید و اشتباهات را اضافه کنید تا تحلیل رفتاری نمایش داده شود." : "No mistake tags yet. Open a trade review and add mistakes to see behavior analytics."} />
                </Section>
                <Section title={t("journal.analytics.emotions")} icon={<Brain className="h-4 w-4" />}>
                  <CompactTable rows={analytics.byEmotion} labelHeader={t("journal.analytics.emotions")} getLabel={(row) => row.label} emptyMessage={isFa ? "هنوز داده احساسی ثبت نشده است. هنگام بررسی معامله، احساس یا وضعیت روانشناسی را اضافه کنید." : "No emotion data yet. Add emotion or psychology status during trade review."} />
                </Section>
                <Section title={isFa ? "عملکرد ستاپ" : "Setup Performance"} icon={<Tags className="h-4 w-4" />}>
                  <CompactTable rows={analytics.bySetup} labelHeader={isFa ? "ستاپ" : "Setup"} getLabel={(row) => row.label} emptyMessage={isFa ? "هنوز تگ ستاپی ثبت نشده است. هنگام بررسی معامله، برچسب‌های ستاپ را اضافه کنید." : "No setup tags yet. Add setup labels during trade review."} />
                </Section>
                <Section title={isFa ? "تکمیل چک‌لیست" : "Checklist Completion"} icon={<ClipboardCheck className="h-4 w-4" />}>
                  <CompactTable rows={analytics.byChecklistCompletion} labelHeader={isFa ? "وضعیت چک‌لیست" : "Checklist Status"} getLabel={(row) => row.label} emptyMessage={isFa ? "هنوز نتیجه چک‌لیستی ثبت نشده است. برای مقایسه عملکرد معاملات تکمیل‌شده و ناقص، چک‌لیست پیش از معامله را به معاملات وصل کنید." : "No checklist results yet. Attach a Pre-Trade Checklist to trades to compare completed vs incomplete performance."} />
                </Section>
              </div>

              <CollapsibleAnalyticsSection title={isFa ? "تحلیل سشن، روز هفته و ساعت" : "Session, weekday, and hourly analytics"} collapsed={!advancedInsightsUnlocked}>
                <div className="space-y-5">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <Section title={t("journal.analytics.sessionPerformance")} description={t("journal.analytics.sessionPerformanceDescription")} icon={<CalendarDays className="h-4 w-4" />}>
                      <PnlBarChart data={analytics.bySession} xKey="session" height={300} />
                    </Section>
                    <Section title={t("journal.analytics.weekdayPnl")} icon={<CalendarDays className="h-4 w-4" />}>
                      <PnlBarChart data={analytics.byWeekday} xKey="weekday" height={280} />
                    </Section>
                  </div>

                  <Section title={t("journal.analytics.hourlyPnl")} icon={<BarChart3 className="h-4 w-4" />}>
                    <PnlBarChart data={hourlyChartData.length > 0 ? hourlyChartData : analytics.byHour} xKey="label" height={280} />
                  </Section>
                </div>
              </CollapsibleAnalyticsSection>
            </>
          ) : null}

          {activeTab === "advanced" ? (
            <>
              {!advancedInsightsUnlocked ? <LowSampleNotice /> : null}
              <>
                <WeeklyAIReportPanel filters={appliedFilters} />

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {advancedMetricCards.map(({ label, value, icon, tone }) => (
                    <StatCard key={label} label={label} value={value} icon={icon} tone={tone} />
                  ))}
                </div>

                <CollapsibleAnalyticsSection title={isFa ? "فضای بررسی معامله" : "Trade review workspace"} collapsed={!advancedInsightsUnlocked}>
                  <TradeZellaAnalysisWorkspace analytics={analytics} />
                </CollapsibleAnalyticsSection>

                <div className="grid gap-5 xl:grid-cols-2">
                  <Section title={t("journal.analytics.longShort")} description={t("journal.analytics.longShortDescription")} icon={<Filter className="h-4 w-4" />}>
                    <div className="space-y-4">
                      <DirectionStats items={directionData} />
                      <DirectionChart data={directionData} />
                    </div>
                  </Section>
                  <Section title={t("journal.analytics.drawdown")} description={t("journal.analytics.drawdownDescription").replace("{current}", formatMoney(overview.currentDrawdown)).replace("{max}", formatMoney(overview.maxDrawdown))} icon={<ArrowDown className="h-4 w-4" />}>
                    <DrawdownChart data={analytics.drawdownCurve} />
                  </Section>
                </div>

                <Section title={t("journal.analytics.hourlyDecisionBoard")} description={t("journal.analytics.hourlyDecisionDescription")} icon={<BarChart3 className="h-4 w-4" />}>
                  <HourlyDecisionPanel rows={analytics.byHour} defaultCollapsed={!advancedInsightsUnlocked} />
                </Section>

                <div className="grid gap-5 xl:grid-cols-2">
                  <Section title={t("journal.analytics.sessionAnalytics")} icon={<CalendarDays className="h-4 w-4" />}>
                    <CompactTable rows={analytics.bySession} labelHeader={t("journal.analytics.session")} getLabel={(row) => row.session} emptyMessage={t("journal.analytics.noSessionAnalytics")} />
                  </Section>
                  <Section title={t("journal.analytics.weekdayAnalytics")} icon={<CalendarDays className="h-4 w-4" />}>
                    <CompactTable rows={analytics.byWeekday} labelHeader={t("journal.analytics.weekday")} getLabel={(row) => row.weekday} emptyMessage={t("journal.analytics.noWeekdayAnalytics")} />
                  </Section>
                </div>
              </>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
