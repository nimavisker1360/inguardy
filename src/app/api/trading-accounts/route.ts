import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { accountSelect, serializeAccount } from "@/lib/dashboard-data";
import { apiResponse, decimalValue } from "@/lib/journal/api-utils";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import { requireActiveSubscription, subscriptionAccessResponse } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireActiveSubscription();

    const accounts = await prisma.tradingAccount.findMany({
      where: { userId },
      select: accountSelect,
      orderBy: { createdAt: "desc" },
    });

    return apiResponse({
      success: true,
      data: accounts.map((account) =>
        serializeAccount(account, { includeJournalSecret: true })
      ),
    });
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    return apiResponse(
      { success: false, message: "Failed to load trading accounts" },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireActiveSubscription();

    const body = await request.json();
    const { name, broker, platform, currency, balance, mt5AccountNumber } = body;

    if (!name || !currency) {
      return apiResponse(
        { success: false, message: "name and currency are required" },
        400
      );
    }

    const account = await prisma.tradingAccount.create({
      data: {
        userId,
        name,
        broker,
        platform,
        currency,
        balance: decimalValue(balance),
        mt5AccountNumber:
          typeof mt5AccountNumber === "string" && mt5AccountNumber.trim()
            ? mt5AccountNumber.trim()
            : null,
      },
      select: accountSelect,
    });

    return apiResponse(
      {
        success: true,
        data: serializeAccount(account, { includeJournalSecret: true }),
      },
      201
    );
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return apiResponse(
        { success: false, message: "Trading account already exists" },
        409
      );
    }

    return apiResponse(
      { success: false, message: "Failed to create trading account" },
      500
    );
  }
}
