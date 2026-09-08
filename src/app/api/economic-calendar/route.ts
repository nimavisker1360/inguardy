import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import {
  fetchWeeklyEconomicCalendar,
  saveEconomicEventsToDatabase,
} from "@/lib/news/jblanked-calendar";

export const dynamic = "force-dynamic";

let lastAutoImportAttemptAt = 0;
const AUTO_IMPORT_RETRY_MS = 15 * 60 * 1000;

async function importCalendarEvents() {
  const { events } = await fetchWeeklyEconomicCalendar();
  await saveEconomicEventsToDatabase(events);
}

async function importCalendarWhenCoverageIsMissing(from: Date, to: Date) {
  const eventsInRange = await prisma.economicEvent.count({
    where: {
      eventTime: {
        gte: from,
        lte: to,
      },
    },
  });

  if (eventsInRange > 0) {
    return;
  }

  const coverage = await prisma.economicEvent.aggregate({
    _count: {
      id: true,
    },
    _min: {
      eventTime: true,
    },
    _max: {
      eventTime: true,
    },
  });

  const hasNoEvents = coverage._count.id === 0;
  const startsBeforeCoverage =
    coverage._min.eventTime !== null && from.getTime() < coverage._min.eventTime.getTime();
  const endsAfterCoverage =
    coverage._max.eventTime !== null && to.getTime() > coverage._max.eventTime.getTime();

  if (!hasNoEvents && !startsBeforeCoverage && !endsAfterCoverage) {
    return;
  }

  const now = Date.now();
  if (!hasNoEvents && now - lastAutoImportAttemptAt < AUTO_IMPORT_RETRY_MS) {
    return;
  }

  lastAutoImportAttemptAt = now;
  try {
    await importCalendarEvents();
  } catch (error) {
    if (hasNoEvents) {
      throw error;
    }

  }
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseDateParam(value: string | null, fallback: Date, endOfDay = false) {
  if (!value) {
    return fallback;
  }

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));

    if (Number.isNaN(parsed.getTime())) {
      return fallback;
    }

    if (endOfDay) {
      parsed.setHours(23, 59, 59, 999);
    }

    return parsed;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed;
}

function normalizeImpactFilter(value: string | null) {
  if (!value || value.toLowerCase() === "all") {
    return undefined;
  }

  const lower = value.toLowerCase();
  if (lower === "high" || lower === "red") return "High";
  if (lower === "medium" || lower === "med" || lower === "orange") return "Medium";
  if (lower === "low" || lower === "yellow") return "Low";
  if (lower === "none") return "None";

  return value;
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const defaultFrom = startOfToday();
    const defaultTo = new Date(defaultFrom);
    defaultTo.setDate(defaultTo.getDate() + 7);

    const from = parseDateParam(searchParams.get("from"), defaultFrom);
    const to = parseDateParam(searchParams.get("to"), defaultTo, true);
    const currency = searchParams.get("currency");
    const impact = normalizeImpactFilter(searchParams.get("impact"));

    await importCalendarWhenCoverageIsMissing(from, to);

    const events = await prisma.economicEvent.findMany({
      where: {
        eventTime: {
          gte: from,
          lte: to,
        },
        ...(currency && currency.toLowerCase() !== "all"
          ? { currency: currency.toUpperCase() }
          : {}),
        ...(impact ? { impact } : {}),
      },
      orderBy: {
        eventTime: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      data: events.map((event) => ({
        id: event.id,
        name: event.name,
        currency: event.currency,
        impact: event.impact,
        category: event.category,
        eventTime: event.eventTime.toISOString(),
        actual: event.actual,
        forecast: event.forecast,
        previous: event.previous,
        outcome: event.outcome,
        strength: event.strength,
        quality: event.quality,
        source: event.source,
      })),
    });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load economic calendar events" },
      { status: 500 }
    );
  }
}
