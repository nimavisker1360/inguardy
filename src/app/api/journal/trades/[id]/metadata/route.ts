import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MetadataPayload = {
  rating?: unknown;
  mistakes?: unknown;
  setups?: unknown;
  emotions?: unknown;
  customTags?: unknown;
  tradeNote?: unknown;
  dailyJournal?: unknown;
  checklistResults?: unknown;
  psychologyStatus?: unknown;
  exitReason?: unknown;
};

function normalizeString(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function normalizeList(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.map((item) => String(item || "").trim()).filter(Boolean))
  );
}

function normalizeRating(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) {
    return null;
  }

  return parsed;
}

function firstListValue(value: string[] | undefined) {
  return value && value.length > 0 ? value[0] : null;
}

function validationResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, message: "Validation failed", errors },
    { status: 400 }
  );
}

function serializeMetadata(metadata: unknown) {
  return metadata || {
    rating: null,
    mistakes: [],
    setups: [],
    emotions: [],
    customTags: [],
    tradeNote: "",
    dailyJournal: "",
    checklistResults: [],
    psychologyStatus: "",
    exitReason: "",
  };
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const trade = await prisma.trade.findFirst({
      where: { id, userId },
      include: {
        ...journalTradeInclude,
        journalMetadata: true,
      },
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      trade: serializeJournalTrade(trade),
      metadata: serializeMetadata(trade.journalMetadata),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load journal metadata" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = (await request.json()) as MetadataPayload;
    const errors: string[] = [];
    const rating = normalizeRating(body.rating);

    if (rating === null) {
      errors.push("rating must be an integer from 1 to 5");
    }

    const mistakes = normalizeList(body.mistakes);
    const setups = normalizeList(body.setups);
    const emotions = normalizeList(body.emotions);
    const customTags = normalizeList(body.customTags);
    const checklistResults = Array.isArray(body.checklistResults)
      ? body.checklistResults
      : body.checklistResults === undefined
        ? undefined
        : [];

    if (errors.length > 0) {
      return validationResponse(errors);
    }

    const saved = await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findFirst({
        where: { id, userId },
        select: { id: true, userId: true },
      });

      if (!trade) {
        throw new Error("Journal trade not found");
      }

      const metadata = await tx.tradeJournalMetadata.upsert({
        where: { tradeId: id },
        update: {
          ...(rating !== undefined ? { rating } : {}),
          ...(mistakes !== undefined ? { mistakes } : {}),
          ...(setups !== undefined ? { setups } : {}),
          ...(emotions !== undefined ? { emotions } : {}),
          ...(customTags !== undefined ? { customTags } : {}),
          ...(body.tradeNote !== undefined ? { tradeNote: normalizeString(body.tradeNote) } : {}),
          ...(body.dailyJournal !== undefined ? { dailyJournal: normalizeString(body.dailyJournal) } : {}),
          ...(checklistResults !== undefined ? { checklistResults } : {}),
          ...(body.psychologyStatus !== undefined
            ? { psychologyStatus: normalizeString(body.psychologyStatus) }
            : {}),
          ...(body.exitReason !== undefined ? { exitReason: normalizeString(body.exitReason) } : {}),
        },
        create: {
          tradeId: id,
          userId: trade.userId,
          rating: rating ?? null,
          mistakes: mistakes ?? [],
          setups: setups ?? [],
          emotions: emotions ?? [],
          customTags: customTags ?? [],
          tradeNote: normalizeString(body.tradeNote),
          dailyJournal: normalizeString(body.dailyJournal),
          checklistResults: checklistResults ?? [],
          psychologyStatus: normalizeString(body.psychologyStatus),
          exitReason: normalizeString(body.exitReason),
        },
      });

      await tx.trade.update({
        where: { id },
        data: {
          ...(mistakes !== undefined ? { mistake: firstListValue(mistakes) } : {}),
          ...(setups !== undefined ? { setup: firstListValue(setups) } : {}),
          ...(emotions !== undefined ? { emotion: firstListValue(emotions) } : {}),
          ...(body.tradeNote !== undefined ? { notes: normalizeString(body.tradeNote) } : {}),
        },
      });

      if (customTags !== undefined) {
        await tx.tradeTag.deleteMany({ where: { tradeId: id } });

        for (const tagName of customTags) {
          const tag = await tx.tag.upsert({
            where: {
              userId_name: {
                userId: trade.userId,
                name: tagName.toLowerCase(),
              },
            },
            update: {},
            create: {
              userId: trade.userId,
              name: tagName.toLowerCase(),
            },
          });

          await tx.tradeTag.create({
            data: {
              tradeId: id,
              tagId: tag.id,
            },
          });
        }
      }

      return metadata;
    });

    return NextResponse.json({
      success: true,
      metadata: saved,
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to save journal metadata";

    return NextResponse.json(
      { success: false, message },
      { status: message === "Journal trade not found" ? 404 : 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return PUT(request, context);
}
