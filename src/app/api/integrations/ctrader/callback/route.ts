import { CtraderDirectConnectionStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { accountSelect } from "@/lib/dashboard-data";
import { getConfiguredSiteUrl } from "@/lib/deployment-url";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import { exchangeCtraderAuthorizationCode } from "@/server/ctrader/oauth-client";
import {
  CTRADER_OAUTH_STATE_COOKIE,
  ctraderOAuthCookieOptions,
  verifyCtraderOAuthState,
} from "@/server/ctrader/oauth-state";
import {
  listCtraderAccounts,
  type CtraderAccountDescriptor,
  type CtraderAccountSnapshot,
  type CtraderEnvironment,
} from "@/server/ctrader/open-api-client";
import { inspectCtraderAccount } from "@/server/ctrader/sync-service";
import { encryptCtraderToken } from "@/server/ctrader/token-vault";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const EARLIEST_HISTORY_DATE = new Date("2000-01-01T00:00:00.000Z");

function destination(request: Request, parameters: Record<string, string>) {
  const requestUrl = new URL(request.url);
  // `0.0.0.0` is a bind address for the server, not an address a browser can
  // navigate to. It can appear in a local OAuth callback when Next is started
  // with `-H 0.0.0.0`, so return the user to the browser-safe loopback host.
  if (requestUrl.hostname === "0.0.0.0") {
    requestUrl.protocol = "http:";
    requestUrl.hostname = "localhost";
  }
  // In production, do not trust a proxy-derived internal host. Local callbacks
  // still need to return to the local development server.
  const baseUrl = ["localhost", "127.0.0.1"].includes(requestUrl.hostname)
    ? requestUrl
    : getConfiguredSiteUrl();
  const url = new URL("/dashboard/accounts", baseUrl);
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value);
  return url;
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "cTrader authorization failed";
  return message.replace(/[\r\n]+/g, " ").slice(0, 240);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  let response: NextResponse;

  try {
    const user = await requireUser();
    const code = requestUrl.searchParams.get("code")?.trim() || "";
    const state = requestUrl.searchParams.get("state")?.trim() || "";
    const cookieHeader = request.headers.get("cookie") || "";
    const cookieState = cookieHeader
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${CTRADER_OAUTH_STATE_COOKIE}=`))
      ?.slice(CTRADER_OAUTH_STATE_COOKIE.length + 1);
    // cTrader currently documents only `code` on the callback. Use the echoed
    // OAuth state when present, while retaining the signed, short-lived cookie
    // fallback for cTrader clients that omit it.
    const effectiveState = state || cookieState || "";
    const verified = effectiveState && (!state || cookieState === state)
      ? verifyCtraderOAuthState(effectiveState, user.id)
      : null;

    if (!code || !verified) {
      throw new Error("The cTrader authorization request expired or is invalid");
    }

    const tokens = await exchangeCtraderAuthorizationCode(code);
    const authorized = await listCtraderAccounts(tokens.accessToken);
    if (!authorized.accounts.length) {
      throw new Error("No cTrader account was authorized");
    }

    const profiles: Array<{
      descriptor: CtraderAccountDescriptor;
      environment: CtraderEnvironment;
      ctidTraderAccountId: string;
      snapshot: CtraderAccountSnapshot;
    }> = [];
    for (const descriptor of authorized.accounts) {
      const ctidTraderAccountId = String(descriptor.ctidTraderAccountId);
      const environment = descriptor.isLive ? "live" : "demo";
      const snapshot = await inspectCtraderAccount({
        environment,
        ctidTraderAccountId,
        accessToken: tokens.accessToken,
      });
      profiles.push({ descriptor, environment, ctidTraderAccountId, snapshot });
    }

    const connectedAt = new Date();
    const accounts = await prisma.$transaction(
      async (tx) => {
        const grant = await tx.ctraderOAuthGrant.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            accessTokenEncrypted: encryptCtraderToken(tokens.accessToken),
            refreshTokenEncrypted: encryptCtraderToken(tokens.refreshToken),
            accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            permissionScope: authorized.permissionScope,
          },
          update: {
            accessTokenEncrypted: encryptCtraderToken(tokens.accessToken),
            refreshTokenEncrypted: encryptCtraderToken(tokens.refreshToken),
            accessTokenExpiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
            permissionScope: authorized.permissionScope,
          },
        });
        const authorizedIds = profiles.map((profile) => profile.ctidTraderAccountId);
        await tx.ctraderDirectConnection.updateMany({
          where: { userId: user.id, ctidTraderAccountId: { notIn: authorizedIds } },
          data: {
            enabled: false,
            status: CtraderDirectConnectionStatus.DISCONNECTED,
            leaseOwner: null,
            leaseUntil: null,
          },
        });

        const saved = [];
        for (const profile of profiles) {
          const { descriptor, snapshot, ctidTraderAccountId, environment } = profile;
          const trader = snapshot.trader;
          const traderLogin = String(trader.traderLogin || descriptor.traderLogin || "") || null;
          const brokerName = trader.brokerName || descriptor.brokerTitleShort || "cTrader";
          const asset = snapshot.assets.find(
            (item) => String(item.assetId) === String(trader.depositAssetId)
          );
          const moneyDigits = Number.isFinite(Number(trader.moneyDigits)) ? Number(trader.moneyDigits) : 2;
          const balance = Number(trader.balance) / 10 ** moneyDigits;
          const existing = await tx.ctraderDirectConnection.findUnique({
            where: {
              userId_ctidTraderAccountId: { userId: user.id, ctidTraderAccountId },
            },
            select: { id: true, accountId: true },
          });
          let accountId = existing?.accountId;
          if (!accountId) {
            const created = await tx.tradingAccount.create({
              data: {
                userId: user.id,
                name: traderLogin ? `cTrader ${traderLogin}` : `cTrader ${ctidTraderAccountId}`,
                broker: brokerName,
                platform: "cTrader",
                currency: asset?.name || "USD",
                balance: new Prisma.Decimal(Number.isFinite(balance) ? balance : 0),
                ctraderAccountId: ctidTraderAccountId,
                ingestionMode: "DIRECT_CTRADER",
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
                name: traderLogin ? `cTrader ${traderLogin}` : undefined,
                broker: brokerName,
                platform: "cTrader",
                currency: asset?.name || undefined,
                balance: Number.isFinite(balance) ? new Prisma.Decimal(balance) : undefined,
                ctraderAccountId: ctidTraderAccountId,
                ingestionMode: "DIRECT_CTRADER",
                journalEnabled: false,
                lastConnectedAt: connectedAt,
              },
            });
          }

          const registrationTimestamp = Number(trader.registrationTimestamp);
          const registeredAt = Number.isFinite(registrationTimestamp)
            ? new Date(registrationTimestamp)
            : EARLIEST_HISTORY_DATE;
          const historyStartAt = verified.historyMode === "new"
            ? connectedAt
            : registeredAt > EARLIEST_HISTORY_DATE
              ? registeredAt
              : EARLIEST_HISTORY_DATE;
          if (existing) {
            await tx.ctraderDirectConnection.update({
              where: { id: existing.id },
              data: {
                grantId: grant.id,
                traderLogin,
                environment,
                brokerName,
                enabled: true,
                status: CtraderDirectConnectionStatus.INITIAL_SYNC,
                historyStartAt,
                cursorAt: null,
                lastError: null,
                leaseOwner: null,
                leaseUntil: null,
                lastConnectedAt: connectedAt,
              },
            });
          } else {
            await tx.ctraderDirectConnection.create({
              data: {
                userId: user.id,
                accountId,
                grantId: grant.id,
                ctidTraderAccountId,
                traderLogin,
                environment,
                brokerName,
                status: CtraderDirectConnectionStatus.INITIAL_SYNC,
                historyStartAt,
                lastConnectedAt: connectedAt,
              },
            });
          }
          saved.push(
            await tx.tradingAccount.findUniqueOrThrow({
              where: { id: accountId },
              select: accountSelect,
            })
          );
        }
        return saved;
      },
      { timeout: 60_000 }
    );

    response = NextResponse.redirect(
      destination(request, { ctrader: "connected", accounts: String(accounts.length) })
    );
  } catch (error) {
    console.error("cTrader OAuth callback failed", {
      message: safeMessage(error),
      callbackHost: requestUrl.host,
    });
    response = NextResponse.redirect(
      destination(request, { ctrader: "error", message: safeMessage(error) })
    );
  }

  response.cookies.set(CTRADER_OAUTH_STATE_COOKIE, "", {
    ...ctraderOAuthCookieOptions,
    maxAge: 0,
  });
  return response;
}
