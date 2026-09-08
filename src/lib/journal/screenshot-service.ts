import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

const DEFAULT_SCREENSHOT_TIMEFRAME = "M5";
const DEFAULT_SCREENSHOT_BARS = 120;
const DEFAULT_SCREENSHOT_DIR = "journal_screenshots";
const MAX_SCREENSHOT_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export type JournalScreenshotType = "entry" | "exit";

export type JournalScreenshotUploadInput = {
  accountNumber: string;
  broker: string;
  serverName: string;
  positionId: string;
  dealTicket: string;
  type: JournalScreenshotType;
  capturedAt: Date;
  status: string;
  imageBase64: string;
};

export type JournalScreenshotUploadResult = {
  imageUrl: string;
  storage: "vercel_blob" | "local";
};

function readEnv(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function readPositiveInteger(name: string, fallback: number) {
  const parsed = Number(readEnv(name));

  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export type JournalScreenshotConfig = {
  uploadEnabled: boolean;
  apiBaseUrl: string;
  uploadSecretConfigured: boolean;
  timeframe: string;
  bars: number;
  directory: string;
};

export function getJournalScreenshotConfig(): JournalScreenshotConfig {
  return {
    uploadEnabled: readEnv("JOURNAL_UPLOAD_ENABLED").toLowerCase() === "true",
    apiBaseUrl: readEnv("JOURNAL_API_BASE_URL"),
    uploadSecretConfigured: readEnv("JOURNAL_UPLOAD_SECRET") !== "",
    timeframe: readEnv(
      "JOURNAL_SCREENSHOT_TIMEFRAME",
      DEFAULT_SCREENSHOT_TIMEFRAME
    ),
    bars: readPositiveInteger("JOURNAL_SCREENSHOT_BARS", DEFAULT_SCREENSHOT_BARS),
    directory: readEnv("JOURNAL_SCREENSHOT_DIR", DEFAULT_SCREENSHOT_DIR),
  };
}

export function buildJournalScreenshotPath(
  symbol: string,
  positionId: string,
  fileName: string
) {
  const config = getJournalScreenshotConfig();
  const safeSymbol = symbol.trim().toUpperCase().replace(/[^A-Z0-9_.-]/g, "");
  const safePositionId = positionId.trim().replace(/[^A-Za-z0-9_.-]/g, "");
  const safeFileName = fileName.trim().replace(/[^A-Za-z0-9_.-]/g, "");

  return path.join(config.directory, safeSymbol, safePositionId, safeFileName);
}

function sanitizePathPart(value: string, fallback = "unknown") {
  return (
    value
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^A-Za-z0-9_.-]/g, "") || fallback
  );
}

function formatTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function getBlobToken() {
  return (
    process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
    process.env.VERCEL_BLOB_READ_WRITE_TOKEN?.trim() ||
    ""
  );
}

function isVercelRuntime() {
  return process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
}

export function decodeBase64Png(imageBase64: string) {
  const normalized = imageBase64
    .replace(/^data:image\/png;base64,/i, "")
    .replace(/\s/g, "");

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new Error("Screenshot must be valid base64");
  }

  const buffer = Buffer.from(normalized, "base64");

  if (buffer.length === 0) {
    throw new Error("Screenshot image is empty");
  }

  if (buffer.length > MAX_SCREENSHOT_BYTES) {
    throw new Error("Screenshot image is too large");
  }

  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Screenshot must be a PNG image");
  }

  return buffer;
}

function getScreenshotPathParts(input: JournalScreenshotUploadInput) {
  const accountNumber = sanitizePathPart(input.accountNumber);
  const positionId = sanitizePathPart(input.positionId);
  const type = sanitizePathPart(input.type);
  const timestamp = formatTimestamp(input.capturedAt);
  const fileName = `${type}-${timestamp}.png`;

  return { accountNumber, positionId, fileName };
}

async function uploadScreenshotToBlob(
  input: JournalScreenshotUploadInput,
  imageBuffer: Buffer
) {
  const token = getBlobToken();

  if (!token) {
    return null;
  }

  const { accountNumber, positionId, fileName } = getScreenshotPathParts(input);
  const pathname = `journal_screenshots/${accountNumber}/${positionId}/${fileName}`;
  const blob = await put(pathname, imageBuffer, {
    access: "public",
    contentType: "image/png",
    token,
  });

  return blob.url;
}

async function saveScreenshotLocally(
  input: JournalScreenshotUploadInput,
  imageBuffer: Buffer
) {
  const { accountNumber, positionId, fileName } = getScreenshotPathParts(input);
  const relativePath = path.join(
    "journal_screenshots",
    accountNumber,
    positionId,
    fileName
  );
  const publicPath = path.join(process.cwd(), "public", relativePath);

  await mkdir(path.dirname(publicPath), { recursive: true });
  await writeFile(publicPath, imageBuffer);

  return `/${relativePath.replace(/\\/g, "/")}`;
}

export async function uploadJournalScreenshot(
  input: JournalScreenshotUploadInput
): Promise<JournalScreenshotUploadResult> {
  const imageBuffer = decodeBase64Png(input.imageBase64);
  let imageUrl: string | null = null;
  let storage: JournalScreenshotUploadResult["storage"] = "vercel_blob";

  try {
    imageUrl = await uploadScreenshotToBlob(input, imageBuffer);
  } catch {
    // Use the local fallback below when blob upload is unavailable.
  }

  if (!imageUrl) {
    if (isVercelRuntime()) {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN is required for screenshot uploads on Vercel"
      );
    }

    storage = "local";
    imageUrl = await saveScreenshotLocally(input, imageBuffer);
  }

  return { imageUrl, storage };
}
