import { notFound, redirect } from "next/navigation";
import type { PrismaTradeDto } from "@/app/journal/_lib/journal-api";
import { TradeDetailClient } from "@/app/journal/[id]/trade-detail-client";
import { accountSelect, serializeAccount } from "@/lib/dashboard-data";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server-auth";
import { getUserPlanLimits } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type JournalTradeDetailPageProps = {
  params: Promise<{ id: string }>;
};

function serializeForClient<T>(value: unknown): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function JournalTradeDetailPage({
  params,
}: JournalTradeDetailPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const tradeRecord = await prisma.trade.findFirst({
    where: { id, userId: session.user.id },
    include: journalTradeInclude,
  });

  if (!tradeRecord) {
    notFound();
  }

  const trade = serializeForClient<PrismaTradeDto>(serializeJournalTrade(tradeRecord));
  const accountRecords = await prisma.tradingAccount.findMany({
    where: { userId: trade.userId },
    select: accountSelect,
    orderBy: { createdAt: "desc" },
  });
  const accounts = accountRecords.map((account) => serializeAccount(account));
  const access = await getUserPlanLimits(trade.userId).catch(() => null);

  return (
    <TradeDetailClient
      initialTrade={trade}
      accounts={accounts}
      aiAnalysisEnabled={Boolean(access?.limits.aiAnalysis)}
    />
  );
}
