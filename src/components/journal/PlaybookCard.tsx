"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { StrategyPerformanceSummary } from "@/components/journal/StrategyPerformanceSummary";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import type { PlaybookStrategyDto } from "@/types/playbooks";

function Badge({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "green" | "amber" | "blue";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
        : tone === "blue"
          ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
          : "border-slate-700 bg-slate-900 text-slate-300";

  return (
    <span className={cn("inline-flex rounded-lg border px-2.5 py-1 text-xs font-semibold", toneClass)}>
      {children}
    </span>
  );
}

export function PlaybookCard({
  playbook,
  onDelete,
}: {
  playbook: PlaybookStrategyDto;
  onDelete: (playbook: PlaybookStrategyDto) => void;
}) {
  const { t } = useLanguage();

  return (
    <article className="rounded-lg border border-slate-800 bg-[#0F172A] p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{playbook.name}</h2>
            <Badge tone={playbook.isActive ? "green" : "amber"}>
              {playbook.isActive ? t("journal.common.active") : t("journal.common.inactive")}
            </Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">
            {playbook.description || t("journal.common.noDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/journal/playbooks/${playbook.id}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800"
            aria-label={t("journal.playbooks.view")}
            title={t("journal.playbooks.view")}
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/journal/playbooks/${playbook.id}/edit`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800"
            aria-label={t("journal.playbooks.edit")}
            title={t("journal.playbooks.edit")}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(playbook)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 text-[#EF4444] hover:bg-red-500/10"
            aria-label={t("journal.playbooks.delete")}
            title={t("journal.playbooks.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{playbook.marketType || t("journal.playbooks.customMarket")}</Badge>
        <Badge>{playbook.symbols || t("journal.playbooks.allSymbols")}</Badge>
        <Badge>{playbook.timeframes || t("journal.playbooks.allTimeframes")}</Badge>
        <Badge tone="blue">
          {t("journal.playbooks.checklistItemsCount").replace("{count}", String(playbook.checklistItems.length))}
        </Badge>
        <Badge>{t("journal.playbooks.rulesCount").replace("{count}", String(playbook.ruleCount))}</Badge>
      </div>

      <div className="mt-4">
        <StrategyPerformanceSummary analytics={playbook.analytics} compact />
      </div>
    </article>
  );
}
