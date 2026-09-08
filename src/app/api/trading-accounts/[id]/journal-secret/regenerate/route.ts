import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { getMt5JournalApiUrl } from "@/server/mt5/config";
import {
  generateJournalSecret,
  hashJournalSecret,
} from "@/server/mt5/hash-journal-secret";
import { encryptJournalSecret } from "@/server/mt5/journal-secret-vault";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;

    await assertUserCanUseJournal(user.id);

    const account = await prisma.tradingAccount.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Trading account not found" },
        { status: 404 }
      );
    }

    const secret = generateJournalSecret();

    await prisma.tradingAccount.update({
      where: { id },
      data: {
        journalSecretHash: hashJournalSecret(secret),
        journalSecretEncrypted: encryptJournalSecret(secret),
        journalEnabled: true,
      },
    });

    return NextResponse.json({
      ok: true,
      secret,
      apiUrl: getMt5JournalApiUrl(request),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }

    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }


    return NextResponse.json(
      { ok: false, error: "Failed to regenerate journal secret" },
      { status: 500 }
    );
  }
}
