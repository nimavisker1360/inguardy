import { randomUUID } from "crypto";

type ScreenshotType = "ENTRY" | "EXIT";

type DbClient = {
  $executeRaw: (query: TemplateStringsArray, ...values: any[]) => Promise<number>;
  $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: any[]) => Promise<T>;
  tradeScreenshot: {
    findFirst: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
  };
};

type PendingScreenshotRow = {
  id: string;
  userId: string;
  accountId: string;
  positionId: string;
  type: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
};

export function toScreenshotType(value: string): ScreenshotType {
  return value.trim().toLowerCase() === "exit" ? "EXIT" : "ENTRY";
}

export async function upsertTradeScreenshot(
  db: DbClient,
  input: {
    tradeId: string;
    userId: string;
    type: ScreenshotType;
    url: string;
  }
) {
  const type = input.type.trim().toUpperCase() as ScreenshotType;
  const existing = await db.tradeScreenshot.findFirst({
    where: {
      tradeId: input.tradeId,
      type: {
        equals: type,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return db.tradeScreenshot.update({
      where: {
        id: existing.id,
      },
      data: {
        type,
        url: input.url,
      },
    });
  }

  return db.tradeScreenshot.create({
    data: {
      tradeId: input.tradeId,
      userId: input.userId,
      type,
      url: input.url,
    },
  });
}

export async function storePendingMt5Screenshot(
  db: DbClient,
  input: {
    userId: string;
    accountId: string;
    positionId: string;
    type: ScreenshotType;
    url: string;
  }
) {
  const existing = await db.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Mt5PendingScreenshot"
    WHERE "accountId" = ${input.accountId}
      AND "positionId" = ${input.positionId}
      AND "type" = ${input.type}
    LIMIT 1
  `;

  if (existing[0]) {
    await db.$executeRaw`
      UPDATE "Mt5PendingScreenshot"
      SET "url" = ${input.url},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${existing[0].id}
    `;
    return;
  }

  await db.$executeRaw`
    INSERT INTO "Mt5PendingScreenshot"
      ("id", "userId", "accountId", "positionId", "type", "url", "createdAt", "updatedAt")
    VALUES
      (${randomUUID()}, ${input.userId}, ${input.accountId}, ${input.positionId}, ${input.type}, ${input.url}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
}

export async function attachPendingMt5Screenshots(
  db: DbClient,
  input: {
    userId: string;
    accountId: string;
    positionId: string;
    tradeId: string;
  }
) {
  const pendingScreenshots = await db.$queryRaw<PendingScreenshotRow[]>`
    SELECT "id", "userId", "accountId", "positionId", "type", "url", "createdAt", "updatedAt"
    FROM "Mt5PendingScreenshot"
    WHERE "userId" = ${input.userId}
      AND "accountId" = ${input.accountId}
      AND "positionId" = ${input.positionId}
    ORDER BY "createdAt" ASC
  `;

  for (const screenshot of pendingScreenshots) {
    await upsertTradeScreenshot(db, {
      tradeId: input.tradeId,
      userId: input.userId,
      type: toScreenshotType(screenshot.type),
      url: screenshot.url,
    });

    await db.$executeRaw`
      DELETE FROM "Mt5PendingScreenshot"
      WHERE "id" = ${screenshot.id}
    `;
  }

  return pendingScreenshots.length;
}
