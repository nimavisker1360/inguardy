"use client";

import { useRouter, useSearchParams } from "next/navigation";

type AccountOption = {
  id: string;
  name: string;
  broker: string | null;
  platform: string | null;
  mt5AccountNumber: string | null;
};

function accountLabel(account: AccountOption) {
  const number = account.mt5AccountNumber || account.name;
  const broker = [account.broker, account.platform].filter(Boolean).join(" / ");

  return broker ? `${number} - ${broker}` : number;
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
    <label className="flex w-full flex-col gap-1 text-xs font-semibold uppercase text-slate-400 sm:w-80">
      {language === "fa" ? "انتخاب حساب" : "Select account"}
      <select
        value={currentAccountId}
        onChange={(event) => selectAccount(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-800 bg-[#111827] px-3 text-sm font-semibold normal-case text-[#E5E7EB] outline-none focus:border-blue-600"
      >
        <option value="">{language === "fa" ? "همه حساب‌ها" : "All accounts"}</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {accountLabel(account)}
          </option>
        ))}
      </select>
    </label>
  );
}
