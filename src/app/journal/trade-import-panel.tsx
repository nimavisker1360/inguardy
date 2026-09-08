"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, FileCode2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

type ImportKind = "mt5-html" | "excel";

type ImportResponse = {
  success: boolean;
  imported?: number;
  created?: number;
  updated?: number;
  skipped?: number;
  errors?: string[];
  warnings?: string[];
  message?: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600";

const copy = {
  en: {
    title: "Import trades",
    description:
      "Upload an MT5 HTML report or fill the downloadable Excel journal template. Imported trades use the same journal review, checklists, AI review, and analytics.",
    template: "Excel template",
    type: "Type",
    mt5Html: "MT5 HTML report",
    excel: "Excel journal template",
    accountName: "Account name",
    mt5Placeholder: "MT5 HTML Import",
    excelPlaceholder: "Excel Journal Import",
    file: "File",
    import: "Import",
    importing: "Importing",
    chooseFile: "Choose an HTML, XLS, or CSV file first.",
    failed: "Import failed.",
    success: (imported: number, created: number, updated: number) =>
      `Imported ${imported} trades. ${created} created, ${updated} updated.`,
    imported: "Imported",
    created: "Created",
    updated: "Updated",
    skipped: "Skipped",
  },
  fa: {
    title: "ایمپورت معاملات",
    description:
      "گزارش HTML متاتریدر 5 را آپلود کنید یا قالب اکسل ژورنال را دانلود و تکمیل کنید. معاملات واردشده در همان مسیر ژورنال، چک‌لیست‌ها، ریویو هوش مصنوعی و تحلیل‌ها استفاده می‌شوند.",
    template: "قالب اکسل",
    type: "نوع فایل",
    mt5Html: "گزارش HTML متاتریدر 5",
    excel: "قالب اکسل ژورنال",
    accountName: "نام حساب",
    mt5Placeholder: "ایمپورت HTML متاتریدر 5",
    excelPlaceholder: "ایمپورت ژورنال اکسل",
    file: "فایل",
    import: "ایمپورت",
    importing: "در حال ایمپورت",
    chooseFile: "ابتدا یک فایل HTML، XLS یا CSV انتخاب کنید.",
    failed: "ایمپورت ناموفق بود.",
    success: (imported: number, created: number, updated: number) =>
      `${imported} معامله ایمپورت شد. ${created} معامله جدید ساخته شد و ${updated} معامله به‌روزرسانی شد.`,
    imported: "ایمپورت‌شده",
    created: "جدید",
    updated: "به‌روزرسانی",
    skipped: "ردشده",
  },
} as const;

export function TradeImportPanel() {
  const router = useRouter();
  const { language } = useLanguage();
  const text = copy[language] || copy.fa;
  const fileRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<ImportKind>("mt5-html");
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);

  async function submitImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const file = fileRef.current?.files?.[0];

    if (!file) {
      toast.error(text.chooseFile);
      return;
    }

    const formData = new FormData(form);
    formData.set("kind", kind);
    formData.set("file", file);
    setImporting(true);
    setLastResult(null);

    try {
      const response = await fetch("/api/journal/import", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as ImportResponse;

      setLastResult(data);

      if (!response.ok || !data.success) {
        toast.error(data.message || data.errors?.[0] || text.failed);
        return;
      }

      toast.success(
        text.success(data.imported || 0, data.created || 0, data.updated || 0)
      );
      form.reset();
      router.refresh();
    } catch {
      toast.error(text.failed);
    } finally {
      setImporting(false);
    }
  }

  return (
    <section id="import-trades" className="scroll-mt-24 rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">{text.title}</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
            {text.description}
          </p>
        </div>
        <a
          href="/api/journal/import/template"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          <Download className="h-4 w-4" />
          {text.template}
        </a>
      </div>

      <form onSubmit={submitImport} className="mt-4 grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {text.type}
            <select
              name="kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as ImportKind)}
              className={inputClass}
            >
              <option value="mt5-html">{text.mt5Html}</option>
              <option value="excel">{text.excel}</option>
            </select>
          </label>
        </div>
        <div className="lg:col-span-3">
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {text.accountName}
            <input
              name="accountName"
              placeholder={kind === "mt5-html" ? text.mt5Placeholder : text.excelPlaceholder}
              className={inputClass}
            />
          </label>
        </div>
        <div className="lg:col-span-4">
          <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
            {text.file}
            <input
              ref={fileRef}
              name="file"
              type="file"
              accept={kind === "mt5-html" ? ".html,.htm,text/html" : ".xls,.xml,.csv,text/csv"}
              className="block h-10 w-full rounded-lg border border-slate-800 bg-[#111827] text-sm text-slate-300 file:mr-3 file:h-full file:border-0 file:bg-slate-800 file:px-3 file:text-sm file:font-semibold file:text-slate-100 hover:file:bg-slate-700"
            />
          </label>
        </div>
        <div className="flex items-end lg:col-span-2">
          <button
            type="submit"
            disabled={importing}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {kind === "mt5-html" ? (
              <FileCode2 className="h-4 w-4" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            {importing ? text.importing : text.import}
          </button>
        </div>
      </form>

      {lastResult ? (
        <div className="mt-3 rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-xs text-slate-300">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>{text.imported}: {lastResult.imported || 0}</span>
            <span>{text.created}: {lastResult.created || 0}</span>
            <span>{text.updated}: {lastResult.updated || 0}</span>
            <span>{text.skipped}: {lastResult.skipped || 0}</span>
          </div>
          {lastResult.errors?.length ? (
            <p className="mt-2 text-red-300">{lastResult.errors.slice(0, 3).join(" | ")}</p>
          ) : null}
          {lastResult.warnings?.length ? (
            <p className="mt-2 text-amber-200">{lastResult.warnings.slice(0, 3).join(" | ")}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
