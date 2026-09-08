import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const JBLANKED_BASE_URL = "https://www.jblanked.com";
const WEEKLY_CALENDAR_ENDPOINT = "/news/api/forex-factory/calendar/week/";
const FOREX_FACTORY_WEEKLY_XML_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml";
export const ECONOMIC_CALENDAR_SOURCE = "jblanked-forex-factory";
export const FOREX_FACTORY_XML_SOURCE = "forex-factory-xml";

type JBlankedEvent = Record<string, unknown>;

export type NormalizedEconomicEvent = {
  name: string;
  currency: string;
  impact: string;
  category: string | null;
  eventTime: Date;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  outcome: string | null;
  strength: string | null;
  quality: string | null;
  source: string;
  rawPayload: Prisma.InputJsonValue;
};

function text(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function extractXmlTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/${tagName}>`, "i"));
  return match ? text(decodeXml(match[1])) : null;
}

function parseForexFactoryTime(value: string | null) {
  if (!value) {
    return { hour: 0, minute: 0 };
  }

  const normalized = value.trim().toLowerCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/);

  if (!match) {
    return { hour: 0, minute: 0 };
  }

  const [, hourValue, minuteValue = "0", period] = match;
  let hour = Number(hourValue);
  const minute = Number(minuteValue);

  if (period === "am" && hour === 12) {
    hour = 0;
  } else if (period === "pm" && hour !== 12) {
    hour += 12;
  }

  return { hour, minute };
}

function forexFactoryDateTime(dateValue: string | null, timeValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const dateMatch = dateValue.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!dateMatch) {
    return null;
  }

  const [, month, day, year] = dateMatch;
  const { hour, minute } = parseForexFactoryTime(timeValue);

  return `${year}.${month}.${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function normalizeImpact(value: unknown) {
  const normalized = text(value);

  if (!normalized) {
    return "None";
  }

  const lower = normalized.toLowerCase();
  if (lower === "high" || lower === "red") return "High";
  if (lower === "medium" || lower === "med" || lower === "orange") return "Medium";
  if (lower === "low" || lower === "yellow") return "Low";

  return normalized;
}

function parseJBlankedDate(value: unknown) {
  const raw = text(value);

  if (!raw) {
    return null;
  }

  const dotted = raw.match(
    /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/
  );

  if (dotted) {
    const [, year, month, day, hour, minute, second = "0"] = dotted;
    const date = new Date(
      Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
      )
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractEvents(payload: unknown): JBlankedEvent[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is JBlankedEvent => item !== null && typeof item === "object");
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const objectPayload = payload as Record<string, unknown>;
  const candidates = [
    objectPayload.data,
    objectPayload.results,
    objectPayload.events,
    objectPayload.calendar,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is JBlankedEvent => item !== null && typeof item === "object");
    }
  }

  return [];
}

function parseForexFactoryXml(xml: string): JBlankedEvent[] {
  const eventBlocks = xml.match(/<event>[\s\S]*?<\/event>/gi) || [];
  const events: JBlankedEvent[] = [];

  for (const block of eventBlocks) {
    const dateTime = forexFactoryDateTime(
      extractXmlTag(block, "date"),
      extractXmlTag(block, "time")
    );

    if (!dateTime) {
      continue;
    }

    events.push({
      Name: extractXmlTag(block, "title"),
      Currency: extractXmlTag(block, "country"),
      Date: dateTime,
      Impact: extractXmlTag(block, "impact"),
      Actual: extractXmlTag(block, "actual"),
      Forecast: extractXmlTag(block, "forecast"),
      Previous: extractXmlTag(block, "previous"),
      Category: extractXmlTag(block, "url"),
      Source: FOREX_FACTORY_XML_SOURCE,
    });
  }

  return events;
}

export async function fetchJBlankedWeeklyCalendar() {
  const apiKey = process.env.JBLANKED_API_KEY;

  if (!apiKey) {
    throw new Error("JBLANKED_API_KEY is missing");
  }

  const response = await fetch(`${JBLANKED_BASE_URL}${WEEKLY_CALENDAR_ENDPOINT}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Api-Key ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const details = body ? `: ${body.slice(0, 250)}` : "";
    throw new Error(`JBlanked calendar request failed with ${response.status}${details}`);
  }

  const payload = (await response.json()) as unknown;
  const events = extractEvents(payload);

  if (events.length === 0) {
  }

  return events;
}

export async function fetchForexFactoryWeeklyCalendar() {
  const response = await fetch(FOREX_FACTORY_WEEKLY_XML_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 Economic Calendar Import",
      Accept: "text/xml,application/xml",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const details = body ? `: ${body.slice(0, 250)}` : "";
    throw new Error(`Forex Factory XML request failed with ${response.status}${details}`);
  }

  const xml = await response.text();
  const events = parseForexFactoryXml(xml);

  if (events.length === 0) {
  }

  return events;
}

export async function fetchWeeklyEconomicCalendar() {
  if (process.env.JBLANKED_API_KEY) {
    try {
      return {
        events: await fetchJBlankedWeeklyCalendar(),
        source: ECONOMIC_CALENDAR_SOURCE,
      };
    } catch {
      // Fall back to the Forex Factory XML feed below.
    }
  }

  return {
    events: await fetchForexFactoryWeeklyCalendar(),
    source: FOREX_FACTORY_XML_SOURCE,
  };
}

export function normalizeJBlankedEvent(item: JBlankedEvent): NormalizedEconomicEvent | null {
  const eventTime = parseJBlankedDate(item.Date);

  if (!eventTime) {
    return null;
  }

  const name = text(item.Name);
  const currency = text(item.Currency)?.toUpperCase();

  if (!name || !currency) {
    return null;
  }

  return {
    name,
    currency,
    impact: normalizeImpact(item.Impact),
    category: text(item.Category),
    eventTime,
    actual: text(item.Actual),
    forecast: text(item.Forecast),
    previous: text(item.Previous),
    outcome: text(item.Outcome),
    strength: text(item.Strength),
    quality: text(item.Quality),
    source: text(item.Source) || ECONOMIC_CALENDAR_SOURCE,
    rawPayload: item as Prisma.InputJsonValue,
  };
}

export async function saveEconomicEventsToDatabase(events: JBlankedEvent[]) {
  let insertedOrUpdated = 0;

  for (const item of events) {
    const normalized = normalizeJBlankedEvent(item);

    if (!normalized) {
      continue;
    }

    await prisma.economicEvent.upsert({
      where: {
        name_currency_eventTime_source: {
          name: normalized.name,
          currency: normalized.currency,
          eventTime: normalized.eventTime,
          source: normalized.source,
        },
      },
      create: normalized,
      update: {
        impact: normalized.impact,
        category: normalized.category,
        actual: normalized.actual,
        forecast: normalized.forecast,
        previous: normalized.previous,
        outcome: normalized.outcome,
        strength: normalized.strength,
        quality: normalized.quality,
        rawPayload: normalized.rawPayload,
      },
    });

    insertedOrUpdated += 1;
  }

  return insertedOrUpdated;
}
