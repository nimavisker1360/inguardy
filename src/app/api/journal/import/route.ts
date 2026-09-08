import { NextResponse } from "next/server";
import {
  importTradesForUser,
  parseImportedTrades,
  type TradeImportKind,
} from "@/lib/journal/trade-import";
import { getCurrentUserId, unauthorizedResponse } from "@/lib/server-auth";
import {
  requireFeatureAccess,
  subscriptionAccessResponse,
} from "@/lib/subscription";

export const dynamic = "force-dynamic";

function textFromArrayBuffer(buffer: ArrayBuffer) {
  const bytes = Buffer.from(buffer);

  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return bytes.subarray(2).toString("utf16le");
  }

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return bytes.subarray(3).toString("utf8");
  }

  const preview = bytes.subarray(0, Math.min(bytes.length, 200));
  const nullCount = preview.filter((byte) => byte === 0).length;

  if (nullCount > preview.length / 5) {
    return bytes.toString("utf16le");
  }

  return bytes.toString("utf8");
}

function parseKind(value: FormDataEntryValue | null): TradeImportKind | null {
  const text = String(value || "").trim();

  if (text === "mt5-html" || text === "excel") {
    return text;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return unauthorizedResponse();
    }

    await requireFeatureAccess(userId, "trades");

    const formData = await request.formData();
    const file = formData.get("file");
    const kind = parseKind(formData.get("kind"));
    const accountName = String(formData.get("accountName") || "").trim();

    if (!kind) {
      return NextResponse.json(
        { success: false, message: "Import type is required." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Upload file is required." },
        { status: 400 }
      );
    }

    if (file.size > 4 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: "Upload file must be smaller than 4MB." },
        { status: 400 }
      );
    }

    const content = textFromArrayBuffer(await file.arrayBuffer());
    const parsed = parseImportedTrades(kind, content);

    if (parsed.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No trade rows were found in this file.",
          warnings: parsed.warnings,
        },
        { status: 400 }
      );
    }

    const result = await importTradesForUser({
      userId,
      kind,
      rows: parsed.rows,
      fallbackAccountName:
        accountName ||
        (kind === "mt5-html" ? "MT5 HTML Import" : "Excel Journal Import"),
    });

    return NextResponse.json({
      success: true,
      ...result,
      warnings: [...parsed.warnings, ...result.warnings],
    });
  } catch (error) {
    const accessResponse = subscriptionAccessResponse(error);

    if (accessResponse) {
      return accessResponse;
    }


    return NextResponse.json(
      { success: false, message: "Failed to import journal file." },
      { status: 500 }
    );
  }
}
