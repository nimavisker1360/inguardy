import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  authenticateTradeLocker,
  getTradeLockerAccounts,
  refreshTradeLockerToken,
  rowsToRecords,
  safeTradeLockerMessage,
  TradeLockerApiError,
  tradeLockerBaseUrl,
} from "./client";
import { decryptTradeLockerToken, encryptTradeLockerToken, jwtExpiration } from "./token-vault";
import { connectTradeLockerSchema } from "./schemas";

const originalFetch = global.fetch;
const originalEncryptionKey = process.env.TRADE_CONNECTION_ENCRYPTION_KEY;
const originalDeveloperKey = process.env.TRADELOCKER_DEVELOPER_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  process.env.TRADE_CONNECTION_ENCRYPTION_KEY = originalEncryptionKey;
  process.env.TRADELOCKER_DEVELOPER_API_KEY = originalDeveloperKey;
});

test("chooses the official live and demo base URLs", () => {
  assert.equal(tradeLockerBaseUrl("LIVE"), "https://live.tradelocker.com/backend-api");
  assert.equal(tradeLockerBaseUrl("DEMO"), "https://demo.tradelocker.com/backend-api");
});

test("authenticates with credentials in a JSON body and validates tokens", async () => {
  let request: RequestInit | undefined;
  global.fetch = async (_url, init) => {
    request = init;
    return new Response(JSON.stringify({ accessToken: "access", refreshToken: "refresh", expireDate: "2030-01-01T00:00:00.000Z" }), { status: 201 });
  };
  const result = await authenticateTradeLocker({ environment: "DEMO", email: "user@example.com", password: "secret", server: "Broker" });
  assert.equal(result.accessToken, "access");
  assert.deepEqual(JSON.parse(String(request?.body)), { email: "user@example.com", password: "secret", server: "Broker" });
});

test("maps rejected credentials to a sanitized error", async () => {
  global.fetch = async () => new Response("bad credentials", { status: 400 });
  await assert.rejects(
    authenticateTradeLocker({ environment: "LIVE", email: "user@example.com", password: "wrong", server: "Broker" }),
    (error) => error instanceof TradeLockerApiError && safeTradeLockerMessage(error) === "Invalid TradeLocker credentials."
  );
});

test("validates and preserves string accountId and accNum values", async () => {
  global.fetch = async () => new Response(JSON.stringify({ accounts: [{ id: "7080", accNum: "2", name: "Primary", currency: "USD", status: "ACTIVE" }] }));
  const result = await getTradeLockerAccounts("LIVE", "access");
  assert.equal(result.accounts[0].id, "7080");
  assert.equal(result.accounts[0].accNum, "2");
});

test("preserves multiple account choices and accepts a valid empty account list", async () => {
  global.fetch = async () => new Response(JSON.stringify({
    accounts: [
      { id: "100", accNum: "1", name: "Live USD", currency: "USD" },
      { id: "200", accNum: "2", name: "Live EUR", currency: "EUR" },
    ],
  }));
  assert.equal((await getTradeLockerAccounts("LIVE", "access")).accounts.length, 2);
  global.fetch = async () => new Response(JSON.stringify({ accounts: [] }));
  assert.deepEqual((await getTradeLockerAccounts("DEMO", "access")).accounts, []);
});

test("rejects unsupported environments before an outbound request", () => {
  assert.equal(connectTradeLockerSchema.safeParse({
    environment: "SANDBOX",
    server: "Broker",
    email: "user@example.com",
    password: "secret",
  }).success, false);
});

test("rejects malformed provider responses", async () => {
  global.fetch = async () => new Response(JSON.stringify({ accessToken: "missing-fields" }), { status: 201 });
  await assert.rejects(
    authenticateTradeLocker({ environment: "DEMO", email: "user@example.com", password: "secret", server: "Broker" }),
    (error) => error instanceof TradeLockerApiError && error.code === "INVALID_RESPONSE"
  );
});

test("refreshes with only the refresh token and supports developer API key", async () => {
  process.env.TRADELOCKER_DEVELOPER_API_KEY = "developer-key";
  let headers: Headers | undefined;
  global.fetch = async (_url, init) => {
    headers = new Headers(init?.headers);
    assert.deepEqual(JSON.parse(String(init?.body)), { refreshToken: "old-refresh" });
    return new Response(JSON.stringify({ accessToken: "new-access", refreshToken: "new-refresh", expireDate: "2030-01-01T00:00:00.000Z" }), { status: 201 });
  };
  const result = await refreshTradeLockerToken({ environment: "LIVE", refreshToken: "old-refresh" });
  assert.equal(result.refreshToken, "new-refresh");
  assert.equal(headers?.get("tl-developer-api-key"), "developer-key");
});

test("maps dynamic TradeLocker table columns without inventing fields", () => {
  assert.deepEqual(rowsToRecords([{ id: "id" }, { id: "side" }], [["42", "buy"]]), [{ id: "42", side: "buy" }]);
});

test("encrypts tokens with authenticated encryption and decodes JWT expiration", () => {
  process.env.TRADE_CONNECTION_ENCRYPTION_KEY = "test-only-secret";
  const encrypted = encryptTradeLockerToken("sensitive-token");
  assert.notEqual(encrypted, "sensitive-token");
  assert.equal(decryptTradeLockerToken(encrypted), "sensitive-token");
  const payload = Buffer.from(JSON.stringify({ exp: 1_900_000_000 })).toString("base64url");
  assert.equal(jwtExpiration(`x.${payload}.x`)?.getTime(), 1_900_000_000_000);
});
