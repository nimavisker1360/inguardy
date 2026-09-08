import crypto from "crypto";

export const CTRADER_OAUTH_STATE_COOKIE = "ctrader_oauth_state";
const STATE_TTL_SECONDS = 10 * 60;

type StatePayload = {
  userId: string;
  historyMode: "all" | "new";
  nonce: string;
  expiresAt: number;
};

function secret() {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (!value) throw new Error("BETTER_AUTH_SECRET is required for cTrader OAuth state");
  return value;
}

function signature(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createCtraderOAuthState(userId: string, historyMode: "all" | "new") {
  const payload: StatePayload = {
    userId,
    historyMode,
    nonce: crypto.randomBytes(24).toString("base64url"),
    expiresAt: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyCtraderOAuthState(value: string, expectedUserId: string) {
  const [encoded, suppliedSignature] = value.split(".");
  if (!encoded || !suppliedSignature) return null;
  const expectedSignature = signature(encoded);
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(suppliedSignature), Buffer.from(expectedSignature))
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as StatePayload;
    if (
      payload.userId !== expectedUserId ||
      payload.expiresAt < Math.floor(Date.now() / 1000) ||
      (payload.historyMode !== "all" && payload.historyMode !== "new")
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const ctraderOAuthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/integrations/ctrader/callback",
  maxAge: STATE_TTL_SECONDS,
};

