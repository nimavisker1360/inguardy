const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const plans = [
  {
    name: "Trial",
    slug: "trial",
    description: "10-day trial with premium journal features.",
    priceUSDT: "0",
    durationDays: 10,
    maxTrades: null,
    maxScreenshots: 20,
    maxPlaybooks: 3,
    maxChecklists: 3,
    aiAnalysis: true,
    advancedAnalytics: true,
    exportEnabled: false,
    isTrial: true,
    isFree: false,
    isActive: true,
  },
  {
    name: "Free",
    slug: "free",
    description: "Limited free journal plan.",
    priceUSDT: "0",
    durationDays: 0,
    maxTrades: 30,
    maxScreenshots: 10,
    maxPlaybooks: 1,
    maxChecklists: 1,
    aiAnalysis: false,
    advancedAnalytics: false,
    exportEnabled: false,
    isTrial: false,
    isFree: true,
    isActive: true,
  },
  {
    name: "Pro Monthly",
    slug: "pro-monthly",
    description: "Monthly Pro access paid manually with USDT.",
    priceUSDT: "15",
    durationDays: 30,
    maxTrades: null,
    maxScreenshots: null,
    maxPlaybooks: null,
    maxChecklists: null,
    aiAnalysis: true,
    advancedAnalytics: true,
    exportEnabled: true,
    isTrial: false,
    isFree: false,
    isActive: true,
  },
  {
    name: "Pro Yearly",
    slug: "pro-yearly",
    description: "Yearly Pro access paid manually with USDT.",
    priceUSDT: "150",
    durationDays: 365,
    maxTrades: null,
    maxScreenshots: null,
    maxPlaybooks: null,
    maxChecklists: null,
    aiAnalysis: true,
    advancedAnalytics: true,
    exportEnabled: true,
    isTrial: false,
    isFree: false,
    isActive: true,
  },
];

async function main() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }

  console.log(`Seeded ${plans.length} subscription plans.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
