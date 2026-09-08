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
import { useState } from "react";
import { toast } from "sonner";

const supportEmail = SUPPORT_EMAIL;
const telegramUrl = TELEGRAM_CHANNEL_URL;

export default function ContactPage() {
  const { t, language } = useLanguage();
  const isRtl = language === "fa";
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
      dir={isRtl ? "rtl" : "ltr"}
      className="relative isolate overflow-hidden bg-white text-slate-950"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_45%,#ffffff_100%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.15),transparent_30%),radial-gradient(circle_at_82%_14%,rgba(168,85,247,0.12),transparent_30%),radial-gradient(circle_at_86%_76%,rgba(16,185,129,0.10),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:22px_22px]" />

      <section className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-14 sm:px-8 lg:px-12 lg:pb-20 lg:pt-[4.5rem]">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-[0_12px_30px_rgba(37,99,235,0.09)] backdrop-blur">
            <Sparkles className="h-4 w-4" />
            {isRtl ? "پشتیبانی Tradivix" : "Tradivix Support"}
          </div>

          <h1 className="text-[2.55rem] font-semibold leading-[1.08] tracking-normal text-[#071034] sm:text-[3.35rem]">
            {t("contactPage.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            {t("contactPage.telegramSubtitle")}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl border border-slate-200 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
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

            <section className="rounded-2xl border border-slate-200 bg-white/92 p-6 shadow-[0_22px_65px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
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

            <section className="rounded-2xl border border-slate-200 bg-white/92 p-6 shadow-[0_22px_65px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
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
