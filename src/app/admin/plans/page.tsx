"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  inputClass,
} from "@/components/admin/AdminUI";

const blankPlan = {
  name: "",
  slug: "",
  description: "",
  priceUSDT: "0",
  durationDays: 30,
  maxTrades: "",
  maxScreenshots: "",
  maxPlaybooks: "",
  maxChecklists: "",
  aiAnalysis: false,
  advancedAnalytics: false,
  exportEnabled: false,
  isTrial: false,
  isFree: false,
  isActive: true,
};

function sortPlans(plans: any[]) {
  return [...plans].sort((first, second) => {
    if (Number(first.isTrial) !== Number(second.isTrial)) {
      return Number(second.isTrial) - Number(first.isTrial);
    }

    if (Number(first.isFree) !== Number(second.isFree)) {
      return Number(second.isFree) - Number(first.isFree);
    }

    return Number(first.priceUSDT || 0) - Number(second.priceUSDT || 0);
  });
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPlanId, setUpdatingPlanId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/plans", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to load plans");
      setPlans(payload.plans || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function save() {
    if (!selected || saving) return;

    const creating = !selected.id;
    setSaving(true);

    try {
      const response = await fetch(creating ? "/api/admin/plans" : `/api/admin/plans/${selected.id}`, {
        method: creating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const payload = await response.json();
      if (!response.ok) return toast.error(payload.message || "Failed to save plan");

      const savedPlan = payload.plan;
      setPlans((current) =>
        sortPlans(
          creating
            ? [savedPlan, ...current]
            : current.map((plan) => (plan.id === savedPlan.id ? savedPlan : plan))
        )
      );
      toast.success("Plan saved");
      setSelected(null);
    } finally {
      setSaving(false);
    }
  }

  async function togglePlan(plan: any) {
    if (updatingPlanId) return;

    setUpdatingPlanId(plan.id);

    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      const payload = await response.json();
      if (!response.ok) return toast.error(payload.message || "Failed to update plan");

      setPlans((current) =>
        current.map((item) => (item.id === payload.plan.id ? payload.plan : item))
      );
      toast.success(plan.isActive ? "Plan deactivated" : "Plan activated");
    } finally {
      setUpdatingPlanId("");
    }
  }

  if (loading) return <LoadingState label="Loading plans" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button type="button" onClick={() => setSelected(blankPlan)}>Create Plan</Button></div>
      {!plans.length ? <EmptyState label="No plans found." /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <AdminCard key={plan.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{plan.name}</h2>
                  <p className="text-sm text-slate-400">{plan.slug}</p>
                </div>
                <div className="flex gap-2"><StatusBadge value={plan.isActive ? "ACTIVE" : "INACTIVE"} />{plan.isTrial && <StatusBadge value="TRIAL" />}{plan.isFree && <StatusBadge value="FREE" />}</div>
              </div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <div>Price: {plan.priceUSDT} USDT</div>
                <div>Duration: {plan.durationDays} days</div>
                <div>Trades: {plan.maxTrades ?? "Unlimited"}</div>
                <div>Screenshots: {plan.maxScreenshots ?? "Unlimited"}</div>
                <div>Playbooks: {plan.maxPlaybooks ?? "Unlimited"}</div>
                <div>Checklists: {plan.maxChecklists ?? "Unlimited"}</div>
                <div>AI Analysis: {plan.aiAnalysis ? "Enabled" : "Disabled"}</div>
                <div>Advanced Analytics: {plan.advancedAnalytics ? "Enabled" : "Disabled"}</div>
                <div>Export: {plan.exportEnabled ? "Enabled" : "Disabled"}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="button" size="sm" onClick={() => setSelected({ ...plan })}>Edit Plan</Button>
                <Button type="button" size="sm" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" disabled={updatingPlanId === plan.id} onClick={() => togglePlan(plan)}>{updatingPlanId === plan.id ? "Saving..." : plan.isActive ? "Deactivate" : "Activate"}</Button>
              </div>
            </AdminCard>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <AdminCard className="max-h-[90vh] w-full max-w-3xl overflow-y-auto">
            <h2 className="mb-4 text-sm font-semibold text-white">{selected.id ? "Edit Plan" : "Create Plan"}</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input className={inputClass} placeholder="Name" value={selected.name} onChange={(event) => setSelected({ ...selected, name: event.target.value })} />
              <input className={inputClass} placeholder="Slug" value={selected.slug} disabled={Boolean(selected.id)} onChange={(event) => setSelected({ ...selected, slug: event.target.value })} />
              <input className={inputClass} placeholder="Price USDT" value={selected.priceUSDT} onChange={(event) => setSelected({ ...selected, priceUSDT: event.target.value })} />
              <input className={inputClass} type="number" placeholder="Duration Days" value={selected.durationDays} onChange={(event) => setSelected({ ...selected, durationDays: Number(event.target.value) })} />
              {["maxTrades", "maxScreenshots", "maxPlaybooks", "maxChecklists"].map((field) => (
                <input key={field} className={inputClass} type="number" placeholder={`${field} blank means unlimited`} value={selected[field] ?? ""} onChange={(event) => setSelected({ ...selected, [field]: event.target.value })} />
              ))}
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
              {["aiAnalysis", "advancedAnalytics", "exportEnabled", "isActive"].map((field) => (
                <label key={field} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected[field])} onChange={(event) => setSelected({ ...selected, [field]: event.target.checked })} /> {field}</label>
              ))}
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected.isTrial)} onChange={(event) => setSelected({ ...selected, isTrial: event.target.checked })} /> isTrial</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(selected.isFree)} onChange={(event) => setSelected({ ...selected, isFree: event.target.checked })} /> isFree</label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" disabled={saving} onClick={() => setSelected(null)}>Cancel</Button>
              <Button type="button" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </AdminCard>
        </div>
      )}
    </div>
  );
}
