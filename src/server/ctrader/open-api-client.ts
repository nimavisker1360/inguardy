import tls from "tls";
import { StringDecoder } from "string_decoder";
import { getCtraderConfig } from "@/server/ctrader/config";

const JSON_PORT = 5036;
const MAX_MESSAGE_BYTES = 16 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

export const CtraderPayload = {
  APPLICATION_AUTH_REQ: 2100,
  APPLICATION_AUTH_RES: 2101,
  ACCOUNT_AUTH_REQ: 2102,
  ACCOUNT_AUTH_RES: 2103,
  ASSET_LIST_REQ: 2112,
  ASSET_LIST_RES: 2113,
  SYMBOLS_LIST_REQ: 2114,
  SYMBOLS_LIST_RES: 2115,
  SYMBOL_BY_ID_REQ: 2116,
  SYMBOL_BY_ID_RES: 2117,
  TRADER_REQ: 2121,
  TRADER_RES: 2122,
  RECONCILE_REQ: 2124,
  RECONCILE_RES: 2125,
  DEAL_LIST_REQ: 2133,
  DEAL_LIST_RES: 2134,
  GET_TRENDBARS_REQ: 2137,
  GET_TRENDBARS_RES: 2138,
  ERROR_RES: 2142,
  GET_ACCOUNTS_REQ: 2149,
  GET_ACCOUNTS_RES: 2150,
  POSITION_UNREALIZED_PNL_REQ: 2187,
  POSITION_UNREALIZED_PNL_RES: 2188,
  HEARTBEAT: 51,
} as const;

export type CtraderEnvironment = "live" | "demo";
export type CtraderJson = Record<string, unknown>;

export type CtraderAccountDescriptor = {
  ctidTraderAccountId: string | number;
  isLive?: boolean;
  traderLogin?: string | number;
  brokerTitleShort?: string;
};

export type CtraderLightSymbol = {
  symbolId: string | number;
  symbolName?: string;
};

export type CtraderSymbol = {
  symbolId: string | number;
  lotSize?: string | number;
};

export type CtraderAsset = {
  assetId: string | number;
  name: string;
};

export type CtraderTrader = {
  ctidTraderAccountId: string | number;
  balance: string | number;
  depositAssetId: string | number;
  traderLogin?: string | number;
  brokerName?: string;
  registrationTimestamp?: string | number;
  moneyDigits?: number;
};

export type CtraderDeal = {
  dealId: string | number;
  orderId?: string | number;
  positionId: string | number;
  volume: string | number;
  filledVolume?: string | number;
  symbolId: string | number;
  executionTimestamp: string | number;
  executionPrice?: number;
  tradeSide: string | number;
  dealStatus: string | number;
  commission?: string | number;
  moneyDigits?: number;
  closePositionDetail?: {
    entryPrice: number;
    grossProfit: string | number;
    swap: string | number;
    commission: string | number;
    closedVolume?: string | number;
    moneyDigits?: number;
    pnlConversionFee?: string | number;
  };
};

export type CtraderPosition = {
  positionId: string | number;
  tradeData: {
    symbolId: string | number;
    volume: string | number;
    tradeSide: string | number;
    openTimestamp?: string | number;
  };
  positionStatus: string | number;
  swap: string | number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  commission?: string | number;
  moneyDigits?: number;
};

export type CtraderPositionPnl = {
  positionId: string | number;
  grossUnrealizedPnL: string | number;
  netUnrealizedPnL: string | number;
};

export type CtraderTrendbar = {
  volume: string | number;
  period?: string | number;
  low?: string | number;
  deltaOpen?: string | number;
  deltaClose?: string | number;
  deltaHigh?: string | number;
  utcTimestampInMinutes?: string | number;
};

export type CtraderChartBar = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type PendingRequest = {
  resolve: (payload: CtraderJson) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

function protocolInteger(value: string | number) {
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) ? numeric : String(value);
}

