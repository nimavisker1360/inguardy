import { Prisma } from "@prisma/client";
import { getPropFirmChallengesForUser } from "@/lib/dashboard-data";
import { apiResponse, decimalValue, parseDate } from "@/lib/journal/api-utils";
import { prisma } from "@/lib/prisma";
import { closeTriggeredPropFirmChallenges } from "@/lib/prop-firms";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

function requiredDecimal(value: unknown) {
  const parsed = decimalValue(value);
  return parsed === undefined ? null : parsed;
}

async function ensureAccountBelongsToUser(accountId: unknown, userId: string) {
  const id = String(accountId || "").trim();

  if (!id) {
    return null;
  }

  const account = await prisma.tradingAccount.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  return account?.id ?? null;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const data = await getPropFirmChallengesForUser(userId);

    return apiResponse({ success: true, data });
  } catch {

    return apiResponse(
      { success: false, message: "Failed to load prop firm challenges" },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const name = String(body.name || "").trim();
    const accountId = await ensureAccountBelongsToUser(body.accountId, userId);
    const startedAt = parseDate(body.startedAt);
    const endedAt = parseDate(body.endedAt);
    const startingBalance = requiredDecimal(body.startingBalance);
    const profitTarget = requiredDecimal(body.profitTarget);
    const maxDailyLoss = requiredDecimal(body.maxDailyLoss);
    const maxTotalLoss = requiredDecimal(body.maxTotalLoss);

    if (!name) {
      return apiResponse({ success: false, message: "Challenge name is required" }, 400);
    }

    if (!accountId) {
      return apiResponse({ success: false, message: "Trading account not found" }, 404);
    }

    if (startedAt === null || endedAt === null) {
      return apiResponse({ success: false, message: "Invalid challenge date" }, 400);
    }

    if (!startingBalance || !profitTarget || !maxDailyLoss || !maxTotalLoss) {
      return apiResponse(
        { success: false, message: "Balance, target, and loss limits are required" },
        400
      );
    }

    const challenge = await prisma.propFirmChallenge.create({
      data: {
        userId,
        accountId,
        name,
        startingBalance,
        profitTarget,
        maxDailyLoss,
        maxTotalLoss,
        startedAt,
        endedAt,
      },
    });
    await closeTriggeredPropFirmChallenges(userId, { challengeId: challenge.id });

    return apiResponse({ success: true, data: challenge }, 201);
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return apiResponse({ success: false, message: "Invalid accountId" }, 400);
    }

    return apiResponse(
      { success: false, message: "Failed to create prop firm challenge" },
      500
    );
  }
}
