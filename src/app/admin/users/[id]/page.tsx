"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
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

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-200">{value ?? "Not available"}</div>
    </div>
  );
}

function Progress({ label, count, max }: { label: string; count: number; max?: number | null }) {
  const percent = max ? Math.min((count / max) * 100, 100) : 100;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm text-slate-300"><span>{label}</span><span>{count} / {max ?? "Unlimited"}</span></div>
      <div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-blue-500" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [manualPlanId, setManualPlanId] = useState("");
  const [manualDays, setManualDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [userResponse, plansResponse] = await Promise.all([
        fetch(`/api/admin/users/${id}`, { cache: "no-store" }),
        fetch("/api/admin/plans", { cache: "no-store" }),
      ]);
      const payload = await userResponse.json();
      const plansPayload = await plansResponse.json();

      if (!userResponse.ok) throw new Error(payload.message || "Failed to load user");
      setData(payload);
      if (plansResponse.ok) {
        const paidPlans = (plansPayload.plans || []).filter(
          (plan: any) => plan.isActive && !plan.isFree && !plan.isTrial
        );

        setPlans(paidPlans);
        setManualPlanId((current) => current || paidPlans[0]?.id || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function addNote() {
    if (!note.trim()) return;
    const response = await fetch(`/api/admin/users/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || "Failed to add note");
    toast.success("Note added");
    setNote("");
    await load();
  }

  async function extendSubscription() {
    const response = await fetch("/api/admin/subscriptions/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: id, planId: manualPlanId, durationDays: manualDays, note: "Manual admin extension" }),
    });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || "Failed to extend subscription");
    toast.success("Subscription extended");
    await load();
  }

  async function cancelSubscription(id: string) {
    if (!window.confirm("Cancel current subscription?")) return;
    const response = await fetch(`/api/admin/subscriptions/${id}/cancel`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || "Failed to cancel subscription");
    toast.success("Subscription canceled");
    await load();
  }

  async function changeRole(role: "USER" | "ADMIN") {
    if (!window.confirm(`Change this user's role to ${role}?`)) return;
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const payload = await response.json();
    if (!response.ok) return toast.error(payload.message || "Failed to change role");
    toast.success("Role updated");
    await load();
  }

  if (loading) return <LoadingState label="Loading user" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  const user = data.user;
  const currentSubscription = data.subscriptions?.[0];
  const currentPlan = currentSubscription?.plan;
  const activity = data.tradingActivity || {};

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800"><Link href="/admin/users">Back to Users</Link></Button>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold text-white">Account Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="User ID" value={user.id} />
            <Field label="Name" value={user.name} />
            <Field label="Email" value={user.email} />
            <Field label="Role" value={<StatusBadge value={user.role} />} />
            <Field label="Created At" value={formatDate(user.createdAt)} />
            <Field label="Last Login" value={formatDate(user.lastLogin)} />
            <Field label="Auth Provider" value={user.authProvider || "Not available"} />
            <Field label="Account Status" value={user.emailVerified ? "Email verified" : "Email not verified"} />
          </div>
        </AdminCard>

        <AdminCard id="billing">
          <h2 className="mb-4 text-sm font-semibold text-white">Current Subscription</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Current Plan" value={currentPlan?.name || "Not available"} />
            <Field label="Status" value={<StatusBadge value={currentSubscription?.status || "NONE"} />} />
            <Field label="Started At" value={formatDate(currentSubscription?.startedAt)} />
            <Field label="Expires At" value={formatDate(currentSubscription?.expiresAt)} />
            <Field label="Days Remaining" value={daysRemaining(currentSubscription?.expiresAt) ?? "Not available"} />
            <Field label="Payment Method" value={currentSubscription?.paymentId ? "Manual USDT" : currentSubscription ? "Manual/Admin" : "Not available"} />
            <Field label="Last Payment" value={currentSubscription?.paymentId || "Not available"} />
            <Field label="Trial Used" value={data.subscriptions?.some((item: any) => item.plan?.isTrial) ? "Yes" : "No"} />
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <h2 className="mb-4 text-sm font-semibold text-white">Usage</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Progress label="Trades" count={data.usage.trades} max={currentPlan?.maxTrades} />
          <Progress label="Screenshots" count={data.usage.screenshots} max={currentPlan?.maxScreenshots} />
          <Progress label="Playbooks" count={data.usage.playbooks} max={currentPlan?.maxPlaybooks} />
          <Progress label="Checklists" count={data.usage.checklists} max={currentPlan?.maxChecklists} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <StatusBadge value={currentPlan?.aiAnalysis ? "AI Analysis Enabled" : "AI Analysis Disabled"} />
          <StatusBadge value={currentPlan?.advancedAnalytics ? "Advanced Analytics Enabled" : "Advanced Analytics Disabled"} />
          <StatusBadge value={currentPlan?.exportEnabled ? "Export Enabled" : "Export Disabled"} />
        </div>
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold text-white">Trading Activity</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Total Trades" value={activity.totalTrades} />
            <Field label="Trades This Month" value={activity.tradesThisMonth} />
            <Field label="Total P&L" value={activity.totalProfitLoss ?? "Not available"} />
            <Field label="Win Rate" value={activity.winRate !== null ? `${activity.winRate}%` : "Not available"} />
            <Field label="Last Trade Date" value={formatDate(activity.lastTradeDate)} />
            <Field label="Total Screenshots" value={activity.totalScreenshots} />
            <Field label="Total Playbooks" value={activity.totalPlaybooks} />
            <Field label="Total Checklists" value={activity.totalChecklists} />
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold text-white">Admin Actions</h2>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto]">
              <select className={selectClass} value={manualPlanId} onChange={(event) => setManualPlanId(event.target.value)}>
                {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
              </select>
              <input className={inputClass} type="number" value={manualDays} onChange={(event) => setManualDays(Number(event.target.value))} />
              <Button type="button" onClick={extendSubscription}>Extend</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentSubscription && <Button type="button" variant="destructive" onClick={() => cancelSubscription(currentSubscription.id)}>Cancel Current Subscription</Button>}
              <Button type="button" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" onClick={() => changeRole(user.role === "ADMIN" ? "USER" : "ADMIN")}>Change Role to {user.role === "ADMIN" ? "USER" : "ADMIN"}</Button>
            </div>
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <h2 className="mb-4 text-sm font-semibold text-white">Payment History</h2>
        {!data.payments?.length ? <EmptyState label="No payment history." /> : (
          <TableWrap><table className={tableClass}><thead><tr><th className={thClass}>Payment ID</th><th className={thClass}>Plan</th><th className={thClass}>Amount</th><th className={thClass}>Network</th><th className={thClass}>TXID</th><th className={thClass}>Status</th><th className={thClass}>Created</th><th className={thClass}>Submitted</th><th className={thClass}>Confirmed</th><th className={thClass}>Action</th></tr></thead><tbody className="divide-y divide-slate-800">{data.payments.map((payment: any) => <tr key={payment.id}><td className={`${tdClass} max-w-[170px] truncate`}>{payment.id}</td><td className={tdClass}>{payment.plan?.name}</td><td className={tdClass}>{payment.amount} {payment.currency}</td><td className={tdClass}>{payment.network}</td><td className={`${tdClass} max-w-[180px] truncate`}>{payment.txid || "Not submitted"}</td><td className={tdClass}><StatusBadge value={payment.status} /></td><td className={tdClass}>{formatDate(payment.createdAt)}</td><td className={tdClass}>{formatDate(payment.submittedAt)}</td><td className={tdClass}>{formatDate(payment.confirmedAt)}</td><td className={tdClass}><Button asChild size="sm"><Link href={`/admin/payments/${payment.id}`}>View Payment</Link></Button></td></tr>)}</tbody></table></TableWrap>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-4 text-sm font-semibold text-white">Subscription History</h2>
        {!data.subscriptions?.length ? <EmptyState label="No subscription history." /> : (
          <TableWrap><table className={tableClass}><thead><tr><th className={thClass}>Plan</th><th className={thClass}>Status</th><th className={thClass}>Started</th><th className={thClass}>Expires</th><th className={thClass}>Canceled</th><th className={thClass}>Payment ID</th><th className={thClass}>Action</th></tr></thead><tbody className="divide-y divide-slate-800">{data.subscriptions.map((subscription: any) => <tr key={subscription.id}><td className={tdClass}>{subscription.plan?.name}</td><td className={tdClass}><StatusBadge value={subscription.status} /></td><td className={tdClass}>{formatDate(subscription.startedAt)}</td><td className={tdClass}>{formatDate(subscription.expiresAt)}</td><td className={tdClass}>{formatDate(subscription.canceledAt)}</td><td className={`${tdClass} max-w-[170px] truncate`}>{subscription.paymentId || "Manual"}</td><td className={tdClass}>{subscription.paymentId && <Button asChild size="sm"><Link href={`/admin/payments/${subscription.paymentId}`}>View Payment</Link></Button>}</td></tr>)}</tbody></table></TableWrap>
        )}
      </AdminCard>

      <AdminCard>
        <h2 className="mb-4 text-sm font-semibold text-white">Admin Notes</h2>
        <div className="mb-4 flex gap-2">
          <input className={`${inputClass} flex-1`} placeholder="Add admin note" value={note} onChange={(event) => setNote(event.target.value)} />
          <Button type="button" onClick={addNote}>Add Note</Button>
        </div>
        {!data.adminNotes?.length ? <EmptyState label="No admin notes." /> : (
          <div className="space-y-3">{data.adminNotes.map((item: any) => <div key={item.id} className="rounded-md border border-slate-800 p-3"><p className="text-sm text-slate-200">{item.note}</p><p className="mt-2 text-xs text-slate-500">{item.admin?.email || "Unknown admin"} - {formatDate(item.createdAt)}</p></div>)}</div>
        )}
      </AdminCard>
    </div>
  );
}
