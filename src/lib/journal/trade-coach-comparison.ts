export type CoachRow = {
  id: "risk" | "reward" | "direction" | "checklist" | "discipline" | "documentation" | "preparation";
  plan: string;
  actual: string;
  status: "PASS" | "ALERT" | "MISSING" | "CONTEXT";
  source: "PLAYBOOK" | "TRADE" | "SAME_DAY_UNLINKED";
  evidence: string;
};

export function coachActionText(category: string, language: "fa" | "en") {
  const actions: Record<string, { fa: string; en: string }> = {
    risk: { fa: "ریسک معاملهٔ بعد را در سقف پلی‌بوک نگه دار.", en: "Keep the next trade's risk within your playbook limit." },
    reward: { fa: "نسبت سود به زیانِ برنامهٔ معاملهٔ بعد را با حداقل پلی‌بوک تطبیق بده.", en: "Check that the next trade's planned reward-to-risk meets your playbook minimum." },
    direction: { fa: "جهت معاملهٔ بعد را با جهت مجاز پلی‌بوک هماهنگ کن.", en: "Match the next trade's direction to your playbook." },
    checklist: { fa: "موارد ضروری چک‌لیست را پیش از ورود به معاملهٔ بعد ثبت کن.", en: "Record the required checklist items before entering the next trade." },
    discipline: { fa: "قوانین ضروری استراتژی را در معاملهٔ بعد رعایت و سپس مرور کن.", en: "Follow the required strategy rules on the next trade, then review them." },
    documentation: { fa: "ستاپ و دلیل ورود معاملهٔ بعد را ثبت کن.", en: "Record the setup and entry reason on the next trade." },
  };
  return actions[category]?.[language] ?? null;
}

export type ComparisonInput = {
  direction: "BUY" | "SELL";
  openedAt: Date | null;
  entryPrice: number | null;
  initialStopLoss: number | null;
  initialTakeProfit: number | null;
  riskAmount: number | null;
  balanceAtOpen: number | null;
  setup: string | null;
  notes: string | null;
  playbook: {
    name: string;
    direction: string;
    riskPerTrade: number | null;
    minRiskReward: number | null;
  } | null;
  strategyReview: {
    followedPlan: string;
    compliancePercent: number;
    requiredCompliancePercent: number;
  } | null;
  requiredAnswers: Array<{ checked: boolean; answeredAt: Date | null }>;
  sameDayPreparation: { selectedPlaybook: string | null; decision: string | null } | null;
};

function fmt(value: number) {
  return Number(value.toFixed(2)).toString();
}

export function plannedRiskReward(input: ComparisonInput) {
  const { entryPrice: entry, initialStopLoss: stop, initialTakeProfit: target } = input;
  if (entry == null || stop == null || target == null) return null;
  const risk = input.direction === "BUY" ? entry - stop : stop - entry;
  const reward = input.direction === "BUY" ? target - entry : entry - target;
  return risk > 0 && reward > 0 ? reward / risk : null;
}

