import { CTRADER_TOKEN_URL, getCtraderConfig } from "@/server/ctrader/config";

export type CtraderTokenResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
};

type RawTokenResponse = Partial<CtraderTokenResponse> & {
  errorCode?: string | null;
  description?: string | null;
};

async function requestToken(parameters: Record<string, string>) {
  const { clientId, clientSecret } = getCtraderConfig();
  const url = new URL(CTRADER_TOKEN_URL);
  for (const [key, value] of Object.entries({
    ...parameters,
    client_id: clientId,
    client_secret: clientSecret,
  })) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await response.json()) as RawTokenResponse;
  if (
    !response.ok ||
    data.errorCode ||
    !data.accessToken ||
    !data.refreshToken ||
    !Number.isFinite(Number(data.expiresIn))
  ) {
    throw new Error(data.description || data.errorCode || "cTrader token exchange failed");
  }

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    tokenType: data.tokenType || "bearer",
    expiresIn: Number(data.expiresIn),
  } satisfies CtraderTokenResponse;
}

export function exchangeCtraderAuthorizationCode(code: string) {
  const { redirectUri } = getCtraderConfig();
  return requestToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
}

export function refreshCtraderAccessToken(refreshToken: string) {
  return requestToken({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

