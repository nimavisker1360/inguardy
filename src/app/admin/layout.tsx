import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminUI";
import { DASHBOARD_THEME_COOKIE_KEY, parseDashboardTheme } from "@/lib/dashboard-theme";
import { getCurrentUser, isAdminUser } from "@/lib/server-auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?redirect=/admin/dashboard");
  }

  if (!isAdminUser(user)) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  const initialTheme = parseDashboardTheme(cookieStore.get(DASHBOARD_THEME_COOKIE_KEY)?.value);

  return <AdminShell adminEmail={user.email} initialTheme={initialTheme}>{children}</AdminShell>;
}
