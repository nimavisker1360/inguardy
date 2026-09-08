import crypto from "crypto";

const JOURNAL_SECRET_PREFIX = "tjr_";
const JOURNAL_SECRET_BYTES = 32;

export function generateJournalSecret() {
  return `${JOURNAL_SECRET_PREFIX}${crypto.randomBytes(JOURNAL_SECRET_BYTES).toString("base64url")}`;
}

export function hashJournalSecret(secret: string) {
  return crypto.createHash("sha256").update(secret.trim()).digest("hex");
}
