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
      subject: "Inguardy SMTP test",
      html,
      text,
    });

    return apiJson({
      success: true,
      message: "Test email accepted by Hostinger SMTP.",
      mail: {
        messageId: result.messageId,
        statusCode: result.statusCode,
      },
    });
  } catch (error) {
    if (error instanceof MailDeliveryError) {
      const message = `Hostinger SMTP rejected the test email${error.statusCode ? ` (${error.statusCode})` : ""}.`;

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
