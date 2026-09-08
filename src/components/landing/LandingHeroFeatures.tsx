import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { useLanguage, type Language } from "@/lib/language-context";

const featureCopy = {
  en: {
    eyebrow: "Automated & Smart Trading Journal",
    titleLine1: "Powerful Trade Journal",
    titleLine2: "for Professional Traders",
    description:
      "Automatically log trades through MT5 sync, use advanced AI analysis, and manage reports and professional checklists in one place to improve your trading performance.",
    cta: "Start Free",
    trial: "10-day free trial",
    noCard: "No credit card required",
    trustItems: [
      "Automatic MT5 Sync",
      "AI-Powered Analysis",
      "Secure & Private",
      "Fast & Automated",
    ],
    sectionTitleHighlight: "Key",
    sectionTitleRest: "Dashboard Features",
    sectionDescription:
      "Everything you need to review, understand, and improve your trading.",
    features: [
      {
        title: "Automated Journaling",
        description:
          "Easy methods like broker sync, file upload, or manual trade adds. Everything is automated.",
        metric: "Auto sync",
      },
      {
        title: "Daily Journal",
        description:
          "Stay on top of your trading plan with structured notes, routines, and daily discipline.",
        metric: "Daily routine",
      },
      {
        title: "Trading Calendar",
        description:
          "Review trading days, track daily performance, and spot patterns across your month.",
        metric: "Calendar view",
      },
    ],
    riskTitle: "Risk Warning:",
    riskText:
      "Trading forex, gold, indices, crypto, and CFDs involves financial risk. This dashboard is designed for trade journaling, analysis, and performance improvement and does not guarantee profit. Final trade decisions and position sizing remain the user's responsibility.",
    imageAltSuffix: "dashboard preview",
  },
  fa: {
    eyebrow: "ژورنال معاملاتی خودکار و هوشمند",
    titleLine1: "ژورنال معاملاتی قدرتمند",
    titleLine2: "برای معامله‌گران حرفه‌ای",
    description:
      "معاملات را با همگام‌سازی MT5 خودکار ثبت کنید، از تحلیل پیشرفته AI استفاده کنید و گزارش‌ها و چک‌لیست‌های حرفه‌ای را در یک جا مدیریت کنید تا عملکرد معاملاتی خود را بهتر کنید.",
    cta: "شروع رایگان",
    trial: "آزمایش رایگان ۱۰ روزه",
    noCard: "بدون نیاز به کارت اعتباری",
    trustItems: [
      "همگام‌سازی خودکار MT5",
      "تحلیل با هوش مصنوعی",
      "امن و خصوصی",
      "سریع و خودکار",
    ],
    sectionTitleHighlight: "قابلیت‌های",
    sectionTitleRest: "کلیدی داشبورد",
    sectionDescription:
      "هر چیزی که برای مرور، فهمیدن و بهبود معاملات نیاز دارید.",
    features: [
      {
        title: "ژورنال‌نویسی خودکار",
        description:
          "روش‌های ساده مثل همگام‌سازی بروکر، آپلود فایل یا افزودن دستی معامله. همه چیز منظم و خودکار است.",
        metric: "همگام‌سازی",
      },
      {
        title: "ژورنال روزانه",
        description:
          "با یادداشت‌های ساختاریافته، روتین‌ها و نظم روزانه روی برنامه معاملاتی خود مسلط بمانید.",
        metric: "روتین روزانه",
      },
      {
        title: "تقویم معاملاتی",
        description:
          "روزهای معاملاتی را مرور کنید، عملکرد روزانه را ببینید و الگوهای ماهانه را پیدا کنید.",
        metric: "نمای تقویم",
      },
    ],
    riskTitle: "هشدار ریسک:",
    riskText:
      "معامله در فارکس، طلا، شاخص‌ها، کریپتو و CFD با ریسک مالی همراه است. این داشبورد برای ژورنال‌نویسی، تحلیل و بهبود عملکرد طراحی شده و سود را تضمین نمی‌کند. تصمیم نهایی معامله و حجم پوزیشن بر عهده کاربر است.",
    imageAltSuffix: "پیش‌نمایش داشبورد",
  },
} as const satisfies Record<Language, unknown>;

