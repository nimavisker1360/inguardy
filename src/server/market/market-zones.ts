export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type MarketZone = {
  id: string;
  type: "support" | "resistance" | "supply" | "demand" | "order_block";
  from: number;
  to: number;
  originTime?: number;
  label: string;
  strength: number;
  touches: number;
  reason: string;
};

export type MarketStructure = {
  bias: "bullish" | "bearish" | "neutral";
  lastBOS?: number;
  lastCHoCH?: number;
  invalidation?: number;
};

export type ZonesResponse = {
  symbol: string;
  timeframe: string;
  currentPrice: number;
  candles: Candle[];
  zones: MarketZone[];
  supportLevels: number[];
  resistanceLevels: number[];
  structure: MarketStructure;
  aiSummary: string;
  disclaimer: string;
};

type Pivot = {
  index: number;
  price: number;
  kind: "high" | "low";
  rejection: number;
};

type ZoneCandidate = Omit<MarketZone, "label"> & {
  index: number;
  rejection: number;
};

type DetectOptions = {
  language?: "fa" | "en";
  maxZones?: number;
};

const DEFAULT_DISCLAIMER_FA =
  "این تحلیل آموزشی است و سیگنال خرید یا فروش محسوب نمی شود. قبل از هر تصمیم، مدیریت ریسک و تایید شخصی الزامی است.";
const DEFAULT_DISCLAIMER_EN =
  "This is educational analysis, not a buy or sell signal. Always manage risk and confirm with your own plan.";

function roundPrice(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const abs = Math.abs(value);
  const decimals = abs >= 1000 ? 2 : abs >= 100 ? 3 : abs >= 10 ? 4 : 5;
  return Number(value.toFixed(decimals));
}

function formatPrice(value: number) {
  return String(roundPrice(value));
}

function candleRange(candle: Candle) {
  return Math.max(candle.high - candle.low, Number.EPSILON);
}

function candleBody(candle: Candle) {
  return Math.abs(candle.close - candle.open);
}

function zoneCenter(zone: Pick<MarketZone, "from" | "to">) {
  return (zone.from + zone.to) / 2;
}

function clampStrength(value: number, exceptional = false) {
  const max = exceptional ? 98 : 95;
  return Math.max(40, Math.min(max, Math.round(value)));
}

function averageVolume(candles: Candle[], endIndex: number, lookback = 20) {
  const sample = candles
    .slice(Math.max(0, endIndex - lookback), endIndex + 1)
    .map((candle) => candle.volume)
    .filter((value): value is number => Number.isFinite(value));

  if (!sample.length) {
    return null;
  }

  return sample.reduce((sum, value) => sum + value, 0) / sample.length;
}

function scoreZone({
  touches,
  index,
  rejection,
  candles,
  currentPrice,
  center,
  volume,
}: {
  touches: number;
  index: number;
  rejection: number;
  candles: Candle[];
  currentPrice: number;
  center: number;
  volume?: number;
}) {
  const recency = index / Math.max(candles.length - 1, 1);
  const distanceRatio = Math.abs(center - currentPrice) / Math.max(currentPrice, Number.EPSILON);
  const distanceScore = Math.max(0, 1 - Math.min(distanceRatio / 0.035, 1));
  const average = averageVolume(candles, index);
  const volumeScore = average && volume ? Math.max(0, Math.min(volume / average - 0.75, 1)) : 0;
  const raw =
    34 +
    Math.min(touches, 4) * 7 +
    Math.max(0, Math.min(rejection, 1)) * 20 +
    recency * 18 +
    distanceScore * 12 +
    volumeScore * 7;
  const exceptional = touches >= 4 && rejection > 0.7 && recency > 0.75 && distanceScore > 0.65;

  return clampStrength(raw, exceptional);
}

export function calculateAtr(candles: Candle[], period = 14) {
  if (candles.length < 2) {
    return 0;
  }

  const trueRanges = candles.slice(1).map((candle, index) => {
    const previousClose = candles[index].close;
    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });
  const sample = trueRanges.slice(-period);

  return sample.reduce((sum, value) => sum + value, 0) / Math.max(sample.length, 1);
}

