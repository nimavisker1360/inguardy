"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AccountConnectionWizard } from "@/components/dashboard/AccountConnectionWizard";
import { type ApiResult, type TradingAccountDto } from "@/components/dashboard/types";
import { useLanguage } from "@/lib/language-context";

export function NewTradingAccountPage({
  canUseAutoSync,
  initialPlatformId,
}: {
  canUseAutoSync: boolean;
  initialPlatformId?: string;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [errorMessage, setErrorMessage] = useState("");

  async function saveManualAccount(payload: Record<string, string | undefined>) {
    setErrorMessage("");
    try {
      const response = await fetch("/api/trading-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as ApiResult<TradingAccountDto>;
      if (!response.ok || !result.success) {
        setErrorMessage(result.message || t("dashboard.accounts.saveFailed"));
        return;
      }
      router.push("/dashboard/accounts");
      router.refresh();
    } catch {
      setErrorMessage(t("dashboard.accounts.saveFailed"));
    }
  }

  return (
    <AccountConnectionWizard
      open
      presentation="page"
      initialPlatformId={initialPlatformId}
      canUseAutoSync={canUseAutoSync}
      errorMessage={errorMessage}
      onClose={() => router.push("/dashboard/accounts")}
      onSaveManual={saveManualAccount}
      onAccountsChanged={async () => { router.refresh(); }}
    />
  );
}
