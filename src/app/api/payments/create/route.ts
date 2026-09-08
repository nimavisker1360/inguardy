import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/server-auth";
import {
  addDays,
  apiError,
  apiJson,
  handleApiError,
  parsePaymentNetwork,
  serializePayment,
  walletAddressForNetwork,
} from "@/lib/payments-api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = (await request.json()) as Record<string, unknown>;
    const planId = typeof body.planId === "string" ? body.planId.trim() : "";
    const network = parsePaymentNetwork(body.network);

    if (!planId) {
      return apiError("planId is required", 400);
    }

    if (!network) {
      return apiError("Invalid payment network", 400);
    }

    const walletAddress = walletAddressForNetwork(network);

    if (!walletAddress) {
      return apiError(`${network} wallet address is not configured`, 400);
    }

    const db = prisma as any;
    const plan = await db.plan.findFirst({
      where: {
        id: planId,
        isActive: true,
      },
    });

    if (!plan) {
      return apiError("Plan not found", 404);
    }

    if (plan.isFree || plan.isTrial) {
      return apiError("Payments cannot be created for Free or Trial plans", 400);
    }

    const payment = await db.payment.create({
      data: {
        userId: user.id,
        planId: plan.id,
        amount: plan.priceUSDT,
        currency: "USDT",
        network,
        walletAddress,
        status: "WAITING_TXID",
        expiresAt: addDays(new Date(), 1),
      },
      include: {
        plan: true,
      },
    });

    return apiJson({ success: true, payment: serializePayment(payment) }, 201);
  } catch (error) {
    return handleApiError(error, "Failed to create payment");
  }
}
