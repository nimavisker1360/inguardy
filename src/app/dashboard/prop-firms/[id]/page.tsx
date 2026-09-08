import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeStatus } from "@prisma/client";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { TradeTable } from "@/components/dashboard/TradeTable";
import { formatMoney, formatNumber } from "@/components/dashboard/types";
import {
  accountSelect,
  serializeAccount,
  serializeTrade,
  tradeListInclude,
} from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";
import { closeTriggeredPropFirmChallenges, getPropFirmTradeWindow } from "@/lib/prop-firms";
import { getSession } from "@/lib/server-auth";

type PropFirmChallengePageProps = {
  params: Promise<{ id: string }>;
};

export default async function PropFirmChallengePage({
  params,
}: PropFirmChallengePageProps) {
  const session = await getSession();

  if (!session?.user.id) {
    notFound();
  }

  const { id } = await params;
  await closeTriggeredPropFirmChallenges(session.user.id, { challengeId: id });

  const challenge = await prisma.propFirmChallenge.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!challenge) {
    notFound();
  }

  const account = challenge.accountId
    ? await prisma.tradingAccount.findFirst({
        where: { id: challenge.accountId, userId: session.user.id },
        select: accountSelect,
      })
    : null;
  const window = getPropFirmTradeWindow(challenge);
  const trades = challenge.accountId
    ? await prisma.trade.findMany({
        where: {
          userId: session.user.id,
          accountId: challenge.accountId,
          OR: [
            {
              status: TradeStatus.CLOSED,
              closedAt: { gte: window.start, lte: window.end },
            },
            {
              status: { not: TradeStatus.CLOSED },
              openedAt: { gte: window.start, lte: window.end },
            },
          ],
        },
        include: tradeListInclude,
        orderBy: [{ openedAt: "desc" }, { createdAt: "desc" }],
      })
    : [];
  const currency = account?.currency || "USD";
  const serializedTrades = trades.map(serializeTrade);
  const totalPnl = serializedTrades.reduce(
    (total, trade) => total + Number(trade.profitLoss || 0),
    0
  );
  const profitTarget = challenge.profitTarget ? Number(challenge.profitTarget) : null;
  const progress = profitTarget && profitTarget > 0 ? (totalPnl / profitTarget) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href="/dashboard/prop-firms"
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-300 hover:text-blue-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Prop Firms
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-200">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{challenge.name}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {account?.mt5AccountNumber || account?.name || "Unknown account"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
          <div className="text-xs uppercase text-slate-400">Starting Balance</div>
          <div className="mt-1 font-semibold text-white">
            {formatMoney(String(challenge.startingBalance), currency)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
          <div className="text-xs uppercase text-slate-400">Challenge P/L</div>
          <div className={totalPnl >= 0 ? "mt-1 font-semibold text-emerald-200" : "mt-1 font-semibold text-red-200"}>
            {formatMoney(totalPnl, currency)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
          <div className="text-xs uppercase text-slate-400">Profit Target</div>
          <div className="mt-1 font-semibold text-white">
            {formatMoney(challenge.profitTarget ? String(challenge.profitTarget) : null, currency)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-[#0F172A] p-4">
          <div className="text-xs uppercase text-slate-400">Progress</div>
          <div className="mt-1 font-semibold text-white">{formatNumber(progress, 2)}%</div>
        </div>
      </div>

      <TradeTable
        trades={serializedTrades.map((trade) => ({
          ...trade,
          account: account ? serializeAccount(account) : trade.account,
        }))}
      />
    </div>
  );
}
