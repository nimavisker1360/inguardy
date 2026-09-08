"use client";

import { useLanguage } from "@/lib/language-context";

export function DashboardText({
  k,
  values,
}: {
  k: string;
  values?: Record<string, string>;
}) {
  const { t } = useLanguage();
  let text = t(k);

  if (values) {
    for (const [key, value] of Object.entries(values)) {
      text = text.replace(`{${key}}`, value);
    }
  }

  return <>{text}</>;
}

export function DashboardMonthText({
  month,
  year,
}: {
  month: number;
  year: number;
}) {
  const { language } = useLanguage();

  return (
    <>
      {new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(
        language === "fa" ? "fa-IR-u-ca-gregory" : "en-US",
        {
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }
      )}
    </>
  );
}