function detectPivots(candles: Candle[], lookback = 3) {
  const pivots: Pivot[] = [];

  for (let index = lookback; index < candles.length - lookback; index += 1) {
    const candle = candles[index];
    const before = candles.slice(index - lookback, index);
    const after = candles.slice(index + 1, index + lookback + 1);
    const neighbors = [...before, ...after];
    const isPivotHigh = neighbors.every((item) => candle.high >= item.high);
    const isPivotLow = neighbors.every((item) => candle.low <= item.low);
    const range = candleRange(candle);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;

    if (isPivotHigh) {
      pivots.push({
        index,
        kind: "high",
        price: candle.high,
        rejection: upperWick / range,
      });
    }

    if (isPivotLow) {
      pivots.push({
        index,
        kind: "low",
        price: candle.low,
        rejection: lowerWick / range,
      });
    }
  }

  return pivots;
}

function buildGroupedZones({
  pivots,
  candles,
  tolerance,
  currentPrice,
  language,
}: {
  pivots: Pivot[];
  candles: Candle[];
  tolerance: number;
  currentPrice: number;
  language: "fa" | "en";
}) {
  const zones: ZoneCandidate[] = [];
  const sorted = [...pivots].sort((a, b) => a.price - b.price);
  const groups: Pivot[][] = [];

  for (const pivot of sorted) {
    const group = groups.find((items) => {
      const average = items.reduce((sum, item) => sum + item.price, 0) / items.length;
      return Math.abs(pivot.price - average) <= tolerance;
    });

    if (group) {
      group.push(pivot);
    } else {
      groups.push([pivot]);
    }
  }

  for (const group of groups) {
    const kind = group[0]?.kind;

    if (!kind || group.length < 1) {
      continue;
    }

    const prices = group.map((pivot) => pivot.price);
    const from = Math.min(...prices) - tolerance * 0.25;
    const to = Math.max(...prices) + tolerance * 0.25;
    const latestIndex = Math.max(...group.map((pivot) => pivot.index));
    const touches = group.length;
    const rejection = group.reduce((sum, pivot) => sum + pivot.rejection, 0) / touches;
    const type = kind === "high" ? "resistance" : "support";
    const center = (from + to) / 2;
    const strength = scoreZone({
      touches,
      index: latestIndex,
      rejection,
      candles,
      currentPrice,
      center,
      volume: candles[latestIndex]?.volume,
    });

    zones.push({
      id: `${type}-${roundPrice(from)}-${roundPrice(to)}`,
      type,
      from: roundPrice(from),
      to: roundPrice(to),
      originTime: candles[latestIndex]?.time,
      strength,
      touches,
      index: latestIndex,
      rejection,
      reason:
        language === "fa"
          ? `${touches} برخورد الگوریتمی با پیوت ${kind === "high" ? "سقف" : "کف"} و واکنش قیمتی در محدوده نزدیک.`
          : `${touches} algorithmic pivot ${kind === "high" ? "high" : "low"} touch(es) with nearby rejection.`,
    });
  }

  return zones;
}

function detectRejectionZones(candles: Candle[], atr: number, currentPrice: number, language: "fa" | "en") {
  const zones: ZoneCandidate[] = [];
  const minimumAtr = Math.max(atr, candles.at(-1)?.close ? candles.at(-1)!.close * 0.0005 : 0);

  candles.forEach((candle, index) => {
    if (index < candles.length - 80) {
      return;
    }

    const range = candleRange(candle);
    const body = candleBody(candle);
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const hasMeaningfulRange = range >= minimumAtr * 0.7;

    if (hasMeaningfulRange && candle.close < candle.open && upperWick > body * 1.2 && upperWick / range > 0.35) {
      zones.push({
        id: `supply-${candle.time}`,
        type: "supply",
        from: roundPrice(Math.max(candle.open, candle.close)),
        to: roundPrice(candle.high),
        originTime: candle.time,
        strength: scoreZone({
          touches: 1,
          index,
          rejection: upperWick / range,
          candles,
          currentPrice,
          center: (Math.max(candle.open, candle.close) + candle.high) / 2,
          volume: candle.volume,
        }),
        touches: 1,
        index,
        rejection: upperWick / range,
        reason:
          language === "fa"
            ? "کندل رد قیمت نزولی با سایه بالایی قوی و بسته شدن ضعیف تر."
            : "Bearish rejection candle with a strong upper wick and weaker close.",
      });
    }

    if (hasMeaningfulRange && candle.close > candle.open && lowerWick > body * 1.2 && lowerWick / range > 0.35) {
      zones.push({
        id: `demand-${candle.time}`,
        type: "demand",
        from: roundPrice(candle.low),
        to: roundPrice(Math.min(candle.open, candle.close)),
        originTime: candle.time,
        strength: scoreZone({
          touches: 1,
          index,
          rejection: lowerWick / range,
          candles,
          currentPrice,
          center: (candle.low + Math.min(candle.open, candle.close)) / 2,
          volume: candle.volume,
        }),
        touches: 1,
        index,
        rejection: lowerWick / range,
        reason:
          language === "fa"
            ? "کندل رد قیمت صعودی با سایه پایینی قوی و بسته شدن بهتر."
            : "Bullish rejection candle with a strong lower wick and stronger close.",
      });
    }
  });

  return zones;
}

