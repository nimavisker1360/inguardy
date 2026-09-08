import { NextResponse } from "next/server";
import { mt5JournalPayloadSchema } from "@/server/mt5/schemas";
import { assertUserCanUseJournal, JournalSubscriptionError } from "@/server/mt5/subscription-service";
import { saveMt5JournalTrade, Mt5TradeJournalError } from "@/server/mt5/trade-journal-service";
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
    const parsed = mt5JournalPayloadSchema.safeParse(body);

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

    const payload = parsed.data;
    const verified = await verifyJournalSecret(
      payload.secret,
      payload.accountNumber
    );

    await assertUserCanUseJournal(verified.userId);

    const trade = await saveMt5JournalTrade({
      account: verified.account,
      payload,
      shouldBindAccountNumber: verified.shouldBindAccountNumber,
    });

    return NextResponse.json({
      ok: true,
      message: "Trade saved successfully",
      id: trade.id,
      ticket: trade.mt5Ticket,
      symbol: trade.symbol,
      side: trade.direction,
      status: trade.status,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return jsonError("Invalid payload", 400);
    }

    if (error instanceof JournalSecretError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof JournalSubscriptionError) {
      return jsonError(error.message, error.status);
    }

    if (error instanceof Mt5TradeJournalError) {
      return jsonError(error.message, error.status);
    }

    return jsonError("Failed to save trade", 500);
  }
}
