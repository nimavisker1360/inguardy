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
  daysRemaining,
  formatDate,
  inputClass,
  selectClass,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/AdminUI";

export default function AdminUsersPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", sortBy });
      if (search) params.set("search", search);
      if (filter) params.set("filter", filter);
      const response = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) throw new Error(payload.message || "Failed to load users");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [filter, page, search, sortBy]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (loading && !data) return <LoadingState label="Loading users" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="grid gap-3 md:grid-cols-[1fr_220px_220px_auto]">
          <input className={inputClass} placeholder="Search by name or email" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          <select className={selectClass} value={filter} onChange={(event) => { setFilter(event.target.value); setPage(1); }}>
            <option value="">All Users</option>
            <option value="admins">Admins</option>
            <option value="trial">Trial Users</option>
            <option value="free">Free Users</option>
            <option value="active-paid">Active Paid Users</option>
            <option value="expired">Expired Users</option>
            <option value="payment-under-review">Payment Under Review</option>
            <option value="created-this-month">Created This Month</option>
          </select>
          <select className={selectClass} value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="createdAt">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="expiresSoon">Subscription expires soon</option>
            <option value="mostTrades">Most trades</option>
            <option value="mostPayments">Most payments</option>
          </select>
          <Button type="button" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800" onClick={() => load()}>
            Refresh
          </Button>
        </div>
      </AdminCard>

      <AdminCard>
        {!data?.users?.length ? (
          <EmptyState label="No users match the selected filters." />
        ) : (
          <TableWrap>
            <table className={tableClass}>
              <thead><tr><th className={thClass}>Name</th><th className={thClass}>Email</th><th className={thClass}>Role</th><th className={thClass}>Provider</th><th className={thClass}>Created</th><th className={thClass}>Last Login</th><th className={thClass}>Plan</th><th className={thClass}>Status</th><th className={thClass}>Expires</th><th className={thClass}>Days</th><th className={thClass}>Trades</th><th className={thClass}>Screenshots</th><th className={thClass}>Payments</th><th className={thClass}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {data.users.map((user: any) => (
                  <tr key={user.id}>
                    <td className={tdClass}>{user.name}</td>
                    <td className={tdClass}>{user.email}</td>
                    <td className={tdClass}><StatusBadge value={user.role} /></td>
                    <td className={tdClass}>{user.authProvider || "Not available"}</td>
                    <td className={tdClass}>{formatDate(user.createdAt)}</td>
                    <td className={tdClass}>{formatDate(user.lastLogin)}</td>
                    <td className={tdClass}>{user.latestSubscription?.plan?.name || "None"}</td>
                    <td className={tdClass}><StatusBadge value={user.latestSubscription?.status || "NONE"} /></td>
                    <td className={tdClass}>{formatDate(user.latestSubscription?.expiresAt)}</td>
                    <td className={tdClass}>{daysRemaining(user.latestSubscription?.expiresAt) ?? "N/A"}</td>
                    <td className={tdClass}>{user.tradeCount}</td>
                    <td className={tdClass}>{user.screenshotsCount}</td>
                    <td className={tdClass}>{user.paymentCount}</td>
                    <td className={tdClass}>
                      <div className="flex gap-2">
                        <Button asChild size="sm"><Link href={`/admin/users/${user.id}`}>View</Link></Button>
                        <Button asChild size="sm" variant="outline" className="border-slate-700 text-slate-100 hover:bg-slate-800"><Link href={`/admin/users/${user.id}#billing`}>Billing</Link></Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(user.email).then(() => toast.success("Email copied"))}>Copy</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </AdminCard>

      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{pagination.total} users</span>
        <div className="flex gap-2">
          <Button type="button" size="sm" disabled={page <= 1} onClick={() => setPage((value) => Math.max(value - 1, 1))}>Previous</Button>
          <span className="px-2 py-1">Page {pagination.page} of {pagination.totalPages}</span>
          <Button type="button" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
