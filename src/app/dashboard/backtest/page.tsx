import {
  BacktestReplayWorkspace,
  type BacktestAccountOption,
} from "@/components/backtest/BacktestReplayWorkspace";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export default async function BacktestPage() {
  const session = await getSession();
  const [playbooks, accountRecords] = session?.user.id
    ? await Promise.all([
        prisma.playbookStrategy.findMany({
          where: { userId: session.user.id, isActive: true },
          orderBy: { updatedAt: "desc" },
          select: { id: true, name: true },
        }),
        prisma.tradingAccount.findMany({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            broker: true,
            platform: true,
            accountType: true,
            currency: true,
            balance: true,
            ctraderConnection: { select: { environment: true } },
            tradeLockerConnection: { select: { environment: true } },
            equitySnapshots: {
              orderBy: { timestamp: "desc" },
              take: 1,
              select: {
                timestamp: true,
                balance: true,
                equity: true,
                margin: true,
                freeMargin: true,
                marginLevel: true,
              },
            },
          },
        }),
      ])
    : [[], []];

  const accounts: BacktestAccountOption[] = accountRecords.map((account) => {
    const snapshot = account.equitySnapshots[0];
    return {
      id: account.id,
      name: account.name,
      broker: account.broker,
      platform: account.platform,
      accountType:
        account.accountType ??
        account.tradeLockerConnection?.environment ??
        account.ctraderConnection?.environment ??
        null,
      currency: account.currency,
      balance: snapshot ? Number(snapshot.balance) : account.balance === null ? null : Number(account.balance),
      equity: snapshot ? Number(snapshot.equity) : account.balance === null ? null : Number(account.balance),
      margin: snapshot?.margin === null || snapshot?.margin === undefined ? null : Number(snapshot.margin),
      freeMargin: snapshot?.freeMargin === null || snapshot?.freeMargin === undefined ? null : Number(snapshot.freeMargin),
      marginLevel: snapshot?.marginLevel === null || snapshot?.marginLevel === undefined ? null : Number(snapshot.marginLevel),
      snapshotAt: snapshot?.timestamp.toISOString() ?? null,
    };
  });

  return <BacktestReplayWorkspace playbooks={playbooks} accounts={accounts} />;
}
