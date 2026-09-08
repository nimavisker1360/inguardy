import { NextResponse } from "next/server";
import { buildTestEmail } from "@/lib/mail-templates";
import { sendTransactionalEmail } from "@/lib/mail";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const testTo = process.env.MAIL_TEST_TO?.trim();

  if (!testTo) {
    return NextResponse.json(
      { error: "MAIL_TEST_TO is not configured" },
      { status: 400 }
    );
  }

  const testSecret = process.env.MAIL_TEST_SECRET?.trim();

  if (testSecret) {
    const authorization = request.headers.get("authorization");

    if (authorization !== `Bearer ${testSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { html, text } = buildTestEmail();
  const result = await sendTransactionalEmail({
    to: testTo,
    subject: "Inguardy SMTP test",
    html,
    text,
  });

  return NextResponse.json({
    ok: true,
    messageId: result.messageId,
    statusCode: result.statusCode,
  });
}
