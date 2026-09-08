import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeTradeChecklist, tradeChecklistInclude } from "@/lib/checklists/api";
import { attachChecklistTemplateToTrade } from "@/lib/checklists/trade-checklists";
import { journalTradeInclude, serializeJournalTrade } from "@/lib/journal/prisma-trades";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function optionalString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  return text ? text : null;
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

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const trade = await prisma.trade.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    const checklists = await prisma.tradeChecklist.findMany({
      where: { tradeId: id },
      include: tradeChecklistInclude,
      orderBy: [{ createdAt: "asc" }],
    });

    return NextResponse.json({
      success: true,
      checklists: checklists.map(serializeTradeChecklist),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load trade checklists" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "checklists");

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const checklistTemplateId = optionalString(
      body.checklistTemplateId ?? body.templateId
    );

    if (!checklistTemplateId) {
      return validationResponse(["checklistTemplateId is required"]);
    }

    const trade = await prisma.trade.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!trade) {
      return NextResponse.json(
        { success: false, message: "Journal trade not found" },
        { status: 404 }
      );
    }

    const checklist = await prisma.$transaction((tx) =>
      attachChecklistTemplateToTrade(tx, {
        tradeId: id,
        checklistTemplateId,
      })
    );

    return NextResponse.json(
      {
        success: true,
        checklist: serializeTradeChecklist(checklist),
        trade: await loadSerializedTrade(userId, id),
      },
      { status: 201 }
    );
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    const message = error instanceof Error ? error.message : "";
    const status =
      message === "Journal trade not found" ||
      message === "Checklist template not found"
        ? 404
        : message === "Checklist template is already attached to this trade"
          ? 409
          : 500;

    if (status !== 500) {
      return NextResponse.json({ success: false, message }, { status });
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return validationResponse(["Checklist relation is invalid"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to attach checklist" },
      { status: 500 }
    );
  }
}
