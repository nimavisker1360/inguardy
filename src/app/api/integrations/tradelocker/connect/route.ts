import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { assertUserCanUseJournal, JournalSubscriptionError } from "@/server/mt5/subscription-service";
import { authenticateTradeLocker, getTradeLockerAccounts, safeTradeLockerMessage } from "@/server/tradelocker/client";
import { connectTradeLockerSchema } from "@/server/tradelocker/schemas";
import { encryptTradeLockerToken, jwtExpiration } from "@/server/tradelocker/token-vault";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await assertUserCanUseJournal(user.id);
    const input = connectTradeLockerSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid environment, server, email, and password." },
        { status: 400 }
      );
    }

    const tokens = await authenticateTradeLocker(input.data);
    const accounts = await getTradeLockerAccounts(input.data.environment, tokens.accessToken);
    if (!accounts.accounts.length) {
      return NextResponse.json(
        { success: false, message: "No trading accounts were found." },
        { status: 404 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    await prisma.tradeLockerAuthSession.deleteMany({
      where: { OR: [{ userId: user.id }, { expiresAt: { lt: now } }] },
    });
    const session = await prisma.tradeLockerAuthSession.create({
      data: {
        userId: user.id,
        environment: input.data.environment,
        server: input.data.server,
        email: input.data.email,
        accessTokenEncrypted: encryptTradeLockerToken(tokens.accessToken),
        refreshTokenEncrypted: encryptTradeLockerToken(tokens.refreshToken),
        accessTokenExpiresAt: new Date(tokens.expireDate),
        refreshTokenExpiresAt: jwtExpiration(tokens.refreshToken),
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        expiresAt: session.expiresAt.toISOString(),
        accounts: accounts.accounts.map((account) => ({
          accountId: account.id,
          accNum: account.accNum,
          name: account.name,
          currency: account.currency,
          status: account.status || null,
          environment: input.data.environment,
          balance: Number.isFinite(account.aaccountBalance) ? account.aaccountBalance : null,
        })),
      },
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { success: false, message: safeTradeLockerMessage(error) },
      { status: 422 }
    );
  }
}
