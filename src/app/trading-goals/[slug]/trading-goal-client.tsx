"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  ImageIcon,
  ListChecks,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { useLanguage } from "@/lib/language-context";
import type { TradingGoal } from "@/lib/trading-goals";

type LocalizedGoal = {
  title: string;
  shortTitle: string;
  eyebrow: string;
  summary: string;
  imageAlt?: string;
  metrics: TradingGoal["metrics"];
  pillars: TradingGoal["pillars"];
  workflow: string[];
  checklist: string[];
  outcome: string;
};

const pageCopy = {
  en: {
    back: "Back to home",
    startDashboard: "Start in Dashboard",
    viewPlans: "View Plans",
    practicalEyebrow: "Practical focus",
    practicalTitle: "What matters on this page.",
    practicalDescription:
      "Each point is written for traders who want a usable process, not generic feature descriptions.",
    workflowEyebrow: "Workflow",
    workflowTitle: "How to use it",
    checklistEyebrow: "Keep in mind",
    checklistTitle: "Smart checklist",
    outcomeEyebrow: "Expected outcome",
    otherEyebrow: "Other goals",
    otherTitle: "Continue exploring",
    imagePlaceholder: "Image placeholder",
    imagePlaceholderDescription:
      "Add a prop firm dashboard or challenge rules preview here when the final artwork is ready.",
  },
  fa: {
    back: "بازگشت به خانه",
    startDashboard: "شروع از داشبورد",
    viewPlans: "مشاهده پلن‌ها",
    practicalEyebrow: "تمرکز کاربردی",
    practicalTitle: "آنچه در این راهکار مهم است.",
    practicalDescription:
      "هر نکته برای معامله‌گرانی نوشته شده که به یک فرایند قابل اجرا نیاز دارند، نه توضیح کلی درباره قابلیت‌ها.",
    workflowEyebrow: "روند کار",
    workflowTitle: "چطور از آن استفاده کنید",
    checklistEyebrow: "در نظر داشته باشید",
    checklistTitle: "چک‌لیست هوشمند",
    outcomeEyebrow: "نتیجه مورد انتظار",
    otherEyebrow: "راهکارهای دیگر",
    otherTitle: "ادامه بررسی راهکارها",
    imagePlaceholder: "جای تصویر",
    imagePlaceholderDescription:
      "وقتی تصویر نهایی آماده شد، پیش‌نمایش داشبورد پراپ فرم یا قوانین چالش در این بخش قرار می‌گیرد.",
  },
} as const;

