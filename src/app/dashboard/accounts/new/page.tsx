import { redirect } from "next/navigation";
import { NewTradingAccountPage } from "@/components/dashboard/NewTradingAccountPage";
import { getSession } from "@/lib/server-auth";
import { getJournalAccessState } from "@/server/mt5/subscription-service";

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams?: Promise<{ platform?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?redirect=/dashboard/accounts/new");

  const journalAccess = await getJournalAccessState(session.user.id);
  const params = await searchParams;
  const initialPlatformId = params?.platform === "tradelocker" ? "tradelocker" : undefined;

  return (
    <NewTradingAccountPage
      canUseAutoSync={journalAccess.canUseJournal}
      initialPlatformId={initialPlatformId}
    />
  );
}
