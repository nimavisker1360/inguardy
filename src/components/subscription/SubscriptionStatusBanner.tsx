"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarDays, Info, X } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { SubscriptionDashboardState } from "@/lib/subscription";
import { cn } from "@/lib/utils";

type SubscriptionStatusBannerProps = {
  title: string;
  titleFa?: string;
  tone?: "info" | "warning" | "neutral" | "trial";
  subscription?: SubscriptionDashboardState | null;
  href?: string;
  buttonText?: string;
  buttonTextFa?: string;
  className?: string;
  dismissible?: boolean;
};

function formatSubscriptionDays(days: number, language: "en" | "fa") {
  const formatter = new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US");

  if (language === "fa") {
    return `${formatter.format(days)} روز`;
  }

  return `${formatter.format(days)} ${days === 1 ? "day" : "days"}`;
}

function formatTrialPlanTitle(subscription: SubscriptionDashboardState, language: "en" | "fa") {
  const formatter = new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US");
  const totalDays = formatter.format(subscription.totalDays);
  const remainingDays = formatter.format(subscription.daysRemaining);

  if (language === "fa") {
    return `از پلن ${totalDays} روزه شما ${remainingDays} روز باقی مانده`;
  }

  return `${remainingDays} ${subscription.daysRemaining === 1 ? "day" : "days"} left from your ${totalDays}-day plan`;
}

function formatSubscriptionDate(value: string, language: "en" | "fa") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(language === "fa" ? "fa-IR-u-ca-gregory" : "en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function SubscriptionStatusBanner({
  title,
  titleFa,
  tone = "info",
  subscription,
  href = "/pricing",
  buttonText = "Upgrade",
  buttonTextFa,
  className,
  dismissible = true,
}: SubscriptionStatusBannerProps) {
  const { language } = useLanguage();
  const isWarning = tone === "warning";
  const isTrialTone = tone === "trial";
  const localizedTitle =
    isTrialTone && subscription?.isTrial
      ? formatTrialPlanTitle(subscription, language)
      : language === "fa" && titleFa
        ? titleFa
        : title;
  const localizedButtonText = isTrialTone
    ? language === "fa"
      ? "ارتقا پلن"
      : "Upgrade plan"
    : language === "fa" && buttonTextFa
      ? buttonTextFa
      : buttonText;
  const dismissKey = useMemo(() => `subscription-banner-dismissed:${title}`, [title]);
  const [dismissed, setDismissed] = useState(false);
  const showSubscriptionDetails = subscription && !subscription.isFree;
  const daysLabel = showSubscriptionDetails
    ? formatSubscriptionDays(subscription.daysRemaining, language)
    : "";
  const dateLabel = showSubscriptionDetails
    ? formatSubscriptionDate(subscription.expiresAt, language)
    : "";
  const detailTitle = showSubscriptionDetails
    ? subscription.isTrial
      ? language === "fa"
        ? "زمان باقی مانده دوره آزمایشی"
        : "Trial time left"
      : language === "fa"
        ? "تمدید اشتراک"
        : "Subscription renewal"
    : "";
  const datePrefix = showSubscriptionDetails
    ? subscription.isTrial
      ? language === "fa"
        ? "پایان"
        : "Ends"
      : language === "fa"
        ? "تمدید"
        : "Renews"
    : "";

  useEffect(() => {
    setDismissed(window.sessionStorage.getItem(dismissKey) === "1");
  }, [dismissKey]);

  if (dismissible && dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        "subscription-status-banner mb-5 rounded-2xl border px-4 py-3.5 text-sm sm:px-5",
        isTrialTone
          ? "subscription-status-banner--trial border-sky-200 bg-sky-50 text-slate-700 dark:border-sky-400/25 dark:bg-sky-500/10 dark:text-sky-100"
          : isWarning
            ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100"
            : tone === "neutral"
              ? "border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200"
              : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100",
        className
      )}
    >
      <div className="subscription-status-banner__content flex flex-col gap-3">
        <div className="subscription-status-banner__heading flex items-start gap-3">
          {isWarning ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <p className="min-w-0 font-medium">{localizedTitle}</p>
        </div>
        <div className="subscription-status-banner__details grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
          <div className="subscription-status-banner__actions flex shrink-0 items-center gap-2">
            <Link
              href={href}
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-lg px-3 text-sm font-semibold",
                isTrialTone
                  ? "bg-sky-600 text-white hover:bg-sky-500"
                  : isWarning
                    ? "bg-amber-300 text-slate-950 hover:bg-amber-200"
                    : "bg-blue-600 text-white hover:bg-blue-500"
              )}
            >
              {localizedButtonText}
            </Link>
            {dismissible ? (
              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.setItem(dismissKey, "1");
                  setDismissed(true);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-current/20 opacity-80 hover:opacity-100"
                aria-label="Dismiss trial banner"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="subscription-status-banner__metadata flex min-w-0 flex-wrap items-center justify-end gap-2 text-xs font-semibold">
            {showSubscriptionDetails ? (
              <>
                <span
                  className={cn(
                    "inline-flex min-h-8 min-w-0 items-center gap-2 rounded-lg border px-2.5",
                    isTrialTone
                      ? "border-sky-200 bg-white/70 text-slate-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-50"
                      : isWarning
                        ? "border-amber-300/80 bg-white/60 text-amber-900 dark:border-amber-400/20 dark:bg-amber-300/10 dark:text-amber-50"
                        : "border-current/15 bg-white/60 dark:bg-white/10"
                  )}
                >
                  <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate opacity-80">{detailTitle}</span>
                  <span className="shrink-0 font-extrabold">{daysLabel}</span>
                </span>
                <span
                  className={cn(
                    "inline-flex min-h-8 min-w-0 items-center rounded-lg border px-2.5",
                    isTrialTone
                      ? "border-sky-200 bg-white/70 text-slate-700 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-50"
                      : isWarning
                        ? "border-amber-300/80 bg-white/60 text-amber-900 dark:border-amber-400/20 dark:bg-amber-300/10 dark:text-amber-50"
                        : "border-current/15 bg-white/60 dark:bg-white/10"
                  )}
                >
                  <span className="max-w-36 truncate">{subscription.planName}</span>
                  {dateLabel ? <span className="mx-1 shrink-0 opacity-50">|</span> : null}
                  {dateLabel ? (
                    <span className="shrink-0 whitespace-nowrap">
                      {datePrefix} {dateLabel}
                    </span>
                  ) : null}
                </span>
              </>
            ) : null}
          </div>
        </div>
        {isTrialTone && subscription ? (
          <div className="subscription-status-banner__progress">
            <div className="h-2 overflow-hidden rounded-full bg-white/80 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${subscription.percentRemaining}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
