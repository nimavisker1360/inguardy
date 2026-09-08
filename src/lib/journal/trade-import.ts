import { Prisma, TradeDirection, TradeStatus } from "@prisma/client";
import { attachDefaultChecklistsToTrade } from "@/lib/checklists/trade-checklists";
import {
  calculateTradeMetrics,
  decimalValue,
} from "@/lib/journal/api-utils";
import {
  EXCEL_JOURNAL_IMPORT_SOURCE,
  MT5_HTML_IMPORT_SOURCE,
} from "@/lib/journal/trade-source";
import { prisma } from "@/lib/prisma";

export type TradeImportKind = "mt5-html" | "excel";

export type ImportedTradeRow = {
  ticket?: string | null;
  orderTicket?: string | null;
  dealTicket?: string | null;
  symbol?: string | null;
  direction?: string | null;
  entryMarker?: string | null;
  status?: string | null;
  entryTime?: string | null;
  exitTime?: string | null;
  entryPrice?: string | number | null;
  exitPrice?: string | number | null;
  stopLoss?: string | number | null;
  takeProfit?: string | number | null;
  lotSize?: string | number | null;
  riskAmount?: string | number | null;
  profitLoss?: string | number | null;
  commission?: string | number | null;
  swap?: string | number | null;
  rr?: string | number | null;
  setup?: string | null;
  session?: string | null;
  emotion?: string | null;
  mistakes?: string | null;
  notes?: string | null;
  accountName?: string | null;
  broker?: string | null;
  platform?: string | null;
  currency?: string | null;
};

export type TradeImportParseResult = {
  rows: ImportedTradeRow[];
  warnings: string[];
};

export type TradeImportSaveResult = {
  imported: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  warnings: string[];
};

const TEMPLATE_HEADERS = [
  "ticket",
  "symbol",
  "direction",
  "status",
  "entryTime",
  "exitTime",
  "entryPrice",
  "exitPrice",
  "stopLoss",
  "takeProfit",
  "lotSize",
  "riskAmount",
  "profitLoss",
  "commission",
  "swap",
  "rr",
  "setup",
  "session",
  "emotion",
  "mistakes",
  "notes",
  "accountName",
  "broker",
  "platform",
  "currency",
] as const;

const FIELD_ALIASES: Record<string, keyof ImportedTradeRow> = {
  account: "accountName",
  accountname: "accountName",
  accountnumber: "accountName",
  actualrr: "rr",
  broker: "broker",
  close: "exitPrice",
  closeprice: "exitPrice",
  closingprice: "exitPrice",
  closetime: "exitTime",
  closedat: "exitTime",
  comment: "notes",
  commission: "commission",
  currency: "currency",
  direction: "direction",
  emotion: "emotion",
  entry: "entryMarker",
  entryprice: "entryPrice",
  openingprice: "entryPrice",
  openprice: "entryPrice",
  entrytime: "entryTime",
  deal: "dealTicket",
  dealid: "dealTicket",
  dealticket: "dealTicket",
  exittime: "exitTime",
  exitprice: "exitPrice",
  lotsize: "lotSize",
  mistakes: "mistakes",
  mt5ticket: "ticket",
  notes: "notes",
  opentime: "entryTime",
  openedat: "entryTime",
  order: "orderTicket",
  orderid: "orderTicket",
  orderticket: "orderTicket",
  platform: "platform",
  pnl: "profitLoss",
  position: "ticket",
  positionid: "ticket",
  profit: "profitLoss",
  profitloss: "profitLoss",
  rr: "rr",
  riskamount: "riskAmount",
  server: "platform",
  servername: "platform",
  session: "session",
  setup: "setup",
  side: "direction",
  sl: "stopLoss",
  sll: "stopLoss",
  status: "status",
  stop: "stopLoss",
  stoploss: "stopLoss",
  stoplossprice: "stopLoss",
  swap: "swap",
  symbol: "symbol",
  takeprofit: "takeProfit",
  takeprofitprice: "takeProfit",
  ticket: "ticket",
  tp: "takeProfit",
  tpp: "takeProfit",
  type: "direction",
  volume: "lotSize",
};

