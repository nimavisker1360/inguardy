import { spawn } from "child_process";
import path from "path";
import type { CtraderChartBar } from "@/server/ctrader/open-api-client";

const MAX_OUTPUT_BYTES = 12 * 1024 * 1024;

type RenderInput = {
  bars: CtraderChartBar[];
  symbol: string;
  capturedAt: Date;
  timeframe: string;
  stage: "entry" | "exit";
  direction: "BUY" | "SELL";
  entryPrice?: number;
  exitPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
};

export async function renderCtraderChart(input: RenderInput) {
  const pythonPath =
    process.env.MT5_PYTHON_PATH?.trim() ||
    path.join(process.cwd(), ".venv-mt5", "Scripts", "python.exe");
  const scriptPath = path.join(process.cwd(), "workers", "ctrader_chart.py");
  const payload = JSON.stringify({
    ...input,
    capturedAt: input.capturedAt.toISOString(),
  });

  return new Promise<string>((resolve, reject) => {
    const child = spawn(pythonPath, [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const timeout = setTimeout(() => {
      child.kill();
      fail(new Error("cTrader chart rendering timed out"));
    }, 60_000);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (Buffer.byteLength(stdout, "utf8") > MAX_OUTPUT_BYTES) {
        child.kill();
        fail(new Error("cTrader chart image exceeded the safe limit"));
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 4096) stderr += chunk.toString("utf8");
    });
    child.on("error", () => {
      clearTimeout(timeout);
      fail(new Error("cTrader chart renderer could not start"));
    });
    child.on("close", () => {
      clearTimeout(timeout);
      if (settled) return;
      try {
        const result = JSON.parse(stdout.trim()) as { ok: boolean; imageBase64?: string; error?: string };
        if (!result.ok || !result.imageBase64) {
          fail(new Error(result.error || "cTrader chart renderer returned no image"));
          return;
        }
        settled = true;
        resolve(result.imageBase64);
      } catch {
        fail(new Error(stderr.trim() || "cTrader chart renderer returned an invalid response"));
      }
    });
    child.stdin.end(payload);
  });
}
