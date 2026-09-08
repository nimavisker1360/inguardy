import { NextResponse } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/server-auth";
import { CTRADER_AUTHORIZE_URL, getCtraderConfig } from "@/server/ctrader/config";
import {
  createCtraderOAuthState,
  CTRADER_OAUTH_STATE_COOKIE,
  ctraderOAuthCookieOptions,
} from "@/server/ctrader/oauth-state";
import {
  assertUserCanUseJournal,
  JournalSubscriptionError,
} from "@/server/mt5/subscription-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    await assertUserCanUseJournal(user.id);
    const { clientId, redirectUri } = getCtraderConfig();
    const requestUrl = new URL(request.url);
    const historyMode = requestUrl.searchParams.get("historyMode") === "new" ? "new" : "all";
    const state = createCtraderOAuthState(user.id, historyMode);
    const authorizeUrl = new URL(CTRADER_AUTHORIZE_URL);
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "accounts");
    authorizeUrl.searchParams.set("product", "web");
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(CTRADER_OAUTH_STATE_COOKIE, state, ctraderOAuthCookieOptions);
    return response;
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof JournalSubscriptionError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "cTrader setup failed" },
      { status: 500 }
    );
  }
}