function cleanCell(value: string) {
  return decodeHtml(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBlankImportValue(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();

  return (
    !text ||
    text === "-" ||
    text === "--" ||
    text === "—" ||
    text === "n/a" ||
    text === "na" ||
    text === "null"
  );
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) =>
      String.fromCharCode(Number.parseInt(code, 16))
    );
}

function normalizedHeader(value: string) {
  return cleanCell(value)
    .toLowerCase()
    .replace(/\((.*?)\)/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function headerToField(
  header: string,
  used: Set<keyof ImportedTradeRow>
): keyof ImportedTradeRow | null {
  const key = normalizedHeader(header);

  if (!key) {
    return null;
  }

  if (key === "time" || key.endsWith("time")) {
    return used.has("entryTime") ? "exitTime" : "entryTime";
  }

  if (key === "direction") {
    return used.has("direction") ? "entryMarker" : "direction";
  }

  if (key === "price") {
    return used.has("entryPrice") ? "exitPrice" : "entryPrice";
  }

  if (key === "sl" || key === "s/l" || key === "stoploss") {
    return "stopLoss";
  }

  if (key === "tp" || key === "t/p" || key === "takeprofit") {
    return "takeProfit";
  }

  return FIELD_ALIASES[key] || null;
}

function mapCellsToRow(headers: string[], cells: string[]) {
  const row: ImportedTradeRow = {};
  const used = new Set<keyof ImportedTradeRow>();

  headers.forEach((header, index) => {
    const field = headerToField(header, used);

    if (!field) {
      return;
    }

    used.add(field);
    const value = cleanCell(cells[index] || "");

    if (value && isBlankImportValue(row[field])) {
      row[field] = value;
    }
  });

  return normalizeMt5Row(row);
}

function hasTradeShape(row: ImportedTradeRow) {
  return Boolean(
    row.symbol &&
      (row.direction || row.entryMarker) &&
      (row.entryPrice || row.exitPrice || row.profitLoss || row.stopLoss || row.takeProfit)
  );
}

function normalizedMarker(value: unknown) {
  const text = String(value ?? "").trim().toLowerCase();

  if (["in", "entry", "open", "in/out"].includes(text)) {
    return "in";
  }

  if (["out", "exit", "close"].includes(text)) {
    return "out";
  }

  return null;
}

function normalizeMt5Row(row: ImportedTradeRow) {
  const normalized: ImportedTradeRow = { ...row };

  if (!parseDirection(normalized.direction) && normalizedMarker(normalized.direction)) {
    normalized.entryMarker = normalized.direction;
    normalized.direction = null;
  }

  const marker = normalizedMarker(normalized.entryMarker);

  if (marker === "out") {
    normalized.exitTime = normalized.exitTime || normalized.entryTime;
    normalized.exitPrice = normalized.exitPrice || normalized.entryPrice;
    normalized.entryTime = null;
    normalized.entryPrice = null;
  }

  return normalized;
}

function looksLikeHeader(cells: string[]) {
  const mapped = new Set<keyof ImportedTradeRow>();

  for (const cell of cells) {
    const field = headerToField(cell, mapped);

    if (field) {
      mapped.add(field);
    }
  }

  return mapped.has("symbol") && (mapped.has("direction") || mapped.has("entryTime"));
}

function isHiddenHtmlCell(attrs: string) {
  return (
    /\bclass\s*=\s*["'][^"']*\bhidden\b/i.test(attrs) ||
    /\bstyle\s*=\s*["'][^"']*display\s*:\s*none/i.test(attrs)
  );
}

function extractHtmlCells(rowHtml: string) {
  return Array.from(rowHtml.matchAll(/<(?:td|th)\b([^>]*)>([\s\S]*?)<\/(?:td|th)>/gi))
    .filter((match) => !isHiddenHtmlCell(match[1] || ""))
    .map((match) => cleanCell(match[2]));
}

function mt5SectionName(cells: string[]) {
  if (cells.length !== 1) {
    return null;
  }

  const key = normalizedHeader(cells[0]);

  if (key === "positions" || key === "orders" || key === "deals") {
    return key;
  }

  return null;
}

function parseHtmlRows(content: string): ImportedTradeRow[] {
  const rows: ImportedTradeRow[] = [];
  const rowMatches = content
    .split(/<tr\b/i)
    .slice(1)
    .map((row) => `<tr${row}`);
  let headers: string[] = [];
  let section: string | null = null;
  let hasMt5Sections = false;

  for (const rowHtml of rowMatches) {
    const cells = extractHtmlCells(rowHtml);

    if (cells.length < 2) {
      const nextSection = mt5SectionName(cells);

      if (nextSection) {
        section = nextSection;
        hasMt5Sections = true;
        headers = [];
      }

      continue;
    }

    if (hasMt5Sections && section !== "positions") {
      continue;
    }

    if (looksLikeHeader(cells)) {
      headers = cells;
      continue;
    }

    if (headers.length === 0) {
      continue;
    }

    const row = mapCellsToRow(headers, cells);

    if (hasTradeShape(row)) {
      rows.push(row);
    }
  }

  return rows;
}

function parseSpreadsheetXmlRows(content: string): ImportedTradeRow[] {
  const rows = Array.from(content.matchAll(/<Row\b[\s\S]*?<\/Row>/gi)).map((rowMatch) => {
    const cells: string[] = [];
    let columnIndex = 0;

    for (const cellMatch of rowMatch[0].matchAll(/<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi)) {
      const attrs = cellMatch[1] || "";
      const explicitIndex = attrs.match(/\b(?:ss:)?Index=["'](\d+)["']/i)?.[1];

      if (explicitIndex) {
        columnIndex = Math.max(Number(explicitIndex) - 1, 0);
      }

      const data = cellMatch[2].match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i)?.[1] || "";
      cells[columnIndex] = cleanCell(data);
      columnIndex += 1;
    }

    return cells.map((cell) => cell || "");
  });
  const headerRow = rows.findIndex((row) => looksLikeHeader(row));

  if (headerRow === -1) {
    return [];
  }

  const headers = rows[headerRow];

  return rows
    .slice(headerRow + 1)
    .map((row) => mapCellsToRow(headers, row))
    .filter(hasTradeShape);
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(cell.trim());
      cell = "";
      continue;
    }

    cell += char;
  }

  cells.push(cell.trim());
  return cells;
}

function parseCsvRows(content: string): ImportedTradeRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line) => looksLikeHeader(parseCsvLine(line)));

  if (headerIndex === -1) {
    return [];
  }

  const headers = parseCsvLine(lines[headerIndex]);

  return lines
    .slice(headerIndex + 1)
    .map((line) => mapCellsToRow(headers, parseCsvLine(line)))
    .filter(hasTradeShape);
}

