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

const QUICK_CONNECT_ACCOUNT_NAME = "MT5 Auto Connect";

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    await assertUserCanUseJournal(user.id);

    const secret = generateJournalSecret();
    const secretData = {
      journalEnabled: true,
      journalSecretHash: hashJournalSecret(secret),
      journalSecretEncrypted: encryptJournalSecret(secret),
    };

    const existingAccount = await prisma.tradingAccount.findFirst({
      where: {
        userId: user.id,
        name: QUICK_CONNECT_ACCOUNT_NAME,
        mt5AccountNumber: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    const account = existingAccount
      ? await prisma.tradingAccount.update({
          where: { id: existingAccount.id },
          data: secretData,
          select: {
            id: true,
            name: true,
          },
        })
      : await prisma.tradingAccount.create({
          data: {
            userId: user.id,
            name: QUICK_CONNECT_ACCOUNT_NAME,
            broker: null,
            platform: "MT5",
            currency: "USD",
            ...secretData,
          },
          select: {
            id: true,
            name: true,
          },
        });

    return NextResponse.json(
      {
        ok: true,
        account,
        secret,
        apiUrl: getMt5JournalApiUrl(request),
      },
      { status: 201 }
    );
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
      { ok: false, error: "Failed to create MT5 quick connection" },
      { status: 500 }
    );
  }
}
