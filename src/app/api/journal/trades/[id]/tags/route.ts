import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function normalizeTags(value: unknown) {
  const rawTags = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  return Array.from(
    new Set(
      rawTags
        .map((tag) => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
      select: {
        id: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!trade) {
      return NextResponse.json(
        {
          success: false,
          message: "Journal trade not found",
          error: `No Trade found for id ${id}`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tags: trade.tags.map((tradeTag) => tradeTag.tag.name),
    });
  } catch (error) {

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load tags",
        error: errorMessage(error),
      },
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

    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;
    const tagNames = normalizeTags(body.tags);

    const savedTags = await prisma.$transaction(async (tx) => {
      const trade = await tx.trade.findFirst({
        where: { id, userId },
        select: { id: true, userId: true },
      });

      if (!trade) {
        throw new Error(`No Trade found for id ${id}`);
      }

      await tx.tradeTag.deleteMany({
        where: { tradeId: trade.id },
      });

      const tags: string[] = [];

      for (const name of tagNames) {
        const tag = await tx.tag.upsert({
          where: {
            userId_name: {
              userId: trade.userId,
              name,
            },
          },
          update: {},
          create: {
            userId: trade.userId,
            name,
          },
        });

        await tx.tradeTag.create({
          data: {
            tradeId: trade.id,
            tagId: tag.id,
          },
        });

        tags.push(tag.name);
      }

      return tags;
    });

    return NextResponse.json({
      success: true,
      tags: savedTags,
    });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to update tags",
          error: "Duplicate trade-tag relation",
        },
        { status: 409 }
      );
    }

    const message = errorMessage(error);
    const status = message.startsWith("No Trade found") ? 404 : 500;

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update tags",
        error: message,
      },
      { status }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  return POST(request, context);
}
