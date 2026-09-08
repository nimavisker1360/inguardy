"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { TradingViewTicker } from "@/components/TradingViewTicker";
import { LandingHeroFeatures } from "@/components/landing/LandingHeroFeatures";
import { useLanguage, type Language } from "@/lib/language-context";
import {
  ArrowRight,
  ClipboardCheck,
  ShieldCheck,
  BarChart3,
  FileCheck2,
  PlayCircle,
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
        "Tradivix automatically syncs your MT5 trades, organizes your trading journal, reviews your setups, tracks mistakes, and helps you improve discipline with AI-powered insights.",
      primaryCta: "Get Started",
      toolsLabel: "Everything in one place - 7 tools",
      imageAlt: "Tradivix trading journal dashboard",
    },
    heroTools: [
      "MT5 Auto Sync",
      "AI Trade Review",
      "Trading Calendar",
      "Playbooks",
      "Checklists",
      "Analytics & Reports",
      "Latest Signals",
    ],
    signal: {
      tools: [
        "Live Signals",
        "Gold Signals",
        "Market Replay",
        "AI Analysis",
        "Telegram Alerts",
        "Signal Archive",
      ],
      eyebrow: "Signal Dashboard",
      title: "Every signal, clear before entry.",
      description:
        "Follow structured trade ideas with direction, entry, stop loss, take profit, status, and closing result visible in one live dashboard.",
      bullets: [
        "Live XAU/USD and forex trade ideas",
        "Entry, stop loss, and take profit levels",
        "Telegram alerts with compact trade details",
        "Closed results tracked with full transparency",
      ],
      imageAlt: "Signal dashboard preview",
    },
    agents: {
      eyebrow: "AI Agents",
      titleHighlight: "Smarter",
      titleRest: "Trading Desk",
      description:
        "Specialized dashboard agents watch the parts of trading that matter most: signals, risk, review, and repeat mistakes.",
      ready: "Agent ready",
      cards: [
        {
          title: "Reads the setup before you enter.",
          eyebrow: "Signal Agent",
          description:
            "Watches live forex and gold ideas, then keeps direction, entry, stop loss, take profit, and signal status easy to scan.",
          tag: "Signals",
          messages: [
            "XAU/USD setup is active with entry, SL, and TP visible.",
            "The signal plan is clear before execution.",
          ],
          action: "Open the signal plan.",
        },
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
      title: "Frequently Asked Questions",
      items: [
        {
          question: "What can I manage inside the dashboard?",
          answer:
            "You can track trades, accounts, daily journal notes, screenshots, playbooks, checklists, analytics, reports, and latest signals from one clean workspace.",
          tag: "Dashboard",
        },
        {
          question: "Does Tradivix sync MT5 trades automatically?",
          answer:
            "Yes. The MT5 journal recorder can send your closed trades into the dashboard so entries, exits, symbols, account history, and screenshots stay organized without manual typing.",
          tag: "MT5 sync",
        },
        {
          question: "What does the AI trade review check?",
          answer:
            "AI review looks at the trade context, setup notes, psychology, exit reason, discipline, and repeated mistakes, then gives practical feedback you can use before the next session.",
          tag: "AI review",
        },
        {
          question: "What is included in the free plan?",
          answer:
            "The free plan is built for testing the workflow with limited journal capacity: manual trades, screenshots, one playbook, one checklist, and basic dashboard access.",
          tag: "Free plan",
        },
        {
          question: "What do I unlock with Pro Monthly?",
          answer:
            "Pro unlocks unlimited trades and screenshots, unlimited playbooks and checklists, AI trade review, advanced analytics, exports, and the full monthly dashboard workflow.",
          tag: "Pro access",
        },
        {
          question: "Are Telegram signals connected to the dashboard?",
          answer:
            "Signals are shared with clear entry, stop loss, take profit, status, and closing result tracking. The dashboard helps you review the structure instead of chasing scattered messages.",
          tag: "Signals",
        },
        {
          question: "Do you guarantee profit from signals or AI feedback?",
          answer:
            "No. Tradivix is built for structure, tracking, and decision support. Trading always carries risk, so every trader should use personal risk management and position sizing.",
          tag: "Risk",
        },
        {
          question: "Can I export my journal and reports?",
          answer:
            "Yes. Pro users can export reports and review performance history, which is useful for funded accounts, monthly reviews, and keeping a clean record of progress.",
          tag: "Reports",
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
        "Tradivix معاملات MT5 شما را خودکار همگام‌سازی می‌کند، ژورنال معاملاتی را مرتب نگه می‌دارد، ستاپ‌ها را بررسی می‌کند، اشتباهات را ردیابی می‌کند و با بینش‌های هوش مصنوعی به تقویت نظم معاملاتی کمک می‌کند.",
      primaryCta: "شروع کنید",
      toolsLabel: "همه چیز در یک جا - ۷ ابزار",
      imageAlt: "داشبورد ژورنال معاملاتی Tradivix",
    },
    heroTools: [
      "همگام‌سازی خودکار MT5",
      "بررسی معامله با AI",
      "تقویم معاملاتی",
      "پلی‌بوک‌ها",
      "چک‌لیست‌ها",
      "تحلیل و گزارش‌ها",
      "آخرین سیگنال‌ها",
    ],
    signal: {
      tools: [
        "سیگنال زنده",
        "سیگنال طلا",
        "بازپخش بازار",
        "تحلیل AI",
        "هشدار تلگرام",
        "آرشیو سیگنال",
      ],
      eyebrow: "داشبورد سیگنال",
      title: "هر سیگنال، قبل از ورود کاملا شفاف.",
      description:
        "ایده‌های معاملاتی ساختاریافته را با جهت، ورود، حد ضرر، حد سود، وضعیت و نتیجه بسته‌شدن در یک داشبورد زنده دنبال کنید.",
      bullets: [
        "ایده‌های معاملاتی زنده برای XAU/USD و فارکس",
        "سطوح ورود، حد ضرر و حد سود",
        "هشدارهای تلگرام با جزئیات فشرده معامله",
        "ردیابی شفاف نتیجه معاملات بسته‌شده",
      ],
      imageAlt: "پیش‌نمایش داشبورد سیگنال",
    },
    agents: {
      eyebrow: "عامل‌های هوش مصنوعی",
      titleHighlight: "میز معاملاتی",
      titleRest: "هوشمندتر",
      description:
        "عامل‌های تخصصی داشبورد بخش‌های مهم معامله‌گری را زیر نظر می‌گیرند: سیگنال، ریسک، مرور معامله و اشتباهات تکراری.",
      ready: "عامل آماده است",
      cards: [
        {
          title: "قبل از ورود، ستاپ را می‌خواند.",
          eyebrow: "عامل سیگنال",
          description:
            "ایده‌های زنده فارکس و طلا را بررسی می‌کند و جهت، ورود، حد ضرر، حد سود و وضعیت سیگنال را خوانا نگه می‌دارد.",
          tag: "سیگنال",
          messages: [
            "ستاپ XAU/USD فعال است و ورود، SL و TP مشخص هستند.",
            "برنامه سیگنال قبل از اجرا واضح است.",
          ],
          action: "برنامه سیگنال را باز کنید.",
        },
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
      title: "سوالات متداول",
      items: [
        {
          question: "داخل داشبورد چه چیزهایی را می‌توانم مدیریت کنم؟",
          answer:
            "می‌توانید معاملات، حساب‌ها، یادداشت‌های روزانه، اسکرین‌شات‌ها، پلی‌بوک‌ها، چک‌لیست‌ها، تحلیل‌ها، گزارش‌ها و آخرین سیگنال‌ها را در یک فضای کاری مرتب دنبال کنید.",
          tag: "داشبورد",
        },
        {
          question: "آیا Tradivix معاملات MT5 را خودکار همگام‌سازی می‌کند؟",
          answer:
            "بله. ضبط‌کننده ژورنال MT5 می‌تواند معاملات بسته‌شده را به داشبورد بفرستد تا ورود، خروج، نماد، تاریخچه حساب و اسکرین‌شات‌ها بدون تایپ دستی مرتب شوند.",
          tag: "همگام‌سازی MT5",
        },
        {
          question: "بررسی معامله با AI چه چیزهایی را بررسی می‌کند؟",
          answer:
            "AI زمینه معامله، یادداشت‌های ستاپ، روان‌شناسی، دلیل خروج، نظم و اشتباهات تکراری را بررسی می‌کند و بازخورد کاربردی برای جلسه بعد می‌دهد.",
          tag: "بررسی AI",
        },
        {
          question: "در پلن رایگان چه چیزی وجود دارد؟",
          answer:
            "پلن رایگان برای تست جریان کاری ساخته شده است: معاملات دستی، اسکرین‌شات، یک پلی‌بوک، یک چک‌لیست و دسترسی پایه به داشبورد.",
          tag: "پلن رایگان",
        },
        {
          question: "با Pro ماهانه چه چیزهایی فعال می‌شود؟",
          answer:
            "Pro معاملات و اسکرین‌شات‌های نامحدود، پلی‌بوک و چک‌لیست نامحدود، بررسی معامله با AI، تحلیل پیشرفته، خروجی گزارش و جریان کامل ماهانه داشبورد را فعال می‌کند.",
          tag: "دسترسی Pro",
        },
        {
          question: "آیا سیگنال‌های تلگرام به داشبورد وصل هستند؟",
          answer:
            "سیگنال‌ها با ورود، حد ضرر، حد سود، وضعیت و نتیجه بسته‌شدن شفاف ارائه می‌شوند. داشبورد کمک می‌کند ساختار را مرور کنید، نه اینکه میان پیام‌های پراکنده دنبال معامله بگردید.",
          tag: "سیگنال‌ها",
        },
        {
          question: "آیا از سیگنال‌ها یا بازخورد AI سود تضمین می‌کنید؟",
          answer:
            "خیر. Tradivix برای ساختار، ردیابی و پشتیبانی تصمیم ساخته شده است. معامله همیشه ریسک دارد و هر معامله‌گر باید مدیریت ریسک و حجم پوزیشن شخصی داشته باشد.",
          tag: "ریسک",
        },
        {
          question: "آیا می‌توانم ژورنال و گزارش‌ها را خروجی بگیرم؟",
          answer:
            "بله. کاربران Pro می‌توانند گزارش‌ها و تاریخچه عملکرد را خروجی بگیرند؛ برای حساب‌های پراپ، مرور ماهانه و نگهداری سابقه تمیز پیشرفت مفید است.",
          tag: "گزارش‌ها",
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
    { icon: BadgeCheck, label: copy.heroTools[6] },
  ];

  const productTools = [
    { icon: FileCheck2, label: copy.signal.tools[0], active: true },
    { icon: BarChart3, label: copy.signal.tools[1] },
    { icon: PlayCircle, label: copy.signal.tools[2] },
    { icon: Sparkles, label: copy.signal.tools[3] },
    { icon: Users, label: copy.signal.tools[4] },
    { icon: ClipboardCheck, label: copy.signal.tools[5] },
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
      icon: BarChart3,
      accent: "from-blue-500 to-cyan-400",
    },
    {
      ...copy.agents.cards[1],
      icon: ShieldCheck,
      accent: "from-violet-500 to-fuchsia-500",
    },
    {
      ...copy.agents.cards[2],
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

  return (
    <div
      className={`flex max-w-full flex-col overflow-x-hidden ${textAlignClass} ${
        isRtl ? "landing-fa-font" : "landing-en-font"
      }`}
      dir={dir}
    >
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
      {/* Features */}
      <section className="relative overflow-hidden bg-white py-16 text-[#10132f]">
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#f8f6ff] to-white" />
        <div className="container relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[linear-gradient(135deg,#ffffff_0%,#fbfbff_58%,#eeeaff_100%)] shadow-[0_30px_90px_rgba(79,70,229,0.16)]">
            <div className="border-b border-violet-100/80 bg-white/70 px-5 py-5 backdrop-blur sm:px-8">
              <div className="flex flex-wrap justify-center gap-2.5">
                {productTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <button
                      key={tool.label}
                      type="button"
                      className={`inline-flex h-12 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-sm transition-colors ${
                        tool.active
                          ? "border-violet-300 bg-white text-slate-950 shadow-[0_10px_24px_rgba(99,102,241,0.14)]"
                          : "border-slate-200 bg-white/80 text-slate-700 hover:border-violet-200"
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          tool.active
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      {tool.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[0.8fr_1.35fr] lg:items-center lg:p-12">
              <div className={`max-w-xl ${textAlignClass}`}>
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-violet-500">
                  {copy.signal.eyebrow}
                </div>
                <h2 className="mt-5 max-w-md text-3xl font-extrabold leading-tight text-[#080b29] sm:text-4xl">
                  {copy.signal.title}
                </h2>
                <p className="mt-6 max-w-lg text-base leading-7 text-slate-500">
                  {copy.signal.description}
                </p>

                <ul className="mt-7 space-y-3 text-sm font-medium text-slate-600">
                  {copy.signal.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-center gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-w-0 overflow-hidden rounded-lg border border-slate-800 bg-[#0f172a] shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
                <Image
                  src="/images/background/signal.png"
                  alt={copy.signal.imageAlt}
                  width={1320}
                  height={780}
                  className="h-auto w-full object-contain"
                  sizes="(min-width: 1024px) 54vw, 100vw"
                />
              </div>
            </div>
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

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
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
        id="faq"
        dir={dir}
        className={`bg-[#f7f9fc] py-16 ${textAlignClass} text-slate-950 lg:py-20`}
      >
        <div className="mx-auto w-full max-w-[900px] px-5 sm:px-8">
          <h2 className="mb-5 text-[1.75rem] font-bold leading-tight tracking-normal text-[#071f41] sm:mb-6 sm:text-[2rem]">
            {copy.faq.title}
          </h2>

          <div className="space-y-3">
            {faqItems.map((item) => (
              <details
                key={item.question}
                className="group rounded-[10px] border border-[#dce5f1] bg-white shadow-none transition-colors duration-200 open:border-[#cfdced] hover:border-[#cdd9ea]"
              >
                <summary className="flex min-h-[64px] cursor-pointer list-none items-center gap-4 px-5 py-4 marker:hidden sm:min-h-[64px]">
                  <span className={`min-w-0 flex-1 ${textAlignClass} text-[0.95rem] font-bold leading-6 text-[#001b3d]`}>
                    {item.question}
                  </span>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 text-[#5b5cf6] transition-transform duration-200 group-open:rotate-180"
                    strokeWidth={2.2}
                  />
                </summary>

                <p className={`border-t border-[#edf2f8] px-5 pb-5 pt-3 ${textAlignClass} text-sm font-normal leading-7 text-slate-600`}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
