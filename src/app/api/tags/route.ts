import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/journal/api-utils";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const db = prisma as any;
    const tags = await db.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    });

    return apiResponse({ success: true, data: tags });
  } catch {

    return apiResponse({ success: false, message: "Failed to load tags" }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name) {
      return apiResponse(
        { success: false, message: "name is required" },
        400
      );
    }

    const db = prisma as any;
    const tag = await db.tag.create({
      data: {
        userId,
        name: String(name).trim(),
        color,
      },
    });

    return apiResponse({ success: true, data: tag }, 201);
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiResponse({ success: false, message: "Tag already exists" }, 409);
    }

    return apiResponse({ success: false, message: "Failed to create tag" }, 500);
  }
}