function detectOrderBlocks(candles: Candle[], atr: number, currentPrice: number, language: "fa" | "en") {
  const zones: ZoneCandidate[] = [];

  for (let index = Math.max(2, candles.length - 90); index < candles.length; index += 1) {
    const candle = candles[index];
    const range = candleRange(candle);
    const bodyRatio = candleBody(candle) / range;
    const isBullishImpulse = candle.close > candle.open && range >= atr * 1.35 && bodyRatio >= 0.55;
    const isBearishImpulse = candle.close < candle.open && range >= atr * 1.35 && bodyRatio >= 0.55;

    if (!isBullishImpulse && !isBearishImpulse) {
      continue;
    }

    const searchStart = Math.max(0, index - 6);
    const previousCandles = candles.slice(searchStart, index).reverse();
    const opposite = previousCandles.find((item) =>
      isBullishImpulse ? item.close < item.open : item.close > item.open
    );

    if (!opposite) {
      continue;
    }

    const oppositeIndex = candles.indexOf(opposite);
    const directionText =
      language === "fa"
        ? isBullishImpulse
          ? "قبل از حرکت شارپ صعودی"
          : "قبل از حرکت شارپ نزولی"
        : isBullishImpulse
          ? "before a bullish impulse"
          : "before a bearish impulse";

    zones.push({
      id: `order-block-${opposite.time}`,
      type: "order_block",
      from: roundPrice(opposite.low),
      to: roundPrice(opposite.high),
      originTime: opposite.time,
      strength: scoreZone({
        touches: 1,
        index: oppositeIndex,
        rejection: bodyRatio,
        candles,
        currentPrice,
        center: (opposite.low + opposite.high) / 2,
        volume: opposite.volume,
      }),
      touches: 1,
      index: oppositeIndex,
      rejection: bodyRatio,
      reason:
        language === "fa"
          ? `آخرین کندل مخالف ${directionText} به عنوان اوردر بلاک احتمالی.`
          : `Last opposite candle ${directionText}, marked as a possible order block.`,
    });
  }

  return zones;
}

function sameDisplayFamily(a: MarketZone["type"], b: MarketZone["type"]) {
  const resistanceFamily = ["resistance", "supply"];
  const supportFamily = ["support", "demand"];

  return (
    a === b ||
    (resistanceFamily.includes(a) && resistanceFamily.includes(b)) ||
    (supportFamily.includes(a) && supportFamily.includes(b))
  );
}

function shouldMergeZones(a: ZoneCandidate, b: ZoneCandidate, tolerance: number) {
  if (!sameDisplayFamily(a.type, b.type) && a.type !== "order_block" && b.type !== "order_block") {
    return false;
  }

  const overlaps = Math.max(a.from, b.from) <= Math.min(a.to, b.to) + tolerance * 0.75;
  const centersClose = Math.abs(zoneCenter(a) - zoneCenter(b)) <= tolerance * 1.15;

  return overlaps || centersClose;
}