export function parseImportedTrades(
  kind: TradeImportKind,
  content: string
): TradeImportParseResult {
  const warnings: string[] = [];
  let rows: ImportedTradeRow[] = [];

  if (kind === "mt5-html") {
    rows = parseHtmlRows(content);
  } else if (content.includes("<Workbook") || content.includes("<ss:Workbook")) {
    rows = parseSpreadsheetXmlRows(content);
  } else {
    rows = parseCsvRows(content);
    warnings.push("CSV-compatible Excel content was detected.");
  }

  if (rows.length === 0) {
    warnings.push("No trade rows were detected in the uploaded file.");
  }

  return { rows: mergeImportedRows(rows, kind), warnings };
}

function optionalString(value: unknown) {
  if (isBlankImportValue(value)) {
    return null;
  }

  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseDirection(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (
    ["buy", "long", "b"].includes(normalized) ||
    normalized.startsWith("buy ")
  ) {
    return TradeDirection.BUY;
  }

  if (
    ["sell", "short", "s"].includes(normalized) ||
    normalized.startsWith("sell ")
  ) {
    return TradeDirection.SELL;
  }

  return null;
}

function inferDirectionFromPrices(input: {
  direction: TradeDirection | null;
  entryPrice?: string | null;
  exitPrice?: string | null;
  profitLoss?: string | null;
}) {
  const entry = numericValue(input.entryPrice);
  const exit = numericValue(input.exitPrice);
  const profit = numericValue(input.profitLoss);

  if (entry === null || exit === null || profit === null || profit === 0) {
    return input.direction;
  }

  if (profit > 0) {
    return exit > entry ? TradeDirection.BUY : TradeDirection.SELL;
  }

  return exit > entry ? TradeDirection.SELL : TradeDirection.BUY;
}

function mergeKey(row: ImportedTradeRow) {
  const ticket = optionalString(row.ticket);

  if (ticket) {
    return `ticket:${ticket}`;
  }

  const symbol = optionalString(row.symbol)?.toUpperCase();
  const direction = parseDirection(row.direction);
  const entryTime = optionalString(row.entryTime);
  const entryPrice = parseNumberString(row.entryPrice);

  if (symbol && direction && entryTime && entryPrice) {
    return `fallback:${symbol}:${direction}:${entryTime}:${entryPrice}`;
  }

  return null;
}

function hasStopOrTarget(row: ImportedTradeRow) {
  return !isBlankImportValue(row.stopLoss) || !isBlankImportValue(row.takeProfit);
}

function numericValue(value: unknown) {
  const parsed = parseNumberString(value);

  if (parsed === undefined) {
    return null;
  }

  const number = Number(parsed);
  return Number.isFinite(number) ? number : null;
}

function isMt5DetailOnlyRow(row: ImportedTradeRow) {
  const profit = numericValue(row.profitLoss);

  return hasStopOrTarget(row) && (profit === null || profit === 0);
}

function sameSymbol(left: ImportedTradeRow, right: ImportedTradeRow) {
  const leftSymbol = optionalString(left.symbol)?.toUpperCase();
  const rightSymbol = optionalString(right.symbol)?.toUpperCase();

  return Boolean(leftSymbol && rightSymbol && leftSymbol === rightSymbol);
}

function sameLotSize(left: ImportedTradeRow, right: ImportedTradeRow) {
  const leftLot = numericValue(left.lotSize);
  const rightLot = numericValue(right.lotSize);

  return leftLot === null || rightLot === null || Math.abs(leftLot - rightLot) < 0.000001;
}

function sameDirection(left: ImportedTradeRow, right: ImportedTradeRow) {
  const leftDirection = parseDirection(left.direction);
  const rightDirection = parseDirection(right.direction);

  return !leftDirection || !rightDirection || leftDirection === rightDirection;
}

function isExitRow(row: ImportedTradeRow) {
  return normalizedMarker(row.entryMarker) === "out" || Boolean(row.exitPrice && !row.entryPrice);
}

function mergeMt5InOutRows(rows: ImportedTradeRow[]) {
  const entries = rows
    .filter((row) => !isExitRow(row))
    .map((row) => ({ ...row }));
  const exits = rows.filter(isExitRow);
  const usedExitIndexes = new Set<number>();

  for (const entry of entries) {
    if (entry.exitPrice || !entry.entryPrice || !parseDirection(entry.direction)) {
      continue;
    }

    const exitIndex = exits.findIndex((exit, index) => {
      if (usedExitIndexes.has(index)) {
        return false;
      }

      return sameSymbol(entry, exit) && sameLotSize(entry, exit) && Boolean(exit.exitPrice || exit.profitLoss);
    });

    if (exitIndex === -1) {
      continue;
    }

    const exit = exits[exitIndex];
    usedExitIndexes.add(exitIndex);
    entry.exitPrice = entry.exitPrice || exit.exitPrice;
    entry.exitTime = entry.exitTime || exit.exitTime;
    entry.profitLoss = entry.profitLoss || exit.profitLoss;
    entry.commission = entry.commission || exit.commission;
    entry.swap = entry.swap || exit.swap;
    entry.ticket = entry.ticket || exit.ticket;
    entry.orderTicket = entry.orderTicket || exit.orderTicket;
  }

  return entries;
}

function mergeMt5DetailRows(rows: ImportedTradeRow[]) {
  const resultRows: ImportedTradeRow[] = [];
  const detailRows: ImportedTradeRow[] = [];

  for (const row of mergeMt5InOutRows(rows)) {
    if (isMt5DetailOnlyRow(row)) {
      detailRows.push(row);
    } else {
      resultRows.push({ ...row });
    }
  }

  const usedDetailIndexes = new Set<number>();

  for (const row of resultRows) {
    const symbol = optionalString(row.symbol)?.toUpperCase();

    if (!symbol || hasStopOrTarget(row)) {
      continue;
    }

    const detailIndex = detailRows.findIndex((detail, index) => {
      if (usedDetailIndexes.has(index)) {
        return false;
      }

      return sameSymbol(row, detail) && sameLotSize(row, detail) && sameDirection(row, detail);
    });

    if (detailIndex === -1) {
      continue;
    }

    const detail = detailRows[detailIndex];
    usedDetailIndexes.add(detailIndex);

    for (const field of [
      "stopLoss",
      "takeProfit",
      "lotSize",
      "riskAmount",
      "setup",
      "session",
      "emotion",
      "mistakes",
      "notes",
    ] as const) {
      if (isBlankImportValue(row[field]) && !isBlankImportValue(detail[field])) {
        row[field] = detail[field] as never;
      }
    }
  }

  return resultRows;
}

function mergeImportedRows(rows: ImportedTradeRow[], kind: TradeImportKind) {
  const merged = new Map<string, ImportedTradeRow>();
  const looseRows: ImportedTradeRow[] = [];
  const sourceRows =
    kind === "mt5-html"
      ? mergeMt5DetailRows(rows).filter((row) => {
          const profit = numericValue(row.profitLoss);

          return profit !== null && Boolean(row.exitPrice);
        })
      : rows;

  for (const row of sourceRows) {
    const key = mergeKey(row);

    if (!key) {
      looseRows.push(row);
      continue;
    }

    const existing = merged.get(key);

    if (!existing) {
      merged.set(key, { ...row });
      continue;
    }

    for (const field of Object.keys(row) as Array<keyof ImportedTradeRow>) {
      if (isBlankImportValue(existing[field]) && !isBlankImportValue(row[field])) {
        existing[field] = row[field] as never;
      }
    }
  }

  return [...merged.values(), ...looseRows];
}

function parseStatus(value: unknown, row: ImportedTradeRow) {
  if (isBlankImportValue(value)) {
    return row.exitTime || row.exitPrice || row.profitLoss
      ? TradeStatus.CLOSED
      : TradeStatus.OPEN;
  }

  const normalized = String(value ?? "").trim().toUpperCase();

  if (normalized === "OPEN" || normalized === "CLOSED" || normalized === "CANCELLED") {
    return normalized as TradeStatus;
  }

  return row.exitTime || row.exitPrice || row.profitLoss
    ? TradeStatus.CLOSED
    : TradeStatus.OPEN;
}

function parseNumberString(value: unknown) {
  if (isBlankImportValue(value)) {
    return undefined;
  }

  const text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(/[^\d.,+\-]/g, "");

  if (!text) {
    return undefined;
  }

  const decimalComma =
    text.includes(",") &&
    (!text.includes(".") || text.lastIndexOf(",") > text.lastIndexOf("."));
  const normalized = decimalComma
    ? text.replace(/\./g, "").replace(",", ".")
    : text.replace(/,/g, "");

  return decimalValue(normalized);
}

function parseDateValue(value: unknown) {
  if (isBlankImportValue(value)) {
    return undefined;
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return undefined;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const serial = Number(text);

    if (serial > 20_000 && serial < 80_000) {
      const excelEpoch = Date.UTC(1899, 11, 30);
      const date = new Date(excelEpoch + serial * 86_400_000);

      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const native = new Date(text);

  if (!Number.isNaN(native.getTime())) {
    return native;
  }

  const match = text.match(
    /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );

  if (!match) {
    return null;
  }

  const a = Number(match[1]);
  const b = Number(match[2]);
  const c = Number(match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);
  const year = match[1].length === 4 ? a : c;
  const month = b;
  const day = match[1].length === 4 ? c : a;
  const date = new Date(year, month - 1, day, hour, minute, second);

  return Number.isNaN(date.getTime()) ? null : date;
}

function decimalOrNull(value: unknown) {
  return parseNumberString(value) ?? null;
}

function validateRow(row: ImportedTradeRow, index: number, kind: TradeImportKind) {
  const errors: string[] = [];
  const symbol = optionalString(row.symbol)?.toUpperCase();
  const status = parseStatus(row.status, row);
  const openedAt = parseDateValue(row.entryTime);
  const closedAt = parseDateValue(row.exitTime);
  const entryPrice = parseNumberString(row.entryPrice);
  const exitPrice = decimalOrNull(row.exitPrice);
  const profitLoss = decimalOrNull(row.profitLoss);
  const direction = inferDirectionFromPrices({
    direction: parseDirection(row.direction),
    entryPrice,
    exitPrice,
    profitLoss,
  });

  if (!symbol || !direction || !entryPrice) {
    return { errors, skipped: true };
  }

  if (!openedAt) {
    errors.push(`Row ${index}: entryTime is required and must be a valid date`);
  }

  if (openedAt === null) {
    errors.push(`Row ${index}: entryTime is invalid`);
  }

  if (errors.length > 0 || !symbol || !direction || !openedAt || !entryPrice) {
    return { errors };
  }

  return {
    errors,
    data: {
      symbol,
      direction,
      status,
      openedAt,
      closedAt: closedAt && closedAt !== null ? closedAt : null,
      entryPrice,
      exitPrice,
      stopLoss: decimalOrNull(row.stopLoss),
      takeProfit: decimalOrNull(row.takeProfit),
      lotSize: decimalOrNull(row.lotSize),
      riskAmount: decimalOrNull(row.riskAmount),
      profitLoss,
      commission: decimalOrNull(row.commission),
      swap: decimalOrNull(row.swap),
      rr: kind === "mt5-html" ? null : decimalOrNull(row.rr),
      mt5Ticket:
        optionalString(row.ticket) ||
        optionalString(row.orderTicket) ||
        optionalString(row.dealTicket),
      setup: optionalString(row.setup),
      session: optionalString(row.session),
      emotion: optionalString(row.emotion),
      mistake: optionalString(row.mistakes),
      notes: optionalString(row.notes),
    },
  };
}

async function ensureImportAccount(
  tx: Prisma.TransactionClient,
  userId: string,
  row: ImportedTradeRow,
  fallbackName: string,
  kind: TradeImportKind
) {
  const name = optionalString(row.accountName) || fallbackName;
  const broker =
    optionalString(row.broker) || (kind === "mt5-html" ? "MetaTrader 5" : "Manual Excel");
  const platform =
    optionalString(row.platform) || (kind === "mt5-html" ? "MT5 Report" : "Excel Journal");

  const existing = await tx.tradingAccount.findFirst({
    where: {
      userId,
      name,
      broker,
      platform,
    },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const account = await tx.tradingAccount.create({
    data: {
      userId,
      name,
      broker,
      platform,
      currency: optionalString(row.currency) || "USD",
    },
    select: { id: true },
  });

  return account.id;
}

export async function importTradesForUser(input: {
  userId: string;
  kind: TradeImportKind;
  rows: ImportedTradeRow[];
  fallbackAccountName: string;
}) {
  const result: TradeImportSaveResult = {
    imported: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };
  const source =
    input.kind === "mt5-html" ? MT5_HTML_IMPORT_SOURCE : EXCEL_JOURNAL_IMPORT_SOURCE;
  const limitedRows = input.rows.slice(0, 500);

  if (input.rows.length > limitedRows.length) {
    result.warnings.push("Only the first 500 rows were imported.");
  }

  const mt5Tickets =
    input.kind === "mt5-html"
      ? Array.from(
          new Set(
            limitedRows
              .map(
                (row) =>
                  optionalString(row.ticket) ||
                  optionalString(row.orderTicket) ||
                  optionalString(row.dealTicket)
              )
              .filter((ticket): ticket is string => Boolean(ticket))
          )
        )
      : [];
  const mt5Dates =
    input.kind === "mt5-html"
      ? limitedRows
          .flatMap((row) => [parseDateValue(row.entryTime), parseDateValue(row.exitTime)])
          .filter((date): date is Date => date instanceof Date)
      : [];
  const mt5DateRange =
    mt5Dates.length > 0
      ? {
          gte: new Date(Math.min(...mt5Dates.map((date) => date.getTime()))),
          lte: new Date(Math.max(...mt5Dates.map((date) => date.getTime()))),
        }
      : null;

  await prisma.$transaction(async (tx) => {
    const cleanedAccountIds = new Set<string>();

    for (const [zeroIndex, row] of limitedRows.entries()) {
      const index = zeroIndex + 2;
      const validated = validateRow(row, index, input.kind);

      if (validated.skipped) {
        result.skipped += 1;
        continue;
      }

      if (validated.errors.length > 0 || !validated.data) {
        result.skipped += 1;
        result.errors.push(...validated.errors);
        continue;
      }

      const accountId = await ensureImportAccount(
        tx,
        input.userId,
        row,
        input.fallbackAccountName,
        input.kind
      );

      if (input.kind === "mt5-html" && !cleanedAccountIds.has(accountId)) {
        const cleanupConditions: Prisma.TradeWhereInput[] = [
          {
            profitLoss: "0",
            exitPrice: null,
          },
        ];

        if (mt5Tickets.length > 0 && mt5DateRange) {
          cleanupConditions.push({
            mt5Ticket: { notIn: mt5Tickets },
            openedAt: mt5DateRange,
          });
        }

        await tx.trade.deleteMany({
          where: {
            userId: input.userId,
            accountId,
            source: MT5_HTML_IMPORT_SOURCE,
            OR: cleanupConditions,
          },
        });
        cleanedAccountIds.add(accountId);
      }

      const metrics = calculateTradeMetrics(validated.data);
      const data = {
        userId: input.userId,
        accountId,
        source,
        symbol: validated.data.symbol,
        direction: validated.data.direction,
        status: validated.data.status,
        entryPrice: validated.data.entryPrice,
        exitPrice: validated.data.exitPrice,
        stopLoss: validated.data.stopLoss,
        takeProfit: validated.data.takeProfit,
        initialStopLoss: validated.data.stopLoss,
        initialTakeProfit: validated.data.takeProfit,
        currentStopLoss: validated.data.stopLoss,
        currentTakeProfit: validated.data.takeProfit,
        lotSize: validated.data.lotSize,
        riskAmount: validated.data.riskAmount,
        profitLoss: validated.data.profitLoss ?? metrics.profitLoss ?? null,
        commission: validated.data.commission,
        swap: validated.data.swap,
        rr: validated.data.rr ?? metrics.rr ?? null,
        mt5Ticket: validated.data.mt5Ticket,
        setup: validated.data.setup,
        session: validated.data.session,
        emotion: validated.data.emotion,
        mistake: validated.data.mistake,
        notes: validated.data.notes,
        openedAt: validated.data.openedAt,
        closedAt: validated.data.closedAt,
      };
      const existing = await tx.trade.findFirst({
        where: {
          userId: input.userId,
          accountId,
          OR: [
            ...(data.mt5Ticket ? [{ mt5Ticket: data.mt5Ticket }] : []),
            {
              source,
              symbol: data.symbol,
              direction: data.direction,
              openedAt: data.openedAt,
              entryPrice: data.entryPrice,
            },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        await tx.trade.update({
          where: { id: existing.id },
          data,
        });
        result.updated += 1;
      } else {
        const trade = await tx.trade.create({ data });
        await attachDefaultChecklistsToTrade(tx, trade.id);
        result.created += 1;
      }

      result.imported += 1;
    }
  });

  return result;
}

function xmlCell(value: string) {
  const escaped = value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return `<Cell><Data ss:Type="String">${escaped}</Data></Cell>`;
}

export function buildJournalExcelTemplate() {
  const sample = [
    "J-1001",
    "XAUUSD",
    "BUY",
    "CLOSED",
    "2026-07-22 09:30:00",
    "2026-07-22 10:45:00",
    "2415.50",
    "2422.10",
    "2411.00",
    "2425.00",
    "0.10",
    "45",
    "66",
    "-3.50",
    "0",
    "1.45",
    "London breakout",
    "London",
    "Calm",
    "",
    "Waited for confirmation before entry.",
    "Manual Excel Journal",
    "Manual",
    "Excel",
    "USD",
  ];
  const rows = [
    `<Row>${TEMPLATE_HEADERS.map((header) => xmlCell(header)).join("")}</Row>`,
    `<Row>${sample.map((value) => xmlCell(value)).join("")}</Row>`,
  ].join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Worksheet ss:Name="Trades">
  <Table>${rows}</Table>
 </Worksheet>
</Workbook>`;
}
