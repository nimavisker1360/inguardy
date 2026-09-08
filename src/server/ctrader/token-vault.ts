import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function key() {
  const source =
    process.env.CTRADER_TOKEN_ENCRYPTION_KEY ||
    process.env.MT5_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.JOURNAL_SECRET_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET;

  if (!source) {
    throw new Error("CTRADER_TOKEN_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required");
  }

  return crypto.createHash("sha256").update(source).digest();
}

export function encryptCtraderToken(value: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error("cTrader token is required");

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptCtraderToken(value: string | null | undefined) {
  if (!value) return null;

  try {
    const [version, iv, tag, encrypted] = value.split(":");
    if (version !== VERSION || !iv || !tag || !encrypted) return null;
    const decipher = crypto.createDecipheriv(ALGORITHM, key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}