const goalTranslations: Record<string, LocalizedGoal> = {
  "automate-my-journal": {
    title: "ژورنال من را خودکار کن",
    shortTitle: "ژورنال خودکار",
    eyebrow: "همگام‌سازی خودکار MT5",
    summary:
      "دیگر تاریخچه معاملاتتان را دستی بازسازی نکنید. ژورنال خودکار، ورودها، خروج‌ها، نمادها، حجم، زمان‌ها، اسکرین‌شات‌ها و اطلاعات حساب را منظم نگه می‌دارد تا مرور شما با داده تمیز شروع شود.",
    imageAlt: "پیش‌نمایش داشبورد ژورنال معاملاتی خودکار",
    metrics: [
      { label: "ورود دستی", value: "کمتر" },
      { label: "تاریخچه معاملات", value: "همگام" },
      { label: "پایه بررسی", value: "تمیز" },
    ],
    pillars: [
      {
        title: "اول واقعیت‌ها را ثبت کن",
        description:
          "کیفیت هر بررسی به داده پشت آن بستگی دارد. همگام‌سازی خودکار موارد اصلی مثل نماد، جهت، زمان باز و بسته شدن، حجم، قیمت، سود و زیان و تاریخچه حساب را حفظ می‌کند.",
      },
      {
        title: "معاملات جامانده را کمتر کن",
        description:
          "ژورنال دستی در روزهای شلوغ معمولاً ناقص می‌شود. همگام شدن معاملات بسته‌شده کمک می‌کند ژورنال حتی در جلسه‌های سریع یا احساسی کامل بماند.",
      },
      {
        title: "اسکرین‌شات‌ها را قابل استفاده کن",
        description:
          "وقتی اسکرین‌شات‌ها به رکورد معامله وصل باشند، می‌توانید چیزی را که هنگام ورود دیده‌اید با اتفاق واقعی بعد از خروج مقایسه کنید.",
      },
    ],
    workflow: [
      "حساب MT5 را از داشبورد وصل کنید.",
      "اجازه دهید معاملات بسته‌شده خودکار وارد ژورنال شوند.",
      "در صورت وجود، اسکرین‌شات ورود و خروج را اضافه کنید.",
      "روز معاملاتی را از یک تاریخچه منظم مرور کنید.",
    ],
    checklist: [
      "بررسی کنید منطقه زمانی حساب و تاریخچه بروکر با یادداشت‌های جلسه شما هماهنگ باشد.",
      "تگ‌های معامله را ساده نگه دارید: ستاپ، اشتباه، وضعیت بازار و سشن.",
      "معاملات واردشده را روزانه مرور کنید تا ایرادهای کوچک داده به آشفتگی ماهانه تبدیل نشوند.",
    ],
    outcome:
      "زمان کمتری صرف تایپ می‌کنید و زمان بیشتری برای بررسی کیفیت اجرا، تصمیم‌های ریسک و ستاپ‌های تکرارشونده دارید.",
  },
  "analyze-my-performance": {
    title: "عملکردم را تحلیل کن",
    shortTitle: "تحلیل عملکرد",
    eyebrow: "تحلیل‌ها و گزارش‌ها",
    summary:
      "تحلیل خوب نشان می‌دهد مزیت واقعی شما از کجا می‌آید. نتیجه‌ها را بر اساس سشن، نماد، ستاپ، ریسک، مدت نگهداری و رفتار بررسی کنید، نه فقط با قضاوت از روی یک معامله.",
    imageAlt: "پیش‌نمایش گزارش تحلیل عملکرد معاملاتی",
    metrics: [
      { label: "الگوها", value: "قابل مشاهده" },
      { label: "گزارش‌ها", value: "کاربردی" },
      { label: "تصمیم‌ها", value: "داده‌محور" },
    ],
    pillars: [
      {
        title: "مزیت را از نویز جدا کن",
        description:
          "یک برد یا باخت به‌تنهایی چیز زیادی نمی‌گوید. نتایج گروه‌بندی‌شده نشان می‌دهند برنامه شما در لندن، نیویورک، طلا، جفت‌ارزها، روزهای خبری یا ستاپ‌های مشخص بهتر عمل می‌کند یا نه.",
      },
      {
        title: "کیفیت ریسک را اندازه بگیر",
        description:
          "میانگین ضرر، میانگین سود، نسبت ریوارد به ریسک، زنجیره افت سرمایه و پایبندی به حد ضرر را دنبال کنید تا بفهمید مشکل از استراتژی است یا اجرا.",
      },
      {
        title: "گزارش‌ها را به قانون تبدیل کن",
        description:
          "هدف نمودارهای زیباتر نیست؛ هدف یک یا دو تغییر مشخص است که بتوانید در جلسه بعد بدون پیچیده کردن پلن اجرا کنید.",
      },
    ],
    workflow: [
      "نتایج را بر اساس نماد، سشن، ستاپ، تگ و بازه زمانی فیلتر کنید.",
      "معاملات برنده، بازنده و سربه‌سر را جداگانه مقایسه کنید.",
      "شرایطی را پیدا کنید که امید ریاضی شما در آن قوی‌تر است.",
      "یک تغییر قانون برای هفته معاملاتی بعد بنویسید.",
    ],
    checklist: [
      "عملکرد را در دسته‌ای از معاملات مرور کنید، نه بعد از هر ضرر احساسی.",
      "هم نتایج مالی و هم امتیازهای فرایندی را دنبال کنید.",
      "قبل از مرور حساب فاندد یا برنامه‌ریزی ماهانه، گزارش خروجی بگیرید.",
    ],
    outcome:
      "می‌بینید کدام رفتارها ارزش حجم بیشتر دارند، کدام ستاپ‌ها به محدودیت نیاز دارند و کدام عادت‌ها آرام‌آرام به حساب آسیب می‌زنند.",
  },
  "improve-my-discipline": {
    title: "نظم معاملاتی‌ام را بهتر کن",
    shortTitle: "نظم معاملاتی",
    eyebrow: "پلی‌بوک‌ها و چک‌لیست‌ها",
    summary:
      "نظم وقتی بهتر می‌شود که قوانین قبل از معامله دیده شوند و بعد از معامله مرور شوند. پلی‌بوک‌ها، چک‌لیست‌ها و یادداشت‌های روزانه، یک پلن مبهم را به روتینی تکرارپذیر تبدیل می‌کنند.",
    imageAlt: "پیش‌نمایش داشبورد چک‌لیست معاملاتی",
    metrics: [
      { label: "قوانین", value: "شفاف" },
      { label: "روتین", value: "روزانه" },
      { label: "اشتباهات", value: "ردیابی‌شده" },
    ],
    pillars: [
      {
        title: "معامله را قبل از ورود تعریف کن",
        description:
          "یک ستاپ باید شرایط، نقطه بی‌اعتبار شدن، ریسک، زمان‌بندی و قوانین مدیریت داشته باشد. اگر این‌ها قبل از ورود روشن نباشند، نظم چیزی برای دنبال کردن ندارد.",
      },
      {
        title: "در نقطه تصمیم از چک‌لیست استفاده کن",
        description:
          "چک‌های کوتاه قبل از معامله، ورودهای عجولانه، دنبال کردن دیرهنگام قیمت، ریسک بیش از حد و معاملات خارج از سشن برنامه‌ریزی‌شده را کاهش می‌دهند.",
      },
      {
        title: "رفتار را بدون هیجان مرور کن",
        description:
          "نظم وقتی سریع‌تر بهتر می‌شود که اشتباه‌ها واضح نام‌گذاری شوند: ورود از ترس جاماندن، جابه‌جایی حد ضرر، خروج زودهنگام، معامله انتقامی، بدون پلن یا نادیده گرفتن ریسک خبر.",
      },
    ],
    workflow: [
      "برای هر ستاپی که واقعاً معامله می‌کنید یک پلی‌بوک بسازید.",
      "یک چک‌لیست کوتاه به ستاپ وصل کنید.",
      "هر معامله بسته‌شده را با چک‌لیست امتیازدهی کنید.",
      "از ژورنال روزانه برای ثبت وضعیت احساسی و نقض قوانین استفاده کنید.",
    ],
    checklist: [
      "چک‌لیست‌ها را آن‌قدر کوتاه نگه دارید که قبل از معامله زنده قابل استفاده باشند.",
      "فقط قوانینی اضافه کنید که رفتار واقعی را تغییر می‌دهند.",
      "اشتباه‌های تکراری را هفتگی مرور کنید و هر بار یک محرک را حذف کنید.",
    ],
    outcome:
      "دیگر فقط به اراده تکیه نمی‌کنید و فرایندی می‌سازید که اشتباه‌های رایج را قبل از هزینه‌ساز شدن تشخیص می‌دهد.",
  },
  "review-trades-with-ai": {
    title: "معاملات را با AI مرور کن",
    shortTitle: "بررسی معامله با AI",
    eyebrow: "بازخورد ساختاریافته",
    summary:
      "بررسی AI هر معامله بسته‌شده را به بازخورد متمرکز درباره کیفیت ستاپ، ریسک، اجرا، روان‌شناسی و قدم بعدی تبدیل می‌کند. این ابزار برای پشتیبانی از مرور شماست، نه جایگزینی قضاوتتان.",
    imageAlt: "پیش‌نمایش داشبورد بررسی معامله با AI",
    metrics: [
      { label: "بازخورد", value: "مشخص" },
      { label: "اشتباهات", value: "نام‌گذاری‌شده" },
      { label: "قدم بعد", value: "روشن" },
    ],
    pillars: [
      {
        title: "کل زمینه معامله را مرور کن",
        description:
          "بازخورد مفید فقط به سود و زیان نیاز ندارد. AI می‌تواند یادداشت‌ها، اسکرین‌شات‌ها، جهت معامله، منطق ورود، دلیل خروج، ریسک و تگ‌های روان‌شناسی را با هم ارزیابی کند.",
      },
      {
        title: "اشتباهات تکراری را پیدا کن",
        description:
          "بزرگ‌ترین بهبود معمولاً از الگوها می‌آید: خروج زودهنگام، ورود دیر، جابه‌جایی حد ضرر، معامله در شرایط ضعیف یا نادیده گرفتن پلی‌بوک.",
      },
      {
        title: "اقدام معامله بعدی را بساز",
        description:
          "مرور باید با یک اصلاح عملی تمام شود؛ مثل صبر برای تایید، کاهش حجم بعد از ضرر یا اجتناب از یک سشن ضعیف.",
      },
    ],
    workflow: [
      "معامله را ببندید و مطمئن شوید داده ژورنال دقیق است.",
      "درباره ستاپ، دلیل ورود، دلیل خروج و احساسات یادداشت اضافه کنید.",
      "بررسی AI را از صفحه جزئیات معامله اجرا کنید.",
      "بازخورد را ذخیره کنید و با معاملات آینده مقایسه کنید.",
    ],
    checklist: [
      "از بازخورد AI به‌عنوان توصیه مالی یا سرویس سیگنال استفاده نکنید.",
      "زمینه کافی بدهید: اسکرین‌شات‌ها و یادداشت‌های صادقانه مهم‌اند.",
      "به دنبال تم‌های تکرارشونده در بازخورد باشید، نه یک نظر تک‌موردی.",
    ],
    outcome:
      "هر معامله بسته‌شده به یک درس عملی تبدیل می‌شود که با حدس و گمان کمتر وارد جلسه بعدی می‌کنید.",
  },
  "track-prop-firm-rules": {
    title: "قوانین پراپ فرم را دنبال کن",
    shortTitle: "قوانین پراپ فرم",
    eyebrow: "اهداف و افت سرمایه",
    summary:
      "معامله در پراپ فرم فقط پیدا کردن ورود خوب نیست. قبل از اینکه حساب در معرض ریسک قرار بگیرد، باید هدف سود، حد ضرر روزانه، حداکثر افت سرمایه، حداقل روزهای معاملاتی و قوانین برداشت را بدانید.",
    imageAlt: "پیش‌نمایش داشبورد قوانین چالش پراپ فرم",
    metrics: [
      { label: "محدودیت‌ها", value: "شفاف" },
      { label: "اهداف", value: "ردیابی‌شده" },
      { label: "ریسک", value: "کنترل‌شده" },
    ],
    pillars: [
      {
        title: "محدودیت‌های سخت را جلوی چشم نگه دار",
        description:
          "حد ضرر روزانه، حداکثر افت سرمایه و قوانین تریلینگ باید قبل از اولین معامله روز بررسی شوند. حتی یک استراتژی سودده هم با نادیده گرفتن قوانین حساب می‌تواند شکست بخورد.",
      },
      {
        title: "بر اساس ریاضی چالش برنامه‌ریزی کن",
        description:
          "هدف سود، حداکثر ضرر، حداقل روزها، قوانین ثبات و محدودیت‌های خبری تعیین می‌کنند چه مقدار ریسک در هر معامله و هر سشن منطقی است.",
      },
      {
        title: "پیشرفت را بدون فشار مرور کن",
        description:
          "ردیاب کمک می‌کند نزدیک هدف، معامله اجباری نگیرید یا بعد از شروع کند، حجم را بیش از حد زیاد نکنید. آگاهی از قوانین از تصمیم‌های احساسی محافظت می‌کند.",
      },
    ],
    workflow: [
      "در داشبورد یک پروفایل حساب پراپ فرم بسازید.",
      "هدف، حد ضرر روزانه، حداکثر افت سرمایه و قوانین فاز را وارد کنید.",
      "قبل از هر سشن، بافر فعلی را بررسی کنید.",
      "از گزارش‌ها برای مرور تصمیم‌های ریسک در طول چالش استفاده کنید.",
    ],
    checklist: [
      "قبل از معامله، آخرین قوانین پراپ فرم را مستقیم از خود شرکت بخوانید.",
      "وقتی بافر حد ضرر روزانه خیلی کم است، معامله جدید باز نکنید.",
      "تغییر قوانین، شرایط برداشت و رویدادهای معاملاتی محدودشده را ثبت کنید.",
    ],
    outcome:
      "می‌توانید طبق پلن معامله کنید و همزمان نسبت به قوانینی که زنده ماندن چالش را تعیین می‌کنند آگاه بمانید.",
  },
};

