import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { apiJson, handleApiError } from "@/lib/payments-api";

export const dynamic = "force-dynamic";

function maskValue(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}...${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`;
}

export async function GET() {
  try {
    await requireAdmin();

    const db = prisma as any;
    const [plansCount, freePlan] = await prisma.$transaction([
      db.plan.count(),
      db.plan.findFirst({ where: { isFree: true, isActive: true }, select: { id: true } }),
    ]);

    const wallets = {
      TRC20: maskValue(process.env.USDT_WALLET_TRC20),
      ERC20: maskValue(process.env.USDT_WALLET_ERC20),
      BEP20: maskValue(process.env.USDT_WALLET_BEP20),
    };

    return apiJson({
      success: true,
      settings: {
        wallets,
        configured: {
          usdtWalletTRC20: Boolean(process.env.USDT_WALLET_TRC20?.trim()),
          usdtWalletERC20: Boolean(process.env.USDT_WALLET_ERC20?.trim()),
          usdtWalletBEP20: Boolean(process.env.USDT_WALLET_BEP20?.trim()),
          adminEmails: Boolean(process.env.ADMIN_EMAILS?.trim()),
          plans: plansCount > 0,
          mailerSendApiToken: Boolean(process.env.MAILERSEND_API_TOKEN?.trim()),
          mailTestTo: Boolean(process.env.MAIL_TEST_TO?.trim()),
        },
        trialDurationDays: 10,
        freePlanEnabled: Boolean(freePlan),
        manualPaymentVerification: true,
        warnings: [
          ...(!process.env.USDT_WALLET_TRC20?.trim() ? ["USDT_WALLET_TRC20 is missing"] : []),
          ...(!process.env.ADMIN_EMAILS?.trim() ? ["ADMIN_EMAILS is missing"] : []),
          ...(plansCount === 0 ? ["Plans are missing"] : []),
        ],
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to load admin settings");
  }
}
