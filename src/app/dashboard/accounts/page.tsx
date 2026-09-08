import { AccountsManager } from "@/components/dashboard/AccountsManager";
import { getAccountsPageData } from "@/lib/dashboard-data";
import { getSession } from "@/lib/server-auth";
import { getJournalAccessState } from "@/server/mt5/subscription-service";

export default async function AccountsPage() {
  const session = await getSession();
  const accounts = session?.user.id ? await getAccountsPageData(session.user.id) : [];
  const journalAccess = session?.user.id
    ? await getJournalAccessState(session.user.id)
    : {
        canUseJournal: false,
        status: "Subscription Required",
        message: "Journal sync disabled. Upgrade to continue receiving MT5 trades.",
      };

  return (
    <AccountsManager
      userId={session?.user.id}
      initialAccounts={accounts}
      journalAccess={journalAccess}
    />
  );
}
