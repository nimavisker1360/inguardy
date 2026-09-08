import { cn } from "@/lib/utils";
import { formatMoney, toNumber } from "@/components/dashboard/types";

export function PnlText({
  value,
  currency = "USD",
  className,
}: {
  value: string | number | null | undefined;
  currency?: string;
  className?: string;
}) {
  const parsed = toNumber(value);

  return (
    <span
      className={cn(
        "font-semibold",
        parsed !== null && parsed > 0 && "text-[#10B981]",
        parsed !== null && parsed < 0 && "text-[#EF4444]",
        (parsed === null || parsed === 0) && "text-[#E5E7EB]",
        className
      )}
    >
      {formatMoney(value, currency)}
    </span>
  );
}
