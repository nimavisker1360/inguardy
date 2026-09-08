"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  FileText,
  GraduationCap,
  LineChart,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

interface NewsItem {
  id: string;
  title: string;
  description: string;
  source: string;
  publishTime: string;
  url: string;
  imageUrl?: string | null;
}

type FeatureCard = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  action: string;
  icon: LucideIcon;
  accent: string;
  stats: readonly string[];
};

const blogCopy = {
  en: {
    eyebrow: "Tradivix Resources",
    title: "Blog & Trading Education",
    subtitle:
      "Read practical market notes, improve your trading process, and follow structured lessons for forex and gold traders.",
    latestTitle: "Latest Market Notes",
    latestSubtitle:
      "Fresh market context and educational reads collected in one clean resource hub.",
    loading: "Loading latest posts...",
    cards: [
      {
        title: "Blog",
        eyebrow: "Market insights",
        description:
          "Practical posts about trading journals, discipline, risk, analytics, and market context.",
        href: "#latest-posts",
        action: "Read the blog",
        icon: FileText,
        accent: "from-blue-600 to-cyan-500",
        stats: ["Market notes", "Risk ideas", "Journal tips"],
      },
      {
        title: "Education",
        eyebrow: "Trading lessons",
        description:
          "Step-by-step guidance for MT5 sync, journaling workflows, trade review, and better execution habits.",
        href: "/dashboard",
        action: "Start learning",
        icon: GraduationCap,
        accent: "from-violet-600 to-fuchsia-500",
        stats: ["Dashboard guide", "MT5 setup", "Trade review"],
      },
    ],
  },
  fa: {
    eyebrow: "منابع تریدیویکس",
    title: "بلاگ و آموزش معامله‌گری",
    subtitle:
      "مطالب کاربردی بازار، نکات مدیریت ریسک و آموزش‌های مرحله‌به‌مرحله برای معامله‌گران فارکس و طلا.",
    latestTitle: "آخرین مطالب بازار",
    latestSubtitle:
      "یادداشت‌های تازه و محتوای آموزشی در یک بخش مرتب و خوانا.",
    loading: "در حال بارگذاری مطالب...",
    cards: [
      {
        title: "بلاگ",
        eyebrow: "تحلیل و نکته‌های بازار",
        description:
          "مطالب کاربردی درباره ژورنال معاملاتی، نظم، مدیریت ریسک، تحلیل عملکرد و شرایط بازار.",
        href: "#latest-posts",
        action: "مشاهده بلاگ",
        icon: FileText,
        accent: "from-blue-600 to-cyan-500",
        stats: ["اخبار بازار", "مدیریت ریسک", "نکات ژورنال"],
      },
      {
        title: "آموزش",
        eyebrow: "مسیر یادگیری",
        description:
          "راهنمای مرحله‌به‌مرحله برای اتصال MT5، ثبت ژورنال، مرور معامله و ساخت عادت‌های بهتر.",
        href: "/dashboard",
        action: "شروع آموزش",
        icon: GraduationCap,
        accent: "from-violet-600 to-fuchsia-500",
        stats: ["راهنمای داشبورد", "اتصال MT5", "مرور معامله"],
      },
    ],
  },
} as const;

