"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type SubscriptionLockedFeatureProps = {
  title: string;
  description: string;
  requiredPlan?: string;
  buttonText?: string;
  href?: string;
  className?: string;
};

export function SubscriptionLockedFeature({
  title,
  description,
  requiredPlan = "Pro",
  buttonText = "Upgrade",
  href = "/pricing",
  className,
}: SubscriptionLockedFeatureProps) {
  const { t } = useLanguage();
  const localizedButtonText = buttonText === "Upgrade" ? t("subscription.upgrade") : buttonText;

  return (
    <section
      className={cn(
        "rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-200">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-amber-50">{title}</h2>
            <p className="mt-1 text-amber-100/80">{description}</p>
            {requiredPlan && (
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-200">
                {t("subscription.requiredPlan").replace("{plan}", requiredPlan)}
              </p>
            )}
          </div>
        </div>
        <Link
          href={href}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-amber-300 px-4 text-sm font-semibold text-slate-950 hover:bg-amber-200"
        >
          {localizedButtonText}
        </Link>
      </div>
    </section>
  );
}
