"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AtSign,
  Facebook,
  Globe2,
  Instagram,
  Linkedin,
  Send,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { TELEGRAM_CHANNEL_URL } from "@/lib/contact-links";
import { useLanguage } from "@/lib/language-context";

const socialLinks = [
  { label: "Telegram", href: TELEGRAM_CHANNEL_URL, icon: Send },
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "LinkedIn", href: "#", icon: Linkedin },
  { label: "Facebook", href: "#", icon: Facebook },
  { label: "Website", href: "#", icon: Globe2 },
];

const footerCopy = {
  en: {
    brand: "Tradivix",
    quickLinks: "Quick Links",
    information: "Information",
    contactUs: "Contact Us",
    providerDescription:
      "AI-powered trading journal for MT5 sync, trade review, playbooks, analytics, and reports.",
    copyright: "© {year} Tradivix. All rights reserved.",
    address: "Address: Turkey",
    email: "Email: info@inguardy.com",
    links: {
      home: "Home",
      signals: "Signals",
      blog: "Blog",
      about: "About Us",
      contact: "Contact",
    },
  },
  fa: {
    brand: "Tradivix",
    quickLinks: "لینک‌های سریع",
    information: "اطلاعات",
    contactUs: "تماس با ما",
    providerDescription:
      "ژورنال معاملاتی هوشمند برای همگام‌سازی MT5، بررسی معامله، پلی‌بوک، تحلیل و گزارش‌ها.",
    copyright: "© {year} Tradivix. تمامی حقوق محفوظ است.",
    address: "آدرس: ترکیه",
    email: "ایمیل: info@inguardy.com",
    links: {
      home: "خانه",
      signals: "سیگنال‌ها",
      blog: "وبلاگ",
      about: "درباره ما",
      contact: "تماس",
    },
  },
} as const;

export function Footer() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const currentYear = new Date().getFullYear();
  const copy = footerCopy[language];

  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/journal") ||
    pathname?.startsWith("/premium")
  ) {
    return null;
  }

  const direction = language === "fa" ? "rtl" : "ltr";
  const columnTextAlign = language === "fa" ? "text-right" : "text-left";
  const isFarsi = language === "fa";
  const brandAlignment = isFarsi ? "items-end" : "items-start";
  const socialAlignment = isFarsi ? "justify-end" : "justify-start";
  const footerContentLayout =
    "grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[360px_150px_150px_220px] lg:justify-between lg:gap-10";
  const bottomAlignment =
    isFarsi
      ? "sm:flex-row-reverse sm:text-right"
      : "sm:flex-row sm:text-left";
  const copyright = copy.copyright.replace("{year}", String(currentYear));
  const email = copy.email.replace(/^Email:\s*/i, "").replace(/^ایمیل:\s*/i, "");

  return (
    <footer
      className={`relative overflow-hidden border-t border-white/10 bg-[#050816] py-16 text-white sm:py-20 ${
        language === "fa" ? "landing-fa-font" : "landing-en-font"
      }`}
      dir={direction}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      <div className="container relative mx-auto max-w-screen-xl px-4">
        <div
          className={footerContentLayout}
          dir="ltr"
        >
          <div
            className={`flex max-w-sm flex-col ${brandAlignment} ${columnTextAlign}`}
            dir={direction}
          >
            <Link href="/" className="inline-flex">
              <Image
                src="/images/tradivix_logo_alpha.png"
                alt={copy.brand}
                width={170}
                height={56}
                className="h-auto w-40 object-contain"
                priority={false}
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-200">
              {copy.providerDescription}
            </p>

            <div className="pt-8" dir="ltr">
              <div className={`flex flex-wrap items-center gap-2.5 ${socialAlignment}`}>
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={
                      href.startsWith("http") ? "noopener noreferrer" : undefined
                    }
                    aria-label={label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/10 text-slate-100 transition hover:-translate-y-0.5 hover:border-blue-300/50 hover:bg-blue-400/20 hover:text-white"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <FooterColumn title={copy.quickLinks} language={language}>
            <FooterLink href="/signals">{copy.links.signals}</FooterLink>
            <FooterLink href="/blog">{copy.links.blog}</FooterLink>
          </FooterColumn>

          <FooterColumn title={copy.information} language={language}>
            <FooterLink href="/about">{copy.links.about}</FooterLink>
            <FooterLink href="/contact">{copy.links.contact}</FooterLink>
          </FooterColumn>

          <div
            className={`flex w-full flex-col ${
              isFarsi ? "items-end text-right" : "items-start text-left"
            }`}
            dir={direction}
          >
            <h3 className="mb-5 text-base font-semibold text-white">
              {copy.contactUs}
            </h3>
            <a
              href={`mailto:${email}`}
              className="inline-flex items-center gap-2 text-sm leading-6 text-slate-300 transition hover:text-blue-300"
              dir="ltr"
            >
              <span>{email}</span>
              <AtSign className="h-4 w-4 shrink-0 text-blue-300" />
            </a>
          </div>
        </div>

        <div
          className={`mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-sm text-slate-400 sm:items-center sm:justify-between ${bottomAlignment}`}
        >
          <p className="min-w-0">{copyright}</p>
          <div className="h-px w-20 bg-gradient-to-r from-blue-400/0 via-blue-400/70 to-blue-400/0 sm:order-first" />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  language,
  title,
  children,
}: {
  language: "en" | "fa";
  title: string;
  children: ReactNode;
}) {
  const itemAlignment = language === "fa" ? "items-end" : "items-start";
  const columnAlignment = language === "fa" ? "items-end" : "items-start";
  const contentAlignment = language === "fa" ? "text-right" : "text-left";

  return (
    <nav
      className={`flex w-full flex-col ${columnAlignment} space-y-3 ${
        language === "fa" ? "text-right" : "text-left"
      }`}
      dir={language === "fa" ? "rtl" : "ltr"}
      aria-label={title}
    >
      <h3 className="mb-5 w-full text-base font-semibold text-white">{title}</h3>
      <div className={`flex w-full flex-col gap-3 text-slate-300 ${itemAlignment} ${contentAlignment}`}>
        {children}
      </div>
    </nav>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex w-full text-sm font-medium text-slate-300 transition hover:text-blue-300"
    >
      {children}
    </Link>
  );
}
