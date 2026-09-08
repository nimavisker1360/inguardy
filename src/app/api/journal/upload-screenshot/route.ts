import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_STAGES = new Set(["START", "END", "TEST"]);
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;

function sanitizePart(value: FormDataEntryValue | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_.-]/g, "") || "unknown";
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request: Request) {
  const expectedSecret = process.env.JOURNAL_UPLOAD_SECRET;
  const providedSecret = request.headers.get("x-journal-upload-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const tradeId = sanitizePart(formData.get("tradeId"));
    const symbol = sanitizePart(formData.get("symbol")).toUpperCase();
    const stage = sanitizePart(formData.get("stage")).toUpperCase();

    if (!ALLOWED_STAGES.has(stage)) {
      return jsonError("Invalid stage", 400);
    }

    if (!(file instanceof File)) {
      return jsonError("Screenshot file is required", 400);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return jsonError("Only PNG and JPEG screenshots are allowed", 400);
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError("Screenshot file is too large", 413);
    }

    const extension = file.type === "image/jpeg" ? "jpg" : "png";
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
    const pathname = `journal-screenshots/${symbol}/${tradeId}/${stage}_${symbol}_${tradeId}_${timestamp}.${extension}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: file.type,
    });


    return NextResponse.json({
      success: true,
      url: blob.url,
      pathname: blob.pathname,
    });
  } catch {

    return jsonError("Failed to upload screenshot", 500);
  }
}
