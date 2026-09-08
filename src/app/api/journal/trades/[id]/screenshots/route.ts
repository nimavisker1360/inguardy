import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";
import { upsertTradeScreenshot } from "@/server/mt5/pending-screenshots";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const SCREENSHOT_TYPES = new Set(["BEFORE", "ENTRY", "EXIT", "AFTER"]);

function optionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function validationResponse(errors: string[]) {
  return NextResponse.json(
    {
      success: false,
      message: "Validation failed",
      errors,
    },
    { status: 400 }
  );
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "screenshots");

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const screenshotUrl = optionalString(body.screenshotUrl ?? body.url);
    const type = optionalString(body.type)?.toUpperCase();
    const errors: string[] = [];

    if (!screenshotUrl) {
      errors.push("screenshotUrl is required");
    }

    if (!type || !SCREENSHOT_TYPES.has(type)) {
      errors.push("type must be BEFORE, ENTRY, EXIT, or AFTER");
    }

    if (errors.length > 0 || !screenshotUrl || !type) {
      return validationResponse(errors);
    }

    const trade = await prisma.trade.findFirst({
      where: { id, userId },
      select: { id: true, userId: true },
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    const screenshot =
      type === "ENTRY" || type === "EXIT"
        ? await upsertTradeScreenshot(prisma as any, {
            tradeId: trade.id,
            userId: trade.userId,
            type,
            url: screenshotUrl,
          })
        : await prisma.tradeScreenshot.create({
            data: {
              tradeId: trade.id,
              userId: trade.userId,
              type,
              url: screenshotUrl,
            },
          });
    const updatedTrade = await prisma.trade.findFirst({
      where: { id, userId },
      include: journalTradeInclude,
    });

    return NextResponse.json(
      {
        success: true,
        screenshot,
        trade: updatedTrade ? serializeJournalTrade(updatedTrade) : null,
      },
      { status: 201 }
    );
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return validationResponse(["tradeId does not match an existing trade"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to save trade screenshot" },
      { status: 500 }
    );
  }
}
