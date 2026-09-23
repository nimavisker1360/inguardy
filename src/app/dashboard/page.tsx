import { DashboardPerformance } from "@/components/dashboard/DashboardPerformance";
import { getDashboardOverviewData } from "@/lib/dashboard-data";
import { getSession } from "@/lib/server-auth";

export default async function DashboardPage() {
  const session = await getSession();
  const data = session?.user.id
    ? await getDashboardOverviewData(session.user.id)
    : {
        activeAccountId: null,
        accounts: [],
        trades: [],
        stats: { totalTrades: 0, closedTrades: 0, totalPnl: 0, winRate: 0, openTrades: 0, notReviewedTrades: 0 },
        pageStats: [],
        performanceTrades: [],
      };

  return (
    <DashboardPerformance
      userId={session?.user.id}
      initialAccounts={data.accounts}
      initialActiveAccountId={data.activeAccountId}
      initialStats={data.stats}
      initialPerformanceTrades={data.performanceTrades}
    />
  );
}
