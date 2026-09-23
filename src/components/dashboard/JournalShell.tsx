"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { isJournalWorkflowPath } from "@/components/dashboard/DashboardSidebarNavigation";
import { TradingWorkflowStrip } from "@/components/journal/TradingWorkflowStrip";
import type { DashboardTheme } from "@/lib/dashboard-theme";

export function JournalShell({
  children,
  topContent,
  initialTheme = "light",
  showAdmin = false,
}: {
  children: ReactNode;
  topContent?: ReactNode;
  initialTheme?: DashboardTheme;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <DashboardShell topContent={topContent} initialTheme={initialTheme} showAdmin={showAdmin}>
      {isJournalWorkflowPath(pathname) ? <TradingWorkflowStrip /> : null}
      {children}
    </DashboardShell>
  );
}
