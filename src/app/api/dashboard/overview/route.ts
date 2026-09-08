import { getDashboardOverviewData } from "@/lib/dashboard-data";
import { apiResponse } from "@/lib/journal/api-utils";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");
    const data = await getDashboardOverviewData(userId, { accountId });

    return apiResponse({ success: true, data });
  } catch {

    return apiResponse(
      { success: false, message: "Failed to load dashboard overview" },
      500
    );
  }
}
