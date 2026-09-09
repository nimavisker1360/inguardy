import type { ZodType } from "zod";
import {
  allTradeLockerAccountsSchema,
  tradeLockerAccountDetailsSchema,
  tradeLockerConfigSchema,
  tradeLockerExecutionsSchema,
  tradeLockerHistorySchema,
  tradeLockerInstrumentsSchema,
  tradeLockerOrderHistorySchema,
  tradeLockerOrdersSchema,
  tradeLockerPositionsSchema,
  tradeLockerStateSchema,
  tradeLockerTokenSchema,
  type TradeLockerEnvironment,
  type TradeLockerResolution,
} from "@/server/tradelocker/schemas";

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export type TradeLockerErrorCode =
  | "INVALID_CREDENTIALS"
  | "SERVER_NOT_FOUND"
  | "AUTH_FAILED"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INVALID_RESPONSE"
  | "REQUEST_FAILED";

export class TradeLockerApiError extends Error {
  constructor(
    public readonly code: TradeLockerErrorCode,
    public readonly status?: number,
    public readonly path?: string
  ) {
    super(path ? `${code}:${path}` : code);
    this.name = "TradeLockerApiError";
  }
}

export function tradeLockerBaseUrl(environment: TradeLockerEnvironment) {
  return environment === "LIVE"
    ? "https://live.tradelocker.com/backend-api"
    : "https://demo.tradelocker.com/backend-api";
}

function classifyStatus(status: number, authenticationRequest: boolean): TradeLockerApiError {
  if (status === 429) return new TradeLockerApiError("RATE_LIMITED", status);
  if (status === 401 || status === 403) return new TradeLockerApiError("AUTH_FAILED", status);
  if (authenticationRequest && status === 404) {
    return new TradeLockerApiError("SERVER_NOT_FOUND", status);
  }
  if (authenticationRequest && status === 400) {
    return new TradeLockerApiError("INVALID_CREDENTIALS", status);
  }
  if (status >= 500) return new TradeLockerApiError("UNAVAILABLE", status);
  return new TradeLockerApiError("REQUEST_FAILED", status);
}

async function requestJson<T>(input: {
  environment: TradeLockerEnvironment;
  path: string;
  schema: ZodType<T>;
  method?: "GET" | "POST";
  accessToken?: string;
  accNum?: string;
  body?: Record<string, string>;
  authenticationRequest?: boolean;
}) {
  const url = `${tradeLockerBaseUrl(input.environment)}${input.path}`;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const headers = new Headers({ Accept: "application/json" });
      if (input.body) headers.set("Content-Type", "application/json");
      if (input.accessToken) headers.set("Authorization", `Bearer ${input.accessToken}`);
      if (input.accNum) headers.set("accNum", input.accNum);
      const developerApiKey = process.env.TRADELOCKER_DEVELOPER_API_KEY?.trim();
      if (developerApiKey) headers.set("tl-developer-api-key", developerApiKey);
      const response = await fetch(url, {
        method: input.method || "GET",
        headers,
        body: input.body ? JSON.stringify(input.body) : undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const classified = classifyStatus(response.status, Boolean(input.authenticationRequest));
        if ((classified.code === "RATE_LIMITED" || classified.code === "UNAVAILABLE") && attempt < MAX_RETRIES) {
          const retryAfter = Number(response.headers.get("retry-after"));
          await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : 400 * 2 ** attempt));
          continue;
        }
        throw new TradeLockerApiError(classified.code, classified.status, input.path);
      }

      const parsed = input.schema.safeParse(await response.json());
      if (!parsed.success) throw new TradeLockerApiError("INVALID_RESPONSE", response.status);
      return parsed.data;
    } catch (error) {
      if (error instanceof TradeLockerApiError) throw error;
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
        continue;
      }
      throw new TradeLockerApiError("UNAVAILABLE");
    }
  }
  throw new TradeLockerApiError("UNAVAILABLE");
}

export function authenticateTradeLocker(input: {
  environment: TradeLockerEnvironment;
  email: string;
  password: string;
  server: string;
}) {
  return requestJson({
    environment: input.environment,
    path: "/auth/jwt/token",
    method: "POST",
    schema: tradeLockerTokenSchema,
    body: { email: input.email, password: input.password, server: input.server },
    authenticationRequest: true,
  });
}

export function refreshTradeLockerToken(input: {
  environment: TradeLockerEnvironment;
  refreshToken: string;
}) {
  return requestJson({
    environment: input.environment,
    path: "/auth/jwt/refresh",
    method: "POST",
    schema: tradeLockerTokenSchema,
    body: { refreshToken: input.refreshToken },
    authenticationRequest: true,
  });
}

export function getTradeLockerAccounts(environment: TradeLockerEnvironment, accessToken: string) {
  return requestJson({
    environment,
    path: "/auth/jwt/all-accounts",
    schema: allTradeLockerAccountsSchema,
    accessToken,
  });
}

