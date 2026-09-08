import { buildTestEmail } from "@/lib/mail-templates";
import { MailDeliveryError, sendTransactionalEmail } from "@/lib/mail";
import { apiJson, handleApiError } from "@/lib/payments-api";
import { requireAdmin } from "@/lib/server-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  try {
    await requireAdmin();

    const testTo = process.env.MAIL_TEST_TO?.trim();

    if (!testTo) {
      return apiJson(
        {
          success: false,
          message: "MAIL_TEST_TO is not configured.",
        },
        400
      );
    }

    const { html, text } = buildTestEmail();
    const result = await sendTransactionalEmail({
      to: testTo,
      subject: "Tradivix MailerSend test",
      html,
      text,
    });

    return apiJson({
      success: true,
      message: "Test email accepted by MailerSend.",
      mail: {
        messageId: result.messageId,
        statusCode: result.statusCode,
      },
    });
  } catch (error) {
    if (error instanceof MailDeliveryError) {
      const message =
        error.statusCode === 401
          ? "MailerSend rejected the API token. Update MAILERSEND_API_TOKEN and restart the app."
          : `MailerSend rejected the test email${error.statusCode ? ` (${error.statusCode})` : ""}.`;

      return apiJson(
        {
          success: false,
          message,
        },
        502
      );
    }

    return handleApiError(error, "Failed to send test email");
  }
}
