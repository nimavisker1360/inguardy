import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon?: ReactNode;
  tone?: "neutral" | "green" | "red" | "blue";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0F172A]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</span>
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-[#111827]",
            tone === "green" && "text-[#10B981]",
            tone === "red" && "text-[#EF4444]",
            tone === "blue" && "text-[#2563EB]"
          )}
        >
          {icon}
        </span>
      </div>
      <div className="mt-4 text-2xl font-semibold text-slate-950 dark:text-[#E5E7EB]">{value}</div>
    </div>
  );
}
