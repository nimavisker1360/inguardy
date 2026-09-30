"use client";

import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL, TELEGRAM_CHANNEL_URL } from "@/lib/contact-links";
import { useLanguage } from "@/lib/language-context";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const supportEmail = SUPPORT_EMAIL;
const telegramUrl = TELEGRAM_CHANNEL_URL;

function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

function ContactCircuit({ progress }: { progress: number }) {
  const topReveal = clampProgress(progress / 0.38);
  const middleReveal = clampProgress((progress - 0.12) / 0.48);
  const bottomReveal = clampProgress((progress - 0.4) / 0.48);

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1600 1320"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full"
    >
      <defs>
        <linearGradient id="contact-circuit-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="0.48" stopColor="#6366f1" />
          <stop offset="1" stopColor="#d946ef" />
        </linearGradient>
      </defs>

      <g
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="1.15"
        vectorEffect="non-scaling-stroke"
        opacity="0.62"
      >
        <path d="M0 156H210L266 212H552L614 274H800" />
        <path d="M1600 156H1390L1334 212H1048L986 274H800" />
        <path d="M0 552H136L206 622H530L592 684H778" />
        <path d="M1600 500H1452L1384 568H1116L1044 640H822" />
        <path d="M0 1074H194L250 1018H548L610 956H800" />
        <path d="M1600 1112H1412L1348 1048H1080L1016 984H800" />
        <path d="M800 274V1138" strokeDasharray="7 12" />
      </g>

      <g
        fill="none"
        stroke="url(#contact-circuit-gradient)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.3"
        vectorEffect="non-scaling-stroke"
      >
        {[
          ["M0 156H210L266 212H552L614 274H800", topReveal],
          ["M1600 156H1390L1334 212H1048L986 274H800", topReveal],
          ["M0 552H136L206 622H530L592 684H778", middleReveal],
          ["M1600 500H1452L1384 568H1116L1044 640H822", middleReveal],
          ["M0 1074H194L250 1018H548L610 956H800", bottomReveal],
          ["M1600 1112H1412L1348 1048H1080L1016 984H800", bottomReveal],
        ].map(([path, reveal]) => (
          <path
            key={String(path)}
            d={String(path)}
            pathLength={1}
            strokeDasharray="1"
            style={{ strokeDashoffset: 1 - Number(reveal) }}
          />
        ))}
        <path
          d="M800 274V1138"
          pathLength={1}
          strokeDasharray="1"
          style={{ strokeDashoffset: 1 - clampProgress(progress / 0.86) }}
        />
      </g>

      {[
        [266, 212, topReveal],
        [1334, 212, topReveal],
        [206, 622, middleReveal],
        [1384, 568, middleReveal],
        [250, 1018, bottomReveal],
        [1348, 1048, bottomReveal],
      ].map(([cx, cy, reveal], index) => (
        <g key={`${cx}-${cy}`} style={{ opacity: Number(reveal) }}>
          <circle cx={cx} cy={cy} r="8" fill="#fff" stroke="#c4b5fd" strokeWidth="2" />
          <circle cx={cx} cy={cy} r="3" fill={index % 2 ? "#d946ef" : "#3b82f6"} />
        </g>
      ))}
    </svg>
  );
}

