import { Prisma } from "@prisma/client";

export const PLAYBOOK_RULE_SECTIONS = [
  "SETUP",
  "ENTRY",
  "EXIT",
  "RISK",
  "MANAGEMENT",
  "PSYCHOLOGY",
] as const;

export const FOLLOWED_PLAN_STATUSES = [
  "YES",
  "PARTIAL",
  "NO",
  "NOT_REVIEWED",
] as const;

export const RULE_REVIEW_STATUSES = [
  "FOLLOWED",
  "VIOLATED",
  "NOT_APPLICABLE",
  "NOT_REVIEWED",
] as const;

export const MARKET_TYPES = [
  "Forex",
  "Crypto",
  "Indices",
  "Stocks",
  "Futures",
  "Custom",
] as const;

export const PLAYBOOK_DIRECTIONS = ["BUY_ONLY", "SELL_ONLY", "BOTH"] as const;

export type PlaybookRuleSection = (typeof PLAYBOOK_RULE_SECTIONS)[number];
export type FollowedPlanStatus = (typeof FOLLOWED_PLAN_STATUSES)[number];
export type RuleReviewStatus = (typeof RULE_REVIEW_STATUSES)[number];

export const playbookStrategyInclude = {
  rules: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  checklistItems: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
  checklistLinks: {
    include: {
      checklistTemplate: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
  _count: {
    select: {
      rules: true,
      checklistLinks: true,
      strategyReviews: true,
    },
  },
} satisfies Prisma.PlaybookStrategyInclude;

export const tradeStrategyReviewInclude = {
  strategy: {
    include: {
      rules: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      checklistItems: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  },
  ruleReviews: {
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  },
} satisfies Prisma.TradeStrategyReviewInclude;

export type PlaybookRulePayload = {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  section?: unknown;
  isRequired?: unknown;
  sortOrder?: unknown;
};

export type PlaybookPayload = {
  name?: unknown;
  description?: unknown;
  marketType?: unknown;
  symbols?: unknown;
  timeframes?: unknown;
  direction?: unknown;
  riskPerTrade?: unknown;
  minRiskReward?: unknown;
  entryRules?: unknown;
  exitRules?: unknown;
  riskRules?: unknown;
  setupRules?: unknown;
  managementRules?: unknown;
  psychologyRules?: unknown;
  sessionFilter?: unknown;
  newsFilter?: unknown;
  htfBias?: unknown;
  exampleWinningTrade?: unknown;
  exampleLosingTrade?: unknown;
  tags?: unknown;
  isActive?: unknown;
  userId?: unknown;
  rules?: unknown;
  checklistItems?: unknown;
  checklistTemplateIds?: unknown;
};

export function optionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

export function optionalBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function optionalFloat(value: unknown, fieldName: string, errors: string[]) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors.push(`${fieldName} must be a valid number`);
    return null;
  }

  return parsed;
}

function parseSortOrder(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function isAllowed(value: string | null | undefined, allowed: readonly string[]) {
  return Boolean(value && allowed.includes(value));
}

export function normalizePlaybookPayload(
  body: PlaybookPayload,
  options: { partial?: boolean } = {}
) {
  const errors: string[] = [];
  const name = optionalString(body.name);
  const marketType = optionalString(body.marketType);
  const direction = optionalString(body.direction)?.toUpperCase() || "BOTH";
  const rawRules = Array.isArray(body.rules) ? body.rules : [];
  const rawChecklistItems = Array.isArray(body.checklistItems)
    ? body.checklistItems
    : [];
  const checklistTemplateIds = Array.isArray(body.checklistTemplateIds)
    ? Array.from(
        new Set(
          body.checklistTemplateIds
            .map((id) => optionalString(id))
            .filter((id): id is string => Boolean(id))
        )
      )
    : [];

  if ((!options.partial || body.name !== undefined) && !name) {
    errors.push("Strategy name is required");
  }

  if (marketType && !(MARKET_TYPES as readonly string[]).includes(marketType)) {
    errors.push("marketType must be Forex, Crypto, Indices, Stocks, Futures, or Custom");
  }

  if (!(PLAYBOOK_DIRECTIONS as readonly string[]).includes(direction)) {
    errors.push("direction must be BUY_ONLY, SELL_ONLY, or BOTH");
  }

  const rules = rawRules.flatMap((rawRule, index) => {
    const rule =
      rawRule && typeof rawRule === "object"
        ? (rawRule as Record<string, unknown>)
        : {};
    const title = optionalString(rule.title);
    const section = optionalString(rule.section)?.toUpperCase();
    const id = optionalString(rule.id);

    if (!title) {
      return [];
    }

    if (!isAllowed(section, PLAYBOOK_RULE_SECTIONS)) {
      errors.push("Rule section must be SETUP, ENTRY, EXIT, RISK, MANAGEMENT, or PSYCHOLOGY");
      return [];
    }

    return [
      {
        ...(id ? { id } : {}),
        title,
        description: optionalString(rule.description),
        section: section as PlaybookRuleSection,
        isRequired: optionalBoolean(rule.isRequired, false),
        sortOrder: parseSortOrder(rule.sortOrder, index),
      },
    ];
  });

  if ((!options.partial || body.rules !== undefined) && rules.length === 0) {
    errors.push("A strategy should have at least one rule");
  }

  const checklistItems = rawChecklistItems.flatMap((rawItem, index) => {
    const item =
      rawItem && typeof rawItem === "object"
        ? (rawItem as Record<string, unknown>)
        : {};
    const title = optionalString(item.title);
    const id = optionalString(item.id);

    if (!title) {
      return [];
    }

    return [
      {
        ...(id ? { id } : {}),
        title,
        description: optionalString(item.description),
        isRequired: optionalBoolean(item.isRequired, false),
        sortOrder: parseSortOrder(item.sortOrder, index),
      },
    ];
  });

  return {
    errors,
    data: {
      userId: optionalString(body.userId) || "",
      name,
      description: optionalString(body.description),
      marketType,
      symbols: optionalString(body.symbols),
      timeframes: optionalString(body.timeframes),
      direction,
      riskPerTrade: optionalFloat(body.riskPerTrade, "riskPerTrade", errors),
      minRiskReward: optionalFloat(body.minRiskReward, "minRiskReward", errors),
      entryRules: optionalString(body.entryRules),
      exitRules: optionalString(body.exitRules),
      riskRules: optionalString(body.riskRules),
      setupRules: optionalString(body.setupRules),
      managementRules: optionalString(body.managementRules),
      psychologyRules: optionalString(body.psychologyRules),
      sessionFilter: optionalString(body.sessionFilter),
      newsFilter: optionalString(body.newsFilter),
      htfBias: optionalString(body.htfBias),
      exampleWinningTrade: optionalString(body.exampleWinningTrade),
      exampleLosingTrade: optionalString(body.exampleLosingTrade),
      tags: optionalString(body.tags),
      isActive: optionalBoolean(body.isActive, true),
      rules,
      checklistItems,
      checklistTemplateIds,
    },
  };
}

export function normalizeFollowedPlan(value: unknown) {
  const normalized = optionalString(value)?.toUpperCase() || "NOT_REVIEWED";
  return isAllowed(normalized, FOLLOWED_PLAN_STATUSES)
    ? (normalized as FollowedPlanStatus)
    : null;
}

export function normalizeRuleReviewStatus(value: unknown) {
  const normalized = optionalString(value)?.toUpperCase() || "NOT_REVIEWED";
  return isAllowed(normalized, RULE_REVIEW_STATUSES)
    ? (normalized as RuleReviewStatus)
    : null;
}

export function serializePlaybookStrategy(
  strategy: Prisma.PlaybookStrategyGetPayload<{
    include: typeof playbookStrategyInclude;
  }>,
  analytics?: unknown
) {
  const textBySection = (section: PlaybookRuleSection) =>
    strategy.rules
      .filter((rule) => rule.section === section)
      .map((rule) => rule.description || rule.title)
      .filter(Boolean)
      .join("\n");

  return {
    ...strategy,
    entryRules: strategy.entryRules || textBySection("ENTRY") || null,
    exitRules: strategy.exitRules || textBySection("EXIT") || null,
    riskRules: strategy.riskRules || textBySection("RISK") || null,
    setupRules: strategy.setupRules || textBySection("SETUP") || null,
    managementRules: strategy.managementRules || textBySection("MANAGEMENT") || null,
    psychologyRules: strategy.psychologyRules || textBySection("PSYCHOLOGY") || null,
    linkedChecklistCount: strategy._count.checklistLinks,
    ruleCount: strategy._count.rules,
    tradeCount: strategy._count.strategyReviews,
    checklistItems: strategy.checklistItems.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      isRequired: item.isRequired,
      sortOrder: item.sortOrder,
    })),
    checklists: strategy.checklistLinks.map((link) => ({
      id: link.checklistTemplate.id,
      title: link.checklistTemplate.title,
      description: link.checklistTemplate.description,
      category: link.checklistTemplate.category,
      isActive: link.checklistTemplate.isActive,
      itemCount: link.checklistTemplate.items.length,
    })),
    ...(analytics ? { analytics } : {}),
  };
}

export function serializeTradeStrategyReview(
  review: Prisma.TradeStrategyReviewGetPayload<{
    include: typeof tradeStrategyReviewInclude;
  }>
) {
  return {
    ...review,
    strategy: review.strategy
      ? {
          ...review.strategy,
          rules: review.strategy.rules,
        }
      : null,
  };
}
