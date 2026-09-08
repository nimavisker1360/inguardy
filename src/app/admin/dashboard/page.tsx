"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AdminCard,
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
  StatusBadge,
  TableWrap,
  daysRemaining,
  formatDate,
  tableClass,
  tdClass,
  thClass,
} from "@/components/admin/AdminUI";

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load admin dashboard");
      }

      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (loading) return <LoadingState label="Loading dashboard" />;
  if (error) return <ErrorState message={error} onRetry={() => load().catch(() => undefined)} />;

  const stats = data?.stats || {};
  const cards = [
    ["Total Users", stats.totalUsers],
    ["New Users This Month", stats.newUsersThisMonth],
    ["Trial Users", stats.trialUsers],
    ["Free Users", stats.freeUsers],
    ["Active Paid Subscriptions", stats.activePaidSubscriptions],
    ["Expired Subscriptions", stats.expiredSubscriptions],
    ["Payments Under Review", stats.paymentsUnderReview],
    ["Confirmed Payments", stats.confirmedPayments],
    ["Rejected Payments", stats.rejectedPayments],
    ["Monthly Revenue USDT", stats.monthlyRevenueUSDT],
    ["Total Revenue USDT", stats.totalRevenueUSDT],
    ["Expiring Soon", stats.expiringSoonSubscriptions],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <StatCard key={label} label={String(label)} value={String(value ?? "0")} />
        ))}
      </div>

      <AdminCard>
        <h2 className="mb-3 text-sm font-semibold text-white">Latest Payments Under Review</h2>
        {!data.latestPaymentsUnderReview?.length ? (
          <EmptyState label="No payments under review." />
        ) : (
          <TableWrap>
            <table className={tableClass}>
              <thead><tr><th className={thClass}>User Email</th><th className={thClass}>Plan</th><th className={thClass}>Amount</th><th className={thClass}>Network</th><th className={thClass}>Submitted</th><th className={thClass}>Action</th></tr></thead>
              <tbody className="divide-y divide-slate-800">
                {data.latestPaymentsUnderReview.map((payment: any) => (
                  <tr key={payment.id}>
                    <td className={tdClass}>{payment.user?.email}</td>
                    <td className={tdClass}>{payment.plan?.name}</td>
                    <td className={tdClass}>{payment.amount} {payment.currency}</td>
                    <td className={tdClass}><StatusBadge value={payment.network} /></td>
                    <td className={tdClass}>{formatDate(payment.submittedAt)}</td>
                    <td className={tdClass}><Button asChild size="sm"><Link href={`/admin/payments/${payment.id}`}>View</Link></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </AdminCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AdminCard>
          <h2 className="mb-3 text-sm font-semibold text-white">Latest Registered Users</h2>
          {!data.latestUsers?.length ? (
            <EmptyState label="No users found." />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead><tr><th className={thClass}>Name</th><th className={thClass}>Email</th><th className={thClass}>Created</th><th className={thClass}>Plan</th><th className={thClass}>Action</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {data.latestUsers.map((user: any) => (
                    <tr key={user.id}>
                      <td className={tdClass}>{user.name}</td>
                      <td className={tdClass}>{user.email}</td>
                      <td className={tdClass}>{formatDate(user.createdAt)}</td>
                      <td className={tdClass}>{user.latestSubscription?.plan?.name || "None"}</td>
                      <td className={tdClass}><Button asChild size="sm"><Link href={`/admin/users/${user.id}`}>View</Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="mb-3 text-sm font-semibold text-white">Expiring Soon</h2>
          {!data.expiringSoon?.length ? (
            <EmptyState label="No subscriptions expire in the next 7 days." />
          ) : (
            <TableWrap>
              <table className={tableClass}>
                <thead><tr><th className={thClass}>User Email</th><th className={thClass}>Plan</th><th className={thClass}>Expires</th><th className={thClass}>Days</th><th className={thClass}>Action</th></tr></thead>
                <tbody className="divide-y divide-slate-800">
                  {data.expiringSoon.map((subscription: any) => (
                    <tr key={subscription.id}>
                      <td className={tdClass}>{subscription.user?.email}</td>
                      <td className={tdClass}>{subscription.plan?.name}</td>
                      <td className={tdClass}>{formatDate(subscription.expiresAt)}</td>
                      <td className={tdClass}>{daysRemaining(subscription.expiresAt)}</td>
                      <td className={tdClass}><Button asChild size="sm"><Link href={`/admin/users/${subscription.userId}`}>View User</Link></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
