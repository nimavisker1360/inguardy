import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { resolveJournalIngestionUserId } from "@/lib/journal/prisma-trades";

const TOKEN_PREFIX = "tjr_";
const TOKEN_BYTES = 32;

export type JournalUploadConnection = {
  userId: string;
  connectedAt: Date | null;
  legacy: boolean;
};

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

function tokenPreview(token: string) {
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

export function createPlainJournalToken() {
  return `${TOKEN_PREFIX}${crypto.randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

export async function getActiveJournalConnection(userId: string) {
  return prisma.journalConnection.findFirst({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tokenPreview: true,
      name: true,
      connectedAt: true,
      lastUsedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function regenerateJournalConnection(userId: string) {
  const token = createPlainJournalToken();
  const hashedToken = hashToken(token);

  const connection = await prisma.$transaction(async (tx) => {
    await tx.journalConnection.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    return tx.journalConnection.create({
      data: {
        userId,
        tokenHash: hashedToken,
        tokenPreview: tokenPreview(token),
        name: "MT5 Journal Recorder",
      },
      select: {
        id: true,
        tokenPreview: true,
        name: true,
        connectedAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  return { connection, token };
}

export async function resolveJournalUploadConnection(
  uploadSecret: string
): Promise<JournalUploadConnection | null> {
  const trimmedSecret = uploadSecret.trim();

  if (!trimmedSecret) {
    return null;
  }

  const connection = await prisma.journalConnection.findFirst({
    where: {
      tokenHash: hashToken(trimmedSecret),
      isActive: true,
    },
    select: {
      id: true,
      userId: true,
      connectedAt: true,
    },
  });

  if (connection) {
    await prisma.journalConnection.update({
      where: { id: connection.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      userId: connection.userId,
      connectedAt: connection.connectedAt,
      legacy: false,
    };
  }

  const legacyEnabled =
    process.env.JOURNAL_LEGACY_UPLOAD_SECRET_ENABLED?.trim().toLowerCase() === "true";
  const legacySecret = process.env.JOURNAL_UPLOAD_SECRET?.trim();

  if (legacyEnabled && legacySecret && trimmedSecret === legacySecret) {
    return {
      userId: await resolveJournalIngestionUserId(),
      connectedAt: null,
      legacy: true,
    };
  }

  return null;
}
