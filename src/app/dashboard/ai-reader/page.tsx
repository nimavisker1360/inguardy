import { DashboardAiWorkspace } from "@/components/dashboard/DashboardAiWorkspace";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type AiReaderPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AIReaderPage({ searchParams }: AiReaderPageProps) {
  const session = await getSession();
  const params = await (
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>)
  );
  const accounts = session?.user.id
    ? await prisma.tradingAccount.findMany({
        where: { userId: session.user.id },
        select: { id: true, name: true, broker: true, platform: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const requestedAccountId = first(params.accountId);
  const activeAccountId =
    accounts.find((account) => account.id === requestedAccountId)?.id ?? accounts[0]?.id ?? null;

  return (
    <DashboardAiWorkspace
      accounts={accounts}
      initialAccountId={first(params.scope) === "all" ? null : activeAccountId}
    />
  );
}
