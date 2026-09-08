import { Prisma, TradeLockerConnectionStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { assertUserCanUseJournal, JournalSubscriptionError } from "@/server/mt5/subscription-service";
import { getTradeLockerAccounts, refreshTradeLockerToken, safeTradeLockerMessage } from "@/server/tradelocker/client";
import { selectTradeLockerAccountSchema, tradeLockerEnvironmentSchema } from "@/server/tradelocker/schemas";
import { acquireTradeLockerConnectionLease, releaseTradeLockerConnectionLease, synchronizeTradeLockerConnection } from "@/server/tradelocker/sync-service";
import { decryptTradeLockerToken, encryptTradeLockerToken, jwtExpiration } from "@/server/tradelocker/token-vault";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const EARLIEST_HISTORY_DATE = new Date("2000-01-01T00:00:00.000Z");

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await assertUserCanUseJournal(user.id);
    const input = selectTradeLockerAccountSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json({ success: false, message: "Invalid TradeLocker account selection." }, { status: 400 });
    }
    const authSession = await prisma.tradeLockerAuthSession.findFirst({
      where: { id: input.data.sessionId, userId: user.id, expiresAt: { gt: new Date() } },
    });
    if (!authSession) {
      return NextResponse.json({ success: false, message: "The TradeLocker connection session expired. Please sign in again." }, { status: 410 });
    }

    const environment = tradeLockerEnvironmentSchema.parse(authSession.environment);
    let accessToken = decryptTradeLockerToken(authSession.accessTokenEncrypted);
    let refreshToken = decryptTradeLockerToken(authSession.refreshTokenEncrypted);
    if (!accessToken || !refreshToken) throw new Error("TradeLocker authorization session is unavailable");
    let accessTokenExpiresAt = authSession.accessTokenExpiresAt;
    let refreshTokenExpiresAt = authSession.refreshTokenExpiresAt;
    if (accessTokenExpiresAt.getTime() <= Date.now() + 30_000) {
      const tokens = await refreshTradeLockerToken({ environment, refreshToken });
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      accessTokenExpiresAt = new Date(tokens.expireDate);
      refreshTokenExpiresAt = jwtExpiration(tokens.refreshToken);
    }

    const available = await getTradeLockerAccounts(environment, accessToken);
    const selected = available.accounts.find((account) => account.id === input.data.accountId);
    if (!selected) {
      return NextResponse.json({ success: false, message: "The selected TradeLocker account is no longer available." }, { status: 404 });
    }
    const alreadyConnected = await prisma.tradeLockerConnection.findUnique({
      where: {
        userId_environment_server_tradeLockerAccountId: {
          userId: user.id,
          environment,
          server: authSession.server,
          tradeLockerAccountId: selected.id,
        },
      },
    });
    if (
      alreadyConnected?.enabled &&
      (alreadyConnected.status === TradeLockerConnectionStatus.CONNECTED ||
        alreadyConnected.status === TradeLockerConnectionStatus.SYNCING)
    ) {
      return NextResponse.json({ success: false, message: "This TradeLocker account is already connected." }, { status: 409 });
    }

    const connectedAt = new Date();
    const connection = await prisma.$transaction(async (tx) => {
      let accountId = alreadyConnected?.accountId;
      if (!accountId) {
        accountId = (await tx.tradingAccount.create({
          data: {
            userId: user.id,
            name: selected.name || `TradeLocker ${selected.id}`,
            broker: authSession.server,
            platform: "TradeLocker",
            currency: selected.currency || "USD",
            balance: Number.isFinite(selected.aaccountBalance) ? new Prisma.Decimal(selected.aaccountBalance!) : null,
            tradeLockerAccountId: selected.id,
            ingestionMode: "DIRECT_TRADELOCKER",
            journalEnabled: false,
            lastConnectedAt: connectedAt,
          },
          select: { id: true },
        })).id;
      } else {
        await tx.tradingAccount.update({
          where: { id: accountId },
          data: {
            name: selected.name || undefined,
            broker: authSession.server,
            platform: "TradeLocker",
            currency: selected.currency || undefined,
            tradeLockerAccountId: selected.id,
            ingestionMode: "DIRECT_TRADELOCKER",
            lastConnectedAt: connectedAt,
          },
        });
      }

      const tokenData = {
        accNum: selected.accNum,
        accountName: selected.name,
        accountStatus: selected.status || null,
        email: authSession.email,
        accessTokenEncrypted: encryptTradeLockerToken(accessToken),
        refreshTokenEncrypted: encryptTradeLockerToken(refreshToken),
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        enabled: true,
        status: TradeLockerConnectionStatus.SYNCING,
        historyStartAt: EARLIEST_HISTORY_DATE,
        cursorAt: alreadyConnected ? alreadyConnected.cursorAt : null,
        lastConnectedAt: connectedAt,
        lastError: null,
        leaseOwner: null,
        leaseUntil: null,
        tokenRefreshOwner: null,
        tokenRefreshUntil: null,
        tokenVersion: { increment: 1 } as const,
      };
      const saved = alreadyConnected
        ? await tx.tradeLockerConnection.update({ where: { id: alreadyConnected.id }, data: tokenData })
        : await tx.tradeLockerConnection.create({
            data: {
              userId: user.id,
              accountId,
              environment,
              server: authSession.server,
              tradeLockerAccountId: selected.id,
              ...tokenData,
              tokenVersion: 1,
            },
          });
      await tx.tradeLockerAuthSession.delete({ where: { id: authSession.id } });
      return saved;
    }, { timeout: 30_000 });

    const owner = `initial:${user.id}:${crypto.randomUUID()}`;
    let initialSync = false;
    let message = "TradeLocker account connected.";
    if (await acquireTradeLockerConnectionLease(connection.id, owner)) {
      try {
        await synchronizeTradeLockerConnection(connection.id);
        initialSync = true;
      } catch {
        message = "TradeLocker account connected. Initial synchronization will retry automatically.";
      } finally {
        await releaseTradeLockerConnectionLease(connection.id, owner);
      }
    }

    return NextResponse.json({
      success: true,
      message,
      data: { accountId: connection.accountId, connectionId: connection.id, initialSync },
    }, { status: 201 });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ success: false, message: "This TradeLocker account is already connected." }, { status: 409 });
    }
    return NextResponse.json({ success: false, message: safeTradeLockerMessage(error) }, { status: 422 });
  }
}