export default function BlogPage() {
  const { t, language } = useLanguage();
  const isRtl = language === "fa";
  const copy = blogCopy[language];
  const translate = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/news-api");

        if (!response.ok) {
          throw new Error("Failed to fetch news data");
        }

        const data = await response.json();
        setNews(Array.isArray(data.news) ? data.news : []);
      } catch {
        setError("blogPage.loadError");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return translate("blogPage.recent", "Recent");
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategory = (item: NewsItem) => {
    const text = `${item.title} ${item.description}`.toLowerCase();

    if (text.includes("gold") || text.includes("xau")) {
      return translate("blogPage.goldTrading", "Gold Trading");
    }

    if (text.includes("risk") || text.includes("volatility")) {
      return translate("blogPage.riskManagement", "Risk Management");
    }

    if (text.includes("education") || text.includes("learn")) {
      return translate("blogPage.education", "Education");
    }

    return translate("blogPage.marketNews", "Market News");
  };

  return (
    <main
      dir="ltr"
      className={`relative isolate min-h-screen max-w-full overflow-hidden bg-white text-slate-950 [overflow-wrap:anywhere] ${
        isRtl ? "landing-fa-font text-right" : "landing-en-font text-left"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_44%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_16%,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_78%_12%,rgba(168,85,247,0.14),transparent_30%),radial-gradient(circle_at_88%_70%,rgba(16,185,129,0.11),transparent_28%),radial-gradient(circle_at_18%_86%,rgba(244,114,182,0.09),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:22px_22px]" />

      <section className="mx-auto w-full max-w-[1320px] overflow-hidden px-5 pb-14 pt-14 sm:px-8 lg:px-12 lg:pb-16 lg:pt-[4.5rem]">
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="mx-auto max-w-3xl text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-[0_12px_30px_rgba(37,99,235,0.09)] backdrop-blur">
            <Sparkles className="h-4 w-4" />
            {copy.eyebrow}
          </div>

          <h1 className="mx-auto max-w-[22rem] break-words text-[2.15rem] font-semibold leading-tight tracking-normal text-[#071034] sm:max-w-3xl sm:text-[3.35rem] sm:leading-[1.08]">
            {copy.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {copy.subtitle}
          </p>
        </div>

        <div className="mt-12 grid min-w-0 gap-6 lg:grid-cols-2">
          {copy.cards.map((card, index) => (
            <ResourceCard
              key={card.title}
              card={card}
              index={index}
              isRtl={isRtl}
            />
          ))}
        </div>
      </section>

      <section
        id="latest-posts"
        className="relative overflow-hidden border-t border-slate-200/70 bg-[#f8fbff] py-14 lg:py-16"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_58%,#ffffff_100%)]" />
        <div className="relative mx-auto w-full max-w-[1320px] overflow-hidden px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div
              dir={isRtl ? "rtl" : "ltr"}
              className={`min-w-0 ${isRtl ? "md:text-right" : "md:text-left"}`}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 shadow-sm">
                <LineChart className="h-4 w-4" />
                {translate("blogPage.financialNews", "Financial News")}
              </div>
              <h2 className="mt-5 break-words text-3xl font-bold tracking-normal text-slate-950 sm:text-4xl">
                {copy.latestTitle}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
                {copy.latestSubtitle}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 text-xs font-bold text-slate-700 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                {translate("blogPage.riskManagement", "Risk Management")}
              </span>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 text-xs font-bold text-slate-700 shadow-sm">
                <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                {translate("blogPage.education", "Education")}
              </span>
            </div>
          </div>

        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white/90 shadow-[0_22px_65px_rgba(15,23,42,0.07)]">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-blue-500" />
            <p className="text-sm font-semibold text-slate-500">
              {copy.loading}
            </p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-bold text-red-700 shadow-sm">
            {translate(error, "Failed to fetch news. Please try again later.")}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {news.slice(0, 9).map((item) => (
              <article
                key={item.id}
                className="group flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_65px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_30px_80px_rgba(37,99,235,0.13)]"
              >
                <Link href={`/blog/${item.id}`} className="block">
                  <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                    <NewsImage
                      src={item.imageUrl}
                      alt={item.title}
                      fallbackLabel={translate("blogPage.financialNews", "Financial News")}
                    />
                    <span
                      className={`absolute top-4 inline-flex items-center gap-1 rounded-full border border-white/30 bg-blue-600/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur ${
                        isRtl ? "right-4" : "left-4"
                      }`}
                    >
                      <Tag className="h-3 w-3" />
                      {getCategory(item)}
                    </span>
                  </div>
                </Link>

                <div className="flex flex-1 flex-col p-6">
                  <div className="mb-3 flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                    <Calendar size={14} />
                    <span>{formatDate(item.publishTime)}</span>
                    <span>/</span>
                    <User size={14} />
                    <span className="truncate">{item.source}</span>
                  </div>

                  <Link href={`/blog/${item.id}`} className="block">
                    <h3 className="mb-3 line-clamp-2 text-xl font-bold leading-8 tracking-normal text-slate-950 transition-colors group-hover:text-blue-700">
                      {item.title}
                    </h3>
                  </Link>
                  <p className="mb-5 line-clamp-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>

                  <Link
                    href={`/blog/${item.id}`}
                    className="mt-auto inline-flex items-center gap-2 text-sm font-bold text-blue-600 transition-colors hover:text-blue-800"
                  >
                    {translate("blogPage.readMore", "Read more")}
                    <ArrowRight
                      size={16}
                      className={isRtl ? "rotate-180" : ""}
                    />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
        </div>
      </section>
    </main>
  );
}

function ResourceCard({
  card,
  index,
  isRtl,
}: {
  card: FeatureCard;
  index: number;
  isRtl: boolean;
}) {
  const Icon = card.icon;

  return (
    <Link
      href={card.href}
      dir={isRtl ? "rtl" : "ltr"}
      className="group relative block min-h-[360px] w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_26px_80px_rgba(15,23,42,0.10)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_34px_95px_rgba(37,99,235,0.16)] sm:p-8"
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${card.accent}`}
      />
      <div
        className={`pointer-events-none absolute -top-24 h-72 w-72 rounded-full bg-gradient-to-br ${card.accent} opacity-10 blur-3xl ${
          isRtl ? "-left-24" : "-right-24"
        }`}
      />
      <div className="relative flex h-full min-w-0 flex-col">
        <div
          className={`flex items-start justify-between gap-5 ${
            isRtl ? "flex-row-reverse" : ""
          }`}
        >
          <span
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${card.accent} text-white shadow-[0_16px_32px_rgba(59,130,246,0.24)]`}
          >
            <Icon className="h-6 w-6" />
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
            0{index + 1}
          </span>
        </div>

        <div className="mt-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
            {card.eyebrow}
          </p>
          <h2 className="mt-2 break-words text-3xl font-bold tracking-normal text-slate-950">
            {card.title}
          </h2>
          <p className="mt-4 break-words text-sm leading-7 text-slate-600">
            {card.description}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {card.stats.map((item) => (
            <span
              key={item}
              className="inline-flex min-h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
            >
              {item}
            </span>
          ))}
        </div>

        <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold text-blue-600 transition-colors group-hover:text-blue-800">
          {card.action}
          {card.href === "/dashboard" ? (
            <PlayCircle className="h-4 w-4" />
          ) : (
            <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          )}
        </span>
      </div>
    </Link>
  );
}

function NewsImage({
  src,
  alt,
  fallbackLabel,
}: {
  src?: string | null;
  alt: string;
  fallbackLabel: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.22),transparent_35%),linear-gradient(135deg,#eff6ff,#f8fafc_55%,#eef2ff)]">
        <span className="rounded-full border border-blue-200 bg-white/80 px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm backdrop-blur">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="absolute h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
