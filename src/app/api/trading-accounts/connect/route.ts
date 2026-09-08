import { Mt5DirectConnectionStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { accountSelect, serializeAccount } from "@/lib/dashboard-data";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { encryptMt5Credential } from "@/server/mt5-direct/credential-vault";
import { Mt5BridgeError } from "@/server/mt5-direct/python-bridge";
import { testMt5Credentials } from "@/server/mt5-direct/sync-service";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EARLIEST_HISTORY_DATE = new Date("2000-01-01T00:00:00.000Z");

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function historyStart(body: Record<string, unknown>) {
  if (body.historyMode === "new") {
    return new Date();
  }

  if (body.historyMode === "from") {
    const parsed = new Date(textValue(body.historyFrom));
    if (!Number.isNaN(parsed.getTime()) && parsed >= EARLIEST_HISTORY_DATE && parsed <= new Date()) {
      return parsed;
    }
  }

  return EARLIEST_HISTORY_DATE;
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await assertUserCanUseJournal(user.id);

    const body = (await request.json()) as Record<string, unknown>;
    const server = textValue(body.server);
    const login = textValue(body.login);
    const password = typeof body.password === "string" ? body.password : "";
    const requestedAccountId = textValue(body.accountId) || null;

    if (!server || server.length > 160) {
      return NextResponse.json(
        { success: false, message: "A valid MT5 broker server is required" },
        { status: 400 }
      );
    }
    if (!/^\d{3,20}$/.test(login)) {
      return NextResponse.json(
        { success: false, message: "A valid numeric MT5 login is required" },
        { status: 400 }
      );
    }
    if (!password || password.length > 512) {
      return NextResponse.json(
        { success: false, message: "The MT5 investor password is required" },
        { status: 400 }
      );
    }

    const [snapshot, existingConnection, requestedAccount] = await Promise.all([
      testMt5Credentials({ server, login, password }),
      prisma.mt5DirectConnection.findUnique({
        where: { userId_server_login: { userId: user.id, server, login } },
        select: { id: true, accountId: true },
      }),
      requestedAccountId
        ? prisma.tradingAccount.findFirst({
            where: { id: requestedAccountId, userId: user.id },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (requestedAccountId && !requestedAccount) {
      return NextResponse.json(
        { success: false, message: "Trading account not found" },
        { status: 404 }
      );
    }
    if (
      requestedAccountId &&
      existingConnection &&
      existingConnection.accountId !== requestedAccountId
    ) {
      return NextResponse.json(
        { success: false, message: "This MT5 login is already connected" },
        { status: 409 }
      );
    }
    if (String(snapshot.account.login) !== login) {
      return NextResponse.json(
        { success: false, message: "MT5 returned a different account login" },
        { status: 422 }
      );
    }

    const credentialEncrypted = encryptMt5Credential(password);
    const startAt = historyStart(body);
    const connectedAt = new Date();
    const account = await prisma.$transaction(async (tx) => {
      let accountId = existingConnection?.accountId || requestedAccount?.id;

      if (!accountId) {
        const created = await tx.tradingAccount.create({
          data: {
            userId: user.id,
            name: snapshot.account.name || `MT5 ${login}`,
            broker: snapshot.account.company || server,
            platform: "MT5",
            currency: snapshot.account.currency || "USD",
            balance:
              snapshot.account.balance === undefined
                ? null
                : new Prisma.Decimal(snapshot.account.balance),
            mt5AccountNumber: login,
            ingestionMode: "DIRECT_MT5",
            journalEnabled: false,
            lastConnectedAt: connectedAt,
          },
          select: { id: true },
        });
        accountId = created.id;
      } else {
        await tx.tradingAccount.update({
          where: { id: accountId },
          data: {
            name: snapshot.account.name || undefined,
            broker: snapshot.account.company || server,
            platform: "MT5",
            currency: snapshot.account.currency || undefined,
            balance:
              snapshot.account.balance === undefined
                ? undefined
                : new Prisma.Decimal(snapshot.account.balance),
            mt5AccountNumber: login,
            ingestionMode: "DIRECT_MT5",
            journalEnabled: false,
            lastConnectedAt: connectedAt,
          },
        });
      }

      if (existingConnection) {
        await tx.mt5DirectConnection.update({
          where: { id: existingConnection.id },
          data: {
            credentialEncrypted,
            enabled: true,
            status: Mt5DirectConnectionStatus.INITIAL_SYNC,
            historyStartAt: startAt,
            cursorAt: null,
            lastError: null,
            leaseOwner: null,
            leaseUntil: null,
            lastConnectedAt: connectedAt,
          },
        });
      } else {
        await tx.mt5DirectConnection.create({
          data: {
            userId: user.id,
            accountId,
            server,
            login,
            credentialEncrypted,
            status: Mt5DirectConnectionStatus.INITIAL_SYNC,
            historyStartAt: startAt,
            lastConnectedAt: connectedAt,
          },
        });
      }

      return tx.tradingAccount.findUniqueOrThrow({
        where: { id: accountId },
        select: accountSelect,
      });
    });

    return NextResponse.json(
      { success: true, data: serializeAccount(account) },
      { status: existingConnection ? 200 : 201 }
    );
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof Mt5BridgeError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: 422 }
      );
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, message: "This MT5 account is already connected" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Failed to save the MT5 connection" },
      { status: 500 }
    );
  }
}
