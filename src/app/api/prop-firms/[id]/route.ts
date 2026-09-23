import { Prisma } from "@prisma/client";
import { apiResponse, decimalValue, parseNullableDate } from "@/lib/journal/api-utils";
import { prisma } from "@/lib/prisma";
import { closeTriggeredPropFirmChallenges } from "@/lib/prop-firms";
import { isPropFirmRuleProfile, isValidTimeZone } from "@/lib/prop-firm-rule-sync";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = await request.json();
    const existing = await prisma.propFirmChallenge.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return apiResponse({ success: false, message: "Prop firm challenge not found" }, 404);
    }

    const data: Prisma.PropFirmChallengeUpdateInput = {};

    if (body.name !== undefined) {
      const name = String(body.name || "").trim();

      if (!name) {
        return apiResponse({ success: false, message: "Challenge name is required" }, 400);
      }

      data.name = name;
    }

    if (body.ruleProfile !== undefined) {
      const ruleProfile = String(body.ruleProfile || "").trim();
      if (!isPropFirmRuleProfile(ruleProfile)) {
        return apiResponse({ success: false, message: "Invalid rule profile" }, 400);
      }
      data.ruleProfile = ruleProfile;
    }

    if (body.dailyResetTimeZone !== undefined) {
      const dailyResetTimeZone = String(body.dailyResetTimeZone || "").trim();
      if (!isValidTimeZone(dailyResetTimeZone)) {
        return apiResponse({ success: false, message: "Invalid daily reset time zone" }, 400);
      }
      data.dailyResetTimeZone = dailyResetTimeZone;
    }

    if (body.warningThreshold !== undefined) {
      const warningThreshold = Number(body.warningThreshold);
      if (!Number.isInteger(warningThreshold) || warningThreshold < 50 || warningThreshold > 100) {
        return apiResponse({ success: false, message: "Warning threshold must be between 50 and 100" }, 400);
      }
      data.warningThreshold = warningThreshold;
    }

    if (body.guardEnabled !== undefined) {
      if (typeof body.guardEnabled !== "boolean") {
        return apiResponse({ success: false, message: "guardEnabled must be a boolean" }, 400);
      }
      data.guardEnabled = body.guardEnabled;
    }

    for (const [field, max] of [
      ["maxDailyEntries", 100],
      ["maxConsecutiveLosses", 20],
      ["lossCooldownMinutes", 1440],
    ] as const) {
      if (body[field] === undefined) continue;
      if (body[field] === null || body[field] === "") {
        data[field] = null;
        continue;
      }
      const value = Number(body[field]);
      if (!Number.isInteger(value) || value < 1 || value > max) {
        return apiResponse({ success: false, message: `${field} must be between 1 and ${max}` }, 400);
      }
      data[field] = value;
    }

    if (body.manualPauseUntil !== undefined) {
      const pauseUntil = parseNullableDate(body.manualPauseUntil);
      if (pauseUntil === false) {
        return apiResponse({ success: false, message: "Invalid manual pause time" }, 400);
      }
      if (pauseUntil && pauseUntil.getTime() > Date.now() + 7 * 24 * 60 * 60 * 1000) {
        return apiResponse({ success: false, message: "Manual pause may be at most 7 days" }, 400);
      }
      data.manualPauseUntil = pauseUntil;
    }

    if (body.accountId !== undefined) {
      const accountId = await ensureAccountBelongsToUser(body.accountId, userId);

      if (!accountId) {
        return apiResponse({ success: false, message: "Trading account not found" }, 404);
      }

      data.accountId = accountId;
    }

    if (body.startingBalance !== undefined) {
      const value = decimalValue(body.startingBalance);

      if (value === undefined) {
        return apiResponse({ success: false, message: "Starting balance is required" }, 400);
      }

      data.startingBalance = value;
    }

    for (const field of ["profitTarget", "maxDailyLoss", "maxTotalLoss"] as const) {
      if (body[field] !== undefined) {
        data[field] = decimalValue(body[field]) ?? null;
      }
    }

    const startedAt = parseNullableDate(body.startedAt);
    const endedAt = parseNullableDate(body.endedAt);

    if (startedAt === false || endedAt === false) {
      return apiResponse({ success: false, message: "Invalid challenge date" }, 400);
    }

    if (startedAt !== undefined) {
      data.startedAt = startedAt;
    }

    if (endedAt !== undefined) {
      data.endedAt = endedAt;
    }

    const challenge = await prisma.propFirmChallenge.update({
      where: { id },
      data,
    });
    await closeTriggeredPropFirmChallenges(userId, { challengeId: id });

    return apiResponse({ success: true, data: challenge });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return apiResponse({ success: false, message: "Prop firm challenge not found" }, 404);
    }

    return apiResponse(
      { success: false, message: "Failed to update prop firm challenge" },
      500
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const result = await prisma.propFirmChallenge.deleteMany({
      where: { id, userId },
    });

    if (result.count === 0) {
      return apiResponse({ success: false, message: "Prop firm challenge not found" }, 404);
    }

    return apiResponse({ success: true });
  } catch {

    return apiResponse(
      { success: false, message: "Failed to delete prop firm challenge" },
      500
    );
  }
}
