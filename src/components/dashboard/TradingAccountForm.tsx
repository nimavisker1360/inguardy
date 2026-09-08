"use client";

import type { FormEvent } from "react";
import type { TradingAccountDto } from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

type AccountPayload = {
  name: string;
  broker?: string;
  platform?: string;
  currency: string;
  balance?: string;
  mt5AccountNumber?: string;
};

export function TradingAccountForm({
  account,
  defaults,
  variant = "panel",
  onSubmit,
  onCancel,
}: {
  account?: TradingAccountDto | null;
  defaults?: Partial<AccountPayload>;
  variant?: "panel" | "wizard";
  onSubmit: (payload: AccountPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useLanguage();
  const isWizard = variant === "wizard";
  const labelClassName = cn(
    "space-y-1 text-xs font-medium",
    isWizard ? "text-slate-600" : "uppercase text-slate-400"
  );
  const inputClassName = cn(
    "h-11 w-full rounded-lg border px-3 text-sm normal-case outline-none transition",
    isWizard
      ? "border-slate-200 bg-white text-slate-950 shadow-sm focus:border-[#6547b7] focus:ring-2 focus:ring-[#6547b7]/15"
      : "border-slate-800 bg-[#111827] text-[#E5E7EB] focus:border-blue-600"
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    await onSubmit({
      name: String(formData.get("name") || ""),
      broker: String(formData.get("broker") || ""),
      platform: String(formData.get("platform") || ""),
      currency: String(formData.get("currency") || "USD"),
      balance: String(formData.get("balance") || ""),
      mt5AccountNumber: String(formData.get("mt5AccountNumber") || ""),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className={labelClassName}>
          {t("dashboard.accounts.name")}
          <input
            name="name"
            required
            defaultValue={account?.name || defaults?.name || ""}
            className={inputClassName}
          />
        </label>
        <label className={labelClassName}>
          {t("dashboard.accounts.currency")}
          <input
            name="currency"
            required
            defaultValue={account?.currency || defaults?.currency || "USD"}
            className={inputClassName}
          />
        </label>
        <label className={labelClassName}>
          {t("dashboard.accounts.broker")}
          <input
            name="broker"
            defaultValue={account?.broker || defaults?.broker || ""}
            className={inputClassName}
          />
        </label>
        <label className={labelClassName}>
          {t("dashboard.accounts.platform")}
          <input
            name="platform"
            defaultValue={account?.platform || defaults?.platform || ""}
            className={inputClassName}
          />
        </label>
        <label className={cn(labelClassName, "md:col-span-2")}>
          MT5 Account Number
          <input
            name="mt5AccountNumber"
            defaultValue={account?.mt5AccountNumber || defaults?.mt5AccountNumber || ""}
            className={inputClassName}
          />
        </label>
        <label className={cn(labelClassName, "md:col-span-2")}>
          {t("dashboard.accounts.balance")}
          <input
            name="balance"
            type="number"
            step="0.01"
            defaultValue={account?.balance ? String(account.balance) : defaults?.balance || ""}
            className={inputClassName}
          />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "inline-flex h-10 items-center rounded-lg border px-4 text-sm font-semibold transition",
              isWizard
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-slate-800 text-slate-300 hover:bg-slate-800"
            )}
          >
            {t("dashboard.actions.cancel")}
          </button>
        ) : null}
        <button
          type="submit"
          className={cn(
            "inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white transition",
            isWizard ? "bg-[#5b3daf] hover:bg-[#4e329b]" : "bg-[#2563EB] hover:bg-blue-500"
          )}
        >
          {t("dashboard.accounts.save")}
        </button>
      </div>
    </form>
  );
}
