import { spawn } from "child_process";
import path from "path";

// A cold bridge recovery can include two 30s IPC attempts plus a terminal
// restart and broker authorization. Keep the HTTP client alive for that full
// recovery window so the single-threaded bridge is not abandoned mid-request.
const DEFAULT_TIMEOUT_MS = 150_000;
const MAX_OUTPUT_BYTES = 50 * 1024 * 1024;

export type Mt5BridgeAccount = {
  login: string;
  name?: string;
  server?: string;
  currency?: string;
  balance?: number;
  equity?: number;
  profit?: number;
  margin?: number;
  margin_free?: number;
  margin_level?: number;
  company?: string;
  trade_mode?: number;
  margin_mode?: number;
};

export type Mt5BridgeSymbol = {
  name: string;
  trade_contract_size?: number;
  trade_tick_size?: number;
  trade_tick_value?: number;
  volume_min?: number;
  volume_max?: number;
  volume_step?: number;
  digits?: number;
  currency_base?: string;
  currency_profit?: string;
};

export type Mt5BridgePosition = {
  ticket: string;
  identifier?: string;
  time?: number;
  time_msc?: number;
  time_update?: number;
  type: number;
  magic?: string;
  volume: number;
  price_open: number;
  sl?: number;
  tp?: number;
  price_current?: number;
  swap?: number;
  profit?: number;
  symbol: string;
  comment?: string;
};

export type Mt5BridgeOrder = {
  ticket: string;
  position_id?: string;
  position_by_id?: string;
  symbol: string;
  type: number;
  state?: number;
  reason?: number;
  volume_initial?: number;
  volume_current?: number;
  price_open?: number;
  sl?: number;
  tp?: number;
  time_setup?: number;
  time_setup_msc?: number;
  time_done?: number;
  time_done_msc?: number;
  magic?: string;
  comment?: string;
};

export type Mt5BridgeDeal = {
  ticket: string;
  order?: string;
  time: number;
  time_msc?: number;
  type: number;
  entry: number;
  magic?: string;
  position_id: string;
  reason?: number;
  volume: number;
  price: number;
  commission?: number;
  swap?: number;
  profit?: number;
  fee?: number;
  symbol: string;
  comment?: string;
  external_id?: string;
};

export type Mt5BridgeTerminal = {
  connected: boolean;
  trade_allowed?: boolean;
  tradeapi_disabled?: boolean;
};

export type Mt5BridgeChart = {
  imageBase64: string;
  bars: number;
  timeframe: string;
  capturedAt: string;
};

export type Mt5BridgeSuccess = {
  ok: true;
  account: Mt5BridgeAccount;
  terminal: Mt5BridgeTerminal;
  positions: Mt5BridgePosition[];
  orders: Mt5BridgeOrder[];
  deals: Mt5BridgeDeal[];
  historyOrders: Mt5BridgeOrder[];
  symbols: Mt5BridgeSymbol[];
  chart?: Mt5BridgeChart;
};

type Mt5BridgeFailure = {
  ok: false;
  errorCode: string;
  error: string;
};

export type Mt5BridgeResult = Mt5BridgeSuccess | Mt5BridgeFailure;

export class Mt5BridgeError extends Error {
  constructor(
    message: string,
    public readonly code = "MT5_BRIDGE_ERROR"
  ) {
    super(message);
    this.name = "Mt5BridgeError";
  }
}

function bridgeConfiguration() {
  const pythonPath =
    process.env.MT5_PYTHON_PATH?.trim() ||
    path.join(process.cwd(), ".venv-mt5", "Scripts", "python.exe");
  const terminalPath =
    process.env.MT5_TERMINAL_PATH?.trim() ||
    "C:\\Program Files\\MetaTrader 5\\terminal64.exe";
  const scriptPath = path.join(process.cwd(), "workers", "mt5_bridge.py");

  const bridgeUrl = process.env.MT5_BRIDGE_URL?.trim() || "";
  const bridgeSecret = process.env.MT5_BRIDGE_SECRET?.trim() || "";

  return { pythonPath, terminalPath, scriptPath, bridgeUrl, bridgeSecret };
}

async function runPersistentBridge(
  bridgeUrl: string,
  bridgeSecret: string,
  payload: string,
  timeoutMs: number
) {
  const response = await fetch(`${bridgeUrl.replace(/\/$/, "")}/bridge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bridgeSecret ? { "X-MT5-Bridge-Secret": bridgeSecret } : {}),
    },
    body: payload,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const result = (await response.json()) as Mt5BridgeResult;
  if (!response.ok || !result.ok) {
    const failure = result as Mt5BridgeFailure;
    throw new Mt5BridgeError(failure.error || "MT5 bridge request failed", failure.errorCode);
  }
  if (!result.terminal?.connected) {
    throw new Mt5BridgeError(
      "MetaTrader is open but is not connected to the broker",
      "MT5_NOT_CONNECTED"
    );
  }
  return result;
}

export async function runMt5Bridge(input: {
  operation: "snapshot" | "sync" | "chart";
  server: string;
  login: string;
  password: string;
  from?: Date;
  to?: Date;
  symbol?: string;
  capturedAt?: Date;
  timeframe?: string;
  bars?: number;
  stage?: "entry" | "exit";
  direction?: "BUY" | "SELL";
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  timeoutMs?: number;
}) {
  const { pythonPath, terminalPath, scriptPath, bridgeUrl, bridgeSecret } = bridgeConfiguration();
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const payload = JSON.stringify({
    operation: input.operation,
    terminalPath,
    server: input.server,
    login: input.login,
    password: input.password,
    from: input.from?.toISOString(),
    to: input.to?.toISOString(),
    symbol: input.symbol,
    capturedAt: input.capturedAt?.toISOString(),
    timeframe: input.timeframe,
    bars: input.bars,
    stage: input.stage,
    direction: input.direction,
    entryPrice: input.entryPrice,
    exitPrice: input.exitPrice,
    stopLoss: input.stopLoss,
    takeProfit: input.takeProfit,
  });

  if (bridgeUrl) {
    return runPersistentBridge(bridgeUrl, bridgeSecret, payload, timeoutMs);
  }

  return new Promise<Mt5BridgeSuccess>((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const finishWithError = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };

    const timeout = setTimeout(() => {
      child.kill();
      finishWithError(new Mt5BridgeError("MT5 connection timed out", "MT5_TIMEOUT"));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > MAX_OUTPUT_BYTES) {
        child.kill();
        finishWithError(new Mt5BridgeError("MT5 response exceeded the safe limit", "MT5_OUTPUT_LIMIT"));
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 4096) {
        stderr += chunk.toString("utf8");
      }
    });

    child.on("error", () => {
      clearTimeout(timeout);
      finishWithError(new Mt5BridgeError("MT5 bridge could not start", "MT5_BRIDGE_START_FAILED"));
    });

    child.on("close", () => {
      clearTimeout(timeout);
      if (settled) return;

      let result: Mt5BridgeResult;
      try {
        result = JSON.parse(stdout.trim()) as Mt5BridgeResult;
      } catch {
        finishWithError(
          new Mt5BridgeError(
            stderr ? "MT5 bridge returned an invalid response" : "MT5 bridge returned no response",
            "MT5_INVALID_RESPONSE"
          )
        );
        return;
      }

      if (!result.ok) {
        finishWithError(new Mt5BridgeError(result.error, result.errorCode));
        return;
      }

      settled = true;
      resolve(result);
    });

    child.stdin.end(payload);
  });
}
