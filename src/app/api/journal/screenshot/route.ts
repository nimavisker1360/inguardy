import { NextResponse } from "next/server";
import { resolveJournalUploadConnection } from "@/lib/journal/connections";
import { journalScreenshotRequestSchema } from "@/lib/journal/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function isJournalScreenshotUploadEnabled() {
  return process.env.JOURNAL_UPLOAD_ENABLED?.trim().toLowerCase() === "true";
}

function screenshotBeforeConnection(capturedAt: Date, connectedAt: Date | null) {
  return Boolean(connectedAt && capturedAt.getTime() < connectedAt.getTime());
}

export async function POST(request: Request) {
  if (!isJournalScreenshotUploadEnabled()) {
    return NextResponse.json({
      success: false,
      disabled: true,
      message: "Journal screenshot upload is disabled",
    });
  }

  try {
    const body = await request.json();
    const parsed = journalScreenshotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid journal screenshot payload",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const connection = await resolveJournalUploadConnection(parsed.data.uploadSecret);

    if (!connection) {
      return jsonError("Unauthorized", 401);
    }

    if (screenshotBeforeConnection(parsed.data.capturedAt, connection.connectedAt)) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "screenshot_before_journal_connection",
        imageUrl: null,
      });
    }

    const { uploadJournalScreenshot } = await import(
      "@/lib/journal/screenshot-service"
    );
    const { saveMt5ScreenshotToPrismaTrade } = await import(
      "@/lib/journal/prisma-trades"
    );
    const { imageUrl } = await uploadJournalScreenshot(parsed.data);
    const tradeUpdated = await saveMt5ScreenshotToPrismaTrade({
      accountNumber: parsed.data.accountNumber,
      broker: parsed.data.broker,
      serverName: parsed.data.serverName,
      positionId: parsed.data.positionId,
      type: parsed.data.type,
      imageUrl,
      userId: connection.userId,
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      tradeUpdated,
      legacyConnection: connection.legacy,
    });
  } catch (error) {
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
