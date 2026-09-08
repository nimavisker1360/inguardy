import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { getMt5JournalApiUrl } from "@/server/mt5/config";
import { decryptJournalSecret } from "@/server/mt5/journal-secret-vault";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  journalEnabled: z.boolean().optional(),
  mt5AccountNumber: z
    .preprocess((value) => {
      if (value === undefined || value === null) {
        return undefined;
      }

      const text = String(value).trim();
      return text || null;
    }, z.string().nullable().optional()),
});

function serializeDate(value: Date | null) {
  return value ? value.toISOString() : null;
}

function serializeConfig(account: {
  id: string;
  name: string;
  mt5AccountNumber: string | null;
  journalEnabled: boolean;
  journalSecretHash: string | null;
  journalSecretEncrypted: string | null;
  lastConnectedAt: Date | null;
  lastSyncAt: Date | null;
}, request?: Request) {
  const secret = decryptJournalSecret(account.journalSecretEncrypted);

  return {
    apiUrl: getMt5JournalApiUrl(request),
    journalEnabled: account.journalEnabled,
    hasSecret: Boolean(account.journalSecretHash),
    secret,
    account: {
      id: account.id,
      name: account.name,
      mt5AccountNumber: account.mt5AccountNumber,
    },
    lastConnectedAt: serializeDate(account.lastConnectedAt),
    lastSyncAt: serializeDate(account.lastSyncAt),
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const account = await prisma.tradingAccount.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        name: true,
        mt5AccountNumber: true,
        journalEnabled: true,
        journalSecretHash: true,
        journalSecretEncrypted: true,
        lastConnectedAt: true,
        lastSyncAt: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { ok: false, error: "Trading account not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      ...serializeConfig(account, request),
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);

    if (authResponse) {
      return authResponse;
    }


    return NextResponse.json(
      { ok: false, error: "Failed to load journal config" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const parsed = patchSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid payload",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const existing = await prisma.tradingAccount.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { ok: false, error: "Trading account not found" },
        { status: 404 }
      );
    }

    if (parsed.data.journalEnabled === true) {
      await assertUserCanUseJournal(user.id);
    }

    const account = await prisma.tradingAccount.update({
      where: { id },
      data: {
        ...(parsed.data.journalEnabled !== undefined
          ? { journalEnabled: parsed.data.journalEnabled }
          : {}),
        ...(parsed.data.mt5AccountNumber !== undefined
          ? { mt5AccountNumber: parsed.data.mt5AccountNumber }
          : {}),
      },
      select: {
        id: true,
        name: true,
        mt5AccountNumber: true,
        journalEnabled: true,
        journalSecretHash: true,
        journalSecretEncrypted: true,
        lastConnectedAt: true,
        lastSyncAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      ...serializeConfig(account, request),
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
      { ok: false, error: "Failed to update journal config" },
      { status: 500 }
    );
  }
}
