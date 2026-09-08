import { NextResponse } from "next/server";
import { buildJournalExcelTemplate } from "@/lib/journal/trade-import";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();

  if (!userId) {
    return unauthorizedResponse();
  }

  return new NextResponse(buildJournalExcelTemplate(), {
    headers: {
      "Content-Disposition": 'attachment; filename="tradivix-journal-template.xls"',
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
