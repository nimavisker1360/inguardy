"use client";

import { Download, Printer } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

const COPY = {
  en: {
    print: "Print / Save PDF",
    csv: "Download CSV",
  },
  fa: {
    print: "چاپ / ذخیره PDF",
    csv: "دانلود CSV",
  },
} as const;

export function ReportActions({ csvHref }: { csvHref: string }) {
  const { language } = useLanguage();
  const copy = COPY[language];
  const localizedCsvHref = `${csvHref}${csvHref.includes("?") ? "&" : "?"}lang=${language}`;

  return (
    <div className="flex flex-wrap gap-2 print:hidden" dir={language === "fa" ? "rtl" : "ltr"}>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
      >
        <Printer className="h-4 w-4" />
        {copy.print}
      </button>
      <a
        href={localizedCsvHref}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-500"
      >
        <Download className="h-4 w-4" />
        {copy.csv}
      </a>
    </div>
  );
}
