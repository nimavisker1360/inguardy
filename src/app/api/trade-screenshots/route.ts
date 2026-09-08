import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/journal/api-utils";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "screenshots");

    const body = await request.json();
    const { tradeId, type, url } = body;

    if (!tradeId || !type || !url) {
      return apiResponse(
        { success: false, message: "tradeId, type, and url are required" },
        400
      );
    }

    const trade = await prisma.trade.findFirst({
      where: { id: String(tradeId), userId },
      select: { id: true },
    });

    if (!trade) {
      return apiResponse({ success: false, message: "Trade not found" }, 404);
    }

    const screenshot = await prisma.tradeScreenshot.create({
      data: {
        userId,
        tradeId,
        type,
        url,
      },
    });

    return apiResponse({ success: true, data: screenshot }, 201);
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return apiResponse({ success: false, message: "Invalid tradeId" }, 400);
    }

    return apiResponse(
      { success: false, message: "Failed to create screenshot metadata" },
      500
    );
  }
}
