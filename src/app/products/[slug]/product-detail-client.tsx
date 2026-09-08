"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
} from "lucide-react";

import { useLanguage } from "@/lib/language-context";
import type { ProductPage } from "@/lib/product-pages";

const pageCopy = {
  en: {
    back: "Back to home",
    openDashboard: "Open in dashboard",
    viewPlans: "View plans",
    detailsEyebrow: "Product details",
    detailsTitle: "What this product helps you do.",
    highlightsEyebrow: "Highlights",
    highlightsTitle: "Key benefits",
    moreEyebrow: "More products",
    moreTitle: "Continue exploring",
    home: "Home",
  },
  fa: {
    back: "بازگشت به خانه",
    openDashboard: "باز کردن در داشبورد",
    viewPlans: "مشاهده پلن‌ها",
    detailsEyebrow: "جزئیات محصول",
    detailsTitle: "این محصول چه کمکی به شما می‌کند؟",
    highlightsEyebrow: "مزیت‌ها",
    highlightsTitle: "مزیت‌های اصلی",
    moreEyebrow: "محصولات بیشتر",
    moreTitle: "ادامه بررسی محصولات",
    home: "خانه",
  },
};

const eyebrowFa: Record<string, string> = {
  "Core product": "محصول اصلی",
  "Performance intelligence": "هوشمندی عملکرد",
  "Structured feedback": "بازخورد ساختاریافته",
  Automation: "اتوماسیون",
  "Strategy rules": "قوانین استراتژی",
  "Process protection": "محافظت از فرایند",
  "Daily overview": "نمای روزانه",
  "Challenge tracking": "پیگیری چالش",
  "Signal desk": "میز سیگنال",
};

export function ProductDetailClient({
  product,
  relatedProducts,
}: {
  product: ProductPage;
  relatedProducts: ProductPage[];
}) {
  const { language } = useLanguage();
  const isFa = language === "fa";
  const copy = pageCopy[language];
  const dir = isFa ? "rtl" : "ltr";
  const BackIcon = isFa ? ArrowRight : ArrowLeft;
  const ForwardIcon = isFa ? ArrowLeft : ArrowRight;
  const localizedTitle = isFa ? product.titleFa : product.title;
  const localizedEyebrow = isFa
    ? eyebrowFa[product.eyebrow] ?? product.eyebrow
    : product.eyebrow;

  return (
    <main
      className={`min-h-screen bg-white text-slate-950 ${isFa ? "product-detail-fa" : ""}`}
      dir={dir}
    >
      <section className="relative isolate overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_54%,#ffffff_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_14%_14%,rgba(37,99,235,0.14),transparent_30%),radial-gradient(circle_at_84%_12%,rgba(168,85,247,0.15),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(16,185,129,0.10),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] [background-image:radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="mx-auto w-full max-w-[1360px] px-5 pb-16 pt-10 sm:px-8 lg:px-12 lg:pb-20 lg:pt-14">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-700"
          >
            <BackIcon className="h-4 w-4" />
            {copy.back}
          </Link>

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-14">
            <div className={isFa ? "text-right" : "text-left"}>
              <div className="inline-flex items-center gap-2 rounded-md border border-violet-200 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-700 shadow-[0_10px_28px_rgba(109,40,217,0.08)] backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                {localizedEyebrow}
              </div>

              <h1 className="mt-6 max-w-3xl text-[2.3rem] font-semibold leading-[1.1] tracking-normal text-[#10152f] sm:text-[3.15rem] lg:text-[3.8rem]">
                {localizedTitle}
              </h1>

              <p className="mt-7 max-w-2xl text-base font-semibold leading-8 text-slate-600 sm:text-lg sm:leading-9">
                {product.summary[language]}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={product.dashboardHref}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#07134a] px-7 text-sm font-bold text-white shadow-[0_16px_34px_rgba(7,19,74,0.22)] transition hover:-translate-y-0.5 hover:bg-[#102064]"
                >
                  {copy.openDashboard} <ForwardIcon className="h-4 w-4" />
                </Link>
                <Link
                  href="/#pricing"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-7 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50"
                >
                  {copy.viewPlans}
                </Link>
              </div>
            </div>

            <ProductVisual product={product} />
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-12">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className={isFa ? "text-right" : "text-left"}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                {copy.detailsEyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-900 sm:text-[2.25rem]">
                {copy.detailsTitle}
              </h2>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {product.sections.map((section) => (
              <article
                key={section.titleEn}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(15,23,42,0.07)] sm:p-7"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-violet-50 text-violet-600">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-normal text-[#10152f]">
                  {isFa ? section.titleFa : section.titleEn}
                </h3>
                <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                  {isFa ? section.bodyFa : section.bodyEn}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-[#f8fbff] py-16 lg:py-20">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(59,130,246,0.12),transparent_28%),radial-gradient(circle_at_86%_72%,rgba(168,85,247,0.12),transparent_30%)]" />
        <div className="mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-12">
          <div className={`mb-8 ${isFa ? "text-right" : "text-left"}`}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
              {copy.highlightsEyebrow}
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-normal text-slate-900">
              {copy.highlightsTitle}
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {product.highlights.map((highlight) => (
              <article
                key={highlight.en}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.07)]"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="mt-4 text-sm font-bold leading-7 text-slate-800">
                  {highlight[language]}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto w-full max-w-[1360px] px-5 sm:px-8 lg:px-12">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div className={isFa ? "text-right" : "text-left"}>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                {copy.moreEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {copy.moreTitle}
              </h2>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.slice(0, 4).map((item) => (
              <Link
                key={item.slug}
                href={`/products/${item.slug}`}
                className="group rounded-lg border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/40"
              >
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  {isFa ? eyebrowFa[item.eyebrow] ?? item.eyebrow : item.eyebrow}
                </p>
                <h3 className="mt-2 text-base font-semibold text-[#10152f] group-hover:text-violet-700">
                  {isFa ? item.titleFa : item.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function ProductVisual({ product }: { product: ProductPage }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-violet-100 bg-white p-3 shadow-[0_26px_70px_rgba(15,23,42,0.12)]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-md bg-[#f4f0ff]">
        <Image
          src={product.image}
          alt={product.imageAlt}
          fill
          priority
          sizes="(min-width: 1024px) 680px, 100vw"
          className="object-contain p-4 transition duration-700 group-hover:scale-[1.01]"
        />
      </div>
    </div>
  );
}
