"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  RefreshCw,
  Search,
  ShieldX,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  TableWrap,
  daysRemaining,
  formatDate,
  inputClass,
  selectClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/AdminUI";

const ACCESS_STATUSES = ["ACTIVE", "TRIAL", "FREE", "MANUAL"];

function dateTime(value?: string | Date | null) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function isCurrentAccess(subscription: any) {
  return (
    ACCESS_STATUSES.includes(subscription?.status) &&
    dateTime(subscription?.expiresAt) > Date.now()
  );
}

function pickCurrentSubscription(subscriptions: any[]) {
  const sorted = [...subscriptions].sort((first, second) => {
    const firstActive = isCurrentAccess(first) ? 1 : 0;
    const secondActive = isCurrentAccess(second) ? 1 : 0;

    if (firstActive !== secondActive) return secondActive - firstActive;
    return (
      dateTime(second.expiresAt) - dateTime(first.expiresAt) ||
      dateTime(second.createdAt) - dateTime(first.createdAt)
    );
  });

  return sorted[0];
}

function groupSubscriptions(subscriptions: any[] = []) {
  const groups = new Map<string, any[]>();

  subscriptions.forEach((subscription) => {
    const key = subscription.userId || subscription.user?.email || subscription.id;
    groups.set(key, [...(groups.get(key) || []), subscription]);
  });

  return Array.from(groups.entries())
    .map(([key, items]) => {
      const history = [...items].sort(
        (first, second) =>
          dateTime(second.createdAt) - dateTime(first.createdAt) ||
          dateTime(second.startedAt) - dateTime(first.startedAt)
      );
      const current = pickCurrentSubscription(history);
      const lastPayment =
        history.find((item) => item.payment || item.paymentId) || current;

      return {
        key,
        user: current?.user,
        current,
        history,
        activeCount: history.filter(isCurrentAccess).length,
        lastPayment,
      };
    })
    .sort((first, second) => {
      const firstActive = isCurrentAccess(first.current) ? 1 : 0;
      const secondActive = isCurrentAccess(second.current) ? 1 : 0;

      if (firstActive !== secondActive) return secondActive - firstActive;
      return dateTime(second.current?.expiresAt) - dateTime(first.current?.expiresAt);
    });
}

