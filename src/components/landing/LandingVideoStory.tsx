"use client";

import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  LayoutDashboard,
  Link2,
  MousePointer2,
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
    progress: "پیشرفت ویدیو",
    scrollHint: "برای دیدن ادامه، اسکرول کنید",
    reverseHint: "با اسکرول رو به بالا، ویدیو هم به عقب برمی‌گردد",
    cta: "ورود به داشبورد",
    steps: [
      {
        id: "automated-journaling",
        video: "/images/video/first.mp4",
        eyebrow: "مرحله ۱ · اتصال حساب معاملاتی",
        title: "حساب‌هایتان را یک‌بار وصل کنید؛ ادامه مسیر خودکار است.",
        description:
          "پلتفرم معاملاتی خود را انتخاب و حساب را از داخل داشبورد متصل کنید. بعد از اتصال، معاملات و اطلاعات حساب بدون ثبت دستی وارد ژورنال می‌شوند.",
        bullets: [
          "انتخاب سریع پلتفرم و حساب معاملاتی",
          "اتصال امن از داخل یک مسیر ساده",
          "آماده‌سازی همگام‌سازی خودکار معاملات",
        ],
        videoLabel: "اتصال پلتفرم‌ها به Tradivix",
      },
      {
        id: "dashboard-preview",
        video: "/images/video/dashboard.mp4",
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
    ],
  },
  en: {
    progress: "Video progress",
    scrollHint: "Scroll to continue the walkthrough",
    reverseHint: "Scroll up and the video moves back with you",
    cta: "Open dashboard",
    steps: [
      {
        id: "automated-journaling",
        video: "/images/video/first.mp4",
        eyebrow: "Step 1 · Connect a trading account",
        title: "Connect your accounts once. The rest stays in sync.",
        description:
          "Choose your trading platform and connect the account from the dashboard. Tradivix can then bring account and trade data into your journal without repetitive manual entry.",
        bullets: [
          "Choose your platform and trading account",
          "Complete one clear, secure connection flow",
          "Prepare automatic trade synchronization",
        ],
        videoLabel: "Connect your platforms to Tradivix",
      },
      {
        id: "dashboard-preview",
        video: "/images/video/dashboard.mp4",
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
    ],
  },
} as const;

function useScrollScrub(
  sectionRef: RefObject<HTMLElement | null>,
  videoRef: RefObject<HTMLVideoElement | null>
) {
  const [progress, setProgress] = useState(0);
  const durationRef = useRef(0);
  const frameRef = useRef<number | null>(null);

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

      const duration = durationRef.current || video.duration;
      if (Number.isFinite(duration) && duration > 0 && video.readyState >= 1) {
        const targetTime = Math.min(
          Math.max(duration - 0.04, 0),
          nextProgress * duration
        );

        if (Math.abs(video.currentTime - targetTime) > 0.025) {
          video.currentTime = targetTime;
        }
      }
    };

    const requestSync = () => {
      if (frameRef.current !== null) return;
      frameRef.current = window.requestAnimationFrame(syncVideo);
    };

    const handleMetadata = () => {
      durationRef.current = Number.isFinite(video.duration) ? video.duration : 0;
      video.pause();
      requestSync();
    };

    video.addEventListener("loadedmetadata", handleMetadata);
    video.addEventListener("durationchange", handleMetadata);
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    requestSync();

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("durationchange", handleMetadata);
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [sectionRef, videoRef]);

  return progress;
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
        className="invisible col-start-1 row-start-1"
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

