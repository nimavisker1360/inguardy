import { loadEnvConfig } from "@next/env";
import { Mt5DirectConnectionStatus } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import {
  acquireMt5ConnectionLease,
  releaseMt5ConnectionLease,
  synchronizeMt5Connection,
} from "../src/server/mt5-direct/sync-service";

loadEnvConfig(process.cwd());

async function main() {
  const login = String(process.argv[2] || "").trim();
  if (!login) throw new Error("Usage: npm run repair:mt5 -- <MT5 login>");
  const connection = await prisma.mt5DirectConnection.findFirst({ where: { login, enabled: true } });
  if (!connection) throw new Error(`No enabled MT5 Direct connection found for login ${login}`);
  if (!await acquireMt5ConnectionLease(connection.id)) {
    throw new Error("The MT5 connection is currently being synchronized; retry after the active lease is released");
  }

  try {
    await prisma.mt5DirectConnection.update({
      where: { id: connection.id },
      data: { cursorAt: connection.historyStartAt, status: Mt5DirectConnectionStatus.INITIAL_SYNC },
    });
    const maximumBatches = Math.max(1, Number(process.env.MT5_BACKFILL_MAX_BATCHES || 100));
    let totals = { createdDeals: 0, projectedTrades: 0, symbolSpecificationsPersisted: 0 };
    for (let batch = 1; batch <= maximumBatches; batch += 1) {
      const result = await synchronizeMt5Connection(connection.id);
      totals = {
        createdDeals: totals.createdDeals + result.createdDeals,
        projectedTrades: totals.projectedTrades + result.projectedTrades,
        symbolSpecificationsPersisted: totals.symbolSpecificationsPersisted + result.symbolSpecificationsPersisted,
      };
      console.log(JSON.stringify({ event: "mt5_repair_batch", login, batch, status: result.connection.status, ...result.counts }));
      if (result.connection.status === Mt5DirectConnectionStatus.ACTIVE) {
        console.log(JSON.stringify({ event: "mt5_repair_complete", login, batches: batch, ...totals }));
        return;
      }
    }
    throw new Error(`MT5 repair did not catch up within ${maximumBatches} batches`);
  } finally {
    await releaseMt5ConnectionLease(connection.id);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
