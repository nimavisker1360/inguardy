"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { TradingViewTicker } from "@/components/TradingViewTicker";
import { LandingHeroFeatures } from "@/components/landing/LandingHeroFeatures";
import { LandingVideoStory } from "@/components/landing/LandingVideoStory";
import { useLanguage, type Language } from "@/lib/language-context";
import {
  ArrowRight,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
  Sparkles,
  RefreshCw,
  CalendarDays,
  Layers,
  BadgeCheck,
  CheckCircle2,
  PlugZap,
  Users,
  HelpCircle,
  ChevronDown,
  Bot,
  Download,
} from "lucide-react";

type DashboardPlan = {
  id: string;
  name: string;
  description?: string | null;
  priceUSDT: string;
  durationDays: number;
  maxTrades?: number | null;
  maxScreenshots?: number | null;
  maxPlaybooks?: number | null;
  maxChecklists?: number | null;
  aiAnalysis?: boolean;
  advancedAnalytics?: boolean;
  exportEnabled?: boolean;
  isFree?: boolean;
  isTrial?: boolean;
};

const landingCopy = {
  en: {
    hero: {
      eyebrow: "AI-powered trading journal",
      titlePrefix: "Your",
      titleHighlight: "AI",
      titleSuffix: "Trading",
      titleLine2: "Journal for Smarter",
      titleLine3: "Decisions",
      description:
        "Inguardy automatically syncs your trades, organizes your trading journal, reviews your setups, tracks mistakes, and helps you improve discipline with AI-powered insights.",
      primaryCta: "Get Started",
      toolsLabel: "Everything in one place - 6 tools",
      imageAlt: "Inguardy trading journal dashboard",
    },
    heroTools: [
      "MT5 Auto Sync",
      "AI Trade Review",
      "Trading Calendar",
      "Playbooks",
      "Checklists",
      "Analytics & Reports",
    ],
    agents: {
      eyebrow: "AI Agents",
      titleHighlight: "Smarter",
      titleRest: "Trading Desk",
      description:
        "Specialized dashboard agents watch the parts of trading that matter most: risk, review, and repeat mistakes.",
      ready: "Agent ready",
      cards: [
        {
          title: "Keeps risk visible before the click.",
          eyebrow: "Risk Agent",
          description:
            "Checks the trade idea against position size, stop-loss distance, daily exposure, and the downside you are accepting.",
          tag: "Risk",
          messages: [
            "Current setup fits your planned daily risk.",
            "Next loss still keeps the session inside limits.",
          ],
          action: "Review risk first.",
        },
        {
          title: "Turns reviews into better habits.",
          eyebrow: "Discipline Agent",
          description:
            "Connects closed trades, AI review notes, checklists, and repeated mistakes so every session teaches the next one.",
          tag: "Review",
          messages: [
            "Last reviews show early exits on winning setups.",
            "Add one checklist rule before the next session.",
          ],
          action: "Improve the next trade.",
        },
      ],
    },
    benefits: {
      eyebrow: "Most Used Dashboard Benefits",
      title: "The dashboard features traders open every day.",
      description:
        "Instead of showing another feature list, this section highlights the two practical benefits users feel immediately: trades are captured automatically, then reviewed with clear feedback.",
      preview: "Live dashboard preview",
      cards: [
        {
          title: "Automatic Trade Tracking",
          eyebrow: "Most used workflow",
          description:
            "Every MT5 trade lands in the journal with clean history, synced context, screenshots, and daily performance without manual typing.",
          stats: [
            { label: "MT5 sync", value: "Auto" },
            { label: "Daily log", value: "Live" },
          ],
          bullets: [
            "Capture entries, exits, symbols, and account history",
            "Keep calendar days and trade details connected",
            "Reduce missed trades and manual journal mistakes",
          ],
        },
        {
          title: "AI Trade Review",
          eyebrow: "Most valuable feedback",
          description:
            "Turn closed trades into practical feedback with setup quality, discipline notes, mistakes, and improvement signals in one review flow.",
          stats: [
            { label: "Review", value: "AI" },
            { label: "Mistakes", value: "Tracked" },
          ],
          bullets: [
            "Review psychology, exit reason, and setup notes",
            "Spot repeated mistakes before they become habits",
            "Improve the next trade with structured feedback",
          ],
        },
      ],
    },
    pricing: {
      eyebrow: "Dashboard Plans",
      title: "Choose the plan that matches your trading workflow.",
      description:
        "Prices are loaded from the same active dashboard plan settings used on the premium payment page.",
      unlockedFeatures: [
        "Unlimited trade journal",
        "MT5-ready screenshots",
        "AI trade review",
        "Advanced analytics",
        "Playbooks and checklists",
        "Export reports",
      ],
      freeBadge: "Free trial",
      freeTitle: "10-Day Free Trial",
      days: "days",
      usdtForDays: "USDT / {days} days",
      freeDescription:
        "Try premium journal features first, then choose monthly or yearly Pro when you are ready.",
      freeFeatures: [
        "10 days of premium access",
        "MT5 journal sync trial",
        "AI trade review access",
        "Advanced analytics preview",
        "Playbooks and checklists included",
      ],
      startFree: "Start free trial",
      mostActive: "Most active",
      dashboardPlan: "Dashboard plan",
      fallbackPlanDescription:
        "Full dashboard access for active journaling, review, analytics, and reporting.",
      upgrade: "Upgrade with this plan",
      loading: "Loading live plan prices from the dashboard...",
      loaded:
        "A 10-day trial can unlock premium journal features first. Paid access keeps Pro features active after the trial period.",
      unlimited: "Unlimited {label}",
      limits: {
        trades: "trades",
        screenshots: "screenshots",
        playbooks: "playbooks",
        checklists: "checklists",
      },
      features: {
        aiIncluded: "AI trade review included",
        manualReview: "Manual review workflow",
        advancedAnalytics: "Advanced analytics included",
        coreAnalytics: "Core analytics",
        exportEnabled: "Report export enabled",
        dashboardAccess: "Dashboard access",
      },
      planNames: {
        "fallback-pro-monthly": "Pro Monthly",
        "fallback-pro-yearly": "Pro Yearly",
      },
      planDescriptions: {
        "fallback-pro-monthly":
          "Unlock the full dashboard for active journaling, review, analytics, and reports.",
        "fallback-pro-yearly":
          "A full year of Pro access for traders who want the best long-term value.",
      },
    },
    faq: {
      eyebrow: "Built around your dashboard",
      title: "Frequently Asked Questions",
      description:
        "Explore the real tools available inside Inguardy, from connected accounts and daily review to risk controls and market preparation.",
      items: [
        {
          question: "Which trading accounts can I connect to Inguardy?",
          answer:
            "You can manage MT4, MT5, cTrader, and TradeLocker accounts from Trading Accounts. Synced trades feed the journal, dashboard metrics, calendar, and reports.",
          tag: "Accounts",
        },
        {
          question: "What can I review in Trades, Day View, and Daily Journal?",
          answer:
            "Review entries and exits, symbols, profit and loss, screenshots, notes, emotions, mistakes, and strategy context. Day View and Daily Journal keep each trading session connected to its trades and reflections.",
          tag: "Journal",
        },
        {
          question: "How do Playbooks and Checklists improve discipline?",
          answer:
            "Playbooks define your repeatable setups, while Checklists turn entry and management rules into a pre-trade routine. Together they help compare what you planned with what you actually executed.",
          tag: "Discipline",
        },
        {
          question: "What does Inguardy AI analyze?",
          answer:
            "Inguardy AI uses journal context such as setup notes, psychology, exit reasons, discipline, performance, and repeated mistakes to turn closed trades into practical review points.",
          tag: "AI review",
        },
        {
          question: "What does Risk Guardian monitor?",
          answer:
            "Risk Guardian keeps daily loss, drawdown, exposure, and account limits visible. It works alongside Position Sizing and Prop Firm Tracker so risk rules stay part of the workflow.",
          tag: "Risk",
        },
        {
          question: "Can I practice and review backtests inside the dashboard?",
          answer:
            "Yes. Market Replay lets you rehearse decisions away from live markets, and Backtest Reports organize historical results so you can compare setups and refine rules.",
          tag: "Practice",
        },
        {
          question: "Which performance insights are available in Analytics and Reports?",
          answer:
            "Track net P&L, win rate, profit factor, drawdown, session and symbol performance, strategy results, habits, and account history through focused reports and analytics views.",
          tag: "Analytics",
        },
        {
          question: "Which market-preparation tools are included?",
          answer:
            "Use Market Scanner, Economic Calendar, Position Sizing, and the dashboard's market tools to find context, prepare for volatility, and plan risk before opening a trade.",
          tag: "Market tools",
        },
      ],
    },
  },
  fa: {
    hero: {
      eyebrow: "ژورنال معاملاتی هوشمند با AI",
      titlePrefix: "ژورنال معاملاتی",
      titleHighlight: "AI",
      titleSuffix: "شما",
      titleLine2: "برای تصمیم‌های",
      titleLine3: "هوشمندتر",
      description:
        "Inguardy معاملات شما را خودکار همگام‌سازی می‌کند، ژورنال معاملاتی را مرتب نگه می‌دارد، ستاپ‌ها را بررسی می‌کند، اشتباهات را ردیابی می‌کند و با بینش‌های هوش مصنوعی به تقویت نظم معاملاتی کمک می‌کند.",
      primaryCta: "شروع کنید",
      toolsLabel: "همه چیز در یک جا - ۶ ابزار",
      imageAlt: "داشبورد ژورنال معاملاتی Inguardy",
    },
    heroTools: [
      "همگام‌سازی خودکار MT5",
      "بررسی معامله با AI",
      "تقویم معاملاتی",
      "پلی‌بوک‌ها",
      "چک‌لیست‌ها",
      "تحلیل و گزارش‌ها",
    ],
    agents: {
      eyebrow: "عامل‌های هوش مصنوعی",
      titleHighlight: "میز معاملاتی",
      titleRest: "هوشمندتر",
      description:
        "عامل‌های تخصصی داشبورد بخش‌های مهم معامله‌گری را زیر نظر می‌گیرند: ریسک، مرور معامله و اشتباهات تکراری.",
      ready: "عامل آماده است",
      cards: [
        {
          title: "ریسک را قبل از کلیک قابل دیدن می‌کند.",
          eyebrow: "عامل ریسک",
          description:
            "ایده معامله را با حجم پوزیشن، فاصله حد ضرر، ریسک روزانه و زیانی که می‌پذیرید مقایسه می‌کند.",
          tag: "ریسک",
          messages: [
            "ستاپ فعلی با ریسک روزانه برنامه‌ریزی‌شده هماهنگ است.",
            "زیان بعدی هنوز جلسه را داخل محدودیت‌ها نگه می‌دارد.",
          ],
          action: "اول ریسک را بررسی کنید.",
        },
        {
          title: "مرورها را به عادت‌های بهتر تبدیل می‌کند.",
          eyebrow: "عامل نظم",
          description:
            "معاملات بسته، یادداشت‌های AI، چک‌لیست‌ها و اشتباهات تکراری را به هم وصل می‌کند تا هر جلسه، جلسه بعدی را بهتر کند.",
          tag: "مرور",
          messages: [
            "مرورهای اخیر خروج زودهنگام از ستاپ‌های برنده را نشان می‌دهند.",
            "قبل از جلسه بعدی یک قانون به چک‌لیست اضافه کنید.",
          ],
          action: "معامله بعدی را بهتر کنید.",
        },
      ],
    },
    benefits: {
      eyebrow: "پرکاربردترین مزیت‌های داشبورد",
      title: "قابلیت‌هایی که معامله‌گران هر روز باز می‌کنند.",
      description:
        "به جای یک فهرست بلند از امکانات، این بخش دو مزیت فوری را نشان می‌دهد: معاملات خودکار ثبت می‌شوند و بعد با بازخورد روشن بررسی می‌شوند.",
      preview: "پیش‌نمایش زنده داشبورد",
      cards: [
        {
          title: "ردیابی خودکار معاملات",
          eyebrow: "پرکاربردترین جریان کاری",
          description:
            "هر معامله MT5 با تاریخچه تمیز، زمینه همگام‌شده، اسکرین‌شات‌ها و عملکرد روزانه وارد ژورنال می‌شود؛ بدون تایپ دستی.",
          stats: [
            { label: "همگام‌سازی MT5", value: "خودکار" },
            { label: "لاگ روزانه", value: "زنده" },
          ],
          bullets: [
            "ثبت ورود، خروج، نماد و تاریخچه حساب",
            "اتصال روزهای تقویم به جزئیات معامله",
            "کاهش معاملات جاافتاده و خطاهای ژورنال دستی",
          ],
        },
        {
          title: "بررسی معامله با AI",
          eyebrow: "ارزشمندترین بازخورد",
          description:
            "معاملات بسته را به بازخورد کاربردی درباره کیفیت ستاپ، نظم، اشتباهات و مسیر بهبود تبدیل می‌کند.",
          stats: [
            { label: "مرور", value: "AI" },
            { label: "اشتباهات", value: "ردیابی" },
          ],
          bullets: [
            "بررسی روان‌شناسی، دلیل خروج و یادداشت‌های ستاپ",
            "دیدن اشتباهات تکراری قبل از تبدیل شدن به عادت",
            "بهبود معامله بعدی با بازخورد ساختاریافته",
          ],
        },
      ],
    },
    pricing: {
      eyebrow: "پلن‌های داشبورد",
      title: "پلنی را انتخاب کنید که با جریان معاملاتی شما هماهنگ است.",
      description:
        "قیمت‌ها از همان تنظیمات فعال پلن داشبورد که در صفحه پرداخت استفاده می‌شود بارگذاری می‌شوند.",
      unlockedFeatures: [
        "ژورنال معاملاتی نامحدود",
        "اسکرین‌شات آماده MT5",
        "بررسی معامله با AI",
        "تحلیل پیشرفته",
        "پلی‌بوک و چک‌لیست",
        "خروجی گزارش‌ها",
      ],
      freeBadge: "آزمایش رایگان",
      freeTitle: "آزمایش رایگان ۱۰ روزه",
      days: "روز",
      usdtForDays: "USDT / {days} روز",
      freeDescription:
        "ابتدا امکانات پریمیوم ژورنال را امتحان کنید، سپس وقتی آماده بودید پلن ماهانه یا سالانه Pro را انتخاب کنید.",
      freeFeatures: [
        "۱۰ روز دسترسی پریمیوم",
        "آزمایش همگام‌سازی ژورنال MT5",
        "دسترسی به بررسی معامله با AI",
        "پیش‌نمایش تحلیل پیشرفته",
        "پلی‌بوک و چک‌لیست شامل می‌شود",
      ],
      startFree: "شروع آزمایش رایگان",
      mostActive: "محبوب‌ترین",
      dashboardPlan: "پلن داشبورد",
      fallbackPlanDescription:
        "دسترسی کامل به داشبورد برای ژورنال‌نویسی فعال، مرور، تحلیل و گزارش‌گیری.",
      upgrade: "ارتقا با این پلن",
      loading: "در حال بارگذاری قیمت‌های زنده پلن از داشبورد...",
      loaded:
        "آزمایش ۱۰ روزه می‌تواند ابتدا امکانات پریمیوم ژورنال را فعال کند. دسترسی پولی بعد از دوره آزمایشی امکانات Pro را فعال نگه می‌دارد.",
      unlimited: "{label} نامحدود",
      limits: {
        trades: "معامله",
        screenshots: "اسکرین‌شات",
        playbooks: "پلی‌بوک",
        checklists: "چک‌لیست",
      },
      features: {
        aiIncluded: "بررسی معامله با AI شامل می‌شود",
        manualReview: "جریان مرور دستی",
        advancedAnalytics: "تحلیل پیشرفته شامل می‌شود",
        coreAnalytics: "تحلیل پایه",
        exportEnabled: "خروجی گزارش فعال است",
        dashboardAccess: "دسترسی به داشبورد",
      },
      planNames: {
        "fallback-pro-monthly": "Pro ماهانه",
        "fallback-pro-yearly": "Pro سالانه",
      },
      planDescriptions: {
        "fallback-pro-monthly":
          "دسترسی کامل داشبورد برای ژورنال‌نویسی فعال، مرور، تحلیل و گزارش‌ها.",
        "fallback-pro-yearly":
          "یک سال دسترسی Pro برای معامله‌گرانی که بهترین ارزش بلندمدت را می‌خواهند.",
      },
    },
    faq: {
      eyebrow: "براساس ابزارهای واقعی داشبورد",
      title: "سوالات متداول",
      description:
        "پاسخ‌های روشن درباره ابزارهای واقعی Inguardy؛ از اتصال حساب و ژورنال روزانه تا کنترل ریسک و آماده‌سازی بازار.",
      items: [
        {
          question: "چه حساب‌های معاملاتی را می‌توانم به Inguardy متصل کنم؟",
          answer:
            "از بخش حساب‌های معاملاتی می‌توانید حساب‌های MT4، MT5، cTrader و TradeLocker را مدیریت کنید. معاملات همگام‌شده وارد ژورنال، آمار داشبورد، تقویم و گزارش‌ها می‌شوند.",
          tag: "حساب‌ها",
        },
        {
          question: "در Trades، Day View و Daily Journal چه چیزهایی را می‌توانم بررسی کنم؟",
          answer:
            "ورود و خروج، نماد، سود و زیان، اسکرین‌شات، یادداشت، احساسات، اشتباهات و زمینه استراتژی را مرور کنید. نمای روزانه و ژورنال روزانه هر جلسه را به معاملات و یادداشت‌های همان روز متصل نگه می‌دارند.",
          tag: "ژورنال",
        },
        {
          question: "پلی‌بوک‌ها و چک‌لیست‌ها چطور نظم معاملاتی را بهتر می‌کنند؟",
          answer:
            "پلی‌بوک‌ها ستاپ‌های تکرارپذیر شما را تعریف می‌کنند و چک‌لیست‌ها قوانین ورود و مدیریت معامله را به یک روتین قبل از معامله تبدیل می‌کنند؛ بنابراین اجرای واقعی با برنامه شما قابل مقایسه می‌شود.",
          tag: "نظم",
        },
        {
          question: "هوش مصنوعی Inguardy چه چیزهایی را تحلیل می‌کند؟",
          answer:
            "هوش مصنوعی Inguardy از اطلاعات ژورنال مانند ستاپ، روان‌شناسی، دلیل خروج، نظم، عملکرد و اشتباهات تکراری استفاده می‌کند تا هر معامله بسته را به نکات عملی برای مرور تبدیل کند.",
          tag: "بررسی AI",
        },
        {
          question: "Risk Guardian چه مواردی را کنترل می‌کند؟",
          answer:
            "Risk Guardian زیان روزانه، افت سرمایه، میزان درگیری سرمایه و محدودیت‌های حساب را قابل مشاهده نگه می‌دارد و در کنار Position Sizing و Prop Firm Tracker کمک می‌کند قوانین ریسک همیشه در جریان کار بمانند.",
          tag: "ریسک",
        },
        {
          question: "آیا می‌توانم داخل داشبورد تمرین و بک‌تست‌ها را مرور کنم؟",
          answer:
            "بله. Market Replay امکان تمرین تصمیم‌گیری دور از بازار زنده را می‌دهد و Backtest Reports نتایج تاریخی را منظم می‌کند تا ستاپ‌ها را مقایسه و قوانین را دقیق‌تر کنید.",
          tag: "تمرین",
        },
        {
          question: "در Analytics و Reports چه اطلاعاتی از عملکرد می‌بینم؟",
          answer:
            "سود و زیان خالص، نرخ برد، Profit Factor، افت سرمایه، عملکرد سشن‌ها و نمادها، نتیجه استراتژی‌ها، عادت‌ها و تاریخچه حساب را در نماهای تحلیلی و گزارش‌های متمرکز دنبال کنید.",
          tag: "تحلیل",
        },
        {
          question: "چه ابزارهایی برای آماده‌سازی قبل از معامله وجود دارد؟",
          answer:
            "از Market Scanner، Economic Calendar، Position Sizing و ابزارهای بازار داشبورد برای پیدا کردن زمینه بازار، آمادگی در برابر نوسان و برنامه‌ریزی ریسک پیش از ورود استفاده کنید.",
          tag: "ابزار بازار",
        },
      ],
    },
  },
} as const;

