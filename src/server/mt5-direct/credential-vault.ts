import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function getCredentialKey() {
  const source =
    process.env.MT5_CREDENTIAL_ENCRYPTION_KEY ||
    process.env.JOURNAL_SECRET_ENCRYPTION_KEY ||
    process.env.BETTER_AUTH_SECRET;

  if (!source) {
    throw new Error("MT5_CREDENTIAL_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required");
  }

  return crypto.createHash("sha256").update(source).digest();
}

export function encryptMt5Credential(credential: string) {
  const normalized = credential.trim();

  if (!normalized) {
    throw new Error("MT5 credential is required");
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getCredentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptMt5Credential(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const [version, iv, tag, encrypted] = value.split(":");

    if (version !== VERSION || !iv || !tag || !encrypted) {
      return null;
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      getCredentialKey(),
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
