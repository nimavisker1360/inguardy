import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getTradingGoal, tradingGoals } from "@/lib/trading-goals";
import { TradingGoalClient } from "./trading-goal-client";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return tradingGoals.map((goal) => ({ slug: goal.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const goal = getTradingGoal(slug);

  if (!goal) {
    return {
      title: "Trading Goal - Inguardy",
    };
  }

  return {
    title: `${goal.title} - Inguardy`,
    description: goal.summary,
  };
}

export default async function TradingGoalPage({ params }: PageProps) {
  const { slug } = await params;
  const goal = getTradingGoal(slug);

  if (!goal) {
    notFound();
  }

  const relatedGoals = tradingGoals.filter((item) => item.slug !== goal.slug);

  return <TradingGoalClient goal={goal} relatedGoals={relatedGoals} />;
}
