import { prisma } from "@/lib/prisma";

async function deleteTradesByIds(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  tradeIds: string[]
) {
  if (tradeIds.length === 0) {
    return { deletedTrades: 0 };
  }

  const [strategyReviews, tradeChecklists] = await Promise.all([
    tx.tradeStrategyReview.findMany({
      where: { tradeId: { in: tradeIds } },
      select: { id: true },
    }),
    tx.tradeChecklist.findMany({
      where: { tradeId: { in: tradeIds } },
      select: { id: true },
    }),
  ]);
  const strategyReviewIds = strategyReviews.map((review) => review.id);
  const tradeChecklistIds = tradeChecklists.map((checklist) => checklist.id);

  if (strategyReviewIds.length > 0) {
    await tx.tradeStrategyRuleReview.deleteMany({
      where: { tradeStrategyReviewId: { in: strategyReviewIds } },
    });
  }

  if (tradeChecklistIds.length > 0) {
    await tx.tradeChecklistAnswer.deleteMany({
      where: { tradeChecklistId: { in: tradeChecklistIds } },
    });
  }

  await tx.tradeTag.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeScreenshot.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeUpdateLog.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeAIReview.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeJournalMetadata.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.voiceMemo.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeChecklist.deleteMany({ where: { tradeId: { in: tradeIds } } });
  await tx.tradeStrategyReview.deleteMany({ where: { tradeId: { in: tradeIds } } });

  const deleted = await tx.trade.deleteMany({
    where: { userId, id: { in: tradeIds } },
  });

  return { deletedTrades: deleted.count };
}

export async function deleteUserTrade(userId: string, tradeId: string) {
  return prisma.$transaction(async (tx) => {
    const trade = await tx.trade.findFirst({
      where: { id: tradeId, userId },
      select: { id: true },
    });

    if (!trade) {
      return { deletedTrades: 0 };
    }

    return deleteTradesByIds(tx, userId, [trade.id]);
  });
}

export async function deleteAllUserTrades(userId: string) {
  return prisma.$transaction(async (tx) => {
    const trades = await tx.trade.findMany({
      where: { userId },
      select: { id: true },
    });
    const tradeIds = trades.map((trade) => trade.id);

    return deleteTradesByIds(tx, userId, tradeIds);
  });
}