export function buildTradeCoachComparison(input: ComparisonInput): CoachRow[] {
  const rows: CoachRow[] = [];
  const riskCap = input.playbook?.riskPerTrade;
  const actualRisk = input.riskAmount != null && input.balanceAtOpen != null && input.balanceAtOpen > 0
    ? input.riskAmount / input.balanceAtOpen * 100
    : null;
  rows.push({
    id: "risk",
    plan: riskCap != null && riskCap > 0 ? `≤ ${fmt(riskCap)}%` : "—",
    actual: actualRisk == null ? "—" : `${fmt(actualRisk)}%`,
    status: riskCap == null || riskCap <= 0 || actualRisk == null
      ? "MISSING" : actualRisk <= riskCap + 0.0001 ? "PASS" : "ALERT",
    source: "PLAYBOOK",
    evidence: "playbook.riskPerTrade, trade.riskAmount, trade.balanceAtOpen",
  });

  const minimumRr = input.playbook?.minRiskReward;
  const plannedRr = plannedRiskReward(input);
  rows.push({
    id: "reward",
    plan: minimumRr != null && minimumRr > 0 ? `≥ ${fmt(minimumRr)}R` : "—",
    actual: plannedRr == null ? "—" : `${fmt(plannedRr)}R`,
    status: minimumRr == null || minimumRr <= 0 || plannedRr == null
      ? "MISSING" : plannedRr + 0.0001 >= minimumRr ? "PASS" : "ALERT",
    source: "PLAYBOOK",
    evidence: "playbook.minRiskReward, trade.entryPrice, trade.initialStopLoss, trade.initialTakeProfit",
  });

  const allowedDirection = input.playbook?.direction;
  const directionMatches = allowedDirection === "BOTH" ||
    (allowedDirection === "BUY_ONLY" && input.direction === "BUY") ||
    (allowedDirection === "SELL_ONLY" && input.direction === "SELL");
  rows.push({
    id: "direction",
    plan: allowedDirection ?? "—",
    actual: input.direction,
    status: !allowedDirection ? "MISSING" : directionMatches ? "PASS" : "ALERT",
    source: "PLAYBOOK",
    evidence: "playbook.direction, trade.direction",
  });

  const required = input.requiredAnswers;
  const timely = required.filter((answer) => answer.checked && answer.answeredAt &&
    input.openedAt && answer.answeredAt <= input.openedAt).length;
  const unverifiable = required.some((answer) => answer.checked && !answer.answeredAt);
  rows.push({
    id: "checklist",
    plan: required.length ? `${required.length}/${required.length}` : "—",
    actual: required.length ? `${timely}/${required.length}` : "—",
    status: !required.length || !input.openedAt || unverifiable
      ? "MISSING" : timely === required.length ? "PASS" : "ALERT",
    source: "TRADE",
    evidence: "trade.checklists.requiredAnswers.answeredAt, trade.openedAt",
  });

  const review = input.strategyReview;
  const reviewed = review && review.followedPlan !== "NOT_REVIEWED";
  rows.push({
    id: "discipline",
    plan: review ? `${fmt(review.requiredCompliancePercent)}% required` : "—",
    actual: reviewed ? `${review!.followedPlan} · ${fmt(review!.compliancePercent)}%` : "—",
    status: !reviewed ? "MISSING"
      : review!.followedPlan === "YES" && review!.compliancePercent >= review!.requiredCompliancePercent
        ? "PASS" : "ALERT",
    source: "TRADE",
    evidence: "trade.strategyReview.followedPlan, trade.strategyReview.compliancePercent",
  });

  const hasSetup = Boolean(input.setup?.trim());
  const hasNotes = Boolean(input.notes?.trim());
  rows.push({
    id: "documentation",
    plan: "Setup + entry reason recorded",
    actual: `${Number(hasSetup) + Number(hasNotes)}/2 fields`,
    status: hasSetup && hasNotes ? "PASS" : "ALERT",
    source: "TRADE",
    evidence: "trade.setup, trade.notes; recording time is unknown",
  });

  if (input.sameDayPreparation) {
    rows.push({
      id: "preparation",
      plan: input.sameDayPreparation.selectedPlaybook || "—",
      actual: input.sameDayPreparation.decision || "—",
      status: "CONTEXT",
      source: "SAME_DAY_UNLINKED",
      evidence: "preTradeCheck.date, preTradeCheck.createdAt; not linked to this trade",
    });
  }
  return rows;
}

export function evaluateCoachAction(row: CoachRow | undefined, language: "fa" | "en") {
  if (!row || row.status === "MISSING" || row.status === "CONTEXT") {
    return {
      verdict: "UNCLEAR" as const,
      reason: language === "fa"
        ? "اطلاعات کافی برای سنجش این اقدام در معاملهٔ بعدی ثبت نشده است."
        : "The next trade does not contain enough evidence to assess this action.",
    };
  }
  const verdict = row.status === "PASS" ? "MET" as const : "NOT_MET" as const;
  const reason = language === "fa"
    ? `معیار برنامه: ${row.plan}؛ مقدار ثبت‌شده: ${row.actual}.`
    : `Plan criterion: ${row.plan}; recorded result: ${row.actual}.`;
  return { verdict, reason };
}