export default function ContactPage() {
  const { t, language } = useLanguage();
  const isRtl = language === "fa";
  const mainRef = useRef<HTMLElement>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null
  );

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    const updateProgress = () => {
      scrollFrameRef.current = null;
      const rect = main.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight * 0.42);
      const nextProgress = clampProgress(
        (window.innerHeight * 0.2 - rect.top) / travel
      );
      setScrollProgress((current) =>
        Math.abs(current - nextProgress) > 0.002 ? nextProgress : current
      );
    };

    const requestUpdate = () => {
      if (scrollFrameRef.current !== null) return;
      scrollFrameRef.current = window.requestAnimationFrame(updateProgress);
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    setSubmitStatus(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(t("contactPage.errorMessage"));
      }

      toast.success(t("contactPage.successMessage"));
      setSubmitStatus("success");
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (error) {
      setSubmitStatus("error");
      toast.error(
        error instanceof Error ? error.message : t("contactPage.errorMessage")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      ref={mainRef}
      dir={isRtl ? "rtl" : "ltr"}
      className="relative isolate overflow-hidden bg-white text-slate-950"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_45%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.15),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_86%_76%,rgba(16,185,129,0.10),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:22px_22px]" />
      <ContactCircuit progress={scrollProgress} />

      <section className="relative z-10 mx-auto w-full max-w-[1320px] px-5 pb-16 pt-14 sm:px-8 lg:px-12 lg:pb-20 lg:pt-[4.5rem]">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-[0_12px_30px_rgba(37,99,235,0.09)] backdrop-blur">
            <Sparkles className="h-4 w-4" />
            {isRtl ? "پشتیبانی Inguardy" : "Inguardy Support"}
          </div>

          <h1 className="text-[2.55rem] font-semibold leading-[1.08] tracking-normal text-[#071034] sm:text-[3.35rem]">
            {t("contactPage.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {t("contactPage.telegramSubtitle")}
          </p>
        </div>

        <div className="relative mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div
            className="pointer-events-none absolute bottom-12 top-12 z-20 hidden -translate-x-1/2 lg:block"
            style={{ left: isRtl ? "52.5%" : "47.5%" }}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-slate-200" />
            <span
              className="absolute inset-y-0 left-1/2 w-[3px] origin-top -translate-x-1/2 rounded-full bg-gradient-to-b from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_18px_rgba(99,102,241,0.36)]"
              style={{
                transform: `translateX(-50%) scaleY(${clampProgress(
                  scrollProgress * 1.35
                )})`,
              }}
            />
            {[0, 0.48, 1].map((position, index) => (
              <span
                key={position}
                className="absolute left-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-white bg-violet-500 shadow-[0_0_0_1px_rgba(139,92,246,0.25)]"
                style={{
                  top: `${position * 100}%`,
                  opacity: 0.3 + clampProgress(scrollProgress * 3 - index * 0.6) * 0.7,
                }}
              />
            ))}
          </div>

          <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
            <span
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px origin-left bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
              style={{ transform: `scaleX(${clampProgress(scrollProgress * 2.2)})` }}
            />
            <div className="mb-7 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_12px_24px_rgba(59,130,246,0.22)]">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-normal text-slate-950">
                  {t("contactPage.contactForm")}
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {t("contactPage.subtitle")}
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    {t("contactPage.fullName")}
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    dir="auto"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={t("contactPage.fullNamePlaceholder")}
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-bold text-slate-700"
                  >
                    {t("contactPage.email")}
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    dir="ltr"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder={t("contactPage.emailPlaceholder")}
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="subject"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  {t("contactPage.subject")}
                </label>
                <input
                  id="subject"
                  type="text"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  dir="auto"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder={t("contactPage.subjectPlaceholder")}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="message"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  {t("contactPage.message")}
                </label>
                <textarea
                  id="message"
                  rows={7}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  dir="auto"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t("contactPage.messagePlaceholder")}
                  required
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="h-14 w-full gap-2 rounded-full bg-[#07134a] text-base font-bold text-white shadow-[0_18px_35px_rgba(7,19,74,0.22)] hover:bg-[#102064]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
                    {t("contactPage.submitting")}
                  </>
                ) : (
                  <>
                    {t("contactPage.submit")}
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>

              {submitStatus ? (
                <p
                  className={`rounded-xl px-4 py-3 text-center text-sm font-bold ${
                    submitStatus === "success"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {submitStatus === "success"
                    ? t("contactPage.successMessage")
                    : t("contactPage.errorMessage")}
                </p>
              ) : null}
            </form>
          </section>

          <aside className="grid gap-5">
            <section className="relative overflow-hidden rounded-2xl border border-blue-100 bg-[#07134a] p-7 text-white shadow-[0_24px_70px_rgba(7,19,74,0.22)] sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.38),transparent_32%),radial-gradient(circle_at_10%_90%,rgba(16,185,129,0.22),transparent_28%)]" />
              <svg
                aria-hidden="true"
                viewBox="0 0 700 280"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
              >
                <path
                  d="M700 58H540L494 104H338L288 154H0"
                  fill="none"
                  stroke="rgba(255,255,255,0.5)"
                  strokeWidth="1.4"
                  pathLength={1}
                  strokeDasharray="1"
                  style={{
                    strokeDashoffset:
                      1 - clampProgress((scrollProgress - 0.08) / 0.38),
                  }}
                />
                <circle cx="494" cy="104" r="5" fill="#a5b4fc" />
              </svg>
              <div className="relative">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white/12 text-white ring-1 ring-white/15">
                  <Send className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-normal">
                  {t("contactPage.telegramSupport")}
                </h2>
                <p className="mt-3 text-sm leading-7 text-blue-100">
                  {t("contactPage.telegramSupportText")}
                </p>
                <Button
                  asChild
                  className="mt-6 gap-2 rounded-full bg-white px-5 font-bold text-[#07134a] hover:bg-blue-50"
                >
                  <Link
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("contactPage.openTelegram")}
                    <ArrowRight
                      className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`}
                    />
                  </Link>
                </Button>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/92 p-6 shadow-[0_22px_65px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
              <span
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px origin-left bg-gradient-to-r from-blue-400 via-violet-400 to-transparent"
                style={{
                  transform: `scaleX(${clampProgress(
                    (scrollProgress - 0.18) * 2.5
                  )})`,
                }}
              />
              <h2 className="mb-6 text-2xl font-bold tracking-normal text-slate-950">
                {t("contactPage.contactInfo")}
              </h2>

              <div className="grid gap-4">
                <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">
                      {t("contactPage.email")}
                    </h3>
                    <p
                      className="mt-1 text-sm font-semibold text-slate-500"
                      dir="ltr"
                    >
                      {supportEmail}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700">
                      {t("contactPage.onlineSupport")}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {t("contactPage.onlineSupportText")}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/92 p-6 shadow-[0_22px_65px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
              <span
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px origin-left bg-gradient-to-r from-violet-400 via-fuchsia-400 to-transparent"
                style={{
                  transform: `scaleX(${clampProgress(
                    (scrollProgress - 0.38) * 2.4
                  )})`,
                }}
              />
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-bold tracking-normal text-slate-950">
                  {t("contactPage.businessHours")}
                </h2>
              </div>

              <div className="space-y-3 text-sm font-semibold">
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-slate-700">
                  <span>{t("contactPage.weekdays")}</span>
                  <span>{t("contactPage.weekdayHours")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-slate-500">
                  <span>{t("contactPage.saturday")}</span>
                  <span>{t("contactPage.closed")}</span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-slate-500">
                  <span>{t("contactPage.sunday")}</span>
                  <span>{t("contactPage.closed")}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
