"use client";

import { useLanguage } from "@/lib/language-context";
import type { PlaybookRuleDto, PlaybookRuleSection as RuleSection } from "@/types/playbooks";

export const RULE_SECTION_LABELS: Record<RuleSection, string> = {
  SETUP: "Setup Rules",
  ENTRY: "Entry Rules",
  EXIT: "Exit Rules",
  RISK: "Risk Rules",
  MANAGEMENT: "Trade Management Rules",
  PSYCHOLOGY: "Psychology Rules",
};

export const RULE_SECTION_ORDER: RuleSection[] = [
  "SETUP",
  "ENTRY",
  "EXIT",
  "RISK",
  "MANAGEMENT",
  "PSYCHOLOGY",
];

export function PlaybookRuleSection({ rules }: { rules: PlaybookRuleDto[] }) {
  const { t } = useLanguage();
  const sectionLabels: Record<RuleSection, string> = {
    SETUP: t("journal.playbooks.setupRules"),
    ENTRY: t("journal.playbooks.entryRules"),
    EXIT: t("journal.playbooks.exitRules"),
    RISK: t("journal.playbooks.riskRules"),
    MANAGEMENT: t("journal.playbooks.managementRules"),
    PSYCHOLOGY: t("journal.playbooks.psychologyRules"),
  };

  return (
    <div className="space-y-4">
      {RULE_SECTION_ORDER.map((section) => {
        const sectionRules = rules.filter((rule) => rule.section === section);

        return (
          <section key={section} className="rounded-lg border border-slate-800 bg-[#111827] p-4">
            <h3 className="text-sm font-semibold text-white">{sectionLabels[section]}</h3>
            {sectionRules.length > 0 ? (
              <div className="mt-3 space-y-2">
                {sectionRules.map((rule) => (
                  <div key={rule.id || `${rule.section}-${rule.sortOrder}`} className="rounded-lg border border-slate-800 bg-[#0F172A] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-white">{rule.title}</div>
                      {rule.isRequired ? (
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                          {t("journal.playbooks.required")}
                        </span>
                      ) : null}
                    </div>
                    {rule.description ? (
                      <p className="mt-1 text-sm text-slate-400">{rule.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t("journal.playbooks.noRulesInSection")}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
