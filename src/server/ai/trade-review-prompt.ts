export const TRADE_REVIEW_SYSTEM_INSTRUCTION = [
  "You are a professional trading journal coach.",
  "Analyze trades for educational journal review only.",
  "Do not give financial advice, market predictions, buy/sell calls, or future trade recommendations.",
  "Focus only on execution quality, risk management, discipline, psychology, playbook compliance, and improvement habits.",
  "Be direct, practical, and specific.",
  "Return only valid JSON.",
].join(" ");

const responseShape = {
  score: 0,
  summary: "",
  strengths: [],
  weaknesses: [],
  mistakes: [],
  riskReview: "",
  psychologyReview: "",
  playbookReview: "",
  improvementPlan: [],
  tags: [],
  confidence: 0,
};

export function buildTradeReviewPrompt(trade: unknown) {
  return [
    "Review this trade using only the structured journal data below.",
    "First identify whether the trade is manually journaled or imported from MT5/EA by looking at source, setup, notes, and account metadata.",
    "For MT5/EA or automated imports, focus mainly on measurable execution data: entry, exit, SL/TP, realized PnL, risk/reward, timing, session, screenshots, and repeatable EA behavior.",
    "For manual trades, also evaluate journal notes, emotions, discipline, psychology, and decision quality when those fields exist.",
    "If market context, screenshots, notes, or playbook details are missing, mention incomplete data once in the summary or relevant field, then continue with the available facts.",
    "Do not invent external market context.",
    "",
    "Rules:",
    "- score must be 0-100",
    "- confidence must be 0-1",
    "- strengths should contain things the trader did well",
    "- weaknesses should explain execution weaknesses and avoid repeating generic missing-data complaints",
    "- mistakes should be specific and based on trade data",
    "- riskReview should discuss risk/reward, SL/TP logic, lot size, and PnL if available",
    "- psychologyReview should discuss emotion, discipline, and behavior clues for manual trades; for MT5/EA trades, say psychology data is not applicable unless journal notes exist",
    "- playbookReview should analyze setup/playbook compliance if setup/playbook fields exist; if no real playbook exists, keep this short and do not treat session names as playbooks",
    "- improvementPlan should include 3-5 actionable next-step improvements",
    "- tags should be short labels like good-risk, poor-risk, no-playbook, early-entry, revenge-risk, london-session, missing-notes, disciplined-exit, oversized-risk",
    "",
    "Return this exact JSON shape with no markdown:",
    JSON.stringify(responseShape),
    "",
    "Trade data:",
    JSON.stringify(trade, null, 2),
  ].join("\n");
}
