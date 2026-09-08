import {
  MailConfigurationError,
  MailDeliveryError,
  sendTransactionalEmail,
} from "@/lib/mail";
import {
  ContactMailConfigurationError,
  ContactMailDeliveryError,
  sendContactEmailViaSmtp,
} from "@/lib/contact-mail";
import { NextResponse } from "next/server";

const contactRecipient = "info@tradivix.com";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMessage(message: string) {
  return escapeHtml(message).replace(/\r?\n/g, "<br />");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name = normalizeText(body.name);
    const email = normalizeText(body.email);
    const subject = normalizeText(body.subject);
    const message = normalizeText(body.message);

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject);
    const safeMessage = formatMessage(message);

    const emailHtml = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 16px">New Tradivix contact message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <div style="margin-top:18px;padding:16px;border:1px solid #dbeafe;border-radius:12px;background:#f8fbff">
            ${safeMessage}
          </div>
        </div>
      `;
    const emailText = [
      "New Tradivix contact message",
      "",
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      message,
    ].join("\n");

    try {
      await sendContactEmailViaSmtp({
        name,
        email,
        subject,
        message,
        html: emailHtml,
        text: emailText,
      });
    } catch (error) {
      if (error instanceof ContactMailConfigurationError) {

        await sendTransactionalEmail({
          to: {
            email: contactRecipient,
            name: "Tradivix Support",
          },
          replyTo: {
            email,
            name,
          },
          subject: `Tradivix contact: ${subject}`,
          html: emailHtml,
          text: emailText,
        });
      } else {
        throw error;
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (error instanceof MailConfigurationError) {
      return NextResponse.json(
        { error: "Contact email is not configured" },
        { status: 500 }
      );
    }

    if (error instanceof MailDeliveryError) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 502 }
      );
    }

    if (error instanceof ContactMailDeliveryError) {
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: "Failed to process your request" },
      { status: 500 }
    );
  }
}
