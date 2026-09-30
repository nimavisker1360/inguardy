import { loadEnvConfig } from "@next/env";
import { Mt5DirectConnectionStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { decryptMt5Credential } from "../src/server/mt5-direct/credential-vault";
import { testMt5Credentials } from "../src/server/mt5-direct/sync-service";

loadEnvConfig(process.cwd());

async function main() {
  const connectionId = process.argv[2]?.trim();
  if (!connectionId) {
    throw new Error("Usage: tsx scripts/activate-mt5-connection.ts <connection-id>");
  }

  const target = await prisma.mt5DirectConnection.findUniqueOrThrow({
    where: { id: connectionId },
  });
  const password = decryptMt5Credential(target.credentialEncrypted);
  if (!password) {
    throw new Error("The stored MT5 credential is unavailable");
  }

  const snapshot = await testMt5Credentials({
    server: target.server,
    login: target.login,
    password,
  });
  if (String(snapshot.account.login) !== target.login) {
    throw new Error("MT5 activated an unexpected account");
  }

  await prisma.$transaction([
    prisma.mt5DirectConnection.updateMany({
      where: {
        userId: target.userId,
        id: { not: target.id },
        enabled: true,
      },
      data: {
        enabled: false,
        status: Mt5DirectConnectionStatus.DISCONNECTED,
        leaseOwner: null,
        leaseUntil: null,
      },
    }),
    prisma.mt5DirectConnection.update({
      where: { id: target.id },
      data: {
        enabled: true,
        status: Mt5DirectConnectionStatus.INITIAL_SYNC,
        lastError: null,
        leaseOwner: null,
        leaseUntil: null,
      },
    }),
  ]);

  process.stdout.write(`Activated MT5 login ${target.login}\n`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "MT5 activation failed");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