function VideoStoryStep({
  step,
  index,
  isRtl,
  labels,
}: {
  step: StoryStep;
  index: number;
  isRtl: boolean;
  labels: {
    progress: string;
    scrollHint: string;
    reverseHint: string;
    cta: string;
  };
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progress = useScrollScrub(sectionRef, videoRef);
  const percent = Math.round(progress * 100);
  const isDark = index === 1;

  return (
    <section
      ref={sectionRef}
      id={step.id}
      className={`relative h-[420svh] min-h-[3000px] scroll-mt-20 ${
        isDark ? "bg-[#070a12] text-white" : "bg-[#f8faff] text-slate-950"
      }`}
    >
      <div className="sticky top-0 flex h-svh min-h-[560px] items-center overflow-hidden">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            isDark
              ? "bg-[radial-gradient(circle_at_18%_30%,rgba(37,99,235,0.19),transparent_32%),radial-gradient(circle_at_83%_66%,rgba(168,85,247,0.16),transparent_34%)]"
              : "bg-[radial-gradient(circle_at_12%_22%,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_88%_72%,rgba(217,70,239,0.12),transparent_32%)]"
          }`}
        />
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 opacity-[0.22] [background-image:radial-gradient(currentColor_1px,transparent_1px)] [background-size:24px_24px] ${
            isDark ? "text-white/20" : "text-slate-300"
          }`}
        />

        <div className="relative mx-auto w-full max-w-[1480px] px-4 py-4 sm:px-6 lg:px-8 xl:px-12">
          <div
            dir="ltr"
            className="grid grid-cols-[minmax(0,1fr)] items-center gap-6 lg:grid-cols-[minmax(280px,0.34fr)_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[360px_minmax(0,1fr)] xl:gap-9"
          >
            <div className="min-w-0 lg:order-2 lg:w-full lg:max-w-[155vh] lg:justify-self-end">
              <div
                className={`relative overflow-hidden rounded-[1.15rem] border p-1 shadow-2xl sm:rounded-[1.4rem] sm:p-1.5 ${
                  isDark
                    ? "border-white/15 bg-white/[0.07] shadow-black/50"
                    : "border-white bg-white/80 shadow-blue-950/15"
                }`}
              >
                <div
                  className={`flex h-8 items-center justify-between rounded-t-[0.8rem] border-b px-3 sm:h-9 sm:px-4 ${
                    isDark
                      ? "border-white/10 bg-[#111624]"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  </div>
                  <span
                    className={`truncate px-3 text-[10px] font-bold sm:text-xs ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {step.videoLabel}
                  </span>
                  <span className="w-[42px] text-end text-[10px] font-black tabular-nums text-violet-500 sm:text-xs">
                    {percent}%
                  </span>
                </div>

                <div className="relative aspect-video overflow-hidden rounded-b-[0.8rem] bg-[#080b12]">
                  <video
                    ref={videoRef}
                    src={step.video}
                    muted
                    playsInline
                    preload="auto"
                    aria-label={step.videoLabel}
                    className="h-full w-full object-contain"
                    onCanPlay={(event) => event.currentTarget.pause()}
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
                className={`mx-auto mt-2.5 flex max-w-xl items-center justify-center gap-2 text-center text-[10px] font-semibold sm:text-[11px] ${
                  isDark ? "text-slate-500" : "text-slate-500"
                }`}
              >
                <MousePointer2 className="h-3.5 w-3.5 shrink-0" />
                <span>{labels.reverseHint}</span>
              </div>
            </div>

            <div
              dir={isRtl ? "rtl" : "ltr"}
              className={`min-w-0 lg:order-1 lg:w-full lg:max-w-[360px] lg:justify-self-start ${
                isRtl ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition duration-300 ${
                  isDark
                    ? "border-violet-400/25 bg-violet-400/10 text-violet-300"
                    : "border-violet-200 bg-white/80 text-violet-700 shadow-sm"
                }`}
                style={{
                  opacity: Math.min(1, progress / 0.035),
                  transform: `translateY(${Math.max(0, 1 - progress / 0.035) * 8}px)`,
                }}
              >
                {index === 0 ? (
                  <Link2 className="h-3.5 w-3.5" />
                ) : (
                  <LayoutDashboard className="h-3.5 w-3.5" />
                )}
                {step.eyebrow}
              </div>

              <ScrollTypedText
                as={index === 0 ? "h1" : "h2"}
                text={step.title}
                progress={progress}
                start={0.035}
                end={0.28}
                className="mt-4 max-w-[32ch] text-[1.35rem] font-extrabold leading-[1.32] tracking-[-0.025em] sm:text-[1.45rem] lg:text-[1.45rem] xl:text-[1.6rem]"
              />

              <ScrollTypedText
                as="p"
                text={step.description}
                progress={progress}
                start={0.24}
                end={0.48}
                className={`mt-4 max-w-[42ch] text-[12px] font-normal leading-[1.8] sm:text-[13px] ${
                  isDark ? "text-slate-400" : "text-slate-600"
                }`}
              />

              <ul className="mt-5 hidden space-y-2.5 sm:block">
                {step.bullets.map((bullet, bulletIndex) => (
                  <li
                    key={bullet}
                    className={`flex items-start gap-2.5 text-[11px] font-semibold leading-[1.65] ${
                      isDark ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500 transition duration-300"
                      style={{
                        opacity: Math.min(
                          1,
                          Math.max(0, (progress - (0.47 + bulletIndex * 0.075)) / 0.04)
                        ),
                      }}
                    />
                    <ScrollTypedText
                      as="span"
                      text={bullet}
                      progress={progress}
                      start={0.47 + bulletIndex * 0.075}
                      end={0.57 + bulletIndex * 0.075}
                      className="flex-1"
                    />
                  </li>
                ))}
              </ul>

              <div
                className="mt-5 flex flex-wrap items-center gap-3 transition duration-300"
                style={{
                  opacity: Math.min(1, Math.max(0, (progress - 0.72) / 0.08)),
                  transform: `translateY(${Math.min(
                    1,
                    Math.max(0, 1 - (progress - 0.72) / 0.08)
                  ) * 8}px)`,
                  pointerEvents: progress >= 0.72 ? "auto" : "none",
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
                  className={`inline-flex items-center gap-2 text-xs font-bold ${
                    isDark ? "text-slate-500" : "text-slate-500"
                  }`}
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
                className={`shrink-0 text-[10px] font-black uppercase tracking-[0.18em] ${
                  isDark ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {labels.progress}
              </span>
              <div
                className={`h-1 flex-1 overflow-hidden rounded-full ${
                  isDark ? "bg-white/10" : "bg-slate-200"
                }`}
              >
                <div
                  className="h-full origin-left rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 will-change-transform"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </div>
              <span
                className={`w-9 text-end text-[10px] font-black tabular-nums ${
                  isDark ? "text-slate-500" : "text-slate-500"
                }`}
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
          isRtl={isRtl}
          labels={{
            progress: copy.progress,
            scrollHint: copy.scrollHint,
            reverseHint: copy.reverseHint,
            cta: copy.cta,
          }}
        />
      ))}
    </div>
  );
}
