export type TradingGoal = {
  slug: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  summary: string;
  image?: string;
  imageAlt?: string;
  metrics: Array<{
    label: string;
    value: string;
  }>;
  pillars: Array<{
    title: string;
    description: string;
  }>;
  workflow: string[];
  checklist: string[];
  outcome: string;
};

export const tradingGoals: TradingGoal[] = [
  {
    slug: "automate-my-journal",
    title: "Automate My Journal",
    shortTitle: "Automated Journal",
    eyebrow: "MT5 auto sync",
    summary:
      "Stop rebuilding your trading history by hand. Automated journaling keeps entries, exits, symbols, volume, timestamps, screenshots, and account context organized so your review starts with clean data.",
    image: "/images/background/AuTrade.png",
    imageAlt: "Automated trade journaling dashboard preview",
    metrics: [
      { label: "Manual entry", value: "Less" },
      { label: "Trade history", value: "Synced" },
      { label: "Review base", value: "Clean" },
    ],
    pillars: [
      {
        title: "Capture the facts first",
        description:
          "Every review is only as good as the data behind it. Auto sync protects the basics: symbol, direction, open and close time, size, price, PnL, and account history.",
      },
      {
        title: "Reduce missed trades",
        description:
          "Manual journals often fail on busy days. Syncing closed trades helps keep the journal complete even when the session is emotional or fast.",
      },
      {
        title: "Make screenshots useful",
        description:
          "When screenshots are connected to the trade record, you can compare what you saw at entry with what actually happened after exit.",
      },
    ],
    workflow: [
      "Connect the MT5 account from the dashboard.",
      "Let closed trades flow into the journal automatically.",
      "Attach entry and exit screenshots when available.",
      "Review the day from one organized trade history.",
    ],
    checklist: [
      "Check that account timezone and broker history match your session notes.",
      "Keep trade tags simple: setup, mistake, market condition, and session.",
      "Review imported trades daily so small data issues never become a monthly mess.",
    ],
    outcome:
      "You spend less time typing and more time studying execution quality, risk decisions, and repeatable setups.",
  },
  {
    slug: "analyze-my-performance",
    title: "Analyze My Performance",
    shortTitle: "Performance Analysis",
    eyebrow: "Analytics and reports",
    summary:
      "Good performance analysis shows where your edge is actually coming from. Break results down by session, symbol, setup, risk, holding time, and behavior instead of judging yourself from one trade.",
    image: "/images/004.png",
    imageAlt: "Trading analytics report preview",
    metrics: [
      { label: "Patterns", value: "Visible" },
      { label: "Reports", value: "Actionable" },
      { label: "Decisions", value: "Data-led" },
    ],
    pillars: [
      {
        title: "Separate edge from noise",
        description:
          "A single win or loss says little. Grouped results reveal whether your plan works better in London, New York, gold, forex majors, news days, or specific setups.",
      },
      {
        title: "Measure risk quality",
        description:
          "Track average loss, average win, reward-to-risk, drawdown streaks, and missed stop discipline so you know whether the problem is strategy or execution.",
      },
      {
        title: "Turn reports into rules",
        description:
          "The goal is not prettier charts. The goal is one or two changes you can apply in the next session without overcomplicating your plan.",
      },
    ],
    workflow: [
      "Filter results by symbol, session, setup, tag, and date range.",
      "Compare winners, losers, and break-even trades separately.",
      "Find the conditions where your expectancy is strongest.",
      "Write one rule change for the next trading week.",
    ],
    checklist: [
      "Review performance in batches of trades, not after every emotional loss.",
      "Track both money results and process scores.",
      "Export reports before funded-account reviews or monthly planning.",
    ],
    outcome:
      "You see which behaviors deserve more size, which setups need limits, and which habits are quietly damaging the account.",
  },
  {
    slug: "improve-my-discipline",
    title: "Improve My Discipline",
    shortTitle: "Trading Discipline",
    eyebrow: "Playbooks and checklists",
    summary:
      "Discipline improves when your rules are visible before the trade and reviewed after the trade. Playbooks, checklists, and daily notes turn a vague plan into a repeatable routine.",
    image: "/images/background/checklist.png",
    imageAlt: "Trading checklist dashboard preview",
    metrics: [
      { label: "Rules", value: "Visible" },
      { label: "Routine", value: "Daily" },
      { label: "Mistakes", value: "Tracked" },
    ],
    pillars: [
      {
        title: "Define the trade before entry",
        description:
          "A setup should have conditions, invalidation, risk, timing, and management rules. If those are not clear before entry, discipline has nothing concrete to follow.",
      },
      {
        title: "Use checklists at the decision point",
        description:
          "Short pre-trade checks reduce impulsive entries, late chasing, oversized risk, and trades taken outside the planned session.",
      },
      {
        title: "Review behavior without drama",
        description:
          "Discipline improves faster when mistakes are named clearly: FOMO entry, moved stop, early exit, revenge trade, no plan, or ignored news risk.",
      },
    ],
    workflow: [
      "Create a playbook for each setup you actually trade.",
      "Attach a short checklist to the setup.",
      "Score each closed trade against the checklist.",
      "Use the daily journal to record emotional state and rule breaks.",
    ],
    checklist: [
      "Keep checklists short enough to use before a live trade.",
      "Only add rules that change real behavior.",
      "Review repeated mistakes weekly and remove one trigger at a time.",
    ],
    outcome:
      "You stop relying on willpower alone and build a trading process that catches common mistakes before they cost money.",
  },
  {
    slug: "review-trades-with-ai",
    title: "Review Trades With AI",
    shortTitle: "AI Trade Review",
    eyebrow: "Structured feedback",
    summary:
      "AI review turns each closed trade into focused feedback about setup quality, risk, execution, psychology, and what to improve next. It is built to support your review process, not replace your judgment.",
    image: "/images/background/AiTrade_cyber.png",
    imageAlt: "AI trade review dashboard preview",
    metrics: [
      { label: "Feedback", value: "Specific" },
      { label: "Mistakes", value: "Named" },
      { label: "Next step", value: "Clear" },
    ],
    pillars: [
      {
        title: "Review the full context",
        description:
          "Useful feedback needs more than PnL. AI can evaluate notes, screenshots, trade direction, entry logic, exit reason, risk, and your psychology tags together.",
      },
      {
        title: "Find repeated mistakes",
        description:
          "The biggest improvement often comes from patterns: early exits, late entries, moving stops, trading during poor conditions, or ignoring the playbook.",
      },
      {
        title: "Create a next-trade action",
        description:
          "A review should end with a practical adjustment, such as waiting for confirmation, reducing size after a loss, or avoiding one weak session.",
      },
    ],
    workflow: [
      "Close the trade and confirm the journal data is accurate.",
      "Add notes about setup, entry reason, exit reason, and emotion.",
      "Run AI review from the trade detail page.",
      "Save the feedback and compare it with future trades.",
    ],
    checklist: [
      "Do not use AI feedback as financial advice or a signal service.",
      "Give the review enough context: screenshots and honest notes matter.",
      "Look for repeated feedback themes, not one-off comments.",
    ],
    outcome:
      "Every closed trade becomes a practical lesson you can bring into the next session with less guesswork.",
  },
  {
    slug: "track-prop-firm-rules",
    title: "Track Prop Firm Rules",
    shortTitle: "Prop Firm Rules",
    eyebrow: "Targets and drawdown",
    summary:
      "Prop firm trading is not only about finding good entries. You must know the profit target, daily loss limit, max drawdown, minimum trading days, and payout rules before the account is at risk.",
    image: "/images/background/prop_firm.png",
    imageAlt: "Prop firm challenge rules dashboard preview",
    metrics: [
      { label: "Limits", value: "Visible" },
      { label: "Targets", value: "Tracked" },
      { label: "Risk", value: "Controlled" },
    ],
    pillars: [
      {
        title: "Keep the hard limits visible",
        description:
          "Daily loss, max drawdown, and trailing rules should be checked before the first trade of the day. A profitable strategy can still fail if account rules are ignored.",
      },
      {
        title: "Plan around challenge math",
        description:
          "Profit target, max loss, minimum days, consistency rules, and news restrictions change how much risk is reasonable per trade and per session.",
      },
      {
        title: "Review progress without pressure",
        description:
          "A tracker helps you avoid forcing trades near the target or oversizing after a slow start. Rule awareness protects the account from emotional decisions.",
      },
    ],
    workflow: [
      "Create a prop firm account profile in the dashboard.",
      "Enter target, daily loss, max drawdown, and phase rules.",
      "Check current buffer before each session.",
      "Use reports to review risk decisions across the challenge.",
    ],
    checklist: [
      "Read the latest prop firm rules directly from the firm before trading.",
      "Avoid opening trades when daily loss buffer is too small.",
      "Document rule changes, payout conditions, and restricted trading events.",
    ],
    outcome:
      "You can trade the plan while staying aware of the account rules that decide whether the challenge stays alive.",
  },
];

export const tradingGoalSlugs = tradingGoals.map((goal) => goal.slug);

export function getTradingGoal(slug: string) {
  return tradingGoals.find((goal) => goal.slug === slug);
}
