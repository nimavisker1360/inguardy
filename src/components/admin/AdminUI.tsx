"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { HTMLAttributes, ReactNode } from "react";
import {
  BadgeDollarSign,
  CreditCard,
  ExternalLink,
  Gauge,
  LayoutDashboard,
  ListChecks,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardSignOutButton } from "@/components/dashboard/DashboardSignOutButton";
import { DashboardThemeToggle, useDashboardTheme } from "@/components/dashboard/dashboard-theme";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import type { DashboardTheme } from "@/lib/dashboard-theme";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", labelFa: "داشبورد", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Users", labelFa: "کاربران", href: "/admin/users", icon: Users },
  { label: "Payments", labelFa: "پرداخت‌ها", href: "/admin/payments", icon: CreditCard },
  { label: "Subscriptions", labelFa: "اشتراک‌ها", href: "/admin/subscriptions", icon: BadgeDollarSign },
  { label: "Plans", labelFa: "پلن‌ها", href: "/admin/plans", icon: ListChecks },
  { label: "Settings", labelFa: "تنظیمات", href: "/admin/settings", icon: Settings },
  { label: "Back to App", labelFa: "بازگشت به برنامه", href: "/dashboard", icon: ExternalLink },
];

const pageTitles: Record<string, { en: string; fa: string }> = {
  "/admin/dashboard": { en: "Admin Dashboard", fa: "داشبورد مدیریت" },
  "/admin/users": { en: "Users", fa: "کاربران" },
  "/admin/payments": { en: "Payments", fa: "پرداخت‌ها" },
  "/admin/subscriptions": { en: "Subscriptions", fa: "اشتراک‌ها" },
  "/admin/plans": { en: "Plans", fa: "پلن‌ها" },
  "/admin/settings": { en: "Settings", fa: "تنظیمات" },
};

export function AdminShell({
  children,
  adminEmail,
  initialTheme = "dark",
}: {
  children: ReactNode;
  adminEmail: string;
  initialTheme?: DashboardTheme;
}) {
  const pathname = usePathname();
  const { theme, isDark, applyTheme } = useDashboardTheme(initialTheme);
  const { language } = useLanguage();
  const isFa = language === "fa";
  const pageTitle =
    pageTitles[pathname]?.[isFa ? "fa" : "en"] ||
    (pathname.startsWith("/admin/users/")
      ? isFa ? "جزئیات کاربر" : "User Detail"
      : pathname.startsWith("/admin/payments/")
        ? isFa ? "جزئیات پرداخت" : "Payment Detail"
        : isFa ? "مدیریت" : "Admin");

  return (
    <section
      className={cn(
        "dashboard-shell themeable-shell min-h-screen transition-colors",
        isDark ? "dark bg-[#020617] text-slate-100" : "bg-slate-50 text-slate-950"
      )}
      data-dashboard-theme={theme}
      dir={language === "fa" ? "rtl" : "ltr"}
    >
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "border-b lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r",
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
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"
                )}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className={cn("text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>Tradivix</div>
                <div className={cn("text-xs", isDark ? "text-slate-400" : "text-slate-500")}>Admin Panel</div>
              </div>
            </div>
            <nav className="flex gap-2 overflow-x-auto px-4 py-4 lg:flex-1 lg:flex-col lg:overflow-visible">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium transition lg:w-full",
                      active
                        ? isDark
                          ? "bg-slate-800 text-white"
                          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : isDark
                          ? "text-slate-300 hover:bg-slate-800 hover:text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", active && !isDark ? "text-emerald-700" : isDark ? "text-slate-400" : "text-slate-500")} />
                    {isFa ? item.labelFa : item.label}
                  </Link>
                );
              })}
            </nav>

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
              "sticky top-0 z-20 border-b backdrop-blur",
              isDark ? "border-slate-800 bg-[#020617]/90" : "border-slate-200 bg-white/90"
            )}
          >
            <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between gap-4 px-6">
              <div className="min-w-0">
                <h1 className={cn("truncate text-sm font-semibold", isDark ? "text-white" : "text-slate-950")}>{pageTitle}</h1>
                <p className={cn("truncate text-xs", isDark ? "text-slate-400" : "text-slate-500")}>{adminEmail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <LanguageSwitcher />
                <DashboardThemeToggle isDark={isDark} onThemeChange={applyTheme} />
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn(
                    isDark
                      ? "border-slate-700 text-slate-100 hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                  )}
                >
                  <Link href="/dashboard">
                    <Gauge className="mr-2 h-4 w-4" />
                    {isFa ? "برنامه" : "App"}
                  </Link>
                </Button>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </section>
  );
}

export function AdminCard({ children, className, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return <div className={cn("rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-sm", className)} {...props}>{children}</div>;
}

export function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <AdminCard>
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </AdminCard>
  );
}

export function StatusBadge({ value, label }: { value?: string | null; label?: string }) {
  const status = value || "N/A";
  const palette = status.includes("ADMIN")
    ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
    : status.includes("CONFIRMED") || status.includes("ACTIVE")
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : status.includes("REJECTED") || status.includes("EXPIRED") || status.includes("CANCELED")
        ? "border-red-500/30 bg-red-500/10 text-red-200"
        : status.includes("UNDER_REVIEW")
          ? "border-blue-500/30 bg-blue-500/10 text-blue-200"
          : status.includes("TRIAL") || status.includes("WAITING")
            ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
            : "border-slate-700 bg-slate-800 text-slate-200";

  return <span className={cn("inline-flex rounded-md border px-2 py-1 text-xs font-semibold", palette)}>{label || status}</span>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="grid gap-3">
      <div className="h-24 animate-pulse rounded-lg bg-slate-800" />
      <div className="h-24 animate-pulse rounded-lg bg-slate-800/70" />
      <p className="text-sm text-slate-400">{label}...</p>
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return <div className="rounded-lg border border-dashed border-slate-700 p-6 text-sm text-slate-400">{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <AdminCard className="border-red-900/60">
      <p className="text-sm text-red-200">{message}</p>
      <Button type="button" size="sm" className="mt-3" onClick={onRetry}>
        Retry
      </Button>
    </AdminCard>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-800">{children}</div>;
}

export const tableClass = "min-w-full divide-y divide-slate-800 text-sm";
export const thClass = "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500";
export const tdClass = "whitespace-nowrap px-4 py-3 text-slate-300";
export const inputClass = "h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-blue-400";
export const selectClass = inputClass;

export function formatDate(value?: string | Date | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function daysRemaining(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  const expiresAt = new Date(value);
  const now = new Date();
  const dayNumber = (date: Date) =>
    Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);

  return Math.max(dayNumber(expiresAt) - dayNumber(now), 0);
}

export function explorerUrl(network?: string | null, txid?: string | null) {
  if (!txid) {
    return null;
  }

  if (network === "ERC20") return `https://etherscan.io/tx/${txid}`;
  if (network === "BEP20") return `https://bscscan.com/tx/${txid}`;
  return `https://tronscan.org/#/transaction/${txid}`;
}
