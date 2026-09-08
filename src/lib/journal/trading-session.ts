export type TradingSessionLabel =
  | "Asia Session"
  | "London Session"
  | "New York Session"
  | "Other";

export function getTradingSessionLabel(value: Date | string | null | undefined): TradingSessionLabel | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const hour = date.getUTCHours();

  if (hour >= 0 && hour < 7) {
    return "Asia Session";
  }

  if (hour >= 7 && hour < 13) {
    return "London Session";
  }

  if (hour >= 13 && hour < 21) {
    return "New York Session";
  }

  return "Other";
}

export function normalizeTradingSession(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized.includes("asia")) {
    return "Asia Session";
  }

  if (normalized.includes("london")) {
    return "London Session";
  }

  if (normalized.includes("new york") || normalized.includes("ny session")) {
    return "New York Session";
  }

  if (normalized === "other") {
    return "Other";
  }

  return null;
}
