"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Link2,
  MousePointer2,
  Target,
} from "lucide-react";
import {
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { useLanguage } from "@/lib/language-context";

type StoryStep = {
  id: string;
  video: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: readonly string[];
  videoLabel: string;
};

const storyCopy = {
  fa: {
    scrollHint: "برای تکمیل متن و رفتن به مرحله بعد اسکرول کنید",
    reverseHint: "ویدیو زنده پخش می‌شود و تا پایان این مرحله تکرار خواهد شد",
    cta: "ورود به داشبورد",
    steps: [
      {
        id: "automated-journaling",
        video: "/clips/first.mp4",
        eyebrow: "مرحله ۱ · اتصال حساب معاملاتی",
        title: "حساب‌هایتان را یک‌بار وصل کنید؛ ادامه مسیر خودکار است.",
        description:
          "پلتفرم معاملاتی خود را انتخاب و حساب را از داخل داشبورد متصل کنید. بعد از اتصال، معاملات و اطلاعات حساب بدون ثبت دستی وارد ژورنال می‌شوند.",
        bullets: [
          "انتخاب سریع پلتفرم و حساب معاملاتی",
          "اتصال امن از داخل یک مسیر ساده",
          "آماده‌سازی همگام‌سازی خودکار معاملات",
        ],
        videoLabel: "اتصال پلتفرم‌ها به Inguardy",
      },
      {
        id: "dashboard-preview",
        video: "/clips/dashboard.mp4",
        eyebrow: "مرحله ۲ · نمای کلی داشبورد",
        title: "تمام چیزی که برای تصمیم بعدی نیاز دارید، در یک نگاه.",
        description:
          "بعد از اتصال حساب، داشبورد نمایی منظم از وضعیت روز، عملکرد حساب، معاملات اخیر و ابزارهای اصلی ژورنال در اختیارتان می‌گذارد.",
        bullets: [
          "مرور سریع وضعیت و عملکرد حساب",
          "دسترسی یکپارچه به ژورنال و معاملات",
          "دیدن اقدام بعدی بدون گم‌شدن میان داده‌ها",
        ],
        videoLabel: "آشنایی با فضای داشبورد",
      },
      {
        id: "strategy-review",
        video: "/clips/strategy.mp4",
        eyebrow: "مرحله ۳ · بررسی استراتژی",
        title: "هر معامله را با استراتژی خودش بسنجید.",
        description:
          "استراتژی مرتبط را به معامله اختصاص دهید، اجرای واقعی را با قوانین ثبت‌شده مقایسه کنید و میزان پایبندی به پلن را برای مرورهای بعدی نگه دارید.",
        bullets: [
          "اتصال هر معامله به استراتژی مرتبط",
          "مقایسه اجرای معامله با قوانین پلن",
          "ثبت میزان پایبندی و نکات بازبینی",
        ],
        videoLabel: "بررسی استراتژی هر معامله",
      },
      {
        id: "playbook-workflow",
        video: "/clips/playbook.mp4",
        eyebrow: "مرحله ۴ · ساخت پلی‌بوک",
        title: "پلن معاملاتی را به یک فرآیند قابل تکرار تبدیل کنید.",
        description:
          "برای هر ستاپ یک پلی‌بوک بسازید، قوانین ورود، خروج و مدیریت ریسک را مشخص کنید و آن را به چک‌لیست‌های موردنیاز متصل نگه دارید.",
        bullets: [
          "ساخت پلی‌بوک اختصاصی برای هر ستاپ",
          "ثبت قوانین ورود، خروج و مدیریت ریسک",
          "اتصال مستقیم پلی‌بوک به چک‌لیست‌ها",
        ],
        videoLabel: "ساخت و مدیریت پلی‌بوک معاملاتی",
      },
      {
        id: "checklist-workflow",
        video: "/clips/checklist.mp4",
        eyebrow: "مرحله ۵ · اجرای چک‌لیست",
        title: "قبل از ورود، هیچ قانون مهمی را جا نیندازید.",
        description:
          "چک‌لیست‌های قابل استفاده مجدد بسازید، آن‌ها را به معامله متصل کنید و پیش از اجرا، شرایط ورود، ریسک و انضباط معاملاتی را مرحله‌به‌مرحله تأیید کنید.",
        bullets: [
          "ساخت چک‌لیست‌های قابل استفاده مجدد",
          "کنترل شرایط ورود و مدیریت ریسک",
          "ثبت نتیجه هر بررسی در سابقه معامله",
        ],
        videoLabel: "ساخت و اجرای چک‌لیست معامله",
      },
      {
        id: "trading-psychology",
        video: "/clips/psychology.mp4",
        eyebrow: "مرحله ۶ · روان‌شناسی معامله",
        title: "احساسات پشت هر تصمیم معاملاتی را بهتر بشناسید.",
        description:
          "وضعیت ذهنی خود را قبل، هنگام و بعد از معامله ثبت کنید و ببینید ترس، عجله، اعتمادبه‌نفس یا فشار روانی چگونه بر اجرای پلن شما اثر گذاشته‌اند.",
        bullets: [
          "ثبت احساسات در مراحل مختلف معامله",
          "شناسایی محرک‌های تصمیم‌های هیجانی",
          "ارتباط روان‌شناسی با کیفیت اجرای پلن",
        ],
        videoLabel: "مرور روان‌شناسی و احساسات معامله",
      },
      {
        id: "ai-journal-assistant",
        video: "/clips/AI.mp4",
        eyebrow: "مرحله ۷ · دستیار هوشمند ژورنال",
        title: "از داده‌های واقعی معاملاتتان، پاسخ عملی بگیرید.",
        description:
          "از Inguardy AI درباره عملکرد، ستاپ‌ها، روان‌شناسی، مدیریت ریسک یا اشتباهات تکراری سؤال کنید و پاسخ‌هایی دریافت کنید که بر اساس اطلاعات ژورنال خودتان ساخته شده‌اند.",
        bullets: [
          "گفت‌وگو با داده‌های واقعی ژورنال",
          "کشف الگوها و اشتباهات تکرارشونده",
          "دریافت نکات مستند برای مرور عملکرد",
        ],
        videoLabel: "کار با دستیار هوشمند Inguardy",
      },
      {
        id: "performance-reports",
        video: "/clips/reports.mp4",
        eyebrow: "مرحله ۸ · گزارش‌های عملکرد",
        title: "اعداد را به تصمیم بهتر برای معامله بعدی تبدیل کنید.",
        description:
          "گزارش‌های تحلیلی، سود و زیان، نرخ برد، افت سرمایه و عملکرد استراتژی‌ها را یکجا بررسی کنید تا نقاط قوت و ضعف روند معاملاتی شما واضح‌تر شوند.",
        bullets: [
          "مرور شاخص‌های کلیدی عملکرد و ریسک",
          "مقایسه نتایج استراتژی‌ها و ستاپ‌ها",
          "شناسایی روندها برای تصمیم‌گیری دقیق‌تر",
        ],
        videoLabel: "مرور گزارش‌ها و تحلیل عملکرد",
      },
    ],
  },
  en: {
    scrollHint: "Scroll to complete the text and continue",
    reverseHint: "The video plays live and repeats until this step is complete",
    cta: "Open dashboard",
    steps: [
      {
        id: "automated-journaling",
        video: "/clips/first.mp4",
        eyebrow: "Step 1 · Connect a trading account",
        title: "Connect your accounts once. The rest stays in sync.",
        description:
          "Choose your trading platform and connect the account from the dashboard. Inguardy can then bring account and trade data into your journal without repetitive manual entry.",
        bullets: [
          "Choose your platform and trading account",
          "Complete one clear, secure connection flow",
          "Prepare automatic trade synchronization",
        ],
        videoLabel: "Connect your platforms to Inguardy",
      },
      {
        id: "dashboard-preview",
        video: "/clips/dashboard.mp4",
        eyebrow: "Step 2 · Explore the dashboard",
        title: "Everything you need for the next decision, at a glance.",
        description:
          "Once connected, the dashboard brings your daily status, account performance, recent trades, and core journaling tools into one organized workspace.",
        bullets: [
          "Review account status and performance quickly",
          "Move between your journal and trades in one place",
          "See the next action without digging through data",
        ],
        videoLabel: "A guided look around the dashboard",
      },
      {
        id: "strategy-review",
        video: "/clips/strategy.mp4",
        eyebrow: "Step 3 · Review your strategy",
        title: "Review every trade against the strategy behind it.",
        description:
          "Assign the relevant strategy to a trade, compare the execution with your saved rules, and keep plan-compliance notes ready for future reviews.",
        bullets: [
          "Connect each trade to its strategy",
          "Compare execution with the trading plan",
          "Record compliance and review notes",
        ],
        videoLabel: "Review the strategy behind each trade",
      },
      {
        id: "playbook-workflow",
        video: "/clips/playbook.mp4",
        eyebrow: "Step 4 · Build a playbook",
        title: "Turn your trading plan into a repeatable process.",
        description:
          "Create a playbook for each setup, define entry, exit, and risk rules, and keep every strategy connected to the checklists it needs.",
        bullets: [
          "Create a dedicated playbook for each setup",
          "Define entry, exit, and risk rules",
          "Link playbooks directly to checklists",
        ],
        videoLabel: "Build and manage a trading playbook",
      },
      {
        id: "checklist-workflow",
        video: "/clips/checklist.mp4",
        eyebrow: "Step 5 · Run your checklist",
        title: "Never skip an important rule before entry.",
        description:
          "Build reusable checklists, attach them to trades, and confirm entry conditions, risk controls, and trading discipline step by step before execution.",
        bullets: [
          "Build reusable trading checklists",
          "Confirm entry conditions and risk controls",
          "Save every check with the trade record",
        ],
        videoLabel: "Build and run a trade checklist",
      },
      {
        id: "trading-psychology",
        video: "/clips/psychology.mp4",
        eyebrow: "Step 6 · Review trading psychology",
        title: "Understand the emotions behind every trading decision.",
        description:
          "Record your mindset before, during, and after a trade, then see how fear, urgency, confidence, or pressure influenced the way you followed your plan.",
        bullets: [
          "Track emotions throughout the trade",
          "Identify triggers behind impulsive decisions",
          "Connect psychology with execution quality",
        ],
        videoLabel: "Review trading psychology and emotions",
      },
      {
        id: "ai-journal-assistant",
        video: "/clips/AI.mp4",
        eyebrow: "Step 7 · Ask your journal AI",
        title: "Turn your real trading data into useful answers.",
        description:
          "Ask Inguardy AI about performance, setups, psychology, risk management, or repeated mistakes and get grounded answers based on your own journal data.",
        bullets: [
          "Chat with your real journal data",
          "Find patterns and repeated mistakes",
          "Get grounded insights for performance reviews",
        ],
        videoLabel: "Work with the Inguardy AI assistant",
      },
      {
        id: "performance-reports",
        video: "/clips/reports.mp4",
        eyebrow: "Step 8 · Explore performance reports",
        title: "Turn the numbers into a better next decision.",
        description:
          "Review analytics, profit and loss, win rate, drawdown, and strategy performance in one place to make the strengths and weaknesses in your process easier to see.",
        bullets: [
          "Review key performance and risk metrics",
          "Compare results across strategies and setups",
          "Spot trends for more informed decisions",
        ],
        videoLabel: "Explore reports and performance analytics",
      },
    ],
  },
} as const;

function useScrollPlayback(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>
) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef<number | null>(null);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    const video = videoRef.current;
    if (!section || !video) return;

    const syncVideo = () => {
      frameRef.current = null;

      const rect = section.getBoundingClientRect();
      const stickyOffset = 0;
      const stickyHeight = Math.max(1, window.innerHeight);
      const distance = Math.max(1, rect.height - stickyHeight);
      const nextProgress = Math.min(
        1,
        Math.max(0, (stickyOffset - rect.top) / distance)
      );

      setProgress((current) =>
        Math.abs(current - nextProgress) > 0.001 ? nextProgress : current
      );

      const viewportCenter = window.innerHeight / 2;
      const isActive =
        rect.top <= viewportCenter && rect.bottom >= viewportCenter;

      if (isActive) {
        if (!wasActiveRef.current && video.readyState >= 1) {
          video.currentTime = 0;
        }
        if (video.paused) {
          void video.play().catch(() => undefined);
        }
      } else if (!video.paused) {
        video.pause();
      }

      wasActiveRef.current = isActive;
    };

    const requestSync = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(syncVideo);
    };

    const handleMetadata = () => {
      requestSync();
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("durationchange", handleMetadata);
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    document.addEventListener("visibilitychange", requestSync);
    requestSync();

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("durationchange", handleMetadata);
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      document.removeEventListener("visibilitychange", requestSync);
      video.pause();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [sectionRef, videoRef]);

  return progress;
}

