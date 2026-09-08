import crypto from "node:crypto";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "docs", "dashboard-training-screenshots");
const baseUrl = process.env.CAPTURE_BASE_URL || "http://localhost:3000";
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const chromeDebugPort = Number(process.env.CHROME_DEBUG_PORT || 9222);
const cookieName = baseUrl.startsWith("https://")
  ? "__Secure-better-auth.session_token"
  : "better-auth.session_token";

const pages = [
  ["dashboard-01-overview.png", "/dashboard"],
  ["dashboard-02-accounts-mt5.png", "/dashboard/accounts"],
  ["dashboard-03-trades-list.png", "/journal"],
  ["dashboard-04-trade-detail.png", "TRADE_DETAIL"],
  ["dashboard-05-daily-journal.png", "/dashboard/daily-journal"],
  ["dashboard-06-playbooks.png", "/journal/playbooks"],
  ["dashboard-07-checklists.png", "/journal/checklists"],
  ["dashboard-08-analytics.png", "/journal/analytics"],
  ["dashboard-09-reports.png", "/dashboard/reports"],
  ["dashboard-10-market-scanner.png", "/dashboard/market-radar"],
  ["dashboard-11-economic-calendar.png", "/economic-calendar"],
  ["dashboard-12-latest-signals.png", "/dashboard/latest-signals"],
  ["dashboard-13-premium.png", "/premium"],
  ["dashboard-14-settings.png", "/dashboard/settings"],
];

async function pickUser() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      trades: { select: { id: true }, take: 1, orderBy: { createdAt: "desc" } },
      _count: { select: { trades: true, tradingAccounts: true } },
    },
  });

  const sorted = users.sort((a, b) => {
    const tradeDiff = b._count.trades - a._count.trades;
    if (tradeDiff) return tradeDiff;
    return b._count.tradingAccounts - a._count.tradingAccounts;
  });

  const user = sorted[0];
  if (!user) {
    throw new Error("No user found for dashboard screenshots.");
  }

  return user;
}

async function createTemporarySession(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress: "127.0.0.1",
      userAgent: "dashboard-training-screenshot",
    },
  });

  const signature = crypto
    .createHmac("sha256", process.env.BETTER_AUTH_SECRET)
    .update(token)
    .digest("base64");
  const signedToken = `${token}.${signature}`;

  return { token, signedToken, expiresAt };
}

async function waitForDashboard(page) {
  await new Promise((resolve) => setTimeout(resolve, 2200));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 15_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Chrome is still starting.
    }

    await wait(250);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(wsUrl) {
  const socket = new WebSocket(wsUrl);
  const pending = new Map();
  let nextId = 1;

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;

    const waiter = pending.get(message.id);
    if (!waiter) return;

    pending.delete(message.id);
    if (message.error) {
      waiter.reject(new Error(message.error.message || "CDP command failed"));
    } else {
      waiter.resolve(message.result);
    }
  });

  return {
    open: () =>
      new Promise((resolve, reject) => {
        socket.addEventListener("open", resolve, { once: true });
        socket.addEventListener("error", reject, { once: true });
      }),
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = nextId++;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      }),
    close: () => socket.close(),
  };
}

async function openChromePage() {
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "tradivix-capture-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${chromeDebugPort}`,
    `--user-data-dir=${profileDir}`,
    "--disable-gpu",
    "--hide-scrollbars",
    "about:blank",
  ], {
    stdio: "ignore",
  });

  const version = await waitForJson(`http://127.0.0.1:${chromeDebugPort}/json/version`);
  const browser = createCdpClient(version.webSocketDebuggerUrl);
  await browser.open();
  const target = await browser.send("Target.createTarget", { url: "about:blank" });
  const tabs = await waitForJson(`http://127.0.0.1:${chromeDebugPort}/json/list`);
  const tab = tabs.find((item) => item.id === target.targetId) || tabs[0];
  const page = createCdpClient(tab.webSocketDebuggerUrl);
  await page.open();

  return {
    browser,
    page,
    async close() {
      page.close();
      await browser.send("Browser.close").catch(() => {});
      browser.close();
      chrome.kill();
      await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

async function main() {
  if (!process.env.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET is required.");
  }

  const user = await pickUser();
  const tradeId = user.trades[0]?.id;
  const session = await createTemporarySession(user.id);

  await fs.mkdir(outputDir, { recursive: true });

  const chrome = await openChromePage();

  try {
    const { page } = chrome;
    await page.send("Page.enable");
    await page.send("Network.enable");
    await page.send("Runtime.enable");
    await page.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1100,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await page.send("Network.setCookie", {
      name: cookieName,
      value: session.signedToken,
      url: baseUrl,
      path: "/",
      httpOnly: true,
      secure: baseUrl.startsWith("https://"),
      sameSite: "Lax",
      expires: Math.floor(session.expiresAt.getTime() / 1000),
    });

    for (const [fileName, route] of pages) {
      if (route === "TRADE_DETAIL" && !tradeId) {
        continue;
      }

      const href = route === "TRADE_DETAIL" ? `/journal/${tradeId}` : route;
      await page.send("Page.navigate", { url: new URL(href, baseUrl).toString() });
      await waitForDashboard(page);

      const text = await page.send("Runtime.evaluate", {
        expression: "document.body?.innerText || ''",
        returnByValue: true,
      });

      if (String(text.result?.value || "").includes("Sign In")) {
        throw new Error(`Authentication failed while capturing ${href}`);
      }

      const shot = await page.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        fromSurface: true,
      });
      await fs.writeFile(path.join(outputDir, fileName), Buffer.from(shot.data, "base64"));
      console.log(`${fileName} ${href}`);
    }
  } finally {
    await chrome.close().catch(() => {});
    await prisma.session.deleteMany({ where: { token: session.token } });
    await prisma.$disconnect();
  }

  console.log(`Saved screenshots to ${outputDir}`);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect().catch(() => {});
  process.exitCode = 1;
});