const trustIcons = [
  { icon: RefreshCw, color: "text-violet-600", bg: "bg-violet-50" },
  { icon: BrainCircuit, color: "text-rose-500", bg: "bg-rose-50" },
  { icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  { icon: Zap, color: "text-blue-600", bg: "bg-blue-50" },
];

const featureVisuals = [
  {
    image: "/images/background/AITradeRevıew.png",
    position: "center center",
  },
  {
    image: "/images/background/daily_journal.png",
    position: "center center",
  },
  {
    image: "/images/background/checklist.png",
    position: "center center",
  },
];

export function LandingHeroFeatures() {
  const { language } = useLanguage();
  const copy = featureCopy[language] as (typeof featureCopy)["en"];
  const isRtl = language === "fa";
  const dir = isRtl ? "rtl" : "ltr";
  const textAlignClass = isRtl ? "text-right" : "text-left";
  const arrowClass = isRtl ? "rotate-180" : "";

  return (
    <section
      dir={dir}
      className={`relative isolate overflow-hidden bg-white pb-20 pt-20 font-sans text-[#0f172a] sm:pt-24 lg:pb-24 lg:pt-28 ${
        isRtl ? "landing-fa-font" : "landing-en-font"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-52 -top-64 h-[640px] w-[640px] rounded-full bg-violet-200/35 blur-[110px]" />
        <div className="absolute -bottom-72 -left-56 h-[640px] w-[640px] rounded-full bg-fuchsia-100/45 blur-[120px]" />
        <div className="absolute right-[-80px] top-[-160px] h-[420px] w-[420px] rounded-full border border-violet-200/55" />
        <div className="absolute right-[-22px] top-[-118px] h-[330px] w-[330px] rounded-full border border-violet-100/80" />
      </div>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-[5%] top-16 -z-[1] hidden select-none text-[15rem] font-semibold leading-none text-violet-100/65 lg:block"
      >
        1
      </span>

      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="mx-auto max-w-[1020px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 shadow-[0_6px_24px_rgba(109,40,217,0.08)] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.eyebrow}
          </div>

          <h1
            className={`mt-7 font-sans font-semibold tracking-normal ${
              isRtl
                ? "text-[2rem] leading-[1.34] sm:text-[3rem] lg:text-[3.65rem]"
                : "text-[2.2rem] leading-[1.08] sm:text-[3.35rem] lg:text-[4.35rem]"
            }`}
          >
            <span className="block">{copy.titleLine1}</span>
            <span className="mt-2 block bg-gradient-to-r from-[#6d28d9] via-[#8b2ce3] to-[#d946ef] bg-clip-text text-transparent">
              {copy.titleLine2}
            </span>
          </h1>

          <p className="mx-auto mt-7 max-w-[760px] text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
            {copy.description}
          </p>

          <Link
            href="/login?redirect=%2Fdashboard"
            className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#d946ef] px-8 text-base font-semibold text-white shadow-[0_16px_35px_rgba(168,85,247,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(168,85,247,0.34)]"
          >
            {copy.cta} <ArrowRight className={`h-4 w-4 ${arrowClass}`} />
          </Link>
          <p className="mt-3 text-xs font-medium text-slate-400">
            {copy.trial} <span className="mx-1 text-violet-300">-</span>{" "}
            {copy.noCard}
          </p>
        </header>

        <div className="mx-auto mt-12 grid max-w-[1240px] overflow-hidden rounded-2xl border border-violet-100 bg-white/90 shadow-[0_18px_55px_rgba(76,29,149,0.09)] backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
          {copy.trustItems.map((label, index) => {
            const { icon: Icon, color, bg } = trustIcons[index];

            return (
              <div
                key={label}
                className={`flex min-h-24 items-center justify-center gap-3 px-5 py-5 ${
                  index ? "border-t border-violet-100 sm:border-l sm:border-t-0" : ""
                } ${index === 2 ? "sm:border-l-0 lg:border-l" : ""}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} ${color}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-20 text-center lg:mt-24">
          <h2 className="text-3xl font-bold tracking-normal sm:text-4xl lg:text-[2.75rem]">
            <span className="bg-gradient-to-r from-[#6d28d9] to-[#d946ef] bg-clip-text text-transparent">
              {copy.sectionTitleHighlight}
            </span>{" "}
            {copy.sectionTitleRest}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            {copy.sectionDescription}
          </p>
        </div>

        <div className="mt-10 grid gap-7 lg:grid-cols-3">
          {copy.features.map(({ title, description, metric }, index) => {
            const { image, position } = featureVisuals[index];

            return (
              <article
                key={title}
                className={`group overflow-hidden rounded-2xl border border-violet-100 bg-white ${textAlignClass} shadow-[0_22px_60px_rgba(46,31,107,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(76,29,149,0.18)]`}
              >
                <div className="relative aspect-square overflow-hidden bg-[#f4f0ff]">
                  <Image
                    src={image}
                    alt={`${title} ${copy.imageAltSuffix}`}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-contain p-3 transition duration-700 group-hover:scale-[1.015] sm:p-4"
                    style={{ objectPosition: position }}
                  />
                  <div className="absolute bottom-5 left-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/55 bg-white/75 text-sm font-extrabold text-slate-950 shadow-[0_10px_26px_rgba(15,23,42,0.18)] backdrop-blur-md">
                    0{index + 1}
                  </div>
                </div>

                <div className="border-t border-violet-100 bg-[linear-gradient(180deg,#ffffff_0%,#fbfaff_100%)] p-6 sm:p-7">
                  <div className="mb-4 inline-flex h-8 items-center rounded-full border border-violet-100 bg-violet-50 px-3 text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                    {metric}
                  </div>
                  <h3 className="text-2xl font-bold leading-tight tracking-normal text-slate-950 sm:text-[1.7rem]">
                    {title}
                  </h3>
                  <p className="mt-4 text-base font-medium leading-7 text-slate-600">
                    {description}
                  </p>

                  <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-violet-100">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#6d28d9] to-[#d946ef]" />
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div
          className={`mt-10 flex items-start gap-4 rounded-2xl border border-violet-200 bg-violet-50/65 p-5 ${textAlignClass} sm:p-6`}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-slate-600">
            <strong className="font-semibold text-slate-800">
              {copy.riskTitle}
            </strong>{" "}
            {copy.riskText}
          </p>
        </div>
      </div>
    </section>
  );
}
