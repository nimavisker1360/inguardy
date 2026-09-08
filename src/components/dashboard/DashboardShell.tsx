"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Download } from "lucide-react";
import { DashboardTrainingPath } from "@/components/dashboard/DashboardTrainingPath";
import {
  DashboardSidebarNavigation,
  localizedDashboardText,
} from "@/components/dashboard/DashboardSidebarNavigation";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { DashboardThemeToggle, useDashboardTheme } from "@/components/dashboard/dashboard-theme";
import { DashboardTutorialButton } from "@/components/dashboard/DashboardTutorialButton";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const MT5_BOT_DOWNLOAD_URL = "/api/downloads/trade-journal-recorder";

export function DashboardShell({
  children,
  topContent,
  showAdmin = false,
  initialTheme = "dark",
  userId,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  showAdmin?: boolean;
  initialTheme?: DashboardTheme;
  userId?: string;
}) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { theme, isDark, applyTheme } = useDashboardTheme(initialTheme);
  const isRtl = language === "fa";
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const showTrainingPath = normalizedPathname === "/dashboard";
  const translatedDownloadBotLabel = t("dashboard.shell.downloadMt5Bot");
  const stableDownloadBotLabel = localizedDashboardText(
    language,
    translatedDownloadBotLabel,
    "dashboard.shell.downloadMt5Bot",
    "Download MT5 Package",
    "دانلود پکیج MT5"
  );
  const tradingJournalLabel = localizedDashboardText(
    language,
    t("dashboard.shell.tradingJournal"),
    "dashboard.shell.tradingJournal",
    "Trading Journal",
    "ژورنال معاملاتی"
  );
  const workspaceLabel = localizedDashboardText(
    language,
    t("dashboard.shell.workspace"),
    "dashboard.shell.workspace",
    "Journal Workspace",
    "فضای کاری ژورنال"
  );
  const workspaceSubtitle = localizedDashboardText(
    language,
    t("dashboard.shell.subtitle"),
    "dashboard.shell.subtitle",
    "Trading operations dashboard",
    "داشبورد عملیات معاملاتی"
  );
  return (
    <section
      className={cn(
        "dashboard-shell themeable-shell min-h-screen transition-colors",
        isDark ? "dark bg-[#020617] text-[#E5E7EB]" : "bg-slate-50 text-slate-950"
      )}
      data-dashboard-theme={theme}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "border-b lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0",
            isRtl ? "lg:border-l" : "lg:border-r",
            isDark ? "border-slate-800 bg-[#0F172A]" : "border-slate-200 bg-white"
          )}
        >
          <div className="flex h-full flex-col">
            <Link
              href="/dashboard"
              aria-label="Tradivix dashboard"
              className={cn(
                "flex h-16 items-center gap-3 border-b px-6 transition",
                isDark ? "hover:bg-slate-900/50" : "hover:bg-slate-50",
                isDark ? "border-slate-800" : "border-slate-200"
              )}
            >
              <Image
                src={isDark ? "/images/tradivix_logo_alpha.png" : "/images/tradivix_logo_dark.png"}
                alt="Tradivix"
                width={180}
                height={78}
                priority
                className="h-8 w-auto shrink-0 object-contain"
              />
              <div className="min-w-0">
                <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                  {tradingJournalLabel}
                </div>
              </div>
            </Link>

            <DashboardSidebarNavigation isDark={isDark} showAdmin={showAdmin} />

            <div
              className={cn(
                "px-4 pb-5 pt-3 lg:mt-auto lg:border-t",
                isDark ? "lg:border-slate-800" : "lg:border-slate-200"
              )}
            >
              <DashboardSignOutButton
                className={cn(
                  "h-11 w-full rounded-xl px-3",
                  isDark ? "hover:bg-red-500/10" : "hover:bg-red-50"
                )}
              />
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={cn(
              "sticky top-0 z-20 border-b shadow-sm backdrop-blur",
              isDark
                ? "border-slate-800 bg-[#020617]/90"
                : "border-blue-100 bg-gradient-to-r from-blue-50/95 via-white/95 to-cyan-50/95"
            )}
          >
            <div className="mx-auto flex min-h-16 w-full max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div data-dashboard-tour="workspace" className="min-w-0">
                <div className={cn("text-base font-extrabold", isDark ? "text-white" : "text-slate-950")}>
                  {workspaceLabel}
                </div>
                <div className={cn("truncate text-sm font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
                  {workspaceSubtitle}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <a
                  data-dashboard-tour="mt5"
                  href={MT5_BOT_DOWNLOAD_URL}
                  className={cn(
                    "download-attention inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
                    isDark
                      ? "border-blue-500/40 bg-blue-600 text-white hover:bg-blue-500"
                      : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                  )}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{stableDownloadBotLabel}</span>
                  <span className="sm:hidden">MT5</span>
                </a>
                <DashboardTutorialButton isDark={isDark} />
                <LanguageSwitcher />
                <DashboardThemeToggle isDark={isDark} onThemeChange={applyTheme} />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">
            {topContent}
            {showTrainingPath ? <DashboardTrainingPath userId={userId} /> : null}
            {children}
          </main>
        </div>
      </div>
    </section>
  );
}
