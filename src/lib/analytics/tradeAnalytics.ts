import { Prisma, TradeDirection } from "@prisma/client";
import type {
  AnalyticsDirectionalStats,
  AnalyticsGroupStats,
  AnalyticsMetadata,
  DrawdownCurvePoint,
  EquityCurvePoint,
  HourlyAnalyticsRow,
  JournalAnalyticsResponse,
  PsychologyAnalyticsRow,
  SessionAnalyticsRow,
  StrategyAnalyticsRow,
  SymbolAnalyticsRow,
  TagAnalyticsRow,
  WeekdayAnalyticsRow,
} from "@/types/analytics";

export const analyticsTradeInclude = {
  account: true,
  tags: {
    include: {
      tag: true,
    },
  },
  strategyReview: true,
  checklists: {
    select: {
      completionPercent: true,
      totalCount: true,
    },
  },
} satisfies Prisma.TradeInclude;

export type AnalyticsTrade = Prisma.TradeGetPayload<{
  include: typeof analyticsTradeInclude;
}>;

type NormalizedTrade = {
  id: string;
  symbol: string;
  direction: TradeDirection;
  pnl: number;
  rr: number | null;
  openedAt: Date | null;
  closedAt: Date | null;
  setup: string | null;
  session: string | null;
  emotion: string | null;
  mistake: string | null;
  strategyName: string | null;
  followedPlan: string | null;
  checklistStatus: "Checklist completed" | "Checklist incomplete" | "Checklist missing";
  tags: string[];
};

type MutableGroup = {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  netPnl: number;
  grossProfit: number;
  grossLoss: number;
  bestTrade: number;
  worstTrade: number;
};

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

const SESSIONS: SessionAnalyticsRow["session"][] = [
  "Asia Session",
  "London Session",
  "New York Session",
  "Other",
];

function toNumber(value: unknown) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function round(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Number(value.toFixed(digits));
}

function dateLabel(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "No date";
}

function dateTimeLabel(date: Date | null) {
  return date ? date.toISOString() : "";
}

function emptyMutableGroup(): MutableGroup {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    netPnl: 0,
    grossProfit: 0,
    grossLoss: 0,
    bestTrade: 0,
    worstTrade: 0,
  };
}

function addToGroup(group: MutableGroup, trade: NormalizedTrade) {
  group.totalTrades += 1;
  group.netPnl += trade.pnl;

  if (trade.pnl > 0) {
    group.winningTrades += 1;
    group.grossProfit += trade.pnl;
  } else if (trade.pnl < 0) {
    group.losingTrades += 1;
    group.grossLoss += Math.abs(trade.pnl);
  } else {
    group.breakEvenTrades += 1;
  }

  if (group.totalTrades === 1) {
    group.bestTrade = trade.pnl;
    group.worstTrade = trade.pnl;
  } else {
    group.bestTrade = Math.max(group.bestTrade, trade.pnl);
    group.worstTrade = Math.min(group.worstTrade, trade.pnl);
  }
}

