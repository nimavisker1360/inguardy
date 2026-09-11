"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ClipboardCheck,
  CreditCard,
  FileText,
  Gauge,
  History,
  ListChecks,
  PlaySquare,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type SidebarItem = {
  labelKey: string;
  labelEn: string;
  labelFa: string;
  href: string;
  aliases?: string[];
  icon: LucideIcon;
};

type SidebarGroup = {
  labelEn: string;
  labelFa: string;
  items: SidebarItem[];
};

const sidebarGroups: SidebarGroup[] = [
  {
    labelEn: "Home",
    labelFa: "خانه",
    items: [
      { labelKey: "dashboard.nav.dashboard", labelEn: "Dashboard", labelFa: "داشبورد", href: "/dashboard", icon: Gauge },
    ],
  },
  {
    labelEn: "Journal",
    labelFa: "ژورنال",
    items: [
      {
        labelKey: "dashboard.nav.trades",
        labelEn: "Trades",
        labelFa: "معاملات",
        href: "/journal",
        aliases: ["/dashboard/trades"],
        icon: ListChecks,
      },
      { labelKey: "dashboard.nav.dailyJournal", labelEn: "Daily Journal", labelFa: "ژورنال روزانه", href: "/dashboard/daily-journal", icon: BookOpenCheck },
      { labelKey: "dashboard.nav.calendar", labelEn: "Calendar", labelFa: "تقویم", href: "/journal/calendar", icon: CalendarDays },
    ],
  },
  {
    labelEn: "Trading Process",
    labelFa: "فرایند معامله",
    items: [
      { labelKey: "dashboard.nav.playbooks", labelEn: "Playbooks", labelFa: "پلی بوک ها", href: "/journal/playbooks", icon: PlaySquare },
      { labelKey: "journal.nav.checklists", labelEn: "Checklists", labelFa: "چک لیست ها", href: "/journal/checklists", icon: ClipboardCheck },
      { labelKey: "dashboard.nav.backtest", labelEn: "Market Replay", labelFa: "بک تست", href: "/dashboard/backtest", icon: BarChart3 },
      { labelKey: "dashboard.nav.backtestReports", labelEn: "Backtest Reports", labelFa: "گزارش بک تست", href: "/dashboard/backtest-reports", icon: History },
      { labelKey: "dashboard.nav.positionSizing", labelEn: "Position Sizing", labelFa: "محاسبه حجم", href: "/dashboard/position-sizing", icon: Calculator },
      { labelKey: "dashboard.nav.propFirmTracker", labelEn: "Prop Firm Tracker", labelFa: "پراپ فرم ها", href: "/dashboard/prop-firms", icon: ShieldCheck },
    ],
  },
  {
    labelEn: "Insights",
    labelFa: "بینش ها",
    items: [
      { labelKey: "dashboard.nav.analytics", labelEn: "Analytics", labelFa: "تحلیل ها", href: "/journal/analytics", icon: BarChart3 },
      { labelKey: "dashboard.nav.reports", labelEn: "Reports", labelFa: "گزارش ها", href: "/dashboard/reports", icon: FileText },
    ],
  },
  {
    labelEn: "Market",
    labelFa: "بازار",
    items: [
      {
        labelKey: "dashboard.nav.marketRadar",
        labelEn: "Market Scanner",
        labelFa: "اسکن بازار",
        href: "/dashboard/market-radar",
        aliases: ["/dashboard/ai-reader"],
        icon: BrainCircuit,
      },
      { labelKey: "dashboard.nav.economicCalendar", labelEn: "Economic Calendar", labelFa: "تقویم اقتصادی", href: "/economic-calendar", icon: CalendarDays },
      { labelKey: "dashboard.nav.latestSignals", labelEn: "Latest Signals", labelFa: "آخرین سیگنال ها", href: "/dashboard/latest-signals", icon: Activity },
    ],
  },
  {
    labelEn: "Account",
    labelFa: "حساب",
    items: [
      { labelKey: "dashboard.nav.accountsAndMt5", labelEn: "Trading Accounts and MT5", labelFa: "حساب های معاملاتی و MT5", href: "/dashboard/accounts", icon: BriefcaseBusiness },
      { labelKey: "dashboard.nav.subscription", labelEn: "Subscription", labelFa: "اشتراک", href: "/premium", icon: CreditCard },
      { labelKey: "dashboard.nav.settings", labelEn: "Settings", labelFa: "تنظیمات", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

const adminGroup: SidebarGroup = {
  labelEn: "Admin",
  labelFa: "ادمین",
  items: [
    { labelKey: "dashboard.nav.admin", labelEn: "Admin", labelFa: "ادمین", href: "/admin/dashboard", icon: ShieldCheck },
  ],
};

export function localizedDashboardText(
  language: "en" | "fa",
  translated: string,
  key: string,
  labelEn: string,
  labelFa: string
) {
  if (language === "fa") {
    return translated === key || translated === labelEn ? labelFa : translated;
  }

  return translated === key ? labelEn : translated;
}

function isActiveNavItem(pathname: string, item: SidebarItem) {
  if (item.href === "/dashboard" || item.href === "/journal" || item.href === "/premium") {
    return pathname === item.href || Boolean(item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)));
  }

  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    Boolean(item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)))
  );
}

export function isJournalWorkflowPath(pathname: string) {
  if (pathname === "/journal") {
    return true;
  }

  return (
    pathname.startsWith("/journal/") &&
    !pathname.startsWith("/journal/analytics")
  );
}

export function DashboardSidebarNavigation({
  isDark,
  showAdmin = false,
}: {
  isDark: boolean;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const groups = showAdmin ? [...sidebarGroups, adminGroup] : sidebarGroups;

  return (
    <nav
      data-dashboard-tour="nav"
      className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-1 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:overflow-x-hidden lg:px-3"
    >
      {groups.map((group) => (
        <div key={group.labelEn} className="contents lg:block">
          <div
            className={cn(
              "hidden rounded-md px-3 py-1 text-xs font-black uppercase tracking-wide lg:block",
              isDark ? "bg-slate-800/70 text-slate-100" : "bg-slate-100 text-slate-900"
            )}
          >
            {language === "fa" ? group.labelFa : group.labelEn}
          </div>
          <div className="contents lg:grid lg:gap-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const itemLabel = localizedDashboardText(
                language,
                t(item.labelKey),
                item.labelKey,
                item.labelEn,
                item.labelFa
              );
              const isActive = isActiveNavItem(pathname, item);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex h-10 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium transition lg:h-9 lg:w-full lg:rounded-lg",
                    isActive
                      ? isDark
                        ? "bg-blue-600/15 text-blue-100 ring-1 ring-blue-500/30"
                        : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                      : isDark
                        ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive
                        ? isDark
                          ? "text-blue-300"
                          : "text-blue-700"
                        : isDark
                          ? "text-slate-400"
                          : "text-slate-500"
                    )}
                  />
                  <span className="truncate">{itemLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