export class CtraderOpenApiError extends Error {
  constructor(message: string, public readonly code = "CTRADER_OPEN_API_ERROR") {
    super(message);
    this.name = "CtraderOpenApiError";
  }
}

export class CtraderOpenApiClient {
  private socket: tls.TLSSocket | null = null;
  private jsonBuffer = "";
  private decoder = new StringDecoder("utf8");
  private pending = new Map<string, PendingRequest>();
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private readonly environment: CtraderEnvironment) {}

  async connect() {
    if (this.socket) return;
    const host = `${this.environment}.ctraderapi.com`;
    await new Promise<void>((resolve, reject) => {
      const socket = tls.connect({ host, port: JSON_PORT, servername: host }, () => {
        this.socket = socket;
        socket.setNoDelay(true);
        this.heartbeat = setInterval(() => this.send(CtraderPayload.HEARTBEAT, {}), 10_000);
        resolve();
      });
      socket.once("error", reject);
      socket.on("data", (chunk) => this.onData(chunk));
      socket.on("error", (error) => this.failAll(error));
      socket.on("close", () => this.failAll(new Error("cTrader connection closed")));
    });
  }

  async authenticateApplication() {
    const { clientId, clientSecret } = getCtraderConfig();
    await this.request(
      CtraderPayload.APPLICATION_AUTH_REQ,
      { clientId, clientSecret },
      CtraderPayload.APPLICATION_AUTH_RES
    );
  }

  async authenticateAccount(ctidTraderAccountId: string, accessToken: string) {
    await this.request(
      CtraderPayload.ACCOUNT_AUTH_REQ,
      { ctidTraderAccountId: protocolInteger(ctidTraderAccountId), accessToken },
      CtraderPayload.ACCOUNT_AUTH_RES
    );
  }

  request(payloadType: number, payload: CtraderJson, expectedPayloadType: number) {
    if (!this.socket) return Promise.reject(new Error("cTrader client is not connected"));
    const clientMsgId = crypto.randomUUID();

    return new Promise<CtraderJson>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(clientMsgId);
        reject(new CtraderOpenApiError("cTrader request timed out", "CTRADER_TIMEOUT"));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(clientMsgId, {
        resolve: (response) => {
          if (Number(response.payloadType) !== expectedPayloadType) {
            reject(new CtraderOpenApiError("Unexpected cTrader response"));
            return;
          }
          resolve(response);
        },
        reject,
        timer,
      });
      this.send(payloadType, payload, clientMsgId);
    });
  }

  close() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.socket?.end();
    this.socket = null;
  }

  private send(payloadType: number, payload: CtraderJson, clientMsgId = crypto.randomUUID()) {
    if (!this.socket) return;
    const body = Buffer.from(JSON.stringify({ clientMsgId, payloadType, payload }), "utf8");
    this.socket.write(body);
  }

  private onData(chunk: Buffer) {
    this.jsonBuffer += this.decoder.write(chunk);
    if (Buffer.byteLength(this.jsonBuffer, "utf8") > MAX_MESSAGE_BYTES) {
      this.failAll(new CtraderOpenApiError("cTrader response exceeded the safe limit"));
      this.close();
      return;
    }

    while (this.jsonBuffer) {
      const start = this.jsonBuffer.indexOf("{");
      if (start < 0) {
        this.jsonBuffer = "";
        return;
      }
      if (start > 0) this.jsonBuffer = this.jsonBuffer.slice(start);
      let depth = 0;
      let inString = false;
      let escaped = false;
      let end = -1;
      for (let index = 0; index < this.jsonBuffer.length; index += 1) {
        const character = this.jsonBuffer[index];
        if (inString) {
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === '"') inString = false;
          continue;
        }
        if (character === '"') inString = true;
        else if (character === "{") depth += 1;
        else if (character === "}") {
          depth -= 1;
          if (depth === 0) {
            end = index + 1;
            break;
          }
        }
      }
      if (end < 0) return;
      const raw = this.jsonBuffer.slice(0, end);
      this.jsonBuffer = this.jsonBuffer.slice(end);
      try {
        this.onMessage(JSON.parse(raw) as CtraderJson);
      } catch {
        this.failAll(new CtraderOpenApiError("Invalid cTrader JSON response"));
      }
    }
  }

  private onMessage(message: CtraderJson) {
    const clientMsgId = typeof message.clientMsgId === "string" ? message.clientMsgId : "";
    if (!clientMsgId) return;
    const pending = this.pending.get(clientMsgId);
    if (!pending) return;
    this.pending.delete(clientMsgId);
    clearTimeout(pending.timer);

    const payload = (message.payload && typeof message.payload === "object"
      ? message.payload
      : {}) as CtraderJson;
    const response = { ...payload, payloadType: message.payloadType };
    if (Number(message.payloadType) === CtraderPayload.ERROR_RES) {
      pending.reject(
        new CtraderOpenApiError(
          String(payload.description || payload.errorCode || "cTrader Open API error"),
          String(payload.errorCode || "CTRADER_OPEN_API_ERROR")
        )
      );
      return;
    }
    pending.resolve(response);
  }

  private failAll(error: Error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

const TRENDBAR_PERIODS = {
  M1: 1,
  M2: 2,
  M3: 3,
  M4: 4,
  M5: 5,
  M10: 6,
  M15: 7,
  M30: 8,
  H1: 9,
  H4: 10,
  H12: 11,
  D1: 12,
  W1: 13,
  MN1: 14,
} as const;

export type CtraderTrendbarPeriod = keyof typeof TRENDBAR_PERIODS;

export function normalizeCtraderTrendbars(trendbars: CtraderTrendbar[]): CtraderChartBar[] {
  return trendbars
    .map((bar) => {
      const lowRelative = Number(bar.low);
      const timestampMinutes = Number(bar.utcTimestampInMinutes);
      if (!Number.isFinite(lowRelative) || !Number.isFinite(timestampMinutes)) return null;
      const price = (delta: unknown) => (lowRelative + Number(delta || 0)) / 100_000;
      return {
        time: timestampMinutes * 60,
        open: price(bar.deltaOpen),
        high: price(bar.deltaHigh),
        low: lowRelative / 100_000,
        close: price(bar.deltaClose),
        volume: Number(bar.volume) || 0,
      };
    })
    .filter((bar): bar is CtraderChartBar => bar !== null)
    .sort((left, right) => left.time - right.time);
}

export async function fetchCtraderTrendbars(input: {
  environment: CtraderEnvironment;
  ctidTraderAccountId: string;
  accessToken: string;
  symbolId: string;
  period: CtraderTrendbarPeriod;
  from: Date;
  to: Date;
  count: number;
}) {
  const client = new CtraderOpenApiClient(input.environment);
  try {
    await client.connect();
    await client.authenticateApplication();
    await client.authenticateAccount(input.ctidTraderAccountId, input.accessToken);
    const response = await client.request(
      CtraderPayload.GET_TRENDBARS_REQ,
      {
        ctidTraderAccountId: protocolInteger(input.ctidTraderAccountId),
        symbolId: protocolInteger(input.symbolId),
        period: TRENDBAR_PERIODS[input.period],
        fromTimestamp: input.from.getTime(),
        toTimestamp: input.to.getTime(),
        count: Math.max(10, Math.min(Math.floor(input.count), 500)),
      },
      CtraderPayload.GET_TRENDBARS_RES
    );
    return normalizeCtraderTrendbars((response.trendbar || []) as CtraderTrendbar[]);
  } finally {
    client.close();
  }
}

async function listCtraderAccountsInEnvironment(
  environment: CtraderEnvironment,
  accessToken: string
) {
  const client = new CtraderOpenApiClient(environment);
  try {
    await client.connect();
    await client.authenticateApplication();
    const response = await client.request(
      CtraderPayload.GET_ACCOUNTS_REQ,
      { accessToken },
      CtraderPayload.GET_ACCOUNTS_RES
    );
    return {
      permissionScope: String(response.permissionScope ?? "SCOPE_VIEW"),
      accounts: (response.ctidTraderAccount || []) as CtraderAccountDescriptor[],
    };
  } finally {
    client.close();
  }
}

export async function listCtraderAccounts(accessToken: string) {
  const results: Awaited<ReturnType<typeof listCtraderAccountsInEnvironment>>[] = [];
  const errors: string[] = [];

  // Live and demo Open API proxies are fully separated. Query both because the
  // OAuth token does not tell us which environment the selected accounts use.
  for (const environment of ["live", "demo"] as const) {
    try {
      results.push(await listCtraderAccountsInEnvironment(environment, accessToken));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown cTrader error";
      errors.push(`${environment}: ${message}`);
    }
  }

  if (!results.length) {
    throw new CtraderOpenApiError(
      `Could not list cTrader accounts (${errors.join("; ")})`,
      "CTRADER_ACCOUNT_LIST_FAILED"
    );
  }

  const accounts = new Map<string, CtraderAccountDescriptor>();
  for (const result of results) {
    for (const account of result.accounts) {
      accounts.set(String(account.ctidTraderAccountId), account);
    }
  }

  return {
    permissionScope: results[0]?.permissionScope || "SCOPE_VIEW",
    accounts: [...accounts.values()],
  };
}

export type CtraderAccountSnapshot = {
  trader: CtraderTrader;
  assets: CtraderAsset[];
  symbols: CtraderLightSymbol[];
  fullSymbols: CtraderSymbol[];
  positions: CtraderPosition[];
  positionPnls: CtraderPositionPnl[];
  positionPnlMoneyDigits: number;
  deals: CtraderDeal[];
  hasMoreDeals: boolean;
};

export async function fetchCtraderSnapshot(input: {
  environment: CtraderEnvironment;
  ctidTraderAccountId: string;
  accessToken: string;
  from: Date;
  to: Date;
}) {
  const client = new CtraderOpenApiClient(input.environment);
  try {
    try {
      await client.connect();
    } catch (error) {
      throw new CtraderOpenApiError(
        `cTrader ${input.environment} endpoint connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CTRADER_ENDPOINT_CONNECTION_FAILED"
      );
    }
    try {
      await client.authenticateApplication();
    } catch (error) {
      throw new CtraderOpenApiError(
        `cTrader application authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CTRADER_APPLICATION_AUTH_FAILED"
      );
    }
    try {
      await client.authenticateAccount(input.ctidTraderAccountId, input.accessToken);
    } catch (error) {
      throw new CtraderOpenApiError(
        `cTrader ${input.environment} account authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        "CTRADER_ACCOUNT_AUTH_FAILED"
      );
    }
    const accountPayload = {
      ctidTraderAccountId: protocolInteger(input.ctidTraderAccountId),
    };
    async function accountRequest(
      operation: string,
      payloadType: number,
      payload: CtraderJson,
      responseType: number
    ) {
      try {
        return await client.request(payloadType, payload, responseType);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown cTrader error";
        throw new CtraderOpenApiError(
          `cTrader ${operation} request failed: ${message}`,
          error instanceof CtraderOpenApiError ? error.code : "CTRADER_CONNECTION_ERROR"
        );
      }
    }

    // Keep account bootstrap requests sequential. Large symbols/history replies
    // arriving concurrently can fill a single TLS stream faster than it is
    // parsed, at which point the cTrader proxy closes the connection.
    const traderResponse = await accountRequest(
      "trader profile",
      CtraderPayload.TRADER_REQ,
      accountPayload,
      CtraderPayload.TRADER_RES
    );
    const assetResponse = await accountRequest(
      "asset list",
      CtraderPayload.ASSET_LIST_REQ,
      accountPayload,
      CtraderPayload.ASSET_LIST_RES
    );
    const symbolResponse = await accountRequest(
      "symbol list",
      CtraderPayload.SYMBOLS_LIST_REQ,
      { ...accountPayload, includeArchivedSymbols: true },
      CtraderPayload.SYMBOLS_LIST_RES
    );
    const reconcileResponse = await accountRequest(
      "positions",
      CtraderPayload.RECONCILE_REQ,
      { ...accountPayload, returnProtectionOrders: false },
      CtraderPayload.RECONCILE_RES
    );
    const dealResponse = await accountRequest(
      "deal history",
      CtraderPayload.DEAL_LIST_REQ,
      {
        ...accountPayload,
        fromTimestamp: input.from.getTime(),
        toTimestamp: input.to.getTime(),
        maxRows: 10000,
      },
      CtraderPayload.DEAL_LIST_RES
    );
    const pnlResponse = await accountRequest(
      "unrealized P&L",
      CtraderPayload.POSITION_UNREALIZED_PNL_REQ,
      accountPayload,
      CtraderPayload.POSITION_UNREALIZED_PNL_RES
    );
    const symbols = [
      ...((symbolResponse.symbol || []) as CtraderLightSymbol[]),
      ...((symbolResponse.archivedSymbol || []) as Array<{ symbolId: string | number; name: string }>).map(
        (symbol) => ({ symbolId: symbol.symbolId, symbolName: symbol.name })
      ),
    ];
    const positions = (reconcileResponse.position || []) as CtraderPosition[];
    async function completeDealRange(
      fromTimestamp: number,
      toTimestamp: number,
      response: CtraderJson,
      depth = 0
    ): Promise<CtraderDeal[]> {
      const currentDeals = (response.deal || []) as CtraderDeal[];
      if (!response.hasMore) return currentDeals;
      if (depth >= 16 || toTimestamp - fromTimestamp < 1000) {
        throw new CtraderOpenApiError(
          "The cTrader history range contains too many deals to import safely",
          "CTRADER_HISTORY_LIMIT"
        );
      }
      const midpoint = Math.floor((fromTimestamp + toTimestamp) / 2);
      await new Promise((resolve) => setTimeout(resolve, 220));
      const left = await client.request(
        CtraderPayload.DEAL_LIST_REQ,
        { ...accountPayload, fromTimestamp, toTimestamp: midpoint, maxRows: 10000 },
        CtraderPayload.DEAL_LIST_RES
      );
      await new Promise((resolve) => setTimeout(resolve, 220));
      const right = await client.request(
        CtraderPayload.DEAL_LIST_REQ,
        { ...accountPayload, fromTimestamp: midpoint + 1, toTimestamp, maxRows: 10000 },
        CtraderPayload.DEAL_LIST_RES
      );
      return [
        ...(await completeDealRange(fromTimestamp, midpoint, left, depth + 1)),
        ...(await completeDealRange(midpoint + 1, toTimestamp, right, depth + 1)),
      ];
    }
    const deals = await completeDealRange(input.from.getTime(), input.to.getTime(), dealResponse);
    const symbolIds = [
      ...new Set([
        ...positions.map((position) => String(position.tradeData.symbolId)),
        ...deals.map((deal) => String(deal.symbolId)),
      ]),
    ];
    const fullSymbolResponse = symbolIds.length
      ? await client.request(
          CtraderPayload.SYMBOL_BY_ID_REQ,
          { ...accountPayload, symbolId: symbolIds.map(protocolInteger) },
          CtraderPayload.SYMBOL_BY_ID_RES
        )
      : {};

    return {
      trader: traderResponse.trader as CtraderTrader,
      assets: (assetResponse.asset || []) as CtraderAsset[],
      symbols,
      fullSymbols: (fullSymbolResponse.symbol || []) as CtraderSymbol[],
      positions,
      positionPnls: (pnlResponse.positionUnrealizedPnL || []) as CtraderPositionPnl[],
      positionPnlMoneyDigits: Number(pnlResponse.moneyDigits ?? 2),
      deals,
      hasMoreDeals: false,
    } satisfies CtraderAccountSnapshot;
  } finally {
    client.close();
  }
}
