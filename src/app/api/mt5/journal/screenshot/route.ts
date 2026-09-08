import { NextResponse } from "next/server";
import { journalScreenshotRequestSchema } from "@/lib/journal/validators";
import { uploadJournalScreenshot } from "@/lib/journal/screenshot-service";
import prisma from "@/lib/prisma";
import {
  storePendingMt5Screenshot,
  toScreenshotType,
  upsertTradeScreenshot,
} from "@/server/mt5/pending-screenshots";
import { verifyJournalSecret, JournalSecretError } from "@/server/mt5/verify-journal-secret";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = journalScreenshotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        "Invalid payload",
        400,
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }))
      );
    }

    const verified = await verifyJournalSecret(
      parsed.data.uploadSecret,
      parsed.data.accountNumber
    );
    const trade = await prisma.trade.findFirst({
      where: {
        accountId: verified.account.id,
        OR: [
          { mt5Ticket: parsed.data.positionId },
          { mt5Ticket: parsed.data.dealTicket },
          { setup: `MT5:${parsed.data.positionId}` },
          { setup: `MT5:${parsed.data.dealTicket}` },
        ],
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const upload = await uploadJournalScreenshot(parsed.data);
    const type = toScreenshotType(parsed.data.type);

    if (!trade) {
      await storePendingMt5Screenshot(prisma as any, {
        userId: verified.userId,
        accountId: verified.account.id,
        positionId: parsed.data.positionId,
        type,
        url: upload.imageUrl,
      });

      return NextResponse.json(
        {
          ok: true,
          imageUrl: upload.imageUrl,
          tradeUpdated: false,
          pending: true,
          storage: upload.storage,
        },
        { status: 202 }
      );
    }

    await upsertTradeScreenshot(prisma as any, {
      tradeId: trade.id,
      userId: trade.userId,
      type,
      url: upload.imageUrl,
    });

    return NextResponse.json({
      ok: true,
      imageUrl: upload.imageUrl,
      tradeUpdated: true,
      storage: upload.storage,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("Invalid payload", 400);
    }

    if (error instanceof JournalSecretError) {
      return jsonError(error.message, error.status);
    }

    const message =
      error instanceof Error ? error.message : "Failed to upload screenshot";
    const isValidationError =
      message.includes("base64") ||
      message.includes("PNG") ||
      message.includes("empty") ||
      message.includes("too large");

    if (!isValidationError) {
    }

    return jsonError(
      isValidationError ? message : "Failed to upload screenshot",
      isValidationError ? 400 : 500
    );
  }
}
