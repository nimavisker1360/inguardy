import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function encryptionKey() {
  const source =
    process.env.TRADE_CONNECTION_ENCRYPTION_KEY ||
    process.env.CTRADER_TOKEN_ENCRYPTION_KEY ||
    process.env.MT5_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.JOURNAL_SECRET_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET;

  if (!source) {
    throw new Error("A trade connection encryption key is required");
  }

  return crypto.createHash("sha256").update(source).digest();
}

export function encryptTradeLockerToken(value: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error("TradeLocker token is required");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptTradeLockerToken(value: string | null | undefined) {
  if (!value) return null;

  try {
    const [version, iv, tag, encrypted] = value.split(":");
    if (version !== VERSION || !iv || !tag || !encrypted) return null;
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      encryptionKey(),
      Buffer.from(iv, "base64url")
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

export function jwtExpiration(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")) as {
      exp?: unknown;
    };
    const seconds = Number(payload.exp);
    return Number.isFinite(seconds) ? new Date(seconds * 1000) : null;
  } catch {
    return null;
  }
}
