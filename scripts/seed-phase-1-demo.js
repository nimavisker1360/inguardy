const { PrismaClient, TradeDirection, TradeStatus } = require("@prisma/client");

const prisma = new PrismaClient();
const userId = process.env.DEMO_USER_ID || "demo-user";

async function findOrCreateAccount(data) {
  const existing = await prisma.tradingAccount.findFirst({
    where: { userId, name: data.name },
  });

  if (existing) {
    return existing;
  }

  return prisma.tradingAccount.create({
    data: { ...data, userId },
  });
}

async function main() {
  const accounts = await Promise.all([
    findOrCreateAccount({
      name: "FTMO Swing",
      broker: "FTMO",
      platform: "MT5",
      currency: "USD",
      balance: "50000",
    }),
    findOrCreateAccount({
      name: "Personal Live",
      broker: "IC Markets",
      platform: "MT5",
      currency: "USD",
      balance: "12000",
    }),
  ]);

  const tags = await Promise.all(
    [
      ["Breakout", "#60a5fa"],
      ["London", "#34d399"],
      ["Mistake", "#f87171"],
      ["A-Setup", "#facc15"],
    ].map(([name, color]) =>
      prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        update: { color },
        create: { userId, name, color },
      })
    )
  );

  const existingCount = await prisma.trade.count({ where: { userId } });

  if (existingCount >= 20) {
    console.log(`Demo user ${userId} already has ${existingCount} trades. Skipping trade creation.`);
    return;
  }

  const tradesToCreate = 20 - existingCount;
  const symbols = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100"];
  const now = new Date();

  for (let offset = 0; offset < tradesToCreate; offset += 1) {
    const index = existingCount + offset;
    const direction = index % 2 === 0 ? TradeDirection.BUY : TradeDirection.SELL;
    const status = index % 4 === 0 ? TradeStatus.OPEN : TradeStatus.CLOSED;
    const account = accounts[index % accounts.length];
    const entryPrice = symbols[index % symbols.length] === "XAUUSD" ? 2330 + index : 1.08 + index * 0.001;
    const exitDelta = index % 3 === 0 ? -0.002 : 0.003;
    const exitPrice =
      status === TradeStatus.CLOSED
        ? direction === TradeDirection.BUY
          ? entryPrice + exitDelta
          : entryPrice - exitDelta
        : null;
    const lotSize = index % 5 === 0 ? "0.50" : "0.10";
    const profitLoss =
      status === TradeStatus.CLOSED
        ? String(Number(((index % 3 === 0 ? -1 : 1) * (45 + index * 7)).toFixed(2)))
        : null;
    const openedAt = new Date(now);
    openedAt.setDate(now.getDate() - index);
    const closedAt = status === TradeStatus.CLOSED ? new Date(openedAt) : null;

    if (closedAt) {
      closedAt.setHours(closedAt.getHours() + 3);
    }

    const tradeTagIds = Array.from(
      new Set([
        tags[index % tags.length].id,
        ...(index % 5 === 0 ? [tags[2].id] : []),
      ])
    );

    await prisma.trade.create({
      data: {
        userId,
        accountId: account.id,
        symbol: symbols[index % symbols.length],
        direction,
        status,
        entryPrice: String(entryPrice.toFixed(5)),
        exitPrice: exitPrice ? String(exitPrice.toFixed(5)) : null,
        stopLoss: String((entryPrice - (direction === TradeDirection.BUY ? 0.004 : -0.004)).toFixed(5)),
        takeProfit: String((entryPrice + (direction === TradeDirection.BUY ? 0.008 : -0.008)).toFixed(5)),
        lotSize,
        riskAmount: String(100 + index * 5),
        profitLoss,
        rr: status === TradeStatus.CLOSED ? (Number(profitLoss) >= 0 ? "1.50" : "-0.80") : null,
        setup: index % 2 === 0 ? "Trend continuation" : "Range rejection",
        session: index % 2 === 0 ? "London" : "New York",
        emotion: index % 3 === 0 ? "Impatient" : "Focused",
        mistake: index % 5 === 0 ? "Late entry" : null,
        notes: "Demo Phase 1 trade for journal testing.",
        openedAt,
        closedAt,
        tags: {
          create: tradeTagIds.map((tagId) => ({ tagId })),
        },
      },
    });
  }

  console.log(`Created ${tradesToCreate} demo trades for ${userId}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
