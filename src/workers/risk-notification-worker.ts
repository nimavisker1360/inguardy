import { loadEnvConfig } from "@next/env";
import { prisma } from "../lib/prisma";
import { dispatchPendingRiskEmails } from "../server/risk-guardian/service";

loadEnvConfig(process.cwd());
let stopping = false;
const interval = 30_000;
process.on("SIGINT", () => { stopping = true; });
process.on("SIGTERM", () => { stopping = true; });

async function main() {
  while (!stopping) {
    try { await dispatchPendingRiskEmails(); }
    catch (error) { console.error("Risk notification delivery failed", error); }
    if (!stopping) await new Promise(resolve => setTimeout(resolve, interval));
  }
  await prisma.$disconnect();
}
void main();
