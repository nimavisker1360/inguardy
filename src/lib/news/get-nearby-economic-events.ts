import { prisma } from "@/lib/prisma";

const SYMBOL_CURRENCIES: Record<string, string[]> = {
  XAUUSD: ["USD"],
  EURUSD: ["EUR", "USD"],
  GBPUSD: ["GBP", "USD"],
  USDJPY: ["USD", "JPY"],
  USDCAD: ["USD", "CAD"],
  AUDUSD: ["AUD", "USD"],
  NZDUSD: ["NZD", "USD"],
  USDCHF: ["USD", "CHF"],
};

function getRelevantCurrencies(symbol: string) {
  const normalized = symbol.replace(/[^A-Za-z]/g, "").toUpperCase();

  if (SYMBOL_CURRENCIES[normalized]) {
    return SYMBOL_CURRENCIES[normalized];
  }

  if (normalized.length >= 6) {
    const base = normalized.slice(0, 3);
    const quote = normalized.slice(3, 6);
    return Array.from(new Set([base, quote]));
  }

  return [];
}

export async function getNearbyEconomicEvents(params: {
  tradeOpenTime: Date;
  symbol: string;
  minutesWindow?: number;
}) {
  const minutesWindow = params.minutesWindow ?? 60;
  const currencies = getRelevantCurrencies(params.symbol);

  if (currencies.length === 0) {
    return [];
  }

  const from = new Date(params.tradeOpenTime.getTime() - minutesWindow * 60 * 1000);
  const to = new Date(params.tradeOpenTime.getTime() + minutesWindow * 60 * 1000);

  return prisma.economicEvent.findMany({
    where: {
      eventTime: {
        gte: from,
        lte: to,
      },
      currency: {
        in: currencies,
      },
      impact: {
        equals: "High",
      },
    },
    orderBy: {
      eventTime: "asc",
    },
  });
}
