import { NextResponse } from "next/server";
import { resolveJournalUploadConnection } from "@/lib/journal/connections";
import { journalEventRequestSchema } from "@/lib/journal/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function isJournalEventIngestionEnabled() {
  return process.env.JOURNAL_ENABLED?.trim().toLowerCase() === "true";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientPrismaConnectionError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as { code?: unknown; message?: unknown };
  const code = String(maybeError.code || "");
  const message = String(maybeError.message || "");

  return (
    code === "P1001" ||
    code === "P1008" ||
    code === "P1017" ||
    message.includes("Can't reach database server") ||
    message.includes("Timed out fetching a new connection")
  );
}

function eventStartedBeforeConnection(
  event: { eventTime: Date; openTime?: Date | null },
  connectedAt: Date | null
) {
  if (!connectedAt) {
    return false;
  }

  const eventStart = event.openTime || event.eventTime;

  return eventStart.getTime() < connectedAt.getTime();
}

export async function POST(request: Request) {
  if (!isJournalEventIngestionEnabled()) {
    return NextResponse.json({
      success: false,
      disabled: true,
      message: "Journal is disabled",
    });
  }

  try {
    const body = await request.json();
    const parsed = journalEventRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid journal event payload",
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

    if (eventStartedBeforeConnection(parsed.data.event, connection.connectedAt)) {
      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "event_before_journal_connection",
      });
    }

    const { processJournalEventPrisma } = await import(
      "@/lib/journal/prisma-trades"
    );
    const input = {
      account: parsed.data.account,
      event: parsed.data.event,
    };
    const retryDelays = [750, 1500, 3000];
    let lastError: unknown;

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const result = await processJournalEventPrisma(input, connection.userId);

        return NextResponse.json({ ...result, legacyConnection: connection.legacy });
      } catch (error) {
        lastError = error;

        if (
          attempt >= retryDelays.length ||
          !isTransientPrismaConnectionError(error)
        ) {
          break;
        }


        await wait(retryDelays[attempt]);
      }
    }

    throw lastError;
  } catch (error) {

    return jsonError(
      isTransientPrismaConnectionError(error)
        ? "Database temporarily unavailable"
        : "Failed to process journal event",
      isTransientPrismaConnectionError(error) ? 503 : 500
    );
  }
}
