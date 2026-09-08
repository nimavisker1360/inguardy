import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { calculateStrategyAnalytics } from "@/lib/playbooks/calculateStrategyAnalytics";
import {
  normalizePlaybookPayload,
  optionalBoolean,
  playbookStrategyInclude,
  serializePlaybookStrategy,
} from "@/lib/playbooks/api";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function validationResponse(errors: string[]) {
  return NextResponse.json(
    { success: false, message: "Validation failed", errors },
    { status: 400 }
  );
}

async function loadStrategyAnalytics(strategyId: string, userId: string) {
  const reviews = await prisma.tradeStrategyReview.findMany({
    where: { strategyId, trade: { userId } },
    include: {
      trade: true,
    },
  });

  return calculateStrategyAnalytics(
    reviews.map((review) => ({
      ...review.trade,
      strategyReview: review,
    }))
  );
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const strategy = await prisma.playbookStrategy.findFirst({
      where: { id, userId },
      include: playbookStrategyInclude,
    });

    if (!strategy) {
      return NextResponse.json(
        { success: false, message: "Playbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      playbook: serializePlaybookStrategy(strategy, await loadStrategyAnalytics(id, userId)),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load playbook" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "SET_ACTIVE") {
      const strategy = await prisma.$transaction(async (tx) => {
        const existing = await tx.playbookStrategy.findFirst({
          where: { id, userId },
          select: { id: true },
        });

        if (!existing) {
          throw new Prisma.PrismaClientKnownRequestError("Playbook not found", {
            code: "P2025",
            clientVersion: Prisma.prismaVersion.client,
          });
        }

        return tx.playbookStrategy.update({
          where: { id },
          data: { isActive: optionalBoolean(body.isActive, true) },
          include: playbookStrategyInclude,
        });
      });

      return NextResponse.json({
        success: true,
        playbook: serializePlaybookStrategy(strategy, await loadStrategyAnalytics(id, userId)),
      });
    }

    const normalized = normalizePlaybookPayload(body);
    const name = normalized.data.name;

    if (normalized.errors.length > 0 || !name) {
      return validationResponse(normalized.errors);
    }

    const strategy = await prisma.$transaction(async (tx) => {
      const existing = await tx.playbookStrategy.findFirst({
        where: { id, userId },
        select: { id: true },
      });

      if (!existing) {
        throw new Prisma.PrismaClientKnownRequestError("Playbook not found", {
          code: "P2025",
          clientVersion: Prisma.prismaVersion.client,
        });
      }

      await tx.playbookChecklistLink.deleteMany({
        where: { strategyId: id },
      });
      await tx.playbookRule.deleteMany({
        where: { strategyId: id },
      });
      await tx.playbookChecklistItem.deleteMany({
        where: { strategyId: id },
      });

      return tx.playbookStrategy.update({
        where: { id },
        data: {
          name,
          description: normalized.data.description,
          marketType: normalized.data.marketType,
          symbols: normalized.data.symbols,
          timeframes: normalized.data.timeframes,
          direction: normalized.data.direction,
          riskPerTrade: normalized.data.riskPerTrade,
          minRiskReward: normalized.data.minRiskReward,
          entryRules: normalized.data.entryRules,
          exitRules: normalized.data.exitRules,
          riskRules: normalized.data.riskRules,
          setupRules: normalized.data.setupRules,
          managementRules: normalized.data.managementRules,
          psychologyRules: normalized.data.psychologyRules,
          sessionFilter: normalized.data.sessionFilter,
          newsFilter: normalized.data.newsFilter,
          htfBias: normalized.data.htfBias,
          exampleWinningTrade: normalized.data.exampleWinningTrade,
          exampleLosingTrade: normalized.data.exampleLosingTrade,
          tags: normalized.data.tags,
          isActive: normalized.data.isActive,
          rules: {
            create: normalized.data.rules.map((rule, index) => ({
              title: rule.title,
              description: rule.description,
              section: rule.section,
              isRequired: rule.isRequired,
              sortOrder: rule.sortOrder ?? index,
            })),
          },
          checklistItems: {
            create: normalized.data.checklistItems.map((item, index) => ({
              title: item.title,
              description: item.description,
              isRequired: item.isRequired,
              sortOrder: item.sortOrder ?? index,
            })),
          },
          checklistLinks: {
            create: normalized.data.checklistTemplateIds.map((checklistTemplateId) => ({
              checklistTemplateId,
            })),
          },
        },
        include: playbookStrategyInclude,
      });
    });

    return NextResponse.json({
      success: true,
      playbook: serializePlaybookStrategy(strategy, await loadStrategyAnalytics(id, userId)),
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Playbook not found" },
        { status: 404 }
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return validationResponse(["One or more checklist templates do not exist"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to update playbook" },
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

    const { id } = await context.params;
    const existing = await prisma.playbookStrategy.findFirst({
      where: { id, userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Playbook not found" },
        { status: 404 }
      );
    }

    const reviewCount = await prisma.tradeStrategyReview.count({
      where: { strategyId: id, trade: { userId } },
    });

    if (reviewCount > 0) {
      const strategy = await prisma.playbookStrategy.update({
        where: { id },
        data: { isActive: false },
        include: playbookStrategyInclude,
      });

      return NextResponse.json({
        success: true,
        message: "Playbook is used by trades and was disabled",
        playbook: serializePlaybookStrategy(strategy, await loadStrategyAnalytics(id, userId)),
      });
    }

    await prisma.playbookStrategy.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Playbook deleted",
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json(
        { success: false, message: "Playbook not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to delete playbook" },
      { status: 500 }
    );
  }
}
