"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LineChart } from "lucide-react";
import {
  DashboardSidebarNavigation,
  isJournalWorkflowPath,
  localizedDashboardText,
} from "@/components/dashboard/DashboardSidebarNavigation";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { DashboardThemeToggle, useDashboardTheme } from "@/components/dashboard/dashboard-theme";
import { DashboardTutorialButton } from "@/components/dashboard/DashboardTutorialButton";
import { TradingWorkflowStrip } from "@/components/journal/TradingWorkflowStrip";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export function JournalShell({
  children,
  topContent,
  initialTheme = "dark",
  showAdmin = false,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  initialTheme?: DashboardTheme;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { theme, isDark, applyTheme } = useDashboardTheme(initialTheme);
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
    t("journal.shell.subtitle"),
    "journal.shell.subtitle",
    "Plan, record, review, and improve each trade.",
    "برنامه ریزی، ثبت، بررسی و بهبود هر معامله"
  );
  const isRtl = language === "fa";

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
            <div
              className={cn(
                "flex h-16 items-center gap-3 border-b px-6",
                isDark ? "border-slate-800" : "border-slate-200"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  isDark ? "bg-blue-600/15 text-blue-400" : "bg-blue-50 text-blue-700"
                )}
              >
                <LineChart className="h-5 w-5" />
              </div>
              <div>
                <div className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>
                  Tradivix
                </div>
                <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>
                  {tradingJournalLabel}
                </div>
              </div>
            </div>

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
            <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-6">
              <div data-dashboard-tour="workspace" className="min-w-0">
                <div className={cn("text-base font-extrabold", isDark ? "text-white" : "text-slate-950")}>
                  {workspaceLabel}
                </div>
                <div className={cn("truncate text-sm font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
                  {workspaceSubtitle}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <DashboardTutorialButton isDark={isDark} />
                <LanguageSwitcher />
                <DashboardThemeToggle isDark={isDark} onThemeChange={applyTheme} />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">
            {topContent}
            {isJournalWorkflowPath(pathname) ? <TradingWorkflowStrip /> : null}
            {children}
          </main>
        </div>
      </div>
    </section>
  );
}
