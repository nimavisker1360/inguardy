"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Language } from "@/lib/language-preferences";

type DeleteTradeResponse = {
  success: boolean;
  message?: string;
};

export function DeleteTradeButton({
  tradeId,
  symbol,
  language,
}: {
  tradeId: string;
  symbol: string;
  language: Language;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const isFa = language === "fa";

  async function deleteTrade() {
    const confirmed = window.confirm(
      isFa
        ? `معامله ${symbol} حذف شود؟ این عملیات قابل بازگشت نیست.`
        : `Delete ${symbol}? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/journal/trades/${tradeId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as DeleteTradeResponse;

      if (!response.ok || !data.success) {
        toast.error(
          data.message || (isFa ? "حذف معامله ناموفق بود." : "Failed to delete trade.")
        );
        return;
      }

      toast.success(isFa ? "معامله حذف شد." : "Trade deleted.");
      router.refresh();
    } catch {
      toast.error(isFa ? "حذف معامله ناموفق بود." : "Failed to delete trade.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteTrade}
      disabled={deleting}
      className="inline-flex h-8 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-red-500/30 px-3 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
      aria-label={isFa ? "حذف معامله" : "Delete trade"}
      title={isFa ? "حذف معامله" : "Delete trade"}
    >
      <Trash2 className="h-4 w-4" />
      {deleting ? (isFa ? "..." : "...") : isFa ? "حذف" : "Delete"}
    </button>
  );
}
