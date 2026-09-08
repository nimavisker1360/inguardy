import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { calculateStrategyAnalytics } from "@/lib/playbooks/calculateStrategyAnalytics";
import {
  normalizePlaybookPayload,
  playbookStrategyInclude,
  serializePlaybookStrategy,
} from "@/lib/playbooks/api";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireFeatureAccess, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

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

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const active = searchParams.get("active");
    const where: Prisma.PlaybookStrategyWhereInput = {
      userId,
      ...(active === "true" ? { isActive: true } : {}),
      ...(active === "false" ? { isActive: false } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { symbols: { contains: search, mode: "insensitive" } },
              { tags: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const strategies = await prisma.playbookStrategy.findMany({
      where,
      include: playbookStrategyInclude,
      orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    });
    const analytics = await Promise.all(
      strategies.map((strategy) => loadStrategyAnalytics(strategy.id, userId))
    );

    return NextResponse.json({
      success: true,
      playbooks: strategies.map((strategy, index) =>
        serializePlaybookStrategy(strategy, analytics[index])
      ),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load playbooks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "playbooks");

    const body = (await request.json()) as Record<string, unknown>;
    const normalized = normalizePlaybookPayload(body);
    const name = normalized.data.name;

    if (normalized.errors.length > 0 || !name) {
      return validationResponse(normalized.errors);
    }

    const strategy = await prisma.playbookStrategy.create({
      data: {
        userId,
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

    return NextResponse.json(
      {
        success: true,
        playbook: serializePlaybookStrategy(strategy, calculateStrategyAnalytics([])),
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
      return validationResponse(["One or more checklist templates do not exist"]);
    }

    return NextResponse.json(
      { success: false, message: "Failed to create playbook" },
      { status: 500 }
    );
  }
}
