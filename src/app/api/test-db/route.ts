import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accountsCount = await prisma.tradingAccount.count();
    const tradesCount = await prisma.trade.count();

    return NextResponse.json({
      success: true,
      message: "Neon PostgreSQL connected successfully",
      data: {
        accountsCount,
        tradesCount,
      },
    });
  } catch {

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
      },
      { status: 500 }
    );
  }
}
