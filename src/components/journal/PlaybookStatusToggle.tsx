"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Power, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

type PlaybookStatusToggleProps = {
  playbookId: string;
  isActive: boolean;
};

export function PlaybookStatusToggle({
  playbookId,
  isActive,
}: PlaybookStatusToggleProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const [active, setActive] = useState(isActive);
  const [saving, setSaving] = useState(false);
  const [isPending, startTransition] = useTransition();
  const nextActive = !active;
  const text =
    language === "fa"
      ? {
          activate: "فعال کردن پلی‌بوک",
          deactivate: "غیرفعال کردن",
          saving: "در حال ذخیره",
          saved: "وضعیت پلی‌بوک تغییر کرد",
          failed: "تغییر وضعیت پلی‌بوک ناموفق بود",
        }
      : {
          activate: "Activate Playbook",
          deactivate: "Deactivate",
          saving: "Saving",
          saved: "Playbook status updated",
          failed: "Failed to update playbook status",
        };

  async function updateStatus() {
    setSaving(true);

    try {
      const response = await fetch(`/api/journal/playbooks/${playbookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_ACTIVE", isActive: nextActive }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || text.failed);
        return;
      }

      setActive(nextActive);
      toast.success(text.saved);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      toast.error(text.failed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={updateStatus}
      disabled={saving || isPending}
      className={
        active
          ? "inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/30 px-4 text-sm font-semibold text-amber-300 hover:bg-amber-500/10 disabled:opacity-60"
          : "inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
      }
    >
      {saving || isPending ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : active ? (
        <Power className="h-4 w-4" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      {saving || isPending ? text.saving : active ? text.deactivate : text.activate}
    </button>
  );
}
