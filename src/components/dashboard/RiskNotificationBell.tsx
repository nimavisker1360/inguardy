"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/language-context";

type Notification = {
  id: string;
  accountId: string;
  accountName: string;
  createdAt: string;
  readAt: string | null;
  riskLevel: string;
  riskScore: number;
  marginLevel: number | null;
  reasons: unknown;
};
type NotificationResponse = { notifications: Notification[]; unreadCount: number };

function notificationTitle(item: Notification, fa: boolean) {
  const reasons = Array.isArray(item.reasons) ? item.reasons as { code?: string }[] : [];
  if (reasons.some(reason => reason.code === "MARGIN_CALL_REACHED")) {
    return fa ? "سطح مارجین به حد کال مارجین رسید" : "Margin call level reached";
  }
  if (reasons.some(reason => reason.code === "MARGIN_CALL_APPROACHING")) {
    return fa ? "حساب به کال مارجین نزدیک می‌شود" : "Approaching margin call";
  }
  if (reasons.some(reason => reason.code === "STOP_OUT_PROXIMITY")) {
    return fa ? "حساب به استاپ‌اوت نزدیک است" : "Approaching stop-out";
  }
  const label = item.riskLevel.replaceAll("_", " ").toLowerCase();
  return fa ? `هشدار ریسک ${item.riskLevel === "CRITICAL" ? "بحرانی" : item.riskLevel === "HIGH_RISK" ? "بالا" : "حساب"}` : `${label} account risk alert`;
}

export function RiskNotificationBell() {
  const { language } = useLanguage();
  const fa = language === "fa";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const knownIds = useRef<Set<string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/risk-guardian/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load notifications");
      const payload = await response.json() as NotificationResponse;
      const currentIds = new Set(payload.notifications.map(item => item.id));
      if (knownIds.current) {
        const newest = payload.notifications.find(item => !item.readAt && !knownIds.current?.has(item.id));
        if (newest) toast.warning(notificationTitle(newest, fa), {
          description: newest.accountName,
          action: { label: fa ? "مشاهده" : "View", onClick: () => router.push(`/dashboard/risk-guardian?accountId=${encodeURIComponent(newest.accountId)}`) },
        });
      }
      knownIds.current = currentIds;
      setItems(payload.notifications);
      setUnreadCount(payload.unreadCount);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [fa, router]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 15_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  async function markRead(id?: string) {
    const response = await fetch("/api/risk-guardian/notifications", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
    if (!response.ok) {
      toast.error(fa ? "ثبت اعلان به‌عنوان خوانده‌شده ناموفق بود" : "Could not mark notification as read");
      return;
    }
    setItems(previous => previous.map(item => !id || item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    setUnreadCount(previous => id ? Math.max(0, previous - 1) : 0);
  }

  async function openNotification(item: Notification) {
    if (!item.readAt) await markRead(item.id);
    setOpen(false);
    router.push(`/dashboard/risk-guardian?accountId=${encodeURIComponent(item.accountId)}`);
  }

  return <div className="relative" ref={rootRef}>
    <button type="button" aria-label={fa ? "اعلان‌های ریسک" : "Risk notifications"} aria-expanded={open}
      aria-haspopup="dialog" onClick={() => { setOpen(value => !value); if (!open) void refresh(); }}
      className="dashboard-topbar-control relative grid h-9 w-9 place-items-center rounded-lg text-slate-300 transition hover:bg-white/[0.07] hover:text-white">
      <Bell className="h-[18px] w-[18px]" />
      {unreadCount > 0 && <span className="absolute end-0 top-0 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white ring-2 ring-[#12151b]">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
    {open && <div role="dialog" aria-label={fa ? "اعلان‌های ریسک" : "Risk notifications"} dir={fa ? "rtl" : "ltr"}
      className="absolute end-0 top-[calc(100%+10px)] z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,.25)] dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <div><p className="text-sm font-bold">{fa ? "اعلان‌های ریسک" : "Risk notifications"}</p><p className="text-xs text-slate-500 dark:text-slate-400">{fa ? `${unreadCount} اعلان خوانده‌نشده` : `${unreadCount} unread`}</p></div>
        {unreadCount > 0 && <button type="button" onClick={() => void markRead()} className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"><CheckCheck size={14} />{fa ? "خواندن همه" : "Mark all read"}</button>}
      </div>
      <div className="max-h-96 overflow-y-auto">
        {loading && <p className="px-4 py-6 text-center text-sm text-slate-500">{fa ? "در حال بارگذاری…" : "Loading…"}</p>}
        {!loading && error && <button type="button" onClick={() => void refresh()} className="w-full px-4 py-6 text-center text-sm text-rose-600">{fa ? "دریافت اعلان‌ها ناموفق بود. تلاش دوباره" : "Could not load notifications. Retry"}</button>}
        {!loading && !error && items.length === 0 && <p className="px-4 py-6 text-center text-sm text-slate-500">{fa ? "اعلان ریسکی ندارید." : "No risk notifications yet."}</p>}
        {!error && items.map(item => <button key={item.id} type="button" onClick={() => void openNotification(item)}
          className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-start transition last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 ${item.readAt ? "opacity-70" : "bg-rose-50/50 dark:bg-rose-500/5"}`}>
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"><TriangleAlert size={16} /></span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{notificationTitle(item, fa)}</span><span className="mt-0.5 block truncate text-xs text-slate-600 dark:text-slate-300">{item.accountName}{item.marginLevel == null ? "" : ` · ${item.marginLevel.toFixed(1)}%`}</span><span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString(fa ? "fa-IR" : undefined)}</span></span>
          {!item.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden />}
        </button>)}
      </div>
    </div>}
  </div>;
}
