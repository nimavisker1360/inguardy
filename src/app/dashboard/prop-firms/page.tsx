import { PropFirmsManager } from "@/components/dashboard/PropFirmsManager";
import { getPropFirmChallengesForUser } from "@/lib/dashboard-data";
import { getSession } from "@/lib/server-auth";

type PropFirmsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropFirmsPage({ searchParams }: PropFirmsPageProps) {
  const session = await getSession();
  const params = (await searchParams) || {};
  const data = session?.user.id
    ? await getPropFirmChallengesForUser(session.user.id)
    : { accounts: [], challenges: [] };

  return (
    <PropFirmsManager
      initialAccounts={data.accounts}
      initialChallenges={data.challenges}
      initialSelectedAccountId={first(params.accountId) || null}
    />
  );
}
