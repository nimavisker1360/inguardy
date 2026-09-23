"use client";

import { ChevronDown, WalletCards } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type AccountOption = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
  mt5AccountNumber: string | null;
  accountType?: string | null;
};

function accountLabel(account: AccountOption) {
  const rawNumber = account.mt5AccountNumber || account.name;
  const number =
    rawNumber.length > 22
      ? `${rawNumber.slice(0, 11)}…${rawNumber.slice(-5)}`
      : rawNumber;
  const details = [account.accountType, account.platform].filter(Boolean).join(" · ");

  return details ? `${number} — ${details}` : number;
}

export function AccountScopeSelect({
  accounts,
  currentAccountId,
  language,
}: {
  accounts: AccountOption[];
  currentAccountId: string;
  language: "en" | "fa";
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectAccount(accountId: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (accountId) {
      params.set("accountId", accountId);
    } else {
      params.delete("accountId");
    }

    params.delete("page");
    const query = params.toString();
    router.push(query ? `/journal?${query}` : "/journal");
  }

  return (
    <label className="group flex min-h-[66px] w-full min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm transition focus-within:border-cyan-400 focus-within:ring-2 focus-within:ring-cyan-500/10 dark:border-slate-800 dark:bg-[#111827]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
        <WalletCards className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {language === "fa" ? "حساب معاملاتی" : "Trading account"}
        </span>
        <span className="relative mt-0.5 block">
          <select
            value={currentAccountId}
            onChange={(event) => selectAccount(event.target.value)}
            className="h-7 w-full cursor-pointer appearance-none truncate bg-transparent pe-7 text-sm font-semibold normal-case text-slate-900 outline-none dark:text-white"
          >
            <option value="">{language === "fa" ? "همه حساب‌ها" : "All accounts"}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {accountLabel(account)}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-0 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition group-focus-within:rotate-180" />
        </span>
      </span>
    </label>
  );
}
