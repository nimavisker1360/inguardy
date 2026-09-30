import { DashboardPerformance } from "@/components/dashboard/DashboardPerformance";
import { getDashboardOverviewData } from "@/lib/dashboard-data";
import { getSession } from "@/lib/server-auth";

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getSession();
  const params = await (
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>)
  );
  const data = session?.user.id
    ? await getDashboardOverviewData(session.user.id, {
        accountId: first(params.accountId),
      })
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
