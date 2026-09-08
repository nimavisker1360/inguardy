import { NextResponse } from "next/server";
import {
  buildJournalReport,
  journalReportToCsv,
  ReportValidationError,
} from "@/lib/reports/journal-report";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const report = await buildJournalReport(userId, searchParams);

    if (searchParams.get("format") === "csv") {
      const language = searchParams.get("lang") === "fa" ? "fa" : "en";
      const csv = journalReportToCsv(report, language);
      const filename = `journal-report-${new Date().toISOString().slice(0, 10)}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof ReportValidationError) {
      return NextResponse.json(
        { success: false, message: error.message, errors: error.errors },
        { status: 400 }
      );
    }


    return NextResponse.json(
      { success: false, message: "Failed to load journal report" },
      { status: 500 }
    );
  }
}
