import { NextResponse } from "next/server";
import {
  fetchWeeklyEconomicCalendar,
  saveEconomicEventsToDatabase,
} from "@/lib/news/jblanked-calendar";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      const authorization = request.headers.get("authorization");

      if (authorization !== `Bearer ${cronSecret}`) {
        return NextResponse.json(
          { success: false, message: "Unauthorized calendar import request" },
          { status: 401 }
        );
      }
    }

    const { events, source } = await fetchWeeklyEconomicCalendar();
    const insertedOrUpdated = await saveEconomicEventsToDatabase(events);

    return NextResponse.json({
      success: true,
      insertedOrUpdated,
      source,
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to import economic calendar events" },
      { status: 500 }
    );
  }
}
