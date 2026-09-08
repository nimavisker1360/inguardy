import { NextResponse } from "next/server";
import { TradeDirection, TradeStatus } from "@prisma/client";

export function apiResponse(
  payload: { success: boolean; data?: unknown; message?: string },
  status = 200
) {
  return NextResponse.json(payload, { status });
}

export function parseTradeDirection(value: unknown) {
  return value === TradeDirection.BUY || value === TradeDirection.SELL
    ? value
    : null;
}

export function parseTradeStatus(value: unknown) {
  return value === TradeStatus.OPEN ||
    value === TradeStatus.CLOSED ||
    value === TradeStatus.CANCELLED
    ? value
    : null;
}

export function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseNullableDate(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? false : date;
}

export function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function decimalValue(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(value) : undefined;
}

function roundDecimal(value: number, digits: number) {
  return Number(value.toFixed(digits));
}

export function calculateTradeMetrics(input: {
  status?: TradeStatus | null;
  direction?: TradeDirection | null;
  entryPrice?: unknown;
  exitPrice?: unknown;
  stopLoss?: unknown;
  lotSize?: unknown;
  profitLoss?: unknown;
  rr?: unknown;
}) {
  const data: { profitLoss?: string; rr?: string } = {};
  const direction = input.direction;
  const entryPrice = Number(input.entryPrice);
  const exitPrice = Number(input.exitPrice);
  const stopLoss = Number(input.stopLoss);
  const lotSize = Number(input.lotSize);
  const hasProfitLoss =
    input.profitLoss !== undefined &&
    input.profitLoss !== null &&
    input.profitLoss !== "";
  const hasRr = input.rr !== undefined && input.rr !== null && input.rr !== "";

  if (
    input.status === TradeStatus.CLOSED &&
    !hasProfitLoss &&
    direction &&
    Number.isFinite(entryPrice) &&
    Number.isFinite(exitPrice) &&
    Number.isFinite(lotSize)
  ) {
    // TODO: Replace with broker-specific contract size, pip value, commission, and swap formulas.
    const rawPnl =
      direction === TradeDirection.BUY
        ? (exitPrice - entryPrice) * lotSize
        : (entryPrice - exitPrice) * lotSize;
    data.profitLoss = String(roundDecimal(rawPnl, 2));
  }

  if (
    input.status === TradeStatus.CLOSED &&
    !hasRr &&
    direction &&
    Number.isFinite(entryPrice) &&
    Number.isFinite(exitPrice) &&
    Number.isFinite(stopLoss)
  ) {
    const risk =
      direction === TradeDirection.BUY ? entryPrice - stopLoss : stopLoss - entryPrice;
    const reward =
      direction === TradeDirection.BUY ? exitPrice - entryPrice : entryPrice - exitPrice;

    if (risk > 0) {
      data.rr = String(roundDecimal(reward / risk, 2));
    }
  }

  return data;
}

export function normalizeTagIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}
