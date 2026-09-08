import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { hashJournalSecret } from "@/server/mt5/hash-journal-secret";

const accountSelect = {
  id: true,
  userId: true,
  name: true,
  broker: true,
  platform: true,
  journalEnabled: true,
  journalSecretHash: true,
  journalSecretEncrypted: true,
  mt5AccountNumber: true,
  lastConnectedAt: true,
  lastSyncAt: true,
  user: {
    select: {
      id: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.TradingAccountSelect;

export type VerifiedJournalAccount = Prisma.TradingAccountGetPayload<{
  select: typeof accountSelect;
}>;

export class JournalSecretError extends Error {
  status: number;
  code: "INVALID_SECRET" | "JOURNAL_DISABLED" | "ACCOUNT_MISMATCH";

  constructor(
    code: JournalSecretError["code"],
    message: string,
    status: number
  ) {
    super(message);
    this.name = "JournalSecretError";
    this.code = code;
    this.status = status;
  }
}

function normalizeAccountNumber(value: string | null | undefined) {
  return String(value || "").trim();
}

export async function verifyJournalSecret(
  secret: string,
  accountNumber?: string
) {
  const trimmedSecret = secret.trim();

  if (!trimmedSecret) {
    throw new JournalSecretError("INVALID_SECRET", "Invalid secret", 401);
  }

  const account = await prisma.tradingAccount.findFirst({
    where: {
      journalSecretHash: hashJournalSecret(trimmedSecret),
    },
    select: accountSelect,
  });

  if (!account) {
    throw new JournalSecretError("INVALID_SECRET", "Invalid secret", 401);
  }

  if (!account.journalEnabled) {
    throw new JournalSecretError("JOURNAL_DISABLED", "Journal disabled", 403);
  }

  const incomingAccountNumber = normalizeAccountNumber(accountNumber);
  const storedMt5AccountNumber = normalizeAccountNumber(account.mt5AccountNumber);
  const accountName = normalizeAccountNumber(account.name);
  const matchedStoredNumber =
    incomingAccountNumber &&
    (incomingAccountNumber === storedMt5AccountNumber ||
      incomingAccountNumber === accountName);

  if (
    incomingAccountNumber &&
    storedMt5AccountNumber &&
    incomingAccountNumber !== storedMt5AccountNumber
  ) {
    throw new JournalSecretError("ACCOUNT_MISMATCH", "Account mismatch", 403);
  }

  if (
    incomingAccountNumber &&
    !storedMt5AccountNumber &&
    accountName &&
    incomingAccountNumber !== accountName
  ) {
    return {
      account,
      userId: account.userId,
      shouldBindAccountNumber: true,
    };
  }

  if (incomingAccountNumber && !matchedStoredNumber && storedMt5AccountNumber) {
    throw new JournalSecretError("ACCOUNT_MISMATCH", "Account mismatch", 403);
  }

  return {
    account,
    userId: account.userId,
    shouldBindAccountNumber: false,
  };
}