function mergeZone(a: ZoneCandidate, b: ZoneCandidate): ZoneCandidate {
  const stronger = a.strength >= b.strength ? a : b;
  const weaker = stronger === a ? b : a;
  const touches = Math.max(1, a.touches + b.touches);
  const strength = clampStrength(Math.max(a.strength, b.strength) + Math.min(touches, 5) * 1.5 + Math.max(a.rejection, b.rejection) * 3);

  return {
    ...stronger,
    id: `${stronger.type}-${roundPrice(Math.min(a.from, b.from))}-${roundPrice(Math.max(a.to, b.to))}`,
    from: roundPrice(Math.min(a.from, b.from)),
    to: roundPrice(Math.max(a.to, b.to)),
    originTime: stronger.originTime ?? weaker.originTime,
    strength,
    touches,
    index: Math.max(a.index, b.index),
    rejection: Math.max(a.rejection, b.rejection),
    reason: stronger.reason || weaker.reason,
  };
}

function mergeNearbyZones(zones: ZoneCandidate[], tolerance: number) {
  const sorted = [...zones].sort((a, b) => b.strength - a.strength || b.index - a.index);
  const result: ZoneCandidate[] = [];

  for (const zone of sorted) {
    const existingIndex = result.findIndex((item) => shouldMergeZones(item, zone, tolerance));

    if (existingIndex >= 0) {
      result[existingIndex] = mergeZone(result[existingIndex], zone);
    } else {
      result.push(zone);
    }
  }

  return result;
}

function labelZone(zone: ZoneCandidate, language: "fa" | "en") {
  const prices = `${formatPrice(zone.from)} - ${formatPrice(zone.to)}`;

  if (language === "fa") {
    const labels: Record<MarketZone["type"], string> = {
      support: "حمایت",
      resistance: "مقاومت",
      supply: "عرضه",
      demand: "تقاضا",
      order_block: "اوردر بلاک",
    };

    return `${labels[zone.type]} ${prices}`;
  }

  const labels: Record<MarketZone["type"], string> = {
    support: "Support",
    resistance: "Resistance",
    supply: "Supply",
    demand: "Demand",
    order_block: "Order block",
  };

  return `${labels[zone.type]} ${prices}`;
}

function determineStructure(candles: Candle[], pivots: Pivot[], zones: ZoneCandidate[]): MarketStructure {
  const currentPrice = candles.at(-1)?.close ?? 0;
  const highPivots = pivots.filter((pivot) => pivot.kind === "high");
  const lowPivots = pivots.filter((pivot) => pivot.kind === "low");
  const previousHigh = highPivots.at(-2);
  const lastHigh = highPivots.at(-1);
  const previousLow = lowPivots.at(-2);
  const lastLow = lowPivots.at(-1);
  let bias: MarketStructure["bias"] = "neutral";
  let lastBOS: number | undefined;
  let lastCHoCH: number | undefined;

  if (lastHigh && previousHigh && lastLow && previousLow) {
    const higherHigh = lastHigh.price > previousHigh.price;
    const higherLow = lastLow.price > previousLow.price;
    const lowerHigh = lastHigh.price < previousHigh.price;
    const lowerLow = lastLow.price < previousLow.price;

    if (higherHigh && higherLow) {
      bias = "bullish";
      lastBOS = roundPrice(lastHigh.price);
    } else if (lowerHigh && lowerLow) {
      bias = "bearish";
      lastBOS = roundPrice(lastLow.price);
    } else if (higherHigh && lowerLow) {
      bias = currentPrice >= (lastHigh.price + lastLow.price) / 2 ? "bullish" : "bearish";
      lastCHoCH = roundPrice(bias === "bullish" ? lastHigh.price : lastLow.price);
    }
  }

  const supportsBelow = zones
    .filter((zone) => ["support", "demand", "order_block"].includes(zone.type) && zone.to < currentPrice)
    .sort((a, b) => b.to - a.to);
  const resistancesAbove = zones
    .filter((zone) => ["resistance", "supply", "order_block"].includes(zone.type) && zone.from > currentPrice)
    .sort((a, b) => a.from - b.from);

  return {
    bias,
    lastBOS,
    lastCHoCH,
    invalidation:
      bias === "bullish"
        ? supportsBelow[0]?.from
        : bias === "bearish"
          ? resistancesAbove[0]?.to
          : supportsBelow[0]?.from ?? resistancesAbove[0]?.to,
  };
}

