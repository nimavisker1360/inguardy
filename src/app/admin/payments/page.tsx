"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  EmptyState,
  ErrorState,
  LoadingState,
  StatusBadge,
  TableWrap,
  explorerUrl,
  formatDate,
  inputClass,
  selectClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/AdminUI";

export default function AdminPaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [network, setNetwork] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (status) params.set("status", status);
      if (network) params.set("network", network);
      if (search) params.set("search", search);
      const response = await fetch(`/api/admin/payments?${params}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to load payments");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [network, page, search, status]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function mutate(id: string, action: "confirm" | "reject") {
    if (action === "confirm" && !window.confirm("Are you sure you verified this USDT payment manually?")) return;
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
    await load();
  }

  if (loading && !data) return <LoadingState label="Loading payments" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]">
          <input className={inputClass} placeholder="Search by email or TXID" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <select className={selectClass} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="WAITING_TXID">WAITING_TXID</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="EXPIRED">EXPIRED</option>
          </select>
          <select className={selectClass} value={network} onChange={(event) => { setNetwork(event.target.value); setPage(1); }}>
            <option value="">All Networks</option>
            <option value="TRC20">TRC20</option>
            <option value="ERC20">ERC20</option>
            <option value="BEP20">BEP20</option>
          </select>
          <Button type="button" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" onClick={() => load()}>Refresh</Button>
        </div>
      </AdminCard>

      <AdminCard>
        {!data?.payments?.length ? (
          <EmptyState label="No payments match the selected filters." />
        ) : (
          <TableWrap>
            <table className={tableClass}>
              <thead><tr><th className={thClass}>User Email</th><th className={thClass}>User Name</th><th className={thClass}>Plan</th><th className={thClass}>Amount</th><th className={thClass}>Network</th><th className={thClass}>TXID</th><th className={thClass}>Status</th><th className={thClass}>Created</th><th className={thClass}>Submitted</th><th className={thClass}>Confirmed</th><th className={thClass}>Actions</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {data.payments.map((payment: any) => {
                  const explorer = explorerUrl(payment.network, payment.txid);
                  return (
                    <tr key={payment.id}>
                      <td className={tdClass}>{payment.user?.email}</td>
                      <td className={tdClass}>{payment.user?.name}</td>
                      <td className={tdClass}>{payment.plan?.name}</td>
                      <td className={tdClass}>{payment.amount} {payment.currency}</td>
                      <td className={tdClass}>{payment.network}</td>
                      <td className={`${tdClass} max-w-[220px] truncate`}>{payment.txid || "Not submitted"}</td>
                      <td className={tdClass}><StatusBadge value={payment.status} /></td>
                      <td className={tdClass}>{formatDate(payment.createdAt)}</td>
                      <td className={tdClass}>{formatDate(payment.submittedAt)}</td>
                      <td className={tdClass}>{formatDate(payment.confirmedAt)}</td>
                      <td className={tdClass}>
                        <div className="flex gap-2">
                          <Button asChild size="sm"><Link href={`/admin/payments/${payment.id}`}>View</Link></Button>
                          <Button type="button" size="sm" disabled={!["UNDER_REVIEW", "WAITING_TXID"].includes(payment.status)} onClick={() => mutate(payment.id, "confirm")}>Confirm</Button>
                          <Button type="button" size="sm" variant="destructive" disabled={payment.status === "REJECTED"} onClick={() => mutate(payment.id, "reject")}>Reject</Button>
                          <Button type="button" size="sm" variant="ghost" disabled={!payment.txid} onClick={() => navigator.clipboard.writeText(payment.txid).then(() => toast.success("TXID copied"))}>Copy</Button>
                          {explorer && <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800"><a href={explorer} target="_blank" rel="noreferrer">Explorer</a></Button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        )}
      </AdminCard>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{pagination.total} payments</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>Previous</Button>
          <span className="px-2 py-1">Page {pagination.page} of {pagination.totalPages}</span>
          <Button type="button" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