function useLazyVideoSource(sectionRef: RefObject<HTMLElement | null>) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;

        setShouldLoad(true);
        observer.disconnect();
      },
      {
        // Begin fetching shortly before the section becomes visible, while
        // keeping the remaining story videos completely off the network.
        rootMargin: "100% 0px",
      }
    );

    observer.observe(section);

    return () => observer.disconnect();
  }, [sectionRef]);

  return shouldLoad;
}

function ScrollTypedText({
  as: Component,
  text,
  progress,
  start,
  end,
  className = "",
}: {
  as: "h1" | "h2" | "p" | "span";
  text: string;
  progress: number;
  start: number;
  end: number;
  className?: string;
}) {
  const typingProgress = Math.min(
    1,
    Math.max(0, (progress - start) / Math.max(0.001, end - start))
  );
  const visibleText = text.slice(
    0,
    Math.floor(text.length * typingProgress)
  );
  const showCursor = progress >= start && progress < end;

  return (
    <Component className={`grid min-w-0 ${className}`} aria-label={text}>
      <span
        aria-hidden="true"
        className="col-start-1 row-start-1 opacity-[0.28]"
      >
        {text}
      </span>
      <span aria-hidden="true" className="col-start-1 row-start-1">
        {visibleText}
        {showCursor ? (
          <span className="ms-1 inline-block h-[0.9em] w-[2px] translate-y-[0.08em] animate-pulse bg-violet-500" />
        ) : null}
      </span>
    </Component>
  );
}

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function CircuitLines({ progress, index }: { progress: number; index: number }) {
  const firstPath = clampProgress(progress / 0.52);
  const secondPath = clampProgress((progress - 0.14) / 0.56);
  const thirdPath = clampProgress((progress - 0.34) / 0.5);
  const gradientId = `story-circuit-gradient-${index}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 900"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.48" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>

      <g fill="none" stroke="#cbd5e1" strokeWidth="1.1" opacity="0.52">
        <path d="M0 132H174L226 184H500L548 232H720" />
        <path d="M1600 138H1450L1394 194H1180L1120 254H930" />
        <path d="M0 716H214L276 654H506L564 596H744" />
        <path d="M1600 748H1412L1348 684H1128L1068 624H846" />
      </g>

      <g
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
      >
        <path
          d="M0 132H174L226 184H500L548 232H720"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: 1 - firstPath }}
        />
        <path
          d="M1600 138H1450L1394 194H1180L1120 254H930"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: 1 - secondPath }}
        />
        <path
          d="M0 716H214L276 654H506L564 596H744"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: 1 - secondPath }}
        />
        <path
          d="M1600 748H1412L1348 684H1128L1068 624H846"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: 1 - thirdPath }}
        />
      </g>

      {[
        [226, 184, firstPath],
        [548, 232, firstPath],
        [1394, 194, secondPath],
        [1120, 254, secondPath],
        [276, 654, secondPath],
        [1348, 684, thirdPath],
      ].map(([cx, cy, reveal], dotIndex) => (
        <g key={`${cx}-${cy}`} style={{ opacity: reveal }}>
          <circle cx={cx} cy={cy} r="8" fill="#ffffff" stroke="#c4b5fd" strokeWidth="2" />
          <circle
            cx={cx}
            cy={cy}
            r="3.2"
            fill={dotIndex % 2 === 0 ? "#6366f1" : "#d946ef"}
          />
        </g>
      ))}
    </svg>
  );
}

function WorkflowRail({
  progress,
  index,
  totalSteps,
  StepIcon,
}: {
  progress: number;
  index: number;
  totalSteps: number;
  StepIcon: typeof LayoutDashboard;
}) {
  const branchProgress = clampProgress((progress - 0.04) / 0.22);
  const nodeProgress = clampProgress(progress / 0.08);

  return (
    <div className="relative hidden h-[min(68vh,650px)] min-h-[430px] items-center justify-center lg:order-2 lg:flex">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
      <span
        className="absolute inset-y-0 left-1/2 w-[3px] origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_18px_rgba(124,58,237,0.45)] will-change-transform"
        style={{ transform: `translateX(-50%) scaleY(${progress})` }}
      />

      <span
        className="absolute left-0 right-1/2 top-1/2 h-px origin-right bg-gradient-to-l from-violet-500 to-violet-200 will-change-transform"
        style={{ transform: `scaleX(${branchProgress})` }}
      />
      <span
        className="absolute left-1/2 right-0 top-1/2 h-px origin-left bg-gradient-to-r from-violet-500 to-fuchsia-200 will-change-transform"
        style={{ transform: `scaleX(${branchProgress})` }}
      />

      <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]" />
      <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-fuchsia-500 shadow-[0_0_0_4px_rgba(217,70,239,0.12)]" />

      <div
        className="relative z-10 grid h-[58px] w-[58px] place-items-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-[0_18px_42px_-16px_rgba(79,70,229,0.75)] transition-transform duration-300"
        style={{
          opacity: 0.35 + nodeProgress * 0.65,
          transform: `scale(${0.78 + nodeProgress * 0.22}) rotate(${(1 - nodeProgress) * -8}deg)`,
        }}
      >
        <StepIcon className="h-5 w-5" />
        <span className="absolute -right-2.5 -top-2.5 grid h-6 min-w-6 place-items-center rounded-full bg-slate-950 px-1 text-[9px] font-black text-white ring-4 ring-white">
          {index + 1}
        </span>
      </div>

      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
        {String(index + 1).padStart(2, "0")} — {String(totalSteps).padStart(2, "0")}
      </span>
    </div>
  );
}

function VideoStoryStep({
  step,
  index,
  totalSteps,
  isRtl,
  labels,
}: {
  step: StoryStep;
  index: number;
  totalSteps: number;
  isRtl: boolean;
  labels: {
    scrollHint: string;
    reverseHint: string;
    cta: string;
  };
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const shouldLoadVideo = useLazyVideoSource(sectionRef);
  const progress = useScrollPlayback(sectionRef, videoRef);
  const percent = Math.round(progress * 100);
  const stepPosition = `${String(index + 1).padStart(2, "0")} / ${String(
    totalSteps
  ).padStart(2, "0")}`;
  const StepIcon = [
    Link2,
    LayoutDashboard,
    Target,
    BookOpenCheck,
    ListChecks,
    HeartPulse,
    BrainCircuit,
    BarChart3,
  ][index] ?? LayoutDashboard;

  return (
    <section
      ref={sectionRef}
      id={step.id}
      className="relative h-[220svh] min-h-[1500px] scroll-mt-20 overflow-clip border-t border-slate-200/60 bg-[#f8faff] text-slate-950"
    >
      <div className="sticky top-0 flex h-svh min-h-[560px] items-center overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(59,130,246,0.16),transparent_27%),radial-gradient(circle_at_90%_76%,rgba(217,70,239,0.14),transparent_29%),linear-gradient(135deg,rgba(255,255,255,0.8),rgba(248,250,255,0.36))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-slate-300 opacity-[0.22] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px]"
        />
        <CircuitLines progress={progress} index={index} />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-transparent via-violet-400 to-transparent will-change-transform"
          style={{ transform: `scaleX(${progress})` }}
        />

        <div className="relative mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          <div
            dir="ltr"
            className="grid grid-cols-[minmax(0,1fr)] items-center gap-5 lg:grid-cols-[minmax(270px,0.36fr)_56px_minmax(0,1fr)] lg:gap-0 xl:grid-cols-[360px_72px_minmax(0,1fr)]"
          >
            <div className="min-w-0 lg:order-3 lg:w-full lg:max-w-[155vh] lg:justify-self-end">
              <div
                className="relative overflow-hidden rounded-[1.15rem] border border-white/90 bg-white/85 p-1 shadow-[0_32px_80px_-36px_rgba(30,41,90,0.5),0_0_0_1px_rgba(124,58,237,0.08)] backdrop-blur-xl sm:rounded-[1.4rem] sm:p-1.5"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-10 top-0 h-px origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 will-change-transform"
                  style={{ transform: `scaleX(${clampProgress(progress / 0.5)})` }}
                />
                <div
                  className="flex h-8 items-center justify-between rounded-t-[0.8rem] border-b border-slate-200 bg-slate-50 px-3 sm:h-9 sm:px-4"
                >
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <div className="flex min-w-0 items-center justify-center gap-2 px-2">
                    <span
                      className="shrink-0 rounded-full bg-slate-200/70 px-2 py-0.5 text-[9px] font-extrabold tabular-nums text-slate-600"
                    >
                      {stepPosition}
                    </span>
                    <span
                      className="truncate text-[10px] font-bold text-slate-500 sm:text-xs"
                    >
                      {step.videoLabel}
                    </span>
                  </div>
                  <span className="w-[42px] text-end text-[10px] font-black tabular-nums text-violet-500 sm:text-xs">
                    {percent}%
                  </span>
                </div>

                <div className="relative aspect-video overflow-hidden rounded-b-[0.8rem] bg-[#080b12]">
                  <video
                    ref={videoRef}
                    src={shouldLoadVideo ? step.video : undefined}
                    muted
                    playsInline
                    loop
                    preload={shouldLoadVideo ? "auto" : "none"}
                    aria-label={step.videoLabel}
                    className="h-full w-full object-contain"
                  />
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-white/10">
                    <div
                      className="h-full origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 will-change-transform"
                      style={{ transform: `scaleX(${progress})` }}
                    />
                  </div>
                </div>
              </div>

              <div
                className="mx-auto mt-2 flex max-w-xl items-center justify-center gap-2 text-center text-[10px] font-semibold text-slate-500 sm:text-[11px]"
              >
                <MousePointer2 className="h-3.5 w-3.5 shrink-0" />
                <span>{labels.reverseHint}</span>
              </div>
            </div>

            <WorkflowRail
              progress={progress}
              index={index}
              totalSteps={totalSteps}
              StepIcon={StepIcon}
            />

            <div
              dir={isRtl ? "rtl" : "ltr"}
              className={`relative min-w-0 rounded-[1.35rem] border border-white/80 bg-white/72 p-4 shadow-[0_24px_60px_-38px_rgba(30,41,90,0.5)] backdrop-blur-xl sm:p-5 lg:order-1 lg:w-full lg:max-w-[360px] lg:justify-self-start lg:rounded-[1.65rem] lg:border-slate-200/80 lg:bg-white/78 lg:p-6 ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-5 h-12 w-px bg-gradient-to-b from-violet-500 to-transparent ${
                  isRtl ? "right-0" : "left-0"
                }`}
              />
              <div
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[10px] font-extrabold text-violet-700 shadow-sm transition duration-300"
                style={{
                  opacity: 0.55 + Math.min(0.45, progress / 0.08),
                  transform: `translateY(${Math.max(0, 1 - progress / 0.035) * 8}px)`,
                }}
              >
                <StepIcon className="h-3.5 w-3.5" />
                {step.eyebrow}
              </div>

              <ScrollTypedText
                as={index === 0 ? "h1" : "h2"}
                text={step.title}
                progress={progress}
                start={0.035}
                end={0.28}
                className="mt-3.5 max-w-[32ch] text-[1.35rem] font-extrabold leading-[1.32] tracking-[-0.025em] sm:text-[1.45rem] lg:text-[1.45rem] xl:text-[1.6rem]"
              />

              <ScrollTypedText
                as="p"
                text={step.description}
                progress={progress}
                start={0.24}
                end={0.55}
                className="mt-3.5 max-w-[42ch] text-[12px] font-normal leading-[1.75] text-slate-600 sm:text-[13px]"
              />

              <ul className="relative mt-5 hidden space-y-2.5 border-t border-slate-200/80 pt-4 sm:block">
                {step.bullets.map((bullet, bulletIndex) => (
                  <li
                    key={bullet}
                    className="group flex items-start gap-2.5 rounded-xl border border-slate-200/70 bg-white/65 px-3 py-2.5 text-[11px] font-semibold leading-[1.65] text-slate-700 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.5)]"
                    style={{
                      opacity:
                        0.32 +
                        clampProgress(
                          (progress - (0.54 + bulletIndex * 0.1)) / 0.08
                        ) *
                          0.68,
                      transform: `translateX(${(1 - clampProgress(
                        (progress - (0.54 + bulletIndex * 0.1)) / 0.08
                      )) * (isRtl ? 10 : -10)}px)`,
                    }}
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 transition duration-300"
                      style={{
                        opacity: Math.min(
                          1,
                          Math.max(0, (progress - (0.56 + bulletIndex * 0.1)) / 0.04)
                        ),
                      }}
                    />
                    <ScrollTypedText
                      as="span"
                      text={bullet}
                      progress={progress}
                      start={0.56 + bulletIndex * 0.1}
                      end={0.66 + bulletIndex * 0.1}
                      className="flex-1"
                    />
                  </li>
                ))}
              </ul>

              <div
                className="mt-4 flex flex-wrap items-center gap-3 transition duration-300"
                style={{
                  opacity: Math.min(1, Math.max(0, (progress - 0.88) / 0.08)),
                  transform: `translateY(${Math.min(
                    1,
                    Math.max(0, 1 - (progress - 0.88) / 0.08)
                  ) * 8}px)`,
                  pointerEvents: progress >= 0.88 ? "auto" : "none",
                }}
              >
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-violet-600 to-fuchsia-500 px-5 text-xs font-extrabold text-white shadow-[0_14px_30px_rgba(124,58,237,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(124,58,237,0.34)]"
                >
                  {labels.cta}
                  <ArrowRight className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
                </Link>

                <span
                  className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"
                >
                  <ArrowDown className="h-4 w-4 animate-bounce" />
                  {labels.scrollHint}
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute -bottom-1 left-3 right-3 sm:left-5 sm:right-5 lg:left-6 lg:right-6 xl:left-8 xl:right-8">
            <div className="flex items-center gap-3">
              <span
                className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"
              >
                {stepPosition}
              </span>
              <div
                className="relative h-1 flex-1 overflow-visible rounded-full bg-slate-200"
              >
                <div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 will-change-transform"
                  style={{ transform: `scaleX(${progress})` }}
                />
                <span
                  className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-500 shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
                  style={{ left: `${progress * 100}%`, opacity: progress > 0.015 ? 1 : 0 }}
                />
              </div>
              <span
                className="w-9 text-end text-[10px] font-black tabular-nums text-slate-500"
              >
                {percent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingVideoStory() {
  const { language } = useLanguage();
  const isRtl = language === "fa";
  const copy = storyCopy[language];

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={isRtl ? "landing-fa-font" : "landing-en-font"}
    >
      {copy.steps.map((step, index) => (
        <VideoStoryStep
          key={step.id}
          step={step}
          index={index}
          totalSteps={copy.steps.length}
          isRtl={isRtl}
          labels={{
            scrollHint: copy.scrollHint,
            reverseHint: copy.reverseHint,
            cta: copy.cta,
          }}
        />
      ))}
    </div>
  );
}