const fallbackDashboardPlans: DashboardPlan[] = [
  {
    id: "fallback-pro-monthly",
    name: "Pro Monthly",
    description:
      "Unlock the full dashboard for active journaling, review, analytics, and reports.",
    priceUSDT: "15.00",
    durationDays: 30,
    maxTrades: null,
    maxScreenshots: null,
    maxPlaybooks: null,
    maxChecklists: null,
    aiAnalysis: true,
    advancedAnalytics: true,
    exportEnabled: true,
  },
  {
    id: "fallback-pro-yearly",
    name: "Pro Yearly",
    description:
      "A full year of Pro access for traders who want the best long-term value.",
    priceUSDT: "150.00",
    durationDays: 365,
    maxTrades: null,
    maxScreenshots: null,
    maxPlaybooks: null,
    maxChecklists: null,
    aiAnalysis: true,
    advancedAnalytics: true,
    exportEnabled: true,
  },
];

function formatPlanPrice(value: string) {
  const price = Number(value);

  if (!Number.isFinite(price)) {
    return value;
  }

  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

function formatLimit(
  value: number | null | undefined,
  label: string,
  unlimitedTemplate: string,
  language: Language
) {
  return value === null || value === undefined
    ? unlimitedTemplate.replace("{label}", label)
    : `${value.toLocaleString(language === "fa" ? "fa-IR" : "en-US")} ${label}`;
}

function planFeatures(
  plan: DashboardPlan,
  copy: (typeof landingCopy)["en" | "fa"]["pricing"],
  language: Language
) {
  return [
    formatLimit(plan.maxTrades, copy.limits.trades, copy.unlimited, language),
    formatLimit(
      plan.maxScreenshots,
      copy.limits.screenshots,
      copy.unlimited,
      language
    ),
    formatLimit(plan.maxPlaybooks, copy.limits.playbooks, copy.unlimited, language),
    formatLimit(
      plan.maxChecklists,
      copy.limits.checklists,
      copy.unlimited,
      language
    ),
    plan.aiAnalysis ? copy.features.aiIncluded : copy.features.manualReview,
    plan.advancedAnalytics
      ? copy.features.advancedAnalytics
      : copy.features.coreAnalytics,
    plan.exportEnabled ? copy.features.exportEnabled : copy.features.dashboardAccess,
  ];
}

export default function Home() {
  const { language } = useLanguage();
  const copy = landingCopy[language];
  const isRtl = language === "fa";
  const dir = isRtl ? "rtl" : "ltr";
  const textAlignClass = isRtl ? "text-right" : "text-left";
  const arrowClass = isRtl ? "rotate-180" : "";
  const trialDays = (10).toLocaleString(language === "fa" ? "fa-IR" : "en-US");
  const [dashboardPlans, setDashboardPlans] = useState<DashboardPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const faqSectionRef = useRef<HTMLElement>(null);
  const [faqScrollProgress, setFaqScrollProgress] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetch("/api/plans", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "Failed to load plans.");
        }

        return payload;
      })
      .then((payload) => {
        if (!mounted) return;

        const paidPlans = ((payload.plans || []) as DashboardPlan[]).filter(
          (plan) => !plan.isFree && !plan.isTrial
        );

        setDashboardPlans(paidPlans);
      })
      .catch(() => {
        if (mounted) setDashboardPlans([]);
      })
      .finally(() => {
        if (mounted) setPlansLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let frame = 0;

    const updateFaqProgress = () => {
      const section = faqSectionRef.current;

      if (!section) return;

      const rect = section.getBoundingClientRect();
      const travel = window.innerHeight + rect.height;
      const progress = Math.min(
        1,
        Math.max(0, (window.innerHeight - rect.top) / travel)
      );

      setFaqScrollProgress(progress);
    };

    const requestUpdate = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateFaqProgress);
    };

    updateFaqProgress();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  const visiblePricingPlans = dashboardPlans.length
    ? dashboardPlans
    : fallbackDashboardPlans;

  const heroTools = [
    { icon: RefreshCw, label: copy.heroTools[0] },
    { icon: Sparkles, label: copy.heroTools[1] },
    { icon: CalendarDays, label: copy.heroTools[2] },
    { icon: Layers, label: copy.heroTools[3] },
    { icon: ClipboardCheck, label: copy.heroTools[4] },
    { icon: BarChart3, label: copy.heroTools[5] },
  ];

  const dashboardBenefits = [
    {
      ...copy.benefits.cards[0],
      icon: PlugZap,
      image: "/images/background/AuTrade.png",
      position: "center center",
    },
    {
      ...copy.benefits.cards[1],
      icon: Sparkles,
      image: "/images/background/AiTrade_cyber.png",
      position: "center center",
    },
  ];

  const commandCenterCards = [
    {
      ...copy.agents.cards[0],
      icon: ShieldCheck,
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      ...copy.agents.cards[1],
      icon: Sparkles,
      accent: "from-emerald-400 to-blue-500",
    },
  ];

  const unlockedFeatures = copy.pricing.unlockedFeatures;

  const faqIcons = [
    {
      icon: BarChart3,
      iconClass: "bg-sky-50 text-sky-600 ring-sky-100",
      tagClass: "bg-sky-50 text-sky-700",
      openClass: "open:border-sky-200 hover:border-sky-200",
    },
    {
      icon: PlugZap,
      iconClass: "bg-amber-50 text-amber-600 ring-amber-100",
      tagClass: "bg-amber-50 text-amber-700",
      openClass: "open:border-amber-200 hover:border-amber-200",
    },
    {
      icon: Bot,
      iconClass: "bg-violet-50 text-violet-600 ring-violet-100",
      tagClass: "bg-violet-50 text-violet-700",
      openClass: "open:border-violet-200 hover:border-violet-200",
    },
    {
      icon: ShieldCheck,
      iconClass: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      tagClass: "bg-emerald-50 text-emerald-700",
      openClass: "open:border-emerald-200 hover:border-emerald-200",
    },
    {
      icon: BadgeCheck,
      iconClass: "bg-blue-50 text-blue-600 ring-blue-100",
      tagClass: "bg-blue-50 text-blue-700",
      openClass: "open:border-blue-200 hover:border-blue-200",
    },
    {
      icon: Users,
      iconClass: "bg-cyan-50 text-cyan-600 ring-cyan-100",
      tagClass: "bg-cyan-50 text-cyan-700",
      openClass: "open:border-cyan-200 hover:border-cyan-200",
    },
    {
      icon: HelpCircle,
      iconClass: "bg-rose-50 text-rose-600 ring-rose-100",
      tagClass: "bg-rose-50 text-rose-700",
      openClass: "open:border-rose-200 hover:border-rose-200",
    },
    {
      icon: Download,
      iconClass: "bg-teal-50 text-teal-600 ring-teal-100",
      tagClass: "bg-teal-50 text-teal-700",
      openClass: "open:border-teal-200 hover:border-teal-200",
    },
  ];

  const faqItems = copy.faq.items.map((item, index) => ({
    ...item,
    ...faqIcons[index],
  }));
  const showLegacyLandingIntro = false;

  return (
    <div
      className={`flex max-w-full flex-col overflow-x-clip ${textAlignClass} ${
        isRtl ? "landing-fa-font" : "landing-en-font"
      }`}
      dir={dir}
    >
      <LandingVideoStory />
      {showLegacyLandingIntro && (
        <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white text-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_42%,rgba(167,139,250,0.28),transparent_34%),radial-gradient(circle_at_88%_58%,rgba(244,114,182,0.22),transparent_28%),radial-gradient(circle_at_61%_70%,rgba(59,130,246,0.18),transparent_32%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_52%,#ffffff_100%)]" />
        <div className="absolute inset-0 opacity-[0.28] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="container relative z-10 mx-auto max-w-[1480px] px-4 pb-14 pt-12 sm:px-6 lg:px-10 lg:pb-16 lg:pt-16 xl:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-[0.52fr_0.48fr] xl:gap-14">
            <div
              className={`min-w-0 max-w-full ${textAlignClass} lg:max-w-[680px]`}
              style={{ maxWidth: "min(100%, calc(100vw - 2rem))" }}
            >
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm backdrop-blur">
                <Sparkles className="h-4 w-4" />
                <span className="min-w-0">{copy.hero.eyebrow}</span>
              </div>

              <h1
                className={`max-w-[680px] text-balance font-sans font-semibold tracking-normal text-[#071034] ${
                  isRtl
                    ? "text-[2.15rem] leading-[1.32] sm:text-[3rem] lg:text-[2.85rem] xl:text-[3.25rem]"
                    : "text-[2.35rem] leading-[1.08] sm:text-[3.25rem] lg:text-[3rem] xl:text-[3.5rem]"
                }`}
              >
                <span className="sm:whitespace-nowrap">
                  {copy.hero.titlePrefix}{" "}
                  <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                    {copy.hero.titleHighlight}
                  </span>{" "}
                  {copy.hero.titleSuffix}
                </span>
                <br />
                <span className="sm:whitespace-nowrap">{copy.hero.titleLine2}</span>
                <br />
                {copy.hero.titleLine3}
              </h1>

              <p
                className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg"
                style={{ maxWidth: "min(36rem, calc(100vw - 2rem))" }}
              >
                {copy.hero.description}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="h-14 w-[calc(100vw-2rem)] max-w-full rounded-full bg-[#07134a] px-8 text-base font-bold text-white shadow-[0_18px_35px_rgba(7,19,74,0.25)] hover:-translate-y-0.5 hover:bg-[#102064] sm:w-auto"
                  asChild
                  style={{ maxWidth: "min(100%, calc(100vw - 2rem))" }}
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    {copy.hero.primaryCta}{" "}
                    <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                  </Link>
                </Button>
              </div>

              <div className="mt-10">
                <div className="mb-4 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-700">
                  {copy.hero.toolsLabel}
                </div>
                <div
                  className="flex max-w-full flex-wrap gap-2.5 overflow-hidden"
                  style={{ maxWidth: "min(100%, calc(100vw - 2rem))" }}
                >
                  {heroTools.map((tool) => {
                    const Icon = tool.icon;

                    return (
                      <span
                        key={tool.label}
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 text-xs font-bold text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.07)] backdrop-blur"
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        {tool.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="relative min-w-0">
              <div className="absolute left-[10%] top-[7%] hidden h-24 w-[80%] rounded-[50%] bg-blue-500/15 blur-3xl lg:block" />
              <div className="relative mx-auto mt-6 w-full max-w-[760px] lg:mt-0 xl:max-w-[820px]">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src="/images/banner.png"
                    alt={copy.hero.imageAlt}
                    fill
                    sizes="(min-width: 1280px) 760px, (min-width: 1024px) 48vw, 100vw"
                    priority
                    className="object-contain drop-shadow-[0_34px_80px_rgba(15,23,42,0.22)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-30 mt-10 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.09)]">
            <TradingViewTicker />
          </div>
        </div>
      </section>
      {/* Automated Journaling */}
      <div id="automated-journaling">
        <LandingHeroFeatures />
      </div>

      {/* AI Command Center */}
      <section
        dir={dir}
        className="relative isolate overflow-hidden bg-[#05060a] py-20 font-sans text-white lg:py-24"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_10%,rgba(37,99,235,0.15),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(217,70,239,0.13),transparent_28%),linear-gradient(180deg,#05060a_0%,#08090d_58%,#05060a_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.11] [background-image:linear-gradient(rgba(148,163,184,0.13)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.13)_1px,transparent_1px)] [background-size:50px_50px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-sm font-bold text-white">{copy.agents.eyebrow}</p>
            <h2 className="mx-auto mt-5 max-w-4xl text-4xl font-semibold leading-tight tracking-normal text-white sm:text-5xl lg:text-[3.9rem]">
              <span className="bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                {copy.agents.titleHighlight}
              </span>{" "}
              {copy.agents.titleRest}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-400">
              {copy.agents.description}
            </p>
          </div>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {commandCenterCards.map(
              (
                {
                  title,
                  eyebrow,
                  description,
                  icon: Icon,
                  accent,
                  tag,
                  messages,
                  action,
                }
              ) => (
                <article
                  key={title}
                  className="group rounded-2xl border border-white/[0.12] bg-[#131419] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.36)] transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-[#171820] sm:p-7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white shadow-[0_16px_34px_rgba(79,70,229,0.24)]`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border border-white/[0.12] bg-white/[0.055] px-3.5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">
                      {tag}
                    </span>
                  </div>

                  <p className="mt-7 text-sm font-black uppercase tracking-normal text-slate-500">
                    {eyebrow}
                  </p>
                  <h3 className="mt-2 max-w-[18rem] text-2xl font-bold leading-tight tracking-normal text-white">
                    {title}
                  </h3>
                  <p className="mt-4 min-h-[104px] text-sm font-semibold leading-7 text-slate-400">
                    {description}
                  </p>

                  <div className="mt-5 rounded-2xl border border-white/[0.07] bg-[#08090d] p-3">
                    {messages.map((message) => (
                      <div
                        key={message}
                        className="mb-2 flex items-start gap-3 rounded-lg bg-white/[0.075] px-3.5 py-3 text-sm font-medium leading-6 text-slate-200 last:mb-0"
                      >
                        <span
                          className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded bg-gradient-to-br ${accent}`}
                        />
                        <span>{message}</span>
                      </div>
                    ))}
                    <div className={`mt-2 flex ${isRtl ? "justify-start" : "justify-end"}`}>
                      <span className="rounded-lg bg-white/[0.13] px-4 py-3 text-sm font-medium text-slate-100">
                        {action}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/[0.08] pt-4">
                    <span className="flex items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {copy.agents.ready}
                    </span>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* Most Used Benefits */}
      <section
        dir={dir}
        className="relative isolate overflow-hidden bg-[#f7f9fc] py-20 font-sans text-[#0f172a] lg:py-24"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-white" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_8%_8%,rgba(167,139,250,0.18),transparent_32%),radial-gradient(circle_at_92%_12%,rgba(216,180,254,0.18),transparent_34%),radial-gradient(circle_at_10%_92%,rgba(196,181,253,0.14),transparent_30%),radial-gradient(circle_at_90%_88%,rgba(244,114,182,0.10),transparent_32%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-violet-200 to-transparent" />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[5%] top-16 -z-[1] hidden select-none text-[15rem] font-semibold leading-none text-violet-100/65 lg:block"
        >
          2
        </span>

        <div className="mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="relative">
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-[0_8px_26px_rgba(37,99,235,0.08)]">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {copy.benefits.eyebrow}
                </div>
                <h2 className="mx-auto mt-6 max-w-3xl text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl lg:text-[3.15rem] lg:leading-[1.05]">
                  {copy.benefits.title}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
                  {copy.benefits.description}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 grid gap-7 lg:grid-cols-2">
            {dashboardBenefits.map(
              (
                {
                  title,
                  eyebrow,
                  description,
                  icon: Icon,
                  image,
                  position,
                  stats,
                  bullets,
                },
                index
              ) => (
                <article
                  key={title}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(79,70,229,0.14)]"
                >
                  <div className="relative overflow-hidden bg-[#07111f]">
                    <div className="relative aspect-video bg-[#eef2ff]">
                      <Image
                        src={image}
                        alt={`${title} dashboard screenshot`}
                        fill
                        sizes="(min-width: 1024px) 560px, 100vw"
                        className="object-contain transition duration-500 group-hover:scale-[1.01]"
                        style={{ objectPosition: position }}
                      />
                    </div>
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,17,31,0.02)_35%,rgba(7,17,31,0.86)_100%)]" />
                    <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/12 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {copy.benefits.preview}
                      </span>
                      <span className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur sm:inline-flex">
                        0{index + 1}
                      </span>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)]">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-500">
                            {eyebrow}
                          </p>
                          <h3 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">
                            {title}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <p className="mt-5 text-sm leading-7 text-slate-500">
                      {description}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2.5">
                      {stats.map((stat) => (
                        <span
                          key={stat.label}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold text-slate-700"
                        >
                          <span className="text-slate-400">{stat.label}</span>
                          <span className="text-slate-950">{stat.value}</span>
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3">
                      {bullets.map((bullet) => (
                        <div
                          key={bullet}
                          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/75 px-4 py-3 text-sm font-medium leading-6 text-slate-600"
                        >
                          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      {/* Background Showcase */}
      <section
        id="dashboard-preview"
        dir={dir}
        className="relative isolate overflow-hidden bg-[#f8fbff] py-16 font-sans text-white lg:py-20"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_88%_12%,rgba(20,184,166,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-[0_26px_80px_rgba(15,23,42,0.14)]">
            <div className="aspect-[16/7] w-full sm:aspect-[16/6]">
              <img
                src="/images/background/background.gif"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

        </>
      )}

      {/* Dashboard Pricing */}
      <section
        id="pricing"
        className="relative isolate overflow-hidden bg-[#f8fbff] py-16 font-sans text-slate-950 lg:py-20"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_50%,#ffffff_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_48%_0%,rgba(16,185,129,0.12),transparent_32%),radial-gradient(circle_at_92%_18%,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_88%_82%,rgba(244,114,182,0.10),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.24] [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto mb-10 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-[0_12px_30px_rgba(37,99,235,0.09)] backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5" />
              {copy.pricing.eyebrow}
            </div>
            <h2 className="mx-auto mt-5 max-w-3xl text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl lg:text-[3.15rem] lg:leading-[1.05]">
              {copy.pricing.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-500">
              {copy.pricing.description}
            </p>
          </div>

          <div className="mb-7 flex flex-wrap justify-center gap-2">
            {unlockedFeatures.map((feature) => (
              <div
                key={feature}
                className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <article className="relative flex min-h-[510px] flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-blue-500 to-violet-500" />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="inline-flex rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
                    {copy.pricing.freeBadge}
                  </span>
                  <h3 className="mt-5 text-2xl font-bold tracking-normal text-slate-950">
                    {copy.pricing.freeTitle}
                  </h3>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                  {trialDays} {copy.pricing.days}
                </span>
              </div>

              <div className="mt-7 rounded-xl border border-emerald-100 bg-emerald-50/80 p-5">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="text-5xl font-black tracking-normal text-slate-950">
                    0
                  </span>
                  <span className="pb-2 text-sm font-bold text-slate-500">
                    {copy.pricing.usdtForDays.replace("{days}", trialDays)}
                  </span>
                </div>
                <p className="mt-5 min-h-14 text-sm font-medium leading-7 text-slate-600">
                  {copy.pricing.freeDescription}
                </p>
              </div>

              <div className="mt-7 grid gap-3">
                {copy.pricing.freeFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="text-sm font-semibold leading-6 text-slate-700">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                asChild
                className="mt-auto h-12 rounded-lg bg-emerald-600 text-sm font-bold text-white hover:bg-emerald-500"
              >
                <Link href="/login?redirect=%2Fdashboard" className="flex items-center justify-center gap-2">
                  {copy.pricing.startFree}
                  <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                </Link>
              </Button>
            </article>

            {visiblePricingPlans.map((plan, index) => {
              const highlighted = index === 0;
              const features = planFeatures(plan, copy.pricing, language);
              const planName =
                copy.pricing.planNames[
                  plan.id as keyof typeof copy.pricing.planNames
                ] ??
                (language === "fa" && /monthly/i.test(plan.name)
                  ? "Pro ماهانه"
                  : language === "fa" && /yearly/i.test(plan.name)
                    ? "Pro سالانه"
                    : plan.name);
              const planDescription =
                copy.pricing.planDescriptions[
                  plan.id as keyof typeof copy.pricing.planDescriptions
                ] ??
                (language === "fa"
                  ? copy.pricing.fallbackPlanDescription
                  : plan.description || copy.pricing.fallbackPlanDescription);
              const durationDays = plan.durationDays.toLocaleString(
                language === "fa" ? "fa-IR" : "en-US"
              );

              return (
                <article
                  key={plan.id}
                  className={`relative flex min-h-[510px] flex-col overflow-hidden rounded-2xl border p-6 shadow-[0_26px_80px_rgba(15,23,42,0.12)] transition duration-300 hover:-translate-y-1 ${
                    highlighted
                      ? "border-blue-300 bg-white ring-4 ring-blue-100/80"
                      : "border-slate-200 bg-white/92"
                  }`}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-violet-500" />
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          highlighted
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {highlighted
                          ? copy.pricing.mostActive
                          : copy.pricing.dashboardPlan}
                      </span>
                      <h3 className="mt-5 text-2xl font-bold tracking-normal text-slate-950">
                        {planName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                      {durationDays} {copy.pricing.days}
                    </span>
                  </div>

                  <div className="mt-7 rounded-xl border border-slate-200 bg-slate-50/85 p-5">
                    <div className="flex flex-wrap items-end gap-2">
                      <span className="text-5xl font-black tracking-normal text-slate-950">
                        {formatPlanPrice(plan.priceUSDT)}
                      </span>
                      <span className="pb-2 text-sm font-bold text-slate-500">
                        {copy.pricing.usdtForDays.replace(
                          "{days}",
                          durationDays
                        )}
                      </span>
                    </div>
                    <p className="mt-5 min-h-14 text-sm font-medium leading-7 text-slate-500">
                      {planDescription}
                    </p>
                  </div>

                  <div className="mt-7 grid gap-3">
                    {features.map((feature) => (
                      <div key={feature} className="flex items-start gap-3">
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            highlighted ? "text-blue-600" : "text-emerald-500"
                          }`}
                        />
                        <span className="text-sm font-semibold leading-6 text-slate-700">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    className={`mt-auto h-12 rounded-lg text-sm font-bold ${
                      highlighted
                        ? "bg-blue-600 text-white hover:bg-blue-500"
                        : "border border-slate-200 bg-slate-950 text-white hover:bg-slate-800"
                    }`}
                  >
                    <Link href="/premium" className="flex items-center justify-center gap-2">
                      {copy.pricing.upgrade}
                      <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
                    </Link>
                  </Button>
                </article>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/80 px-5 py-4 text-sm font-medium leading-7 text-blue-900">
            {plansLoading
              ? copy.pricing.loading
              : copy.pricing.loaded}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section
        ref={faqSectionRef}
        id="faq"
        dir={dir}
        className={`relative isolate overflow-hidden border-y border-slate-200/80 bg-[#f7f9fc] py-20 ${textAlignClass} text-slate-950 lg:py-28`}
      >
        <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_8%_12%,rgba(59,130,246,0.15),transparent_28%),radial-gradient(circle_at_92%_20%,rgba(217,70,239,0.12),transparent_27%),radial-gradient(circle_at_52%_92%,rgba(20,184,166,0.10),transparent_30%),linear-gradient(180deg,#ffffff_0%,#f6f8ff_48%,#ffffff_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-35 [background-image:radial-gradient(rgba(100,116,139,0.35)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_92%)]" />

        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full lg:block"
          viewBox="0 0 1440 1040"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="faq-circuit-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b82f6" />
              <stop offset="0.5" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#d946ef" />
            </linearGradient>
            <filter id="faq-circuit-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path d="M0 146 H170 Q204 146 204 180 V286 Q204 320 238 320 H314" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="5 10" />
          <path d="M1440 186 H1282 Q1248 186 1248 220 V356 Q1248 390 1214 390 H1148" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="5 10" />
          <path d="M0 836 H126 Q160 836 160 802 V714 Q160 680 194 680 H296" fill="none" stroke="#d8b4fe" strokeWidth="1.2" strokeDasharray="5 10" />
          <path d="M1440 806 H1310 Q1276 806 1276 772 V690 Q1276 656 1242 656 H1152" fill="none" stroke="#bfdbfe" strokeWidth="1.2" strokeDasharray="5 10" />
          <path
            d="M18 146 H170 Q204 146 204 180 V286 Q204 320 238 320 H314"
            fill="none"
            stroke="url(#faq-circuit-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - Math.min(1, faqScrollProgress * 2.1),
              filter: "url(#faq-circuit-glow)",
            }}
          />
          <path
            d="M1422 186 H1282 Q1248 186 1248 220 V356 Q1248 390 1214 390 H1148"
            fill="none"
            stroke="url(#faq-circuit-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - Math.min(1, Math.max(0, faqScrollProgress * 2.1 - 0.18)),
              filter: "url(#faq-circuit-glow)",
            }}
          />
          <path
            d="M18 836 H126 Q160 836 160 802 V714 Q160 680 194 680 H296"
            fill="none"
            stroke="url(#faq-circuit-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - Math.min(1, Math.max(0, faqScrollProgress * 2.1 - 0.54)),
              filter: "url(#faq-circuit-glow)",
            }}
          />
          <path
            d="M1422 806 H1310 Q1276 806 1276 772 V690 Q1276 656 1242 656 H1152"
            fill="none"
            stroke="url(#faq-circuit-gradient)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="1"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - Math.min(1, Math.max(0, faqScrollProgress * 2.1 - 0.72)),
              filter: "url(#faq-circuit-glow)",
            }}
          />
        </svg>

        <div className="mx-auto w-full max-w-[1120px] px-5 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 shadow-[0_12px_30px_rgba(109,40,217,0.10)] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {copy.faq.eyebrow}
            </div>
            <h2 className="mt-5 text-3xl font-black leading-tight tracking-[-0.03em] text-[#071f41] sm:text-4xl lg:text-[3.15rem]">
              {copy.faq.title}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
              {copy.faq.description}
            </p>
          </div>

          <div className="relative mt-12 lg:mt-16">
            <div className={`pointer-events-none absolute bottom-7 top-7 hidden w-px bg-slate-200 md:block ${isRtl ? "right-[27px]" : "left-[27px]"}`}>
              <span
                className="absolute inset-x-[-1px] top-0 origin-top rounded-full bg-gradient-to-b from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_16px_rgba(124,58,237,0.42)]"
                style={{ height: `${Math.min(100, faqScrollProgress * 145)}%` }}
              />
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
              <div key={item.question} className="relative md:ps-[76px]">
                <span className={`absolute top-7 hidden h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_0_5px_rgba(139,92,246,0.10),0_0_18px_rgba(99,102,241,0.40)] md:block ${isRtl ? "right-[22px]" : "left-[22px]"}`} />
              <details
                className={`group overflow-hidden rounded-2xl border border-slate-200/90 bg-white/90 shadow-[0_14px_42px_rgba(15,23,42,0.06)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-[0_20px_52px_rgba(79,70,229,0.10)] ${item.openClass}`}
              >
                <summary className="flex min-h-[84px] cursor-pointer list-none items-center gap-4 px-5 py-4 marker:hidden sm:px-6">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${item.iconClass}`}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`mb-1 inline-flex rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] ${item.tagClass}`}>
                      {String(index + 1).padStart(2, "0")} · {item.tag}
                    </span>
                    <span className={`block ${textAlignClass} text-[0.98rem] font-extrabold leading-7 text-[#001b3d] sm:text-base`}>
                      {item.question}
                    </span>
                  </span>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-violet-500 transition-transform duration-300 group-open:rotate-180"
                    strokeWidth={2.2}
                  />
                </summary>

                <div className="px-5 pb-6 sm:px-6">
                  <p className={`border-t border-slate-100 pt-4 ${textAlignClass} text-sm font-medium leading-8 text-slate-600 sm:ps-[60px]`}>
                    {item.answer}
                  </p>
                </div>
              </details>
              </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
