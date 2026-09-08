import { NextResponse } from "next/server";
import {
  getTradingSignalsPage,
  saveTradingSignal,
  SignalValidationError,
} from "@/lib/signal-store";
import type {
  SignalDateFilter,
  SignalDirectionFilter,
  SignalStatusFilter,
} from "@/lib/signal-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const includeTestSignals = url.searchParams.get("includeTest") === "true";
    const limit = parsePositiveInteger(url.searchParams.get("limit"), 12, 50);
    const page = parsePositiveInteger(url.searchParams.get("page"), 1);
    const status = parseStatusFilter(url.searchParams.get("status"));
    const direction = parseDirectionFilter(url.searchParams.get("direction"));
    const date = parseDateFilter(url.searchParams.get("date"));
    const symbol = url.searchParams.get("symbol") || undefined;
    const result = await getTradingSignalsPage({
      limit,
      page,
      status,
      symbol,
      direction,
      date,
      includeTestSignals,
    });

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch {

    return NextResponse.json(
      { success: false, message: "Failed to load signals" },
      { status: 500 }
    );
  }
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  max?: number
) {
  const parsed = Number(value);
  const normalized = Number.isFinite(parsed) ? Math.floor(parsed) : fallback;
  const positive = Math.max(normalized, 1);

  return max ? Math.min(positive, max) : positive;
}

function parseStatusFilter(value: string | null): SignalStatusFilter {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "open" || normalized === "closed") {
    return normalized;
  }

  if (normalized === "tp" || normalized === "tp_hit") {
    return "tp";
  }

  if (normalized === "sl" || normalized === "sl_hit") {
    return "sl";
  }

  return "all";
}

function parseDirectionFilter(value: string | null): SignalDirectionFilter {
  const normalized = value?.trim().toUpperCase();

  if (normalized === "BUY" || normalized === "SELL") {
    return normalized;
  }

  return "all";
}

function parseDateFilter(value: string | null): SignalDateFilter {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "today" ||
    normalized === "yesterday" ||
    normalized === "week" ||
    normalized === "this_week"
  ) {
    return normalized === "this_week" ? "week" : normalized;
  }

  return "all";
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {

    return NextResponse.json(
      { success: false, message: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  try {
    const signal = await saveTradingSignal(body);


    return NextResponse.json(
      {
        success: true,
        message: "Signal saved successfully",
        signal,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SignalValidationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }


    return NextResponse.json(
      { success: false, message: "Failed to save signal" },
      { status: 500 }
    );
  }
}
