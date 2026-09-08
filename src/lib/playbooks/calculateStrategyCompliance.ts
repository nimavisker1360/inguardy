export type StrategyRuleReviewInput = {
  status: string | null;
  isRequiredSnapshot: boolean;
};

export function calculateStrategyCompliance(ruleReviews: StrategyRuleReviewInput[]) {
  const totalRules = ruleReviews.length;
  const followedRules = ruleReviews.filter(
    (review) => review.status === "FOLLOWED"
  ).length;
  const violatedRules = ruleReviews.filter(
    (review) => review.status === "VIOLATED"
  ).length;
  const requiredRules = ruleReviews.filter(
    (review) => review.isRequiredSnapshot
  ).length;
  const requiredFollowedRules = ruleReviews.filter(
    (review) => review.isRequiredSnapshot && review.status === "FOLLOWED"
  ).length;

  return {
    totalRules,
    followedRules,
    violatedRules,
    requiredRules,
    requiredFollowedRules,
    compliancePercent: totalRules > 0 ? (followedRules / totalRules) * 100 : 0,
    requiredCompliancePercent:
      requiredRules > 0 ? (requiredFollowedRules / requiredRules) * 100 : 0,
  };
}
