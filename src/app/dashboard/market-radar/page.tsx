import { AIMarketRadar } from "@/components/dashboard/AIMarketRadar";
import { getMarketRadarAccess } from "@/lib/market-radar-access";
import { getCurrentUserId } from "@/lib/server-auth";

export default async function MarketRadarPage() {
  const userId = await getCurrentUserId();
  const access = userId ? await getMarketRadarAccess(userId).catch(() => null) : null;

  return (
    <AIMarketRadar
      aiAnalysisEnabled={Boolean(access?.aiAnalysisEnabled)}
      hasUsedFreeAnalysis={Boolean(access?.hasUsedFreeAnalysis)}
    />
  );
}
