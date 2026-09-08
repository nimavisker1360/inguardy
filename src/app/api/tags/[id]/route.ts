import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiResponse } from "@/lib/journal/api-utils";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { id } = await context.params;

    const db = prisma as any;
    await db.tag.delete({
      where: { id, userId },
    });

    return apiResponse({ success: true });
  } catch (error) {

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return apiResponse({ success: false, message: "Tag not found" }, 404);
    }

    return apiResponse({ success: false, message: "Failed to delete tag" }, 500);
  }
}