function localizeGoal(goal: TradingGoal, isFa: boolean): TradingGoal | LocalizedGoal {
  if (!isFa) {
    return goal;
  }

  return goalTranslations[goal.slug] ?? goal;
}

export function TradingGoalClient({
  goal,
  relatedGoals,
}: {
  goal: TradingGoal;
  relatedGoals: TradingGoal[];
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const copy = pageCopy[language];
  const localizedGoal = localizeGoal(goal, isFa);
  const BackIcon = isFa ? ArrowRight : ArrowLeft;
  const ForwardIcon = isFa ? ArrowLeft : ArrowRight;

  return (
    <main
      className={`min-h-screen bg-white text-slate-900 ${
        isFa ? "landing-fa-font text-right" : "landing-en-font text-left"
      }`}
      dir={isFa ? "rtl" : "ltr"}
    >
      <section className="relative isolate overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_54%,#ffffff_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_12%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(59,130,246,0.13),transparent_32%),radial-gradient(circle_at_76%_78%,rgba(217,70,239,0.10),transparent_31%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.2] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-10 sm:px-8 lg:px-12 lg:pb-20 lg:pt-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-700"
          >
            <BackIcon className="h-4 w-4" />
            {copy.back}
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-violet-200 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 shadow-[0_10px_28px_rgba(109,40,217,0.08)] backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {localizedGoal.eyebrow}
              </div>
              <h1 className="mt-6 max-w-3xl text-[2.25rem] font-semibold leading-[1.12] tracking-normal text-[#1e293b] sm:text-[3rem] lg:text-[3.55rem]">
                {localizedGoal.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                {localizedGoal.summary}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?redirect=%2Fdashboard"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-md bg-[#07134a] px-7 text-sm font-bold text-white shadow-[0_16px_34px_rgba(7,19,74,0.22)] transition hover:-translate-y-0.5 hover:bg-[#102064]"
                >
                  {copy.startDashboard} <ForwardIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50"
                >
                  {copy.viewPlans}
                </Link>
              </div>
            </div>

            <HeroVisual goal={goal} localizedGoal={localizedGoal} />
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {localizedGoal.metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-lg border border-slate-200 bg-white/85 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)] backdrop-blur"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {metric.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-[#1f2937]">
                  {metric.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                {copy.practicalEyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-900 sm:text-[2.25rem]">
                {copy.practicalTitle}
              </h2>
            </div>
            <p className="max-w-xl text-sm font-medium leading-7 text-slate-500">
              {copy.practicalDescription}
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {localizedGoal.pillars.map((pillar, index) => (
              <article
                key={pillar.title}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.07)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                  <PillarIcon index={index} />
                </span>
                <h3 className="mt-5 text-xl font-semibold tracking-normal text-[#1f2937]">
                  {pillar.title}
                </h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#f8fbff] py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_86%_72%,rgba(168,85,247,0.12),transparent_30%)]" />
        <div className="mx-auto grid w-full max-w-[1320px] gap-6 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <ListChecks className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600">
                  {copy.workflowEyebrow}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {copy.workflowTitle}
                </h2>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              {localizedGoal.workflow.map((step, index) => (
                <div key={step} className="flex gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-1 text-sm font-semibold leading-7 text-slate-600">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:p-7">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                <ClipboardCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-600">
                  {copy.checklistEyebrow}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {copy.checklistTitle}
                </h2>
              </div>
            </div>

            <div className="mt-7 grid gap-3">
              {localizedGoal.checklist.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold leading-7 text-slate-600"
                >
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-md border border-violet-100 bg-violet-50/70 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-700">
                {copy.outcomeEyebrow}
              </p>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-700">
                {localizedGoal.outcome}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                {copy.otherEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {copy.otherTitle}
              </h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedGoals.slice(0, 4).map((item) => {
              const localizedItem = localizeGoal(item, isFa);

              return (
                <Link
                  key={item.slug}
                  href={`/trading-goals/${item.slug}`}
                  className="group rounded-lg border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    {localizedItem.eyebrow}
                  </p>
                  <h3 className="mt-2 text-base font-semibold text-[#1f2937] group-hover:text-violet-700">
                    {localizedItem.title}
                  </h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroVisual({
  goal,
  localizedGoal,
}: {
  goal: TradingGoal;
  localizedGoal: TradingGoal | LocalizedGoal;
}) {
  const { language } = useLanguage();
  const copy = pageCopy[language];

  if (!goal.image) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-dashed border-violet-200 bg-white/80 p-8 shadow-[0_26px_70px_rgba(15,23,42,0.10)] backdrop-blur">
        <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-[linear-gradient(135deg,#f8fbff_0%,#f3e8ff_100%)]">
          <div className="max-w-sm text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-md bg-white text-violet-600 shadow-sm">
              <ImageIcon className="h-7 w-7" />
            </span>
            <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-violet-700">
              {copy.imagePlaceholder}
            </p>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
              {copy.imagePlaceholderDescription}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border border-violet-100 bg-white p-3 shadow-[0_26px_70px_rgba(15,23,42,0.12)]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-[#f4f0ff]">
        <Image
          src={goal.image}
          alt={localizedGoal.imageAlt ?? localizedGoal.title}
          fill
          priority
          sizes="(min-width: 1024px) 620px, 100vw"
          className="object-contain p-4 transition duration-700 group-hover:scale-[1.01]"
        />
      </div>
    </div>
  );
}

function PillarIcon({ index }: { index: number }) {
  const icons = [
    <BarChart3 key="chart" className="h-5 w-5" />,
    <ShieldCheck key="shield" className="h-5 w-5" />,
    <FileText key="file" className="h-5 w-5" />,
  ];

  return icons[index % icons.length];
}
