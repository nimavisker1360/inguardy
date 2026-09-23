import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { redirect } from "next/navigation";
import { getDashboardOverviewData } from "@/lib/dashboard-data";
import { getSession } from "@/lib/server-auth";
import { getJournalAccessState } from "@/server/mt5/subscription-service";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await getSession();
  const params = await (
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>)
  );
  if (getSingleParam(params.addAccount) === "1") redirect("/dashboard/accounts/new");
  const [data, journalAccess] = session?.user.id
    ? await Promise.all([
        getDashboardOverviewData(session.user.id),
        getJournalAccessState(session.user.id),
      ])
    : [{
        activeAccountId: null,
        accounts: [],
        trades: [],
        stats: { totalTrades: 0, closedTrades: 0, totalPnl: 0, winRate: 0, openTrades: 0, notReviewedTrades: 0 },
        pageStats: [],
        performanceTrades: [],
      }, {
        canUseJournal: false,
        status: "Subscription Required",
        message: null,
      }];

  return (
    <DashboardOverview
      userId={session?.user.id}
      userName={session?.user.name}
      initialAccounts={data.accounts}
      initialActiveAccountId={data.activeAccountId}
      initialTrades={data.trades}
      initialStats={data.stats}
      initialPageStats={data.pageStats}
      canUseAutoSync={journalAccess.canUseJournal}
    />
  );
}
