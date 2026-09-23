"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BriefcaseBusiness,
  CircleHelp,
  CreditCard,
  Menu,
  Moon,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";
import { DashboardSidebarNavigation } from "@/components/dashboard/DashboardSidebarNavigation";
import { RiskNotificationBell } from "@/components/dashboard/RiskNotificationBell";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

function UserMenu({
  isDark,
  userName,
  userEmail,
  userImage,
  onThemeChange,
}: {
  isDark: boolean;
  userName: string;
  userEmail?: string | null;
  userImage?: string | null;
  onThemeChange: (theme: DashboardTheme) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();

  useEffect(() => {
    function closeMenu(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const linkClass =
    "flex min-h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white";

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        aria-label={language === "fa" ? `منوی کاربر ${userName}` : `${userName} user menu`}
        className="dashboard-user-trigger grid h-9 w-9 place-items-center rounded-lg text-white transition hover:bg-white/[0.07]"
      >
        <span className="grid h-7 w-7 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shadow-sm ring-1 ring-white/10">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </span>
        <span className="sr-only">{userName}</span>
      </button>

      {open ? (
        <div
          role="menu"
          dir={language === "fa" ? "rtl" : "ltr"}
          className="absolute end-0 top-[calc(100%+8px)] z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 text-slate-950 shadow-[0_18px_55px_rgba(15,23,42,0.2)] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          <div className="border-b border-slate-200 px-3 pb-3 pt-2 dark:border-slate-700">
            <p className="truncate text-sm font-bold">{userName}</p>
            {userEmail ? <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{userEmail}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-3 dark:border-slate-700">
            <span className="text-sm font-semibold">{language === "fa" ? "پوسته" : "Theme"}</span>
            <div className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                aria-label={language === "fa" ? "پوسته روشن" : "Light theme"}
                aria-pressed={!isDark}
                onClick={() => onThemeChange("light")}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full transition",
                  !isDark ? "bg-white text-amber-500 shadow-sm" : "text-slate-500"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label={language === "fa" ? "پوسته تیره" : "Dark theme"}
                aria-pressed={isDark}
                onClick={() => onThemeChange("dark")}
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full transition",
                  isDark ? "bg-slate-700 text-sky-300 shadow-sm" : "text-slate-500"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-0.5 py-2">
            <Link href="/contact" className={linkClass} onClick={() => setOpen(false)}>
              <CircleHelp className="h-4 w-4" />
              {language === "fa" ? "راهنما و پشتیبانی" : "Help & support"}
            </Link>
            <Link href="/dashboard/accounts" className={linkClass} onClick={() => setOpen(false)}>
              <BriefcaseBusiness className="h-4 w-4" />
              {language === "fa" ? "حساب‌های معاملاتی" : "Trading accounts"}
            </Link>
            <Link href="/premium" className={linkClass} onClick={() => setOpen(false)}>
              <CreditCard className="h-4 w-4" />
              {language === "fa" ? "اشتراک" : "Subscription"}
            </Link>
            <Link href="/dashboard/settings" className={linkClass} onClick={() => setOpen(false)}>
              <Settings className="h-4 w-4" />
              {language === "fa" ? "تنظیمات" : "Settings"}
            </Link>
          </div>

          <div className="border-y border-slate-200 px-2 py-2 dark:border-slate-700">
            <LanguageSwitcher />
          </div>

          <DashboardSignOutButton className="mt-1 h-9 rounded-lg px-3 text-sm hover:bg-red-50 dark:hover:bg-red-500/10" />
        </div>
      ) : null}
    </div>
  );
}

export function DashboardShell({
  children,
  topContent,
  showAdmin = false,
  initialTheme = "light",
  userName = "Trader",
  userEmail,
  userImage,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  showAdmin?: boolean;
  initialTheme?: DashboardTheme;
  userId?: string;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
}) {
  const pathname = usePathname();
  const { language } = useLanguage();
  const { theme, isDark, applyTheme } = useDashboardTheme(initialTheme);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const normalizedPathname = pathname.replace(/\/+$/, "") || "/";
  const isBacktestWorkspace = normalizedPathname === "/dashboard/backtest";
  const isPerformanceDashboard = normalizedPathname === "/dashboard";
  const isCalendarWorkspace = normalizedPathname === "/journal/calendar";
  const journalPathParts = normalizedPathname.split("/").filter(Boolean);
  const isTradeDetailWorkspace = journalPathParts.length === 2
    && journalPathParts[0] === "journal"
    && !["analytics", "calendar", "checklists", "playbooks"].includes(journalPathParts[1]);
  const [profile, setProfile] = useState({ name: userName, image: userImage });
  const displayName = profile.name?.trim() || userEmail?.split("@")[0] || "Trader";

  useEffect(() => {
    setProfile({ name: userName, image: userImage });
  }, [userImage, userName]);

  useEffect(() => {
    function updateProfile(event: Event) {
      const detail = (event as CustomEvent<{ name?: string | null; image?: string | null }>).detail;

      if (!detail) {
        return;
      }

      setProfile((current) => ({
        name: detail.name === undefined ? current.name : detail.name,
        image: detail.image === undefined ? current.image : detail.image,
      }));
    }

    window.addEventListener("profile-updated", updateProfile);
    return () => window.removeEventListener("profile-updated", updateProfile);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  function toggleSidebar() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSidebarOpen((value) => !value);
      return;
    }

    setMobileSidebarOpen((value) => !value);
  }

  return (
    <section
      className={cn(
        "dashboard-shell themeable-shell min-h-screen transition-colors",
        isDark ? "dark bg-[#090d14] text-[#E5E7EB]" : "bg-[#f5f6f8] text-slate-950"
      )}
      data-dashboard-theme={theme}
      dir="ltr"
    >
      <header className="dashboard-topbar fixed inset-x-0 top-0 z-40 h-[60px] border-b border-white/[0.06] bg-[#12151b] text-white shadow-[0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={language === "fa" ? "باز و بسته کردن منوی کناری" : "Toggle sidebar"}
              aria-expanded={desktopSidebarOpen || mobileSidebarOpen}
              className="dashboard-menu-toggle dashboard-topbar-control grid h-9 w-9 shrink-0 place-items-center rounded-lg"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href="/dashboard/home" aria-label="Ingyardy home" className="flex min-w-0 items-center">
              <Image
                src="/images/logo.png"
                alt="Ingyardy"
                width={515}
                height={141}
                priority
                className="h-7 w-auto max-w-[145px] object-contain brightness-0 invert sm:max-w-[165px]"
              />
            </Link>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/dashboard/ai-reader"
              aria-current={normalizedPathname === "/dashboard/ai-reader" ? "page" : undefined}
              className={cn(
                "dashboard-topbar-control inline-flex h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold text-slate-100 shadow-sm transition hover:border-white/15 hover:bg-white/10",
                normalizedPathname === "/dashboard/ai-reader"
                  ? "border-sky-400/40 bg-sky-400/10"
                  : "border-white/10 bg-white/[0.055]"
              )}
            >
              <Image
                src="/images/ingyardy-ai.png"
                alt=""
                width={128}
                height={128}
                className="h-6 w-6 shrink-0 object-contain drop-shadow-[0_0_6px_rgba(56,189,248,0.28)]"
              />
              <span className="hidden sm:inline">Ingyardy AI</span>
            </Link>
            <RiskNotificationBell />
            <UserMenu
              isDark={isDark}
              userName={displayName}
              userEmail={userEmail}
              userImage={profile.image}
              onThemeChange={applyTheme}
            />
          </div>
        </div>
      </header>

      <div className="flex min-h-screen pt-[60px]">
        <aside
          className={cn(
            "dashboard-sidebar fixed bottom-0 left-0 top-[60px] z-30 hidden overflow-visible border-e border-white/[0.05] bg-[#15191f] shadow-xl transition-[width] duration-200 lg:block",
            desktopSidebarOpen ? "w-[244px]" : "w-[72px]"
          )}
        >
          <DashboardSidebarNavigation isDark showAdmin={showAdmin} collapsed={!desktopSidebarOpen} />
        </aside>

        <button
          type="button"
          aria-label={language === "fa" ? "بستن منوی کناری" : "Close sidebar"}
          onClick={() => setMobileSidebarOpen(false)}
          className={cn(
            "fixed inset-0 top-[60px] z-20 bg-slate-950/50 backdrop-blur-[2px] transition-opacity lg:hidden",
            mobileSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          )}
        />
        <aside
          className={cn(
            "dashboard-sidebar fixed bottom-0 left-0 top-[60px] z-30 w-[280px] overflow-hidden border-e border-white/[0.05] bg-[#15191f] shadow-2xl transition-transform duration-200 lg:hidden",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <DashboardSidebarNavigation isDark showAdmin={showAdmin} mobileDrawer />
        </aside>

        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[margin] duration-200",
            desktopSidebarOpen ? "lg:ml-[244px]" : "lg:ml-[72px]"
          )}
          dir={language === "fa" ? "rtl" : "ltr"}
        >
          <main
            className={cn(
              "w-full flex-1",
              isBacktestWorkspace || isTradeDetailWorkspace
                ? "flex flex-col px-3 py-3 lg:h-[calc(100dvh-60px)] lg:min-h-0 lg:max-w-none lg:flex-none lg:overflow-hidden"
                : cn(
                    "mx-auto px-4 py-7 sm:px-6 lg:px-8 lg:py-10",
                    isCalendarWorkspace || isPerformanceDashboard ? "max-w-[1600px]" : "max-w-[1120px]"
                  )
            )}
          >
            {topContent ? (
              <div className={cn("mb-5", (isBacktestWorkspace || isTradeDetailWorkspace) && "backtest-subscription-compact shrink-0")}>
                {topContent}
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </section>
  );
}
