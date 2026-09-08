"use client";

import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, ListChecks, Plus, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1 text-xs font-medium uppercase text-slate-400">
      {label}
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600";
const textareaClass =
  "w-full rounded-lg border border-slate-800 bg-[#111827] px-3 py-2 text-sm normal-case text-[#E5E7EB] outline-none focus:border-blue-600";

function formValue(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : undefined;
}

type CreateTradeResponse = {
  trade?: {
    id?: string;
    _id?: string;
  };
  message?: string;
  errors?: string[];
};

export function ManualTradeForm({
  accountId,
  accountLabel,
}: {
  accountId?: string;
  accountLabel?: string;
} = {}) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submitTrade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      symbol: formValue(formData.get("symbol")),
      side: formValue(formData.get("side")),
      entryPrice: formValue(formData.get("entryPrice")),
      exitPrice: formValue(formData.get("exitPrice")),
      stopLoss: formValue(formData.get("stopLoss")),
      takeProfit: formValue(formData.get("takeProfit")),
      lotSize: formValue(formData.get("lotSize")),
      riskAmount: formValue(formData.get("riskAmount")),
      profitLoss: formValue(formData.get("profitLoss")),
      entryTime: formValue(formData.get("entryTime")),
      exitTime: formValue(formData.get("exitTime")),
      status: formValue(formData.get("status")),
      strategy: formValue(formData.get("strategy")),
      setup: formValue(formData.get("setup")),
      emotion: formValue(formData.get("emotion")),
      mistakes: formValue(formData.get("mistakes")),
      notes: formValue(formData.get("notes")),
      accountId,
    };

    try {
      const response = await fetch("/api/journal/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as CreateTradeResponse;

      if (!response.ok) {
        toast.error(
          Array.isArray(data.errors) ? data.errors.join(", ") : data.message
        );
        return;
      }

      toast.success(
        language === "fa"
          ? "معامله ذخیره شد. با افزودن اسکرین‌شات‌ها و تکمیل بررسی ادامه دهید."
          : "Trade saved. Continue by adding screenshots and completing the review."
      );
      formRef.current?.reset();
      setOpen(false);
      const tradeId = data.trade?.id || data.trade?._id;

      if (tradeId) {
        router.push(
          accountId
            ? `/journal/${tradeId}?accountId=${encodeURIComponent(accountId)}`
            : `/journal/${tradeId}`
        );
      } else {
        router.refresh();
      }
    } catch {
      toast.error(t("journal.manualTrade.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500"
      >
        {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {open ? t("journal.manualTrade.close") : t("journal.manualTrade.newTrade")}
      </button>

      {open && (
        <form
          ref={formRef}
          onSubmit={submitTrade}
          className="rounded-lg border border-slate-800 bg-[#0F172A] p-4 shadow-sm"
        >
          {accountId ? <input type="hidden" name="accountId" value={accountId} /> : null}
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-100">
            <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
            <span>
              {accountLabel
                ? language === "fa"
                  ? `این معامله برای حساب ${accountLabel} ثبت می‌شود.`
                  : `This trade will be saved to account ${accountLabel}.`
                : t("journal.manualTrade.checklistHint")}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <Field label={t("journal.tradeDetail.symbol")}>
              <input name="symbol" required placeholder="XAUUSD" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.side")}>
              <select name="side" required defaultValue="BUY" className={inputClass}>
                <option value="BUY">{t("journal.tradeDetail.buy")}</option>
                <option value="SELL">{t("journal.tradeDetail.sell")}</option>
              </select>
            </Field>
            <Field label={t("journal.tradeDetail.entryPrice")}>
              <input name="entryPrice" required type="number" step="any" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.exitPrice")}>
              <input name="exitPrice" type="number" step="any" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.stopLoss")}>
              <input name="stopLoss" type="number" step="any" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.takeProfit")}>
              <input name="takeProfit" type="number" step="any" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.lotSize")}>
              <input name="lotSize" type="number" step="any" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.riskAmount")}>
              <input name="riskAmount" type="number" step="any" className={inputClass} />
            </Field>
            <Field label="PnL">
              <input name="profitLoss" type="number" step="any" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.entryTime")}>
              <input name="entryTime" required type="datetime-local" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.exitTime")}>
              <input name="exitTime" type="datetime-local" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.status")}>
              <select name="status" defaultValue="OPEN" className={inputClass}>
                <option value="OPEN">{t("journal.tradeDetail.open")}</option>
                <option value="CLOSED">{t("journal.tradeDetail.closed")}</option>
              </select>
            </Field>
            <Field label={t("journal.tradeDetail.setup")}>
              <input name="setup" placeholder="Order Block" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.emotion")}>
              <input name="emotion" placeholder="Calm" className={inputClass} />
            </Field>
            <Field label={t("journal.tradeDetail.mistakes")}>
              <input name="mistakes" placeholder="None" className={inputClass} />
            </Field>
          </div>

          <div className="mt-3">
            <Field label={t("journal.tradeDetail.notes")}>
              <textarea name="notes" rows={3} className={textareaClass} />
            </Field>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-800 px-4 text-sm font-semibold text-slate-300 hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
              {t("journal.tradeDetail.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? t("journal.tradeDetail.saving") : t("journal.manualTrade.saveTrade")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
