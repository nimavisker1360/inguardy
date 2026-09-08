import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { journalPsychologySchema } from "@/lib/journal/validators";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function psychologyStatus(followedPlan: boolean | "partially" | null) {
  if (followedPlan === true) {
    return "followed_plan";
  }

  if (followedPlan === false) {
    return "broke_plan";
  }

  if (followedPlan === "partially") {
    return "partially_followed_plan";
  }

  return null;
}

function listValue(value: string | null) {
  return value ? [value] : [];
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = await request.json();
    const parsed = journalPsychologySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid psychology payload",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const psychology = parsed.data;
    const saved = await prisma.$transaction(async (tx) => {
      const existingTrade = await tx.trade.findFirst({
        where: { id, userId },
        select: { id: true, userId: true },
      });

      if (!existingTrade) {
        throw new Prisma.PrismaClientKnownRequestError("Journal trade not found", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      await tx.tradeJournalMetadata.upsert({
        where: { tradeId: id },
        update: {
          rating: psychology.confidenceScore,
          mistakes: listValue(psychology.mistakeTag),
          setups: listValue(psychology.entryReason),
          emotions: listValue(psychology.emotionAfter || psychology.emotionBefore),
          psychologyNote: psychology.personalNote,
          lessonLearned: psychology.lessonLearned,
          psychologyStatus: psychologyStatus(psychology.followedPlan),
        },
        create: {
          tradeId: id,
          userId: existingTrade.userId,
          rating: psychology.confidenceScore,
          mistakes: listValue(psychology.mistakeTag),
          setups: listValue(psychology.entryReason),
          emotions: listValue(psychology.emotionAfter || psychology.emotionBefore),
          customTags: [],
          tradeNote: null,
          psychologyNote: psychology.personalNote,
          lessonLearned: psychology.lessonLearned,
          dailyJournal: null,
          checklistResults: [],
          psychologyStatus: psychologyStatus(psychology.followedPlan),
          exitReason: null,
        },
      });

      return tx.trade.update({
        where: { id },
        data: {
          emotion: psychology.emotionAfter || psychology.emotionBefore,
          mistake: psychology.mistakeTag,
          setup: psychology.entryReason,
          psychologyReviewCompletedAt: new Date(),
        },
        include: journalTradeInclude,
      });
    });

    return NextResponse.json({ success: true, trade: serializeJournalTrade(saved) });
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

    return NextResponse.json(
      { success: false, message: "Failed to update psychology" },
      { status: 500 }
    );
  }
}
