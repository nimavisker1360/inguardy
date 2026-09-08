import { AlertTriangle, CheckCircle2, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

export function StrategyComplianceBadge({
  percent,
  violatedRules = 0,
  reviewed = true,
}: {
  percent: number | null | undefined;
  violatedRules?: number;
  reviewed?: boolean;
}) {
  const value = Number(percent || 0);
  const lowCompliance = reviewed && value < 70;
  const toneClass = !reviewed
    ? "border-slate-700 bg-slate-900 text-slate-300"
    : lowCompliance || violatedRules > 0
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  const Icon = !reviewed ? CircleHelp : lowCompliance || violatedRules > 0 ? AlertTriangle : CheckCircle2;
  const label = !reviewed
    ? "Not Reviewed"
    : violatedRules > 0
      ? `${Math.round(value)}% / ${violatedRules} violated`
      : `${Math.round(value)}%`;

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold", toneClass)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
