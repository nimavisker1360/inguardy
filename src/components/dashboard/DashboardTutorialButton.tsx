"use client";

import { GraduationCap } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export const START_DASHBOARD_TOUR_EVENT = "tradivix:start-onboarding-tour";

export function DashboardTutorialButton({ isDark: _isDark }: { isDark: boolean }) {
  const { language } = useLanguage();
  const label = language === "fa" ? "آموزش" : "Tutorial";
  void _isDark;

  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(START_DASHBOARD_TOUR_EVENT));
      }}
      className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-500 bg-red-600 px-3 text-xs font-bold text-white shadow-sm shadow-red-900/20 transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
      aria-label={label}
      title={label}
    >
      <GraduationCap className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
