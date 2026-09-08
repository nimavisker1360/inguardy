import { NextResponse } from "next/server";
import { mt5AccountHeartbeatPayloadSchema } from "@/server/mt5/schemas";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";
import { saveMt5AccountHeartbeat } from "@/server/mt5/trade-journal-service";
import {
  verifyJournalSecret,
  JournalSecretError,
} from "@/server/mt5/verify-journal-secret";

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

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeDecimal(value: unknown) {
  return value === null || value === undefined ? null : String(value);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = mt5AccountHeartbeatPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(
        "Invalid account payload",
        400,
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        }))
      );
    }

    const payload = parsed.data;
    const verified = await verifyJournalSecret(
      payload.secret,
      payload.accountNumber
    );

    await assertUserCanUseJournal(verified.userId);

    const account = await saveMt5AccountHeartbeat({
      account: verified.account,
      payload,
      shouldBindAccountNumber: verified.shouldBindAccountNumber,
    });

    return NextResponse.json({
      ok: true,
      account: {
        ...account,
        balance: serializeDecimal(account.balance),
        lastConnectedAt: serializeDate(account.lastConnectedAt),
        lastSyncAt: serializeDate(account.lastSyncAt),
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("Invalid account payload", 400);
    }

    if (error instanceof JournalSecretError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof JournalSubscriptionError) {
      return jsonError(error.message, error.status);
    }


    return jsonError("Failed to save MT5 account heartbeat", 500);
  }
}
