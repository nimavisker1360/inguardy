import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import "tw-animate-css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ToastProvider } from "@/components/ui/toast-provider";
import {
  DASHBOARD_THEME_COOKIE_KEY,
  DASHBOARD_THEME_STORAGE_KEY,
} from "@/lib/dashboard-theme";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_KEY,
  LANGUAGE_STORAGE_KEY,
  type Language,
} from "@/lib/language-preferences";
import {
  LanguageProvider,
} from "@/lib/language-context";

export const metadata: Metadata = {
  title: "Tradivix - AI Trading Journal",
  description:
    "AI-powered trading journal for MT5 sync, trade review, playbooks, analytics, and reports",
};

const dashboardThemeScript = `
(function () {
  try {
    var path = window.location.pathname;
    var isDashboardRoute = /^\\/(dashboard|journal|admin|economic-calendar|signals|premium)(\\/|$)/.test(path);
    if (!isDashboardRoute) return;

    var storedTheme = window.localStorage.getItem("${DASHBOARD_THEME_STORAGE_KEY}");
    var cookieMatch = document.cookie.match(/(?:^|; )${DASHBOARD_THEME_COOKIE_KEY}=(light|dark)(?:;|$)/);
    var theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : cookieMatch
        ? cookieMatch[1]
        : "dark";
    var root = document.documentElement;
    root.dataset.dashboardTheme = theme;
    root.classList.toggle("dark", theme === "dark");
  } catch (error) {}
})();
`;

const languagePreferenceScript = `
(function () {
  try {
    var storedLanguage = window.localStorage.getItem("${LANGUAGE_STORAGE_KEY}");
    var cookieMatch = document.cookie.match(/(?:^|; )${LANGUAGE_COOKIE_KEY}=(en|fa)(?:;|$)/);
    var language = storedLanguage === "en" || storedLanguage === "fa"
      ? storedLanguage
      : cookieMatch
        ? cookieMatch[1]
        : "${DEFAULT_LANGUAGE}";

    var root = document.documentElement;
    root.lang = language;
    root.dir = language === "fa" ? "rtl" : "ltr";
    window.localStorage.setItem("${LANGUAGE_STORAGE_KEY}", language);
    document.cookie = "${LANGUAGE_COOKIE_KEY}=" + language + "; path=/; max-age=31536000; SameSite=Lax";
  } catch (error) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const languageCookie = cookieStore.get(LANGUAGE_COOKIE_KEY)?.value;
  const initialLanguage: Language =
    languageCookie === "en" || languageCookie === "fa"
      ? languageCookie
      : DEFAULT_LANGUAGE;

  return (
    <html
      className="bg-black"
      dir={initialLanguage === "fa" ? "rtl" : "ltr"}
      lang={initialLanguage}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: languagePreferenceScript }} />
        <script dangerouslySetInnerHTML={{ __html: dashboardThemeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col overflow-x-hidden bg-black text-white">
        <LanguageProvider initialLanguage={initialLanguage}>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <ToastProvider />
        </LanguageProvider>
      </body>
    </html>
  );
}
