import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { apiError, apiJson, handleApiError } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const note = typeof body.note === "string" ? body.note.trim() : "";

    if (!note) {
      return apiError("note is required", 400);
    }

    const db = prisma as any;
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return apiError("User not found", 404);
    }

    const adminNote = await db.adminNote.create({
      data: {
        userId: id,
        adminId: admin.id,
        note,
      },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return apiJson({ success: true, adminNote }, 201);
  } catch (error) {
    return handleApiError(error, "Failed to add admin note");
  }
}
