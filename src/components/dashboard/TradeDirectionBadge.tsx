"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import { cn } from "@/lib/utils";

export function TradeDirectionBadge({ direction }: { direction: "BUY" | "SELL" }) {
  const Icon = direction === "BUY" ? ArrowUp : ArrowDown;
  const { t } = useLanguage();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold",
        direction === "BUY" &&
          "border-emerald-500/30 bg-emerald-500/10 text-[#10B981]",
        direction === "SELL" && "border-red-500/30 bg-red-500/10 text-[#EF4444]"
      )}
    >
      <Icon className="h-3 w-3" />
      {direction === "BUY" ? t("dashboard.common.buy") : t("dashboard.common.sell")}
    </span>
  );
}
