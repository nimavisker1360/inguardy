"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  ErrorState,
  LoadingState,
  StatusBadge,
  explorerUrl,
  formatDate,
} from "@/components/admin/AdminUI";

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm text-slate-200">{value || "Not available"}</div>
    </div>
  );
}

export default function AdminPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/payments/${id}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to load payment");
      setPayment(payload.payment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payment");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function mutate(action: "confirm" | "reject") {
    if (action === "confirm" && !window.confirm("Confirm only if the USDT amount, network, wallet address, and TXID are correct.")) return;
    const reason = action === "reject" ? window.prompt("Rejection reason") || "" : undefined;
    const response = await fetch(`/api/admin/payments/${id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: action === "reject" ? JSON.stringify({ reason }) : undefined,
    });
    const payload = await response.json();

    if (!response.ok) {
      toast.error(payload.message || `Failed to ${action} payment`);
      return;
    }

    toast.success(action === "confirm" ? "Payment confirmed" : "Payment rejected");
    setPayment(payload.payment);
  }

  if (loading) return <LoadingState label="Loading payment" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  const explorer = explorerUrl(payment.network, payment.txid);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800"><Link href="/admin/payments">Back to Payments</Link></Button>
        <Button type="button" disabled={!["UNDER_REVIEW", "WAITING_TXID"].includes(payment.status)} onClick={() => mutate("confirm")}>Confirm & Activate Subscription</Button>
        <Button type="button" variant="destructive" onClick={() => mutate("reject")}>Reject Payment</Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-white">Payment Summary</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Row label="Payment ID" value={payment.id} />
            <Row label="Status" value={<StatusBadge value={payment.status} />} />
            <Row label="Amount" value={`${payment.amount} ${payment.currency}`} />
            <Row label="Network" value={payment.network} />
            <Row label="Wallet Address" value={payment.walletAddress} />
            <Row label="TXID" value={payment.txid} />
            <Row label="Created At" value={formatDate(payment.createdAt)} />
            <Row label="Submitted At" value={formatDate(payment.submittedAt)} />
            <Row label="Confirmed At" value={formatDate(payment.confirmedAt)} />
            <Row label="Rejected At" value={formatDate(payment.rejectedAt)} />
            <Row label="Expires At" value={formatDate(payment.expiresAt)} />
            <Row label="Rejection Reason" value={payment.rejectionReason} />
            <Row label="Admin Note" value={payment.adminNote} />
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold text-white">Manual Verification</h2>
          <div className="space-y-3">
            <Button type="button" className="w-full" disabled={!payment.txid} onClick={() => navigator.clipboard.writeText(payment.txid).then(() => toast.success("TXID copied"))}>Copy TXID</Button>
            <Button type="button" className="w-full" variant="outline" disabled={!payment.walletAddress} onClick={() => navigator.clipboard.writeText(payment.walletAddress).then(() => toast.success("Wallet copied"))}>Copy Wallet</Button>
            {explorer && <Button asChild className="w-full" variant="outline"><a href={explorer} target="_blank" rel="noreferrer">Open Explorer</a></Button>}
            <p className="text-xs text-slate-400">Do not automatically verify blockchain transactions. Use the explorer link for manual review.</p>
          </div>
        </AdminCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold text-white">User Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Row label="Name" value={payment.user?.name} />
            <Row label="Email" value={payment.user?.email} />
            <Row label="Role" value={<StatusBadge value={payment.user?.role} />} />
            <Row label="Created At" value={formatDate(payment.user?.createdAt)} />
            <Row label="Current Subscription" value={payment.subscription?.status || "Not available"} />
          </div>
          <Button asChild className="mt-4" size="sm"><Link href={`/admin/users/${payment.user?.id}`}>View User</Link></Button>
        </AdminCard>
        <AdminCard>
          <h2 className="mb-4 text-sm font-semibold text-white">Plan Info</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Row label="Plan Name" value={payment.plan?.name} />
            <Row label="Price USDT" value={payment.plan?.priceUSDT} />
            <Row label="Duration Days" value={payment.plan?.durationDays} />
            <Row label="Limits" value={`Trades ${payment.plan?.maxTrades ?? "Unlimited"}, Screenshots ${payment.plan?.maxScreenshots ?? "Unlimited"}`} />
            <Row label="Features" value={[payment.plan?.aiAnalysis && "AI Analysis", payment.plan?.advancedAnalytics && "Advanced Analytics", payment.plan?.exportEnabled && "Export"].filter(Boolean).join(", ") || "None"} />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
