"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileText,
  Gauge,
  History,
  Home,
  ListChecks,
  PlaySquare,
  Settings,
  ShieldCheck,
  Sparkles,
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

// Keep the existing information architecture intact; only its visual treatment changes.
const primaryItems: SidebarItem[] = [
  { labelKey: "dashboard.nav.home", labelEn: "Home", labelFa: "خانه", href: "/dashboard/home", icon: Home },
  { labelKey: "dashboard.nav.dashboard", labelEn: "Dashboard", labelFa: "داشبورد", href: "/dashboard", icon: Gauge },
  { labelKey: "dashboard.nav.trades", labelEn: "Trades", labelFa: "معاملات", href: "/journal", aliases: ["/dashboard/trades"], icon: ListChecks },
  { labelKey: "dashboard.nav.calendar", labelEn: "Day View", labelFa: "نمای روزانه", href: "/journal/calendar", icon: CalendarDays },
  { labelKey: "dashboard.nav.reports", labelEn: "Reports", labelFa: "گزارش‌ها", href: "/dashboard/reports", icon: FileText },
];

const sidebarGroups: SidebarGroup[] = [
  {
    labelEn: "Journal",
    labelFa: "ژورنال",
    items: [
      { labelKey: "dashboard.nav.dailyJournal", labelEn: "Daily Journal", labelFa: "ژورنال روزانه", href: "/dashboard/daily-journal", icon: BookOpenCheck },
    ],
  },
  {
    labelEn: "Trading tools",
    labelFa: "ابزار معامله",
    items: [
      { labelKey: "dashboard.nav.playbooks", labelEn: "Playbooks", labelFa: "پلی‌بوک‌ها", href: "/journal/playbooks", icon: PlaySquare },
      { labelKey: "journal.nav.checklists", labelEn: "Checklists", labelFa: "چک‌لیست‌ها", href: "/journal/checklists", icon: ClipboardCheck },
      { labelKey: "dashboard.nav.backtest", labelEn: "Market Replay", labelFa: "بازپخش بازار", href: "/dashboard/backtest", icon: BarChart3 },
      { labelKey: "dashboard.nav.backtestReports", labelEn: "Backtest Reports", labelFa: "گزارش بک‌تست", href: "/dashboard/backtest-reports", icon: History },
      { labelKey: "dashboard.nav.positionSizing", labelEn: "Position Sizing", labelFa: "محاسبه حجم", href: "/dashboard/position-sizing", icon: Calculator },
      { labelKey: "dashboard.nav.propFirmTracker", labelEn: "Prop Firm Tracker", labelFa: "پراپ‌فرم‌ها", href: "/dashboard/prop-firms", icon: ShieldCheck },
      { labelKey: "dashboard.nav.riskGuardian", labelEn: "Risk Guardian", labelFa: "نگهبان ریسک", href: "/dashboard/risk-guardian", icon: ShieldCheck },
    ],
  },
  {
    labelEn: "More insights",
    labelFa: "تحلیل بیشتر",
    items: [
      { labelKey: "dashboard.nav.aiAssistant", labelEn: "Ingyardy AI", labelFa: "هوش مصنوعی اینگاردی", href: "/dashboard/ai-reader", icon: Sparkles },
      { labelKey: "dashboard.nav.analytics", labelEn: "Analytics", labelFa: "تحلیل‌ها", href: "/journal/analytics", icon: BarChart3 },
    ],
  },
  {
    labelEn: "Market",
    labelFa: "بازار",
    items: [
      { labelKey: "dashboard.nav.marketRadar", labelEn: "Market Scanner", labelFa: "اسکن بازار", href: "/dashboard/market-radar", icon: BrainCircuit },
      { labelKey: "dashboard.nav.economicCalendar", labelEn: "Economic Calendar", labelFa: "تقویم اقتصادی", href: "/economic-calendar", icon: CalendarDays },
    ],
  },
  {
    labelEn: "Account",
    labelFa: "حساب کاربری",
    items: [
      { labelKey: "dashboard.nav.accountsAndMt5", labelEn: "Trading Accounts and MT5", labelFa: "حساب‌های معاملاتی و MT5", href: "/dashboard/accounts", icon: BriefcaseBusiness },
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
  if (item.href === "/journal") {
    const tradeDetail =
      /^\/journal\/[^/]+$/.test(pathname) &&
      !["/journal/calendar", "/journal/analytics", "/journal/checklists", "/journal/playbooks"].includes(pathname);
    return pathname === "/journal" || tradeDetail || Boolean(item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)));
  }

  if (item.href === "/dashboard" || item.href === "/premium") {
    return pathname === item.href || Boolean(item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)));
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`) || Boolean(item.aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)));
}

export function isJournalWorkflowPath(pathname: string) {
  return pathname === "/journal" || (pathname.startsWith("/journal/") && !pathname.startsWith("/journal/analytics"));
}

type SidebarTooltip = {
  label: string;
  top: number;
  pinned: boolean;
};

function NavigationList({
  showAdmin,
  pathname,
  collapsed,
}: {
  showAdmin: boolean;
  pathname: string;
  collapsed: boolean;
}) {
  const { language, t } = useLanguage();
  const groups = showAdmin ? [...sidebarGroups, adminGroup] : sidebarGroups;
  const [tooltip, setTooltip] = useState<SidebarTooltip | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }, []);

  function showTooltip(event: { currentTarget: HTMLElement }, label: string, pinned = false) {
    if (!collapsed) return;
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, pinned });

    if (pinned) {
      tooltipTimer.current = setTimeout(() => setTooltip(null), 1600);
    }
  }

  function hideTooltip() {
    if (!tooltip?.pinned) setTooltip(null);
  }

  function itemLink(item: SidebarItem, nested = false) {
    const Icon = item.icon;
    const active = isActiveNavItem(pathname, item);
    const translated = t(item.labelKey);
    const label = item.href === "/journal/calendar"
      ? language === "fa" ? item.labelFa : item.labelEn
      : localizedDashboardText(language, translated, item.labelKey, item.labelEn, item.labelFa);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? label : undefined}
        onMouseEnter={(event) => showTooltip(event, label)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(event, label)}
        onBlur={hideTooltip}
        onClick={(event) => showTooltip(event, label, true)}
        className={cn(
          "dashboard-sidebar-item group/item relative flex min-h-10 items-center rounded-lg text-[13px] font-semibold",
          collapsed ? "mx-auto h-11 w-11 justify-center px-0" : "gap-3 px-3",
          !collapsed && nested && (item.href === "/dashboard/backtest-reports" ? "ps-9" : "ps-5"),
          active
            ? "bg-white/[0.09] shadow-[inset_3px_0_0_#38bdf8]"
            : ""
        )}
      >
        <Icon
          className={cn(
            "dashboard-sidebar-icon h-[18px] w-[18px] shrink-0",
            active && "dashboard-sidebar-icon-active"
          )}
        />
        {!collapsed ? <span className="dashboard-sidebar-label truncate">{label}</span> : null}
      </Link>
    );
  }

  if (collapsed) {
    const collapsedItems = [
      ...primaryItems,
      ...groups.flatMap((group) => group.items),
    ];

    return (
      <>
        <div className="space-y-1.5 py-1">
          {collapsedItems.map((item) => itemLink(item))}
        </div>
        {tooltip && typeof document !== "undefined"
          ? createPortal(
              <span
                role="tooltip"
                dir={language === "fa" ? "rtl" : "ltr"}
                className="pointer-events-none fixed left-[78px] z-[80] -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white shadow-xl ring-1 ring-white/10"
                style={{ top: tooltip.top }}
              >
                <i className="absolute end-full top-1/2 -translate-y-1/2 border-y-[6px] border-e-[7px] border-y-transparent border-e-slate-950" />
                {tooltip.label}
              </span>,
              document.body
            )
          : null}
      </>
    );
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">{primaryItems.map((item) => itemLink(item))}</div>
      <div className="my-3 border-t border-white/[0.07]" />
      {groups.map((group) => {
        const active = group.items.some((item) => isActiveNavItem(pathname, item));

        return (
          <details key={group.labelEn} open={active ? true : undefined} className="group rounded-lg">
            <summary className="dashboard-sidebar-group-label flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] [&::-webkit-details-marker]:hidden">
              {language === "fa" ? group.labelFa : group.labelEn}
              <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="space-y-1 pb-2 pt-1">{group.items.map((item) => itemLink(item, true))}</div>
          </details>
        );
      })}
    </div>
  );
}

export function DashboardSidebarNavigation({
  showAdmin = false,
  mobileDrawer = false,
  collapsed = false,
}: {
  isDark: boolean;
  showAdmin?: boolean;
  mobileDrawer?: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <nav
      data-dashboard-tour="nav"
      dir={language === "fa" ? "rtl" : "ltr"}
      className={cn(
        "h-full overflow-y-auto py-5",
        collapsed ? "px-2" : "px-3",
        mobileDrawer && "pb-8"
      )}
    >
      <NavigationList showAdmin={showAdmin} pathname={pathname} collapsed={collapsed} />
    </nav>
  );
}
