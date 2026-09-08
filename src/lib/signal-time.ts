const SIGNAL_TIME_ZONE = "Europe/Istanbul";
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type CalendarParts = {
  year: number;
  month: number;
  day: number;
};

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SIGNAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timePartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SIGNAL_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SIGNAL_TIME_ZONE,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SIGNAL_TIME_ZONE,
});

const dateGroupFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: SIGNAL_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

const offsetPartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: SIGNAL_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function getPart(parts: Intl.DateTimeFormatPart[], type: string) {
  return Number(parts.find((part) => part.type === type)?.value);
}

function getCalendarParts(date: Date): CalendarParts {
  const parts = datePartsFormatter.formatToParts(date);

  return {
    year: getPart(parts, "year"),
    month: getPart(parts, "month"),
    day: getPart(parts, "day"),
  };
}

function getCalendarKey(date: Date) {
  const { year, month, day } = getCalendarParts(date);

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
    2,
    "0"
  )}`;
}

function addCalendarDays(parts: CalendarParts, days: number): CalendarParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getTimeZoneOffsetMs(date: Date) {
  const parts = offsetPartsFormatter.formatToParts(date);
  const asUtc = Date.UTC(
    getPart(parts, "year"),
    getPart(parts, "month") - 1,
    getPart(parts, "day"),
    getPart(parts, "hour"),
    getPart(parts, "minute"),
    getPart(parts, "second")
  );

  return asUtc - date.getTime();
}

function getZonedDateTime(parts: CalendarParts, hour = 0, minute = 0, second = 0) {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    second
  );
  const firstPass = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess)));
  const secondPass = new Date(
    utcGuess - getTimeZoneOffsetMs(firstPass)
  );

  return secondPass;
}

function getSignalDayStart(referenceDate: Date, offsetDays = 0) {
  const calendarParts = addCalendarDays(
    getCalendarParts(referenceDate),
    offsetDays
  );

  return getZonedDateTime(calendarParts);
}

export function getSignalDayRange(referenceDate = new Date(), offsetDays = 0) {
  const start = getSignalDayStart(referenceDate, offsetDays);
  const end = getSignalDayStart(referenceDate, offsetDays + 1);

  return { start, end };
}

export function getSignalRecentRange(referenceDate = new Date(), daysAgo = 0) {
  const end = new Date(referenceDate.getTime() - daysAgo * DAY_IN_MS);
  const start = new Date(end.getTime() - DAY_IN_MS);

  return { start, end };
}

export function parseSignalDateTime(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const timestampMs = Math.abs(value) < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(timestampMs);

    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const text = value.trim();

  if (!text) {
    return undefined;
  }

  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return parseSignalDateTime(Number(text));
  }

  const localMatch = text.match(
    /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (localMatch && !/(z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const [, year, month, day, hour = "0", minute = "0", second = "0"] =
      localMatch;

    return getZonedDateTime(
      {
        year: Number(year),
        month: Number(month),
        day: Number(day),
      },
      Number(hour),
      Number(minute),
      Number(second)
    );
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getSignalWeekRange(referenceDate = new Date()) {
  const todayParts = getCalendarParts(referenceDate);
  const todayAsUtc = new Date(
    Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day)
  );
  const daysSinceMonday = (todayAsUtc.getUTCDay() + 6) % 7;
  const startParts = addCalendarDays(todayParts, -daysSinceMonday);

  return { start: getZonedDateTime(startParts) };
}

export function isSameSignalDate(a: Date, b: Date) {
  return getCalendarKey(a) === getCalendarKey(b);
}

export function getSignalDateKey(date: Date) {
  return getCalendarKey(date);
}

export function formatSignalDateGroupLabel(date: Date) {
  return dateGroupFormatter.format(date);
}

export function getRelativeSignalDateLabel(
  date: Date,
  referenceDate = new Date()
) {
  const yesterday = getSignalDayStart(referenceDate, -1);

  if (isSameSignalDate(date, referenceDate)) {
    return "Today";
  }

  if (isSameSignalDate(date, yesterday)) {
    return "Yesterday";
  }

  return "Older";
}

export function formatSignalTimestamp(date: Date, referenceDate = new Date()) {
  const time = timePartsFormatter.format(date);
  const relativeLabel = getRelativeSignalDateLabel(date, referenceDate);

  if (relativeLabel === "Today" || relativeLabel === "Yesterday") {
    return `${time} Istanbul`;
  }

  return `${fullDateFormatter.format(date)} - ${time} Istanbul`;
}

export function formatSignalDateTime(date: Date) {
  return `${dateTimeFormatter.format(date)} Istanbul`;
}
