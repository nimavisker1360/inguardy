import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { RiskGuardianClient } from "@/components/dashboard/RiskGuardianClient";

export default async function RiskGuardianPage({ searchParams }: { searchParams: Promise<{ accountId?: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login?redirect=/dashboard/risk-guardian");
  const accounts = await prisma.tradingAccount.findMany({ where: { userId },
    select: { id: true, name: true, broker: true, currency: true, ingestionMode: true }, orderBy: { createdAt: "desc" } });
  const { accountId } = await searchParams;
  return <RiskGuardianClient accounts={accounts} initialAccountId={accounts.some(account => account.id === accountId) ? accountId : undefined} />;
}
