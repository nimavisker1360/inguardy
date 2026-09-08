"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpenCheck,
  ClipboardCheck,
  ListChecks,
  PlaySquare,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

const steps = [
  {
    label: "Playbook",
    labelFa: "پلی بوک",
    href: "/journal/playbooks",
    icon: PlaySquare,
  },
  {
    label: "Pre-Trade Checklist",
    labelFa: "چک لیست پیش از معامله",
    href: "/journal/checklists",
    icon: ClipboardCheck,
  },
  {
    label: "Trades",
    labelFa: "معاملات",
    href: "/journal",
    aliases: ["/dashboard/trades"],
    icon: ListChecks,
  },
  {
    label: "Daily Journal",
    labelFa: "ژورنال روزانه",
    href: "/dashboard/daily-journal",
    icon: BookOpenCheck,
  },
];

function isActiveStep(pathname: string, href: string, aliases: string[] = []) {
  return [href, ...aliases].some((path) =>
    pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function TradingWorkflowStrip() {
  const pathname = usePathname();
  const { language } = useLanguage();

  return (
    <div
      data-dashboard-tour="workflow"
      className="mb-5 overflow-hidden rounded-lg border border-slate-800 bg-[#0F172A] shadow-sm"
    >
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const active = isActiveStep(pathname, step.href, step.aliases);

          return (
            <div key={step.href} className="flex shrink-0 items-center gap-2">
              <Link
                href={step.href}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
                  active
                    ? "border-blue-500/40 bg-blue-600/15 text-blue-100"
                    : "border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                )}
              >
                <Icon className={cn("h-4 w-4", active ? "text-blue-300" : "text-slate-500")} />
                {language === "fa" ? step.labelFa : step.label}
              </Link>
              {index < steps.length - 1 ? (
                <span className="text-xs font-semibold text-slate-600">/</span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
