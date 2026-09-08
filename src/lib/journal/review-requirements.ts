import { Prisma, TradeReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const REVIEW_REQUIREMENT_MESSAGE =
  "Complete the required steps before continuing.";

export const DAILY_JOURNAL_BLOCKED_MESSAGE =
  "You have trades waiting for review. Complete their Playbook and Checklist before closing the day.";

export type ReviewRequirementCode =
  | "PLAYBOOK_REQUIRED"
  | "CHECKLIST_REQUIRED"
  | "CHECKLIST_INCOMPLETE"
  | "CRITICAL_CHECK_FAILED"
  | "PSYCHOLOGY_REVIEW_REQUIRED"
  | "STRATEGY_REVIEW_REQUIRED"
  | "TRADES_WAITING_FOR_REVIEW";

export type RequirementStepId =
  | "select-playbook"
  | "complete-checklist"
  | "trade-information"
  | "psychology-review"
  | "strategy-review"
  | "ai-review"
  | "complete-review";

type Db = Prisma.TransactionClient | typeof prisma;

export type RequirementStep = {
  id: RequirementStepId;
  label: string;
  complete: boolean;
  locked: boolean;
  reason: string | null;
  href: string;
};

export type TradeRequirements = {
  readyToTrade: boolean;
  readyForAIReview: boolean;
  readyForCompleteReview: boolean;
  progressPercent: number;
  missingRequirements: ReviewRequirementCode[];
  firstIncompleteStep: RequirementStepId | null;
  steps: RequirementStep[];
};

export type DailyJournalRequirements = {
  readyToComplete: boolean;
  missingRequirements: ReviewRequirementCode[];
  missingItems: Array<{
    code: ReviewRequirementCode;
    label: string;
    href: string;
  }>;
  message: string | null;
};

const tradeRequirementsInclude = {
  screenshots: { select: { id: true } },
  journalMetadata: true,
  strategyReview: {
    include: {
      ruleReviews: true,
    },
  },
  aiReviews: {
    select: { id: true },
    take: 1,
  },
  checklists: {
    include: {
      answers: true,
    },
  },
} satisfies Prisma.TradeInclude;

export type TradeRequirementInput = {
  symbol: string;
  direction: unknown;
  status: unknown;
  reviewStatus: string;
  aiReviewStatus: string;
  playbookId?: string | null;
  emotion?: string | null;
  mistake?: string | null;
  checklistCompletedAt?: Date | null;
  psychologyReviewCompletedAt?: Date | null;
  strategyReviewCompletedAt?: Date | null;
  screenshots: Array<{ id: string }>;
  aiReviews: Array<{ id: string }>;
  journalMetadata: {
    psychologyStatus?: string | null;
    psychologyNote?: string | null;
    lessonLearned?: string | null;
  } | null;
  strategyReview: {
    strategyId?: string | null;
    strategyNameSnapshot?: string | null;
    followedPlan: string;
  } | null;
  checklists: Array<{
    answers: Array<{
      isRequiredSnapshot: boolean;
      isCriticalSnapshot: boolean;
      checked: boolean;
      answeredAt?: Date | null;
    }>;
  }>;
};

function hasText(value: string | null | undefined) {
  return Boolean(value && value.trim());
}

function isAnswered(answer: {
  checked: boolean;
  answeredAt?: Date | null;
}) {
  return Boolean(answer.answeredAt || answer.checked);
}

function checklistState(trade: Pick<TradeRequirementInput, "checklists">) {
  const answers = trade.checklists.flatMap((checklist) => checklist.answers);
  const required = answers.filter((answer) => answer.isRequiredSnapshot);
  const criticalFailed = answers.some(
    (answer) => answer.isCriticalSnapshot && isAnswered(answer) && !answer.checked
  );
  const requiredAnswered = required.filter(isAnswered).length;

  return {
    attached: trade.checklists.length > 0,
    requiredTotal: required.length,
    requiredAnswered,
    requiredComplete: required.length === 0 || requiredAnswered >= required.length,
    criticalFailed,
  };
}

function psychologyComplete(trade: TradeRequirementInput) {
  const metadata = trade.journalMetadata;

  return Boolean(
    hasText(metadata?.psychologyStatus) ||
      hasText(metadata?.psychologyNote) ||
      hasText(metadata?.lessonLearned) ||
      hasText(trade.emotion) ||
      hasText(trade.mistake)
  );
}

function strategyComplete(trade: TradeRequirementInput) {
  return Boolean(
    trade.strategyReview && trade.strategyReview.followedPlan !== "NOT_REVIEWED"
  );
}

function playbookSelected(trade: TradeRequirementInput) {
  return Boolean(trade.playbookId || trade.strategyReview?.strategyId);
}

function tradeInformationComplete(trade: TradeRequirementInput) {
  return Boolean(trade.symbol && trade.direction && trade.status);
}

function requirementSteps(input: {
  trade: TradeRequirementInput;
  missing: ReviewRequirementCode[];
  checklistComplete: boolean;
  playbookComplete: boolean;
  psychologyDone: boolean;
  strategyDone: boolean;
}) {
  const tradeInfoDone = tradeInformationComplete(input.trade);
  const aiDone = Boolean(
    input.trade.aiReviewStatus === "REVIEWED" || input.trade.aiReviews.length > 0
  );

  return [
    {
      id: "select-playbook",
      label: "Select Playbook",
      complete: input.playbookComplete,
      locked: false,
      reason: input.playbookComplete ? null : "Select a Playbook to continue.",
      href: "#strategy-checklist",
    },
    {
      id: "complete-checklist",
      label: "Complete Checklist",
      complete: input.checklistComplete,
      locked: !input.playbookComplete,
      reason: input.checklistComplete
        ? null
        : "Complete the Playbook and Pre-Trade Checklist to continue.",
      href: "#strategy-checklist",
    },
    {
      id: "trade-information",
      label: "Trade Information",
      complete: tradeInfoDone,
      locked: false,
      reason: tradeInfoDone ? null : "Save the required trade information.",
      href: "#summary",
    },
    {
      id: "psychology-review",
      label: "Psychology Review",
      complete: input.psychologyDone,
      locked: !input.checklistComplete,
      reason: input.psychologyDone ? null : "Complete Psychology Review to continue.",
      href: "#psychology",
    },
    {
      id: "strategy-review",
      label: "Strategy Review",
      complete: input.strategyDone,
      locked: !input.checklistComplete,
      reason: input.strategyDone ? null : "Complete Strategy Review to continue.",
      href: "#strategy-checklist",
    },
    {
      id: "ai-review",
      label: "AI Review",
      complete: aiDone,
      locked: input.missing.length > 0,
      reason: input.missing.length > 0 ? REVIEW_REQUIREMENT_MESSAGE : null,
      href: "#ai-review",
    },
    {
      id: "complete-review",
      label: "Complete Review",
      complete: input.trade.reviewStatus === "REVIEWED",
      locked: input.missing.length > 0,
      reason: input.missing.length > 0 ? REVIEW_REQUIREMENT_MESSAGE : null,
      href: "#review-requirements",
    },
  ] satisfies RequirementStep[];
}

export function calculateTradeRequirements(
  trade: TradeRequirementInput
): TradeRequirements {
  const checklist = checklistState(trade);
  const playbookComplete = playbookSelected(trade);
  const psychologyDone = psychologyComplete(trade);
  const strategyDone = strategyComplete(trade);
  const missing: ReviewRequirementCode[] = [];

  if (!playbookComplete) {
    missing.push("PLAYBOOK_REQUIRED");
  }

  if (!checklist.attached) {
    missing.push("CHECKLIST_REQUIRED");
  } else if (!checklist.requiredComplete) {
    missing.push("CHECKLIST_INCOMPLETE");
  }

  if (checklist.criticalFailed) {
    missing.push("CRITICAL_CHECK_FAILED");
  }

  if (!psychologyDone) {
    missing.push("PSYCHOLOGY_REVIEW_REQUIRED");
  }

  if (!strategyDone) {
    missing.push("STRATEGY_REVIEW_REQUIRED");
  }

  const readyToTrade =
    playbookComplete &&
    checklist.attached &&
    checklist.requiredComplete &&
    !checklist.criticalFailed;
  const readyForReview = readyToTrade && psychologyDone && strategyDone;
  const steps = requirementSteps({
    trade,
    missing,
    checklistComplete: checklist.attached && checklist.requiredComplete && !checklist.criticalFailed,
    playbookComplete,
    psychologyDone,
    strategyDone,
  });
  const requiredSteps = steps.filter((step) => step.id !== "ai-review");
  const completedRequired = requiredSteps.filter((step) => step.complete).length;

  return {
    readyToTrade,
    readyForAIReview: readyForReview,
    readyForCompleteReview: readyForReview,
    progressPercent:
      readyForReview && trade.reviewStatus === "REVIEWED"
        ? 100
        : Math.round((completedRequired / requiredSteps.length) * 100),
    missingRequirements: missing,
    firstIncompleteStep: steps.find((step) => !step.complete)?.id || null,
    steps,
  };
}

export async function loadTradeRequirements(
  db: Db,
  userId: string,
  tradeId: string
) {
  const trade = await db.trade.findFirst({
    where: { id: tradeId, userId },
    include: tradeRequirementsInclude,
  });

  if (!trade) {
    return null;
  }

  return {
    trade,
    requirements: calculateTradeRequirements(trade),
  };
}

export function requirementFailureResponse(
  missingRequirements: ReviewRequirementCode[]
) {
  return {
    message: REVIEW_REQUIREMENT_MESSAGE,
    missingRequirements,
  };
}

export async function completeTradeReview(db: Db, userId: string, tradeId: string) {
  const loaded = await loadTradeRequirements(db, userId, tradeId);

  if (!loaded) {
    throw new Error("TRADE_NOT_FOUND");
  }

  if (!loaded.requirements.readyForCompleteReview) {
    return {
      ok: false as const,
      requirements: loaded.requirements,
      trade: loaded.trade,
    };
  }

  const reviewedAt = new Date();
  const trade = await db.trade.update({
    where: { id: tradeId },
    data: {
      reviewStatus: TradeReviewStatus.REVIEWED,
      reviewedAt,
      checklistCompletedAt: loaded.trade.checklistCompletedAt || reviewedAt,
      psychologyReviewCompletedAt:
        loaded.trade.psychologyReviewCompletedAt || reviewedAt,
      strategyReviewCompletedAt:
        loaded.trade.strategyReviewCompletedAt || reviewedAt,
      playbookId: loaded.trade.playbookId || loaded.trade.strategyReview?.strategyId,
    },
    include: tradeRequirementsInclude,
  });

  return {
    ok: true as const,
    requirements: calculateTradeRequirements(trade),
    trade,
  };
}

function dayRange(date: Date) {
  const start = new Date(date);
  const end = new Date(date);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export async function loadDailyJournalRequirements(
  db: Db,
  input: { userId: string; date: Date; accountId?: string | null }
): Promise<DailyJournalRequirements> {
  const { start, end } = dayRange(input.date);
  const [journal, preTradeCheck, trades] = await Promise.all([
    db.dailyJournal.findUnique({
      where: { userId_date: { userId: input.userId, date: input.date } },
      select: { mainPlaybookId: true },
    }),
    db.preTradeCheck.findUnique({
      where: { userId_date: { userId: input.userId, date: input.date } },
      select: {
        selectedPlaybook: true,
        checklistCompleted: true,
        checklistTotal: true,
      },
    }),
    db.trade.findMany({
      where: {
        userId: input.userId,
        status: "CLOSED",
        closedAt: { gte: start, lt: end },
        ...(input.accountId ? { accountId: input.accountId } : {}),
      },
      include: tradeRequirementsInclude,
    }),
  ]);
  const missing = new Set<ReviewRequirementCode>();
  const missingItems: DailyJournalRequirements["missingItems"] = [];
  const hasPlaybook = Boolean(journal?.mainPlaybookId || preTradeCheck?.selectedPlaybook);
  const preTradeChecklistComplete = Boolean(
    preTradeCheck &&
      preTradeCheck.checklistTotal > 0 &&
      preTradeCheck.checklistCompleted >= preTradeCheck.checklistTotal
  );
  const tradeRequirementResults = trades.map(calculateTradeRequirements);
  const tradesWaiting = tradeRequirementResults.some(
    (requirements, index) =>
      trades[index].reviewStatus === "NEEDS_REVIEW" ||
      trades[index].reviewStatus !== "REVIEWED" ||
      !requirements.readyForCompleteReview
  );

  if (!hasPlaybook) {
    missing.add("PLAYBOOK_REQUIRED");
    missingItems.push({
      code: "PLAYBOOK_REQUIRED",
      label: "Select a Playbook",
      href: "#daily-plan",
    });
  }

  if (!preTradeChecklistComplete) {
    missing.add("CHECKLIST_INCOMPLETE");
    missingItems.push({
      code: "CHECKLIST_INCOMPLETE",
      label: "Complete Pre-Trade Checklist",
      href: "/dashboard",
    });
  }

  if (tradesWaiting) {
    missing.add("TRADES_WAITING_FOR_REVIEW");
    missingItems.push({
      code: "TRADES_WAITING_FOR_REVIEW",
      label: "Review remaining trades",
      href: "/journal?reviewStatus=not-reviewed",
    });
  }

  for (const requirements of tradeRequirementResults) {
    if (requirements.missingRequirements.includes("PSYCHOLOGY_REVIEW_REQUIRED")) {
      missing.add("PSYCHOLOGY_REVIEW_REQUIRED");
    }

    if (requirements.missingRequirements.includes("STRATEGY_REVIEW_REQUIRED")) {
      missing.add("STRATEGY_REVIEW_REQUIRED");
    }
  }

  if (missing.has("PSYCHOLOGY_REVIEW_REQUIRED")) {
    missingItems.push({
      code: "PSYCHOLOGY_REVIEW_REQUIRED",
      label: "Complete Psychology Review",
      href: "/journal?reviewStatus=not-reviewed",
    });
  }

  if (missing.has("STRATEGY_REVIEW_REQUIRED")) {
    missingItems.push({
      code: "STRATEGY_REVIEW_REQUIRED",
      label: "Complete Strategy Review",
      href: "/journal?reviewStatus=not-reviewed",
    });
  }

  return {
    readyToComplete: missing.size === 0,
    missingRequirements: Array.from(missing),
    missingItems,
    message: missing.size > 0 ? DAILY_JOURNAL_BLOCKED_MESSAGE : null,
  };
}