export default function AdminSubscriptionsPage() {
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [search, setSearch] = useState("");
  const [expiringSoon, setExpiringSoon] = useState(false);
  const [page, setPage] = useState(1);
  const [extendTarget, setExtendTarget] = useState<any>(null);
  const [extensionPlanId, setExtensionPlanId] = useState("");
  const [extensionDays, setExtensionDays] = useState(30);
  const [extensionNote, setExtensionNote] = useState("Manual admin extension");
  const [submittingExtension, setSubmittingExtension] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      if (plan) params.set("plan", plan);
      if (search) params.set("search", search);
      if (expiringSoon) params.set("expiringSoon", "true");
      const [subscriptionsResponse, plansResponse] = await Promise.all([
        fetch(`/api/admin/subscriptions?${params}`, { cache: "no-store" }),
        fetch("/api/admin/plans", { cache: "no-store" }),
      ]);
      const payload = await subscriptionsResponse.json();
      const plansPayload = await plansResponse.json();

      if (!subscriptionsResponse.ok) throw new Error(payload.message || "Failed to load subscriptions");
      setData(payload);
      if (plansResponse.ok) setPlans(plansPayload.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, [expiringSoon, page, plan, search, status]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const subscriptionGroups = useMemo(
    () => groupSubscriptions(data?.subscriptions || []),
    [data?.subscriptions]
  );
  const duplicateRows = Math.max((data?.subscriptions?.length || 0) - subscriptionGroups.length, 0);
  const selectedExtensionPlan = plans.find((item) => item.id === extensionPlanId);

  async function cancel(id: string) {
    if (!window.confirm("Cancel all active dashboard access for this user?")) return;
    const response = await fetch(`/api/admin/subscriptions/${id}/cancel`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || "Failed to cancel user access");
    toast.success("User access canceled");
    await load();
  }

  function openExtend(subscription: any) {
    const preferredPlan =
      plans.find((item) => item.id === subscription.planId && item.isActive && !item.isFree && !item.isTrial) ||
      plans.find((item) => item.isActive && !item.isFree && !item.isTrial) ||
      plans.find((item) => item.isActive && !item.isFree && !item.isTrial);
    const durationDays = Number(preferredPlan?.durationDays) || 30;

    setExtendTarget(subscription);
    setExtensionPlanId(preferredPlan?.id || subscription.planId || "");
    setExtensionDays(durationDays);
    setExtensionNote("Manual admin extension");
  }

  async function extend() {
    if (!extendTarget) return;
    if (!extensionPlanId) return toast.error("Select a plan first");
    if (!Number.isInteger(extensionDays) || extensionDays <= 0) {
      return toast.error("Duration days must be a positive number");
    }

    setSubmittingExtension(true);

    try {
      const response = await fetch("/api/admin/subscriptions/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: extendTarget.id,
          userId: extendTarget.userId,
          planId: extensionPlanId,
          durationDays: extensionDays,
          note: extensionNote,
        }),
      });
      const payload = await response.json();

      if (!response.ok) return toast.error(payload.message || "Failed to extend subscription");
      toast.success("Subscription extended");
      setExtendTarget(null);
      await load();
    } finally {
      setSubmittingExtension(false);
    }
  }

  if (loading && !data) return <LoadingState label="Loading subscriptions" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      {extendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-950 p-5 shadow-2xl">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-white">Extend Subscription</h2>
              <p className="mt-1 text-sm text-slate-400">
                {extendTarget.user?.email} - current status: {extendTarget.status}
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Plan</span>
                <select
                  className={`${selectClass} w-full`}
                  value={extensionPlanId}
                  onChange={(event) => {
                    const nextPlan = plans.find((item) => item.id === event.target.value);
                    setExtensionPlanId(event.target.value);
                    setExtensionDays(Number(nextPlan?.durationDays) || 30);
                  }}
                >
                  <option value="">Select plan</option>
                  {plans
                    .filter((item) => item.isActive && !item.isFree && !item.isTrial)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - {item.durationDays} days
                      </option>
                    ))}
                </select>
              </label>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="block text-sm text-slate-300">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Duration days</span>
                  <input
                    className={`${inputClass} w-full`}
                    type="number"
                    min={1}
                    value={extensionDays}
                    onChange={(event) => setExtensionDays(Number(event.target.value))}
                  />
                </label>
                <div className="flex items-end gap-2">
                  {[7, 30, 60, 90].map((days) => (
                    <Button
                      key={days}
                      type="button"
                      size="sm"
                      variant={extensionDays === days ? "default" : "outline"}
                      className={extensionDays === days ? "" : "border-slate-700 text-slate-100 hover:bg-slate-800"}
                      onClick={() => setExtensionDays(days)}
                    >
                      {days}
                    </Button>
                  ))}
                </div>
              </div>

              <label className="block text-sm text-slate-300">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Admin note</span>
                <input
                  className={`${inputClass} w-full`}
                  value={extensionNote}
                  onChange={(event) => setExtensionNote(event.target.value)}
                  placeholder="Reason or note"
                />
              </label>

              <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                This will set the user access to MANUAL and expire it after {extensionDays || 0} days
                {selectedExtensionPlan ? ` on ${selectedExtensionPlan.name}.` : "."}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-slate-700 text-slate-100 hover:bg-slate-800"
                onClick={() => setExtendTarget(null)}
                disabled={submittingExtension}
              >
                Close
              </Button>
              <Button type="button" onClick={extend} disabled={submittingExtension}>
                {submittingExtension ? "Extending..." : "Extend access"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <AdminCard>
        <div className="grid gap-3 md:grid-cols-[1fr_160px_180px_150px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className={`${inputClass} w-full pl-9`} placeholder="Search by user email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </label>
          <select className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All</option><option value="ACTIVE">ACTIVE</option><option value="TRIAL">TRIAL</option><option value="FREE">FREE</option><option value="MANUAL">MANUAL</option><option value="EXPIRED">EXPIRED</option><option value="CANCELED">CANCELED</option>
          </select>
          <select className={selectClass} value={plan} onChange={(event) => { setPlan(event.target.value); setPage(1); }}>
            <option value="">All Plans</option>
            {plans.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
          </select>
          <label className="flex h-9 items-center gap-2 rounded-md border border-slate-700 px-3 text-sm text-slate-200"><input type="checkbox" checked={expiringSoon} onChange={(event) => { setExpiringSoon(event.target.checked); setPage(1); }} /> Expiring Soon</label>
          <Button type="button" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" onClick={() => load()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">User access overview</h2>
            <p className="mt-1 text-sm text-slate-400">
              One row per email. Previous plans stay inside history so the current access is clear.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-300">
            <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1">{subscriptionGroups.length} users on this page</span>
            {duplicateRows > 0 && (
              <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-100">
                {duplicateRows} duplicate email rows grouped
              </span>
            )}
          </div>
        </div>

        {!subscriptionGroups.length ? <EmptyState label="No subscriptions match the selected filters." /> : (
          <TableWrap>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>User</th>
                  <th className={thClass}>Current Access</th>
                  <th className={thClass}>Dates</th>
                  <th className={thClass}>Payment</th>
                  <th className={thClass}>History</th>
                  <th className={thClass}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subscriptionGroups.map((group) => {
                  const subscription = group.current;
                  const active = isCurrentAccess(subscription);
                  const expanded = Boolean(expandedUsers[group.key]);
                  const payment = group.lastPayment;

                  return (
                    <Fragment key={group.key}>
                      <tr className={active ? "bg-emerald-500/[0.03]" : ""}>
                        <td className={`${tdClass} min-w-[260px]`}>
                          <div className="font-medium text-slate-100">{group.user?.email || "Unknown email"}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {group.user?.name || "No name"} - {group.history.length} subscription record{group.history.length === 1 ? "" : "s"}
                          </div>
                        </td>
                        <td className={`${tdClass} min-w-[170px]`}>
                          <div className="flex items-center gap-2">
                            <StatusBadge value={subscription.status} />
                            <span className="font-medium text-slate-100">{subscription.plan?.name || "No plan"}</span>
                          </div>
                          <div className={active ? "mt-1 text-xs text-emerald-300" : "mt-1 text-xs text-slate-500"}>
                            {active ? "Access is available now" : "No active access"}
                            {group.activeCount > 1 ? ` - ${group.activeCount} active records` : ""}
                          </div>
                        </td>
                        <td className={`${tdClass} min-w-[210px]`}>
                          <div className="flex items-center gap-2 text-slate-200">
                            <CalendarClock className="h-4 w-4 text-slate-500" />
                            <span>{daysRemaining(subscription.expiresAt)} days left</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {formatDate(subscription.startedAt)} to {formatDate(subscription.expiresAt)}
                          </div>
                        </td>
                        <td className={`${tdClass} min-w-[190px]`}>
                          <div className="max-w-[180px] truncate text-slate-200">{payment?.paymentId || "Manual"}</div>
                          <div className="mt-1">
                            <StatusBadge value={payment?.payment?.status || "N/A"} />
                          </div>
                        </td>
                        <td className={`${tdClass} min-w-[130px]`}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-slate-700 text-slate-100 hover:bg-slate-800"
                            onClick={() =>
                              setExpandedUsers((value) => ({
                                ...value,
                                [group.key]: !value[group.key],
                              }))
                            }
                          >
                            {expanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                            {group.history.length} records
                          </Button>
                        </td>
                        <td className={tdClass}>
                          <div className="flex flex-wrap gap-2">
                            <Button asChild size="sm">
                              <Link href={`/admin/users/${subscription.userId}`}>
                                <UserRound className="mr-2 h-4 w-4" />
                                User
                              </Link>
                            </Button>
                            {subscription.paymentId && (
                              <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800">
                                <Link href={`/admin/payments/${subscription.paymentId}`}>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Payment
                                </Link>
                              </Button>
                            )}
                            <Button type="button" size="sm" onClick={() => openExtend(subscription)}>Extend</Button>
                            <Button type="button" size="sm" variant="destructive" onClick={() => cancel(subscription.id)}>
                              <ShieldX className="mr-2 h-4 w-4" />
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td className="bg-slate-950/50 px-4 py-3" colSpan={6}>
                            <div className="grid gap-2">
                              {group.history.map((item: any) => (
                                <div
                                  key={item.id}
                                  className="grid gap-2 rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300 md:grid-cols-[130px_120px_1fr_180px]"
                                >
                                  <div><StatusBadge value={item.status} /></div>
                                  <div className="font-medium text-slate-100">{item.plan?.name || "No plan"}</div>
                                  <div>{formatDate(item.startedAt)} to {formatDate(item.expiresAt)} - {daysRemaining(item.expiresAt)} days</div>
                                  <div className="truncate">{item.paymentId || "Manual"}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </AdminCard>
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{pagination.total} subscription records</span>
        <div className="flex gap-2"><Button type="button" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>Previous</Button><span className="px-2 py-1">Page {pagination.page} of {pagination.totalPages}</span><Button type="button" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button></div>
      </div>
    </div>
  );
}
