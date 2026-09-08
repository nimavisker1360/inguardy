import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { generateGeminiJson } from "@/server/ai/gemini-client";
import { buildTradeReviewPrompt } from "@/server/ai/trade-review-prompt";
import {
  parseTradeAIReviewJson,
  type TradeAIReviewResponse,
} from "@/server/ai/trade-review-schema";

export const tradeAIReviewInclude = {
  account: true,
  user: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  strategyReview: {
    include: {
      strategy: true,
      ruleReviews: true,
    },
  },
  checklists: {
    include: {
      answers: true,
    },
  },
  screenshots: true,
} satisfies Prisma.TradeInclude;

type TradeForReview = Prisma.TradeGetPayload<{
  include: typeof tradeAIReviewInclude;
}>;

function decimalToString(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

function dateToString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

function buildStructuredTradeData(trade: TradeForReview) {
  return {
    id: trade.id,
    source: trade.source,
    symbol: trade.symbol,
    direction: trade.direction,
    status: trade.status,
    account: {
      name: trade.account?.name,
      broker: trade.account?.broker,
      platform: trade.account?.platform,
      currency: trade.account?.currency,
      mt5AccountNumber: trade.account?.mt5AccountNumber,
    },
    mt5Ticket: trade.mt5Ticket,
    prices: {
      entryPrice: decimalToString(trade.entryPrice),
      exitPrice: decimalToString(trade.exitPrice),
      stopLoss: decimalToString(trade.stopLoss),
      takeProfit: decimalToString(trade.takeProfit),
      lotSize: decimalToString(trade.lotSize),
      riskAmount: decimalToString(trade.riskAmount),
      profitLoss: decimalToString(trade.profitLoss),
      commission: decimalToString(trade.commission),
      swap: decimalToString(trade.swap),
      riskReward: decimalToString(trade.rr),
    },
    journal: {
      setup: trade.setup,
      session: trade.session,
      emotion: trade.emotion,
      mistake: trade.mistake,
      notes: trade.notes,
      tags: trade.tags.map((item) => item.tag.name),
    },
    timing: {
      openedAt: dateToString(trade.openedAt),
      closedAt: dateToString(trade.closedAt),
      lastUpdatedAt: dateToString(trade.updatedAt),
    },
    playbook: trade.strategyReview
      ? {
          strategyName: trade.strategyReview.strategyNameSnapshot,
          followedPlan: trade.strategyReview.followedPlan,
          compliancePercent: trade.strategyReview.compliancePercent,
          requiredCompliancePercent:
            trade.strategyReview.requiredCompliancePercent,
          rules: trade.strategyReview.ruleReviews.map((rule) => ({
            title: rule.ruleTitleSnapshot,
            section: rule.ruleSectionSnapshot,
            required: rule.isRequiredSnapshot,
            status: rule.status,
            note: rule.note,
          })),
          strategy: trade.strategyReview.strategy
            ? {
                name: trade.strategyReview.strategy.name,
                marketType: trade.strategyReview.strategy.marketType,
                symbols: trade.strategyReview.strategy.symbols,
                direction: trade.strategyReview.strategy.direction,
                riskPerTrade: trade.strategyReview.strategy.riskPerTrade,
                minRiskReward: trade.strategyReview.strategy.minRiskReward,
                entryRules: trade.strategyReview.strategy.entryRules,
                exitRules: trade.strategyReview.strategy.exitRules,
                riskRules: trade.strategyReview.strategy.riskRules,
                setupRules: trade.strategyReview.strategy.setupRules,
                managementRules: trade.strategyReview.strategy.managementRules,
                psychologyRules: trade.strategyReview.strategy.psychologyRules,
                sessionFilter: trade.strategyReview.strategy.sessionFilter,
                newsFilter: trade.strategyReview.strategy.newsFilter,
              }
            : null,
        }
      : null,
    checklists: trade.checklists.map((checklist) => ({
      title: checklist.titleSnapshot,
      category: checklist.categorySnapshot,
      completionPercent: checklist.completionPercent,
      answers: checklist.answers.map((answer) => ({
        title: answer.titleSnapshot,
        required: answer.isRequiredSnapshot,
        checked: answer.checked,
        note: answer.note,
      })),
    })),
    screenshots: trade.screenshots.map((screenshot) => ({
      type: screenshot.type,
      hasImage: Boolean(screenshot.url),
    })),
  };
}

export function serializeTradeAIReview(review: TradeAIReviewResponse & {
  id?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}) {
  return {
    id: review.id,
    score: review.score,
    summary: review.summary,
    strengths: review.strengths,
    weaknesses: review.weaknesses,
    mistakes: review.mistakes,
    riskReview: review.riskReview,
    psychologyReview: review.psychologyReview,
    playbookReview: review.playbookReview,
    improvementPlan: review.improvementPlan,
    tags: review.tags,
    confidence: review.confidence,
    createdAt: review.createdAt ? dateToString(review.createdAt) : undefined,
    updatedAt: review.updatedAt ? dateToString(review.updatedAt) : undefined,
  };
}

export async function generateTradeAIReview(trade: TradeForReview) {
  const prompt = buildTradeReviewPrompt(buildStructuredTradeData(trade));
  const responseText = await generateGeminiJson(prompt);

  return parseTradeAIReviewJson(responseText);
}

export async function saveTradeAIReview({
  tradeId,
  userId,
  review,
}: {
  tradeId: string;
  userId: string;
  review: TradeAIReviewResponse;
}) {
  return prisma.$transaction(async (tx) => {
    const saved = await tx.tradeAIReview.upsert({
      where: {
        tradeId_userId: {
          tradeId,
          userId,
        },
      },
      create: {
        tradeId,
        userId,
        ...review,
      },
      update: {
        ...review,
      },
    });

    await tx.trade.updateMany({
      where: { id: tradeId, userId },
      data: {
        aiReviewStatus: "REVIEWED",
        aiReviewScore: review.score,
      },
    });

    return saved;
  });
}
