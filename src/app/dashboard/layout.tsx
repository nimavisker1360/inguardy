import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SubscriptionStatusBanner } from "@/components/subscription/SubscriptionStatusBanner";
import { DASHBOARD_THEME_COOKIE_KEY, parseDashboardTheme } from "@/lib/dashboard-theme";
import { getCurrentUser, getSession, isAdminPanelOnlyUser, isAdminUser } from "@/lib/server-auth";
import {
  getSubscriptionShellState,
  requireActiveSubscription,
  SubscriptionAccessError,
} from "@/lib/subscription";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  const user = await getCurrentUser();

  if (isAdminPanelOnlyUser(user)) {
    redirect("/admin/dashboard");
  }

  let activeSubscription: Awaited<ReturnType<typeof requireActiveSubscription>> = null;

  try {
    activeSubscription = await requireActiveSubscription();
  } catch (error) {
    if (error instanceof SubscriptionAccessError) {
      redirect("/premium?reason=subscription-required");
    }

    throw error;
  }
  const { banner, subscription } = await getSubscriptionShellState(session.user.id, activeSubscription);
  const cookieStore = await cookies();
  const initialTheme = parseDashboardTheme(cookieStore.get(DASHBOARD_THEME_COOKIE_KEY)?.value);
  const subscriptionBanner = banner ? (
    <SubscriptionStatusBanner
      title={banner.title}
      titleFa={banner.titleFa}
      tone={banner.tone as "info" | "warning" | "neutral" | "trial"}
      subscription={subscription}
      href={banner.href}
      buttonText={banner.buttonText}
      buttonTextFa={banner.buttonTextFa}
      dismissible={false}
    />
  ) : null;

  return (
    <DashboardShell
      showAdmin={isAdminUser(user)}
      initialTheme={initialTheme}
      userId={session.user.id}
      topContent={subscriptionBanner}
    >
      {children}
    </DashboardShell>
  );
}