function finalizeGroup(group: MutableGroup): AnalyticsGroupStats {
  const totalTrades = group.totalTrades;
  const winRate = totalTrades > 0 ? (group.winningTrades / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (group.losingTrades / totalTrades) * 100 : 0;

  return {
    totalTrades,
    winningTrades: group.winningTrades,
    losingTrades: group.losingTrades,
    breakEvenTrades: group.breakEvenTrades,
    winRate: round(winRate, 1),
    lossRate: round(lossRate, 1),
    netPnl: round(group.netPnl),
    averagePnl: totalTrades > 0 ? round(group.netPnl / totalTrades) : 0,
    grossProfit: round(group.grossProfit),
    grossLoss: round(group.grossLoss),
    profitFactor:
      group.grossLoss > 0 ? round(group.grossProfit / group.grossLoss, 2) : null,
    bestTrade: totalTrades > 0 ? round(group.bestTrade) : 0,
    worstTrade: totalTrades > 0 ? round(group.worstTrade) : 0,
  };
}

function isClosedTrade(trade: AnalyticsTrade) {
  return trade.status === "CLOSED" || Boolean(trade.closedAt) || trade.exitPrice !== null;
}

function fallbackPnl(trade: AnalyticsTrade) {
  const entryPrice = nullableNumber(trade.entryPrice);
  const exitPrice = nullableNumber(trade.exitPrice);
  const lotSize = nullableNumber(trade.lotSize);

  if (entryPrice === null || exitPrice === null || lotSize === null) {
    return 0;
  }

  const priceMove =
    trade.direction === TradeDirection.BUY
      ? exitPrice - entryPrice
      : entryPrice - exitPrice;

  return priceMove * lotSize;
}

function normalizeTrade(trade: AnalyticsTrade): NormalizedTrade | null {
  if (!isClosedTrade(trade)) {
    return null;
  }

  const primaryPnl = nullableNumber(trade.profitLoss);
  const pnl = primaryPnl ?? fallbackPnl(trade);

  return {
    id: trade.id,
    symbol: trade.symbol || "UNKNOWN",
    direction: trade.direction,
    pnl,
    rr: nullableNumber(trade.rr),
    openedAt: trade.openedAt,
    closedAt: trade.closedAt || trade.openedAt || trade.createdAt,
    setup: trade.setup,
    session: trade.session,
    emotion: trade.emotion,
    mistake: trade.mistake,
    strategyName: trade.strategyReview?.strategyNameSnapshot || null,
    followedPlan: trade.strategyReview?.followedPlan || null,
    checklistStatus: trade.checklists.some((checklist) => checklist.completionPercent >= 100)
      ? "Checklist completed"
      : trade.checklists.length > 0
        ? "Checklist incomplete"
        : "Checklist missing",
    tags: trade.tags
      .map((tradeTag) => tradeTag.tag.name?.trim())
      .filter((tag): tag is string => Boolean(tag)),
  };
}

function tradeReference(trade: NormalizedTrade) {
  return {
    id: trade.id,
    symbol: trade.symbol,
    direction: trade.direction,
    pnl: round(trade.pnl),
    openedAt: trade.openedAt ? trade.openedAt.toISOString() : null,
    closedAt: trade.closedAt ? trade.closedAt.toISOString() : null,
  };
}

function getSession(date: Date | null): SessionAnalyticsRow["session"] {
  if (!date) {
    return "Other";
  }

  const hour = date.getUTCHours();

  if (hour >= 0 && hour < 7) {
    return "Asia Session";
  }

  if (hour >= 7 && hour < 13) {
    return "London Session";
  }

  if (hour >= 13 && hour < 21) {
    return "New York Session";
  }

  return "Other";
}

function getStrategy(trade: NormalizedTrade) {
  const strategyName =
    trade.followedPlan && trade.followedPlan !== "NOT_REVIEWED"
      ? trade.strategyName?.trim()
      : "";

  if (strategyName) {
    return strategyName;
  }

  return null;
}

function getPsychologyStatus(trade: NormalizedTrade) {
  const emotion = trade.emotion?.trim();
  const mistake = trade.mistake?.trim();

  if (emotion) {
    return emotion;
  }

  if (mistake) {
    return mistake;
  }

  return null;
}

function buildGroupMap(
  trades: NormalizedTrade[],
  getKey: (trade: NormalizedTrade) => string | null
) {
  const map = new Map<string, MutableGroup>();

  for (const trade of trades) {
    const key = getKey(trade);

    if (!key) {
      continue;
    }

    const group = map.get(key) || emptyMutableGroup();
    addToGroup(group, trade);
    map.set(key, group);
  }

  return map;
}

function buildMultiGroupMap(
  trades: NormalizedTrade[],
  getKeys: (trade: NormalizedTrade) => string[]
) {
  const map = new Map<string, MutableGroup>();

  for (const trade of trades) {
    const uniqueKeys = Array.from(new Set(getKeys(trade).map((key) => key.trim()).filter(Boolean)));

    for (const key of uniqueKeys) {
      const group = map.get(key) || emptyMutableGroup();
      addToGroup(group, trade);
      map.set(key, group);
    }
  }

  return map;
}

function tagRowsFromMap(map: Map<string, MutableGroup>, totalTrades: number): TagAnalyticsRow[] {
  return Array.from(map.entries())
    .map(([label, group]) => {
      const stats = finalizeGroup(group);

      return {
        label,
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        netPnl: stats.netPnl,
        averagePnl: stats.averagePnl,
        profitFactor: stats.profitFactor,
        shareOfTrades:
          totalTrades > 0 ? round((stats.totalTrades / totalTrades) * 100, 1) : 0,
      };
    })
    .sort((a, b) => {
      const pnlDelta = a.netPnl - b.netPnl;
      return pnlDelta || b.totalTrades - a.totalTrades;
    });
}

function emptyDirection(direction: TradeDirection): AnalyticsDirectionalStats {
  return {
    direction,
    totalTrades: 0,
    winRate: 0,
    netPnl: 0,
    averagePnl: 0,
    bestTrade: 0,
    worstTrade: 0,
  };
}

function directionalStats(
  trades: NormalizedTrade[],
  direction: TradeDirection
): AnalyticsDirectionalStats {
  const group = emptyMutableGroup();

  for (const trade of trades) {
    if (trade.direction === direction) {
      addToGroup(group, trade);
    }
  }

  if (group.totalTrades === 0) {
    return emptyDirection(direction);
  }

  const stats = finalizeGroup(group);

  return {
    direction,
    totalTrades: stats.totalTrades,
    winRate: stats.winRate,
    netPnl: stats.netPnl,
    averagePnl: stats.averagePnl,
    bestTrade: stats.bestTrade,
    worstTrade: stats.worstTrade,
  };
}

function buildEquityAndDrawdown(trades: NormalizedTrade[]) {
  const sorted = [...trades].sort((a, b) => {
    const aDate = a.closedAt || a.openedAt;
    const bDate = b.closedAt || b.openedAt;
    const dateDelta = (aDate?.getTime() || 0) - (bDate?.getTime() || 0);
    return dateDelta || a.id.localeCompare(b.id);
  });
  const equityCurve: EquityCurvePoint[] = [];
  const drawdownCurve: DrawdownCurvePoint[] = [];
  let equity = 0;
  let peak = 0;
  let maxDrawdown = 0;

  sorted.forEach((trade, index) => {
    equity += trade.pnl;
    peak = Math.max(peak, equity);

    const drawdown = Math.min(equity - peak, 0);
    const drawdownAbs = Math.abs(drawdown);
    const drawdownPercent = peak > 0 ? (drawdownAbs / peak) * 100 : 0;
    const date = trade.closedAt || trade.openedAt;

    maxDrawdown = Math.max(maxDrawdown, drawdownAbs);

    equityCurve.push({
      index: index + 1,
      date: dateTimeLabel(date),
      label: dateLabel(date),
      equity: round(equity),
      pnl: round(trade.pnl),
      tradeId: trade.id,
      symbol: trade.symbol,
    });
    drawdownCurve.push({
      index: index + 1,
      date: dateTimeLabel(date),
      label: dateLabel(date),
      equity: round(equity),
      drawdown: round(drawdown),
      drawdownPercent: round(drawdownPercent, 2),
    });
  });

  return {
    equityCurve,
    drawdownCurve,
    maxDrawdown: round(maxDrawdown),
    currentDrawdown: drawdownCurve.length
      ? round(Math.abs(drawdownCurve[drawdownCurve.length - 1].drawdown))
      : 0,
  };
}

function emptyOverview(): JournalAnalyticsResponse["overview"] {
  return {
    totalNetPnl: 0,
    grossProfit: 0,
    grossLoss: 0,
    winRate: 0,
    lossRate: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    breakEvenTrades: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: null,
    averageRR: 0,
    bestTrade: null,
    worstTrade: null,
    maxDrawdown: 0,
    currentDrawdown: 0,
    expectancyPerTrade: 0,
  };
}

export function buildAnalyticsMetadata(trades: AnalyticsTrade[]): AnalyticsMetadata {
  const normalized = trades
    .map(normalizeTrade)
    .filter((trade): trade is NormalizedTrade => Boolean(trade));
  const symbols = Array.from(new Set(normalized.map((trade) => trade.symbol))).sort();
  const strategies = Array.from(
    new Set(
      normalized
        .map(getStrategy)
        .filter((strategy): strategy is string => Boolean(strategy))
    )
  ).sort();
  const setups = Array.from(
    new Set(normalized.map((trade) => trade.setup?.trim()).filter((value): value is string => Boolean(value)))
  ).sort();
  const mistakes = Array.from(
    new Set(normalized.map((trade) => trade.mistake?.trim()).filter((value): value is string => Boolean(value)))
  ).sort();
  const emotions = Array.from(
    new Set(normalized.map((trade) => trade.emotion?.trim()).filter((value): value is string => Boolean(value)))
  ).sort();
  const sessions = Array.from(new Set(normalized.map((trade) => getSession(trade.openedAt)))).sort();
  const hasPsychologyData = normalized.some((trade) =>
    Boolean(getPsychologyStatus(trade))
  );
  const hasTagData = normalized.some(
    (trade) =>
      Boolean(trade.mistake?.trim()) ||
      Boolean(trade.emotion?.trim()) ||
      Boolean(trade.setup?.trim()) ||
      trade.tags.length > 0
  );

  return {
    symbols,
    strategies,
    setups,
    mistakes,
    emotions,
    sessions,
    hasStrategyData: strategies.length > 0,
    hasPsychologyData,
    hasTagData,
  };
}

export function buildTradeAnalytics(
  trades: AnalyticsTrade[],
  metadata: AnalyticsMetadata = buildAnalyticsMetadata(trades)
): JournalAnalyticsResponse {
  const normalized = trades
    .map(normalizeTrade)
    .filter((trade): trade is NormalizedTrade => Boolean(trade));
  const overviewGroup = emptyMutableGroup();

  for (const trade of normalized) {
    addToGroup(overviewGroup, trade);
  }

  const overviewStats = finalizeGroup(overviewGroup);
  const rrTrades = normalized.filter((trade) => trade.rr !== null);
  const bestTrade =
    normalized.length > 0
      ? normalized.reduce((best, trade) => (trade.pnl > best.pnl ? trade : best))
      : null;
  const worstTrade =
    normalized.length > 0
      ? normalized.reduce((worst, trade) => (trade.pnl < worst.pnl ? trade : worst))
      : null;
  const curves = buildEquityAndDrawdown(normalized);
  const winRateDecimal = overviewStats.winRate / 100;
  const lossRateDecimal = overviewStats.lossRate / 100;

  const symbolMap = buildGroupMap(normalized, (trade) => trade.symbol);
  const bySymbol: SymbolAnalyticsRow[] = Array.from(symbolMap.entries())
    .map(([symbol, group]) => ({ symbol, ...finalizeGroup(group) }))
    .sort((a, b) => b.netPnl - a.netPnl);

  const sessionMap = buildGroupMap(normalized, (trade) => getSession(trade.openedAt));
  const bySession: SessionAnalyticsRow[] = SESSIONS.map((session) => {
    const stats = finalizeGroup(sessionMap.get(session) || emptyMutableGroup());

    return {
      session,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      netPnl: stats.netPnl,
      averagePnl: stats.averagePnl,
    };
  });

  const weekdayMap = buildGroupMap(normalized, (trade) =>
    String((trade.openedAt || trade.closedAt)?.getUTCDay() ?? 0)
  );
  const byWeekday: WeekdayAnalyticsRow[] = WEEKDAY_DISPLAY_ORDER.map((weekdayIndex) => {
    const stats = finalizeGroup(
      weekdayMap.get(String(weekdayIndex)) || emptyMutableGroup()
    );

    return {
      weekday: WEEKDAYS[weekdayIndex],
      weekdayIndex,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      netPnl: stats.netPnl,
      averagePnl: stats.averagePnl,
    };
  });

  const hourMap = buildGroupMap(normalized, (trade) => {
    const date = trade.openedAt || trade.closedAt;
    return String(date?.getUTCHours() ?? 0);
  });
  const byHour: HourlyAnalyticsRow[] = Array.from({ length: 24 }, (_, hour) => {
    const stats = finalizeGroup(hourMap.get(String(hour)) || emptyMutableGroup());

    return {
      hour,
      label: `${String(hour).padStart(2, "0")}:00`,
      totalTrades: stats.totalTrades,
      winRate: stats.winRate,
      netPnl: stats.netPnl,
      averagePnl: stats.averagePnl,
    };
  });

  const strategyMap = buildGroupMap(normalized, getStrategy);
  const byStrategy: StrategyAnalyticsRow[] = Array.from(strategyMap.entries())
    .map(([strategy, group]) => {
      const stats = finalizeGroup(group);

      return {
        strategy,
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        netPnl: stats.netPnl,
        profitFactor: stats.profitFactor,
        averagePnl: stats.averagePnl,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);

  const psychologyMap = buildGroupMap(normalized, getPsychologyStatus);
  const byPsychology: PsychologyAnalyticsRow[] = Array.from(psychologyMap.entries())
    .map(([psychologyStatus, group]) => {
      const stats = finalizeGroup(group);

      return {
        psychologyStatus,
        totalTrades: stats.totalTrades,
        winRate: stats.winRate,
        netPnl: stats.netPnl,
        averagePnl: stats.averagePnl,
      };
    })
    .sort((a, b) => b.netPnl - a.netPnl);
  const byMistake = tagRowsFromMap(
    buildGroupMap(normalized, (trade) => trade.mistake?.trim() || null),
    normalized.length
  );
  const byEmotion = tagRowsFromMap(
    buildGroupMap(normalized, (trade) => trade.emotion?.trim() || null),
    normalized.length
  );
  const bySetup = tagRowsFromMap(
    buildGroupMap(normalized, (trade) => trade.setup?.trim() || null),
    normalized.length
  );
  const byTag = tagRowsFromMap(
    buildMultiGroupMap(normalized, (trade) => trade.tags),
    normalized.length
  );
  const byChecklistCompletion = tagRowsFromMap(
    buildGroupMap(normalized, (trade) => trade.checklistStatus),
    normalized.length
  );

  return {
    success: true,
    overview: {
      ...emptyOverview(),
      totalNetPnl: overviewStats.netPnl,
      grossProfit: overviewStats.grossProfit,
      grossLoss: overviewStats.grossLoss,
      winRate: overviewStats.winRate,
      lossRate: overviewStats.lossRate,
      totalTrades: overviewStats.totalTrades,
      winningTrades: overviewStats.winningTrades,
      losingTrades: overviewStats.losingTrades,
      breakEvenTrades: overviewStats.breakEvenTrades,
      averageWin:
        overviewStats.winningTrades > 0
          ? round(overviewStats.grossProfit / overviewStats.winningTrades)
          : 0,
      averageLoss:
        overviewStats.losingTrades > 0
          ? round(overviewStats.grossLoss / overviewStats.losingTrades)
          : 0,
      profitFactor: overviewStats.profitFactor,
      averageRR:
        rrTrades.length > 0
          ? round(
              rrTrades.reduce((total, trade) => total + toNumber(trade.rr), 0) /
                rrTrades.length,
              2
            )
          : 0,
      bestTrade: bestTrade ? tradeReference(bestTrade) : null,
      worstTrade: worstTrade ? tradeReference(worstTrade) : null,
      maxDrawdown: curves.maxDrawdown,
      currentDrawdown: curves.currentDrawdown,
      expectancyPerTrade: round(
        winRateDecimal *
          (overviewStats.winningTrades > 0
            ? overviewStats.grossProfit / overviewStats.winningTrades
            : 0) -
          lossRateDecimal *
            (overviewStats.losingTrades > 0
              ? overviewStats.grossLoss / overviewStats.losingTrades
              : 0)
      ),
    },
    longShort: {
      buy: directionalStats(normalized, TradeDirection.BUY),
      sell: directionalStats(normalized, TradeDirection.SELL),
    },
    bySymbol,
    bySession,
    byWeekday,
    byHour,
    byStrategy,
    byPsychology,
    byMistake,
    byEmotion,
    bySetup,
    byTag,
    byChecklistCompletion,
    equityCurve: curves.equityCurve,
    drawdownCurve: curves.drawdownCurve,
    metadata,
  };
}