function tradeRequest<T>(input: {
  environment: TradeLockerEnvironment;
  accessToken: string;
  accNum: string;
  path: string;
  schema: ZodType<T>;
}) {
  return requestJson(input);
}

export function getTradeLockerAccountDetails(environment: TradeLockerEnvironment, accessToken: string, accNum: string) {
  return tradeRequest({ environment, accessToken, accNum, path: "/trade/accounts", schema: tradeLockerAccountDetailsSchema });
}

export function getTradeLockerConfig(environment: TradeLockerEnvironment, accessToken: string, accNum: string) {
  return tradeRequest({ environment, accessToken, accNum, path: "/trade/config", schema: tradeLockerConfigSchema });
}

export function getTradeLockerAccountState(environment: TradeLockerEnvironment, accessToken: string, accNum: string, accountId: string) {
  return tradeRequest({ environment, accessToken, accNum, path: `/trade/accounts/${encodeURIComponent(accountId)}/state`, schema: tradeLockerStateSchema });
}

export function getTradeLockerPositions(environment: TradeLockerEnvironment, accessToken: string, accNum: string, accountId: string) {
  return tradeRequest({ environment, accessToken, accNum, path: `/trade/accounts/${encodeURIComponent(accountId)}/positions`, schema: tradeLockerPositionsSchema });
}

export function getTradeLockerOrders(environment: TradeLockerEnvironment, accessToken: string, accNum: string, accountId: string, from?: Date, to?: Date) {
  const parameters = new URLSearchParams();
  if (from) parameters.set("from", String(from.getTime()));
  if (to) parameters.set("to", String(to.getTime()));
  const query = parameters.size ? `?${parameters}` : "";
  return tradeRequest({ environment, accessToken, accNum, path: `/trade/accounts/${encodeURIComponent(accountId)}/orders${query}`, schema: tradeLockerOrdersSchema });
}

export function getTradeLockerOrderHistory(environment: TradeLockerEnvironment, accessToken: string, accNum: string, accountId: string, from: Date, to: Date) {
  const parameters = new URLSearchParams({ from: String(from.getTime()), to: String(to.getTime()) });
  return tradeRequest({ environment, accessToken, accNum, path: `/trade/accounts/${encodeURIComponent(accountId)}/ordersHistory?${parameters}`, schema: tradeLockerOrderHistorySchema });
}

export function getTradeLockerExecutions(environment: TradeLockerEnvironment, accessToken: string, accNum: string, accountId: string) {
  return tradeRequest({ environment, accessToken, accNum, path: `/trade/accounts/${encodeURIComponent(accountId)}/executions`, schema: tradeLockerExecutionsSchema });
}

export function getTradeLockerInstruments(environment: TradeLockerEnvironment, accessToken: string, accNum: string, accountId: string) {
  return tradeRequest({ environment, accessToken, accNum, path: `/trade/accounts/${encodeURIComponent(accountId)}/instruments`, schema: tradeLockerInstrumentsSchema });
}

export async function getTradeLockerPriceHistory(input: {
  environment: TradeLockerEnvironment;
  accessToken: string;
  accNum: string;
  tradableInstrumentId: string;
  routeId: string;
  resolution: TradeLockerResolution;
  from: Date;
  to: Date;
}) {
  const parameters = new URLSearchParams({
    tradableInstrumentId: input.tradableInstrumentId,
    routeId: input.routeId,
    resolution: input.resolution,
    from: String(input.from.getTime()),
    to: String(input.to.getTime()),
  });
  const response = await tradeRequest({
    environment: input.environment,
    accessToken: input.accessToken,
    accNum: input.accNum,
    path: `/trade/history?${parameters}`,
    schema: tradeLockerHistorySchema,
  });
  return (response.d?.barDetails || []).map((bar) => ({
    time: Math.floor(bar.t / 1000),
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  })).sort((left, right) => left.time - right.time);
}

export function rowsToRecords(columns: Array<{ id: string }>, rows: unknown[][]) {
  return rows.map((row) => Object.fromEntries(columns.map((column, index) => [column.id, row[index] ?? null])));
}

export function safeTradeLockerMessage(error: unknown) {
  if (!(error instanceof TradeLockerApiError)) return "Unable to connect to TradeLocker.";
  switch (error.code) {
    case "INVALID_CREDENTIALS": return "Invalid TradeLocker credentials.";
    case "SERVER_NOT_FOUND": return "TradeLocker server was not found.";
    case "AUTH_FAILED": return "TradeLocker authentication failed.";
    case "RATE_LIMITED": return "TradeLocker is receiving too many requests. Please try again shortly.";
    default: return "Unable to connect to TradeLocker.";
  }
}