export function detectMarketZones(candles: Candle[], options: DetectOptions = {}) {
  const language = options.language ?? "fa";
  const sorted = [...candles]
    .filter(
      (candle) =>
        Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
    )
    .sort((a, b) => a.time - b.time);

  if (sorted.length < 50) {
    throw new Error("Insufficient candle data for analysis");
  }

  const currentPrice = sorted.at(-1)!.close;
  const atr = calculateAtr(sorted);
  const tolerance = Math.max(atr * 0.75, currentPrice * 0.0012);
  const pivots = detectPivots(sorted);
  const supports = buildGroupedZones({
    pivots: pivots.filter((pivot) => pivot.kind === "low"),
    candles: sorted,
    tolerance,
    currentPrice,
    language,
  });
  const resistances = buildGroupedZones({
    pivots: pivots.filter((pivot) => pivot.kind === "high"),
    candles: sorted,
    tolerance,
    currentPrice,
    language,
  });
  const rejectionZones = detectRejectionZones(sorted, atr, currentPrice, language);
  const orderBlocks = detectOrderBlocks(sorted, atr, currentPrice, language);
  const allZones = mergeNearbyZones([...supports, ...resistances, ...rejectionZones, ...orderBlocks], tolerance)
    .sort((a, b) => b.strength - a.strength || Math.abs(zoneCenter(a) - currentPrice) - Math.abs(zoneCenter(b) - currentPrice))
    .slice(0, options.maxZones ?? 14);
  const structure = determineStructure(sorted, pivots, allZones);
  const zones = allZones.map((candidate) => ({
    id: candidate.id,
    type: candidate.type,
    from: candidate.from,
    to: candidate.to,
    originTime: candidate.originTime,
    label: labelZone(candidate, language),
    strength: candidate.strength,
    touches: candidate.touches,
    reason: candidate.reason,
  }));

  return {
    currentPrice: roundPrice(currentPrice),
    zones,
    supportLevels: zones
      .filter((zone) => ["support", "demand"].includes(zone.type))
      .sort((a, b) => Math.abs(zoneCenter(a) - currentPrice) - Math.abs(zoneCenter(b) - currentPrice))
      .map((zone) => roundPrice((zone.from + zone.to) / 2))
      .slice(0, 5),
    resistanceLevels: zones
      .filter((zone) => ["resistance", "supply"].includes(zone.type))
      .sort((a, b) => Math.abs(zoneCenter(a) - currentPrice) - Math.abs(zoneCenter(b) - currentPrice))
      .map((zone) => roundPrice((zone.from + zone.to) / 2))
      .slice(0, 5),
    structure: {
      ...structure,
      invalidation: structure.invalidation === undefined ? undefined : roundPrice(structure.invalidation),
    },
    disclaimer: language === "fa" ? DEFAULT_DISCLAIMER_FA : DEFAULT_DISCLAIMER_EN,
  };
}

export function createMockCandles(symbol: string, timeframe: string, limit = 180): Candle[] {
  const seedText = `${symbol}:${timeframe}`;
  let seed = Array.from(seedText).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const nextRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const base = symbol.includes("JPY") ? 155 : symbol.includes("BTC") ? 62000 : symbol.includes("XAU") ? 2350 : 1.12;
  const step = base > 1000 ? base * 0.002 : base * 0.0015;
  const intervalMs = timeframe === "D1" || timeframe === "D" ? 86_400_000 : timeframe === "H4" || timeframe === "240" ? 14_400_000 : timeframe === "M15" || timeframe === "15" ? 900_000 : timeframe === "M5" || timeframe === "5" ? 300_000 : 3_600_000;
  const start = Date.now() - limit * intervalMs;
  let close = base;

  return Array.from({ length: limit }, (_, index) => {
    const wave = Math.sin(index / 9) * step * 4 + Math.sin(index / 23) * step * 7;
    const drift = (index - limit / 2) * step * 0.035;
    const open = close;
    close = Math.max(base * 0.25, base + wave + drift + (nextRandom() - 0.5) * step * 2);
    const spread = Math.max(Math.abs(close - open), step * (1.2 + nextRandom() * 2.2));
    const high = Math.max(open, close) + spread * (0.35 + nextRandom());
    const low = Math.min(open, close) - spread * (0.35 + nextRandom());

    return {
      time: start + index * intervalMs,
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume: Math.round(1000 + nextRandom() * 5000),
    };
  });
}
