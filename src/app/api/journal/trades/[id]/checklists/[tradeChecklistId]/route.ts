import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  inferChecklistItemSection,
  progressFromAnswers,
  serializeTradeChecklist,
  tradeChecklistInclude,
} from "@/lib/checklists/api";
import { recalculateTradeChecklist } from "@/lib/checklists/trade-checklists";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { loadTradeRequirements } from "@/lib/journal/review-requirements";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string; tradeChecklistId: string }>;
};

function optionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
}

function optionalBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function validationResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, message: "Validation failed", errors },
    { status: 400 }
  );
}

async function loadSerializedTrade(userId: string, id: string) {
  const trade = await prisma.trade.findFirst({
    where: { id, userId },
    include: journalTradeInclude,
  });

  return trade ? serializeJournalTrade(trade) : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id, tradeChecklistId } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const refreshFromTemplate = optionalBoolean(body.refreshFromTemplate, false);

    if (refreshFromTemplate) {
      const checklist = await prisma.$transaction(async (tx) => {
        const existing = await tx.tradeChecklist.findFirst({
          where: {
            id: tradeChecklistId,
            tradeId: id,
            trade: { userId },
          },
          select: {
            id: true,
            checklistTemplateId: true,
          },
        });

        if (!existing) {
          throw new Error("Trade checklist not found");
        }

        if (!existing.checklistTemplateId) {
          throw new Error("Checklist template is not available");
        }

        const template = await tx.checklistTemplate.findFirst({
          where: {
            id: existing.checklistTemplateId,
          },
          include: {
            items: {
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
          },
        });

        if (!template || template.items.length === 0) {
          throw new Error("Checklist template is not available");
        }

        const progress = progressFromAnswers(
          template.items.map((item) => ({
            checked: false,
            isRequiredSnapshot: item.isRequired,
            isCriticalSnapshot: item.isCritical,
          }))
        );

        await tx.tradeChecklistAnswer.deleteMany({
          where: { tradeChecklistId },
        });

        return tx.tradeChecklist.update({
          where: { id: tradeChecklistId },
          data: {
            titleSnapshot: template.title,
            categorySnapshot: template.category,
            ...progress,
            answers: {
              create: template.items.map((item) => ({
                checklistItemId: item.id,
                titleSnapshot: item.title,
                descriptionSnapshot: item.description,
                sectionSnapshot:
                  item.section || inferChecklistItemSection(item.title, template.category),
                isRequiredSnapshot: item.isRequired,
                isCriticalSnapshot: item.isCritical,
                sortOrder: item.sortOrder,
              })),
            },
          },
          include: tradeChecklistInclude,
        });
      });

      return NextResponse.json({
        success: true,
        checklist: serializeTradeChecklist(checklist),
        trade: await loadSerializedTrade(userId, id),
      });
    }

    const answers = Array.isArray(body.answers) ? body.answers : [];

    if (answers.length === 0) {
      return validationResponse(["answers must include at least one item"]);
    }

    const checklist = await prisma.$transaction(async (tx) => {
      const existing = await tx.tradeChecklist.findFirst({
        where: {
          id: tradeChecklistId,
          tradeId: id,
          trade: { userId },
        },
        select: { id: true },
      });

      if (!existing) {
        throw new Error("Trade checklist not found");
      }

      for (const rawAnswer of answers) {
        const answer =
          rawAnswer && typeof rawAnswer === "object"
            ? (rawAnswer as Record<string, unknown>)
            : {};
        const answerId = optionalString(answer.id);

        if (!answerId) {
          continue;
        }

        const data: { checked?: boolean; note?: string | null; answeredAt?: Date } = {};

        if (answer.checked !== undefined) {
          data.checked = optionalBoolean(answer.checked, false);
          data.answeredAt = new Date();
        }

        if (answer.note !== undefined) {
          data.note = optionalString(answer.note);
        }

        if (Object.keys(data).length === 0) {
          continue;
        }

        await tx.tradeChecklistAnswer.updateMany({
          where: {
            id: answerId,
            tradeChecklistId,
          },
          data,
        });
      }

      const checklist = await recalculateTradeChecklist(tx, tradeChecklistId);
      const loaded = await loadTradeRequirements(tx, userId, id);

      if (loaded?.requirements.readyToTrade) {
        await tx.trade.update({
          where: { id },
          data: { checklistCompletedAt: new Date() },
        });
      }

      return checklist;
    });

    return NextResponse.json({
      success: true,
      checklist: serializeTradeChecklist(checklist),
      trade: await loadSerializedTrade(userId, id),
    });
  } catch (error) {

    const message = error instanceof Error ? error.message : "";

    if (
      message === "Trade checklist not found" ||
      message === "Checklist template is not available" ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025")
    ) {
      return NextResponse.json(
        { success: false, message },
        { status: message === "Trade checklist not found" ? 404 : 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to update trade checklist" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id, tradeChecklistId } = await context.params;
    const deleted = await prisma.tradeChecklist.deleteMany({
      where: {
        id: tradeChecklistId,
        tradeId: id,
        trade: { userId },
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, message: "Trade checklist not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trade checklist removed",
      trade: await loadSerializedTrade(userId, id),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to remove trade checklist" },
      { status: 500 }
    );
  }
}
