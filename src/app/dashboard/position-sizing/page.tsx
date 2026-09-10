import { PositionSizingCalculator } from "@/components/dashboard/PositionSizingCalculator";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function decimal(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

export default async function PositionSizingPage() {
  const session = await getSession();
  const accounts = session?.user.id
    ? await prisma.tradingAccount.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          broker: true,
          platform: true,
          currency: true,
          balance: true,
          symbolSpecifications: {
            orderBy: { symbol: "asc" },
            select: {
              symbol: true,
              contractSize: true,
              tickSize: true,
              tickValue: true,
              volumeMin: true,
              volumeMax: true,
              volumeStep: true,
              digits: true,
              baseCurrency: true,
              quoteCurrency: true,
            },
          },
        },
      })
    : [];

  return (
    <PositionSizingCalculator
      accounts={accounts.map((account) => ({
        ...account,
        balance: decimal(account.balance),
        symbols: account.symbolSpecifications.map((symbol) => ({
          ...symbol,
          contractSize: decimal(symbol.contractSize),
          tickSize: decimal(symbol.tickSize),
          tickValue: decimal(symbol.tickValue),
          volumeMin: decimal(symbol.volumeMin),
          volumeMax: decimal(symbol.volumeMax),
          volumeStep: decimal(symbol.volumeStep),
        })),
      }))}
    />
  );
}
