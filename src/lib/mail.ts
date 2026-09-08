import "server-only";

import { EmailParams, MailerSend, Recipient, Sender } from "mailersend";

type MailAddress =
  | string
  | {
      email: string;
      name?: string | null;
    };

type SendTransactionalEmailInput = {
  to: MailAddress | MailAddress[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: MailAddress;
};

type SendTransactionalEmailResult = {
  messageId: string | null;
  statusCode: number;
};

type MailerSendApiResponse = {
  headers?: Record<string, unknown>;
  statusCode?: number;
};

const DEFAULT_FROM_EMAIL = "noreply@tradivix.com";
const DEFAULT_FROM_NAME = "Tradivix";

let mailerSendClient: MailerSend | null = null;

export class MailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MailConfigurationError";
  }
}

export class MailDeliveryError extends Error {
  readonly statusCode: number | null;

  constructor(statusCode: number | null) {
    super("Transactional email delivery failed");
    this.name = "MailDeliveryError";
    this.statusCode = statusCode;
  }
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new MailConfigurationError(`${name} is not configured`);
  }

  return value;
}

function getMailerSendClient() {
  if (!mailerSendClient) {
    mailerSendClient = new MailerSend({
      apiKey: getRequiredEnv("MAILERSEND_API_TOKEN"),
    });
  }

  return mailerSendClient;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAddress(address: MailAddress) {
  const email = typeof address === "string" ? address.trim() : address.email.trim();
  const name = typeof address === "string" ? undefined : address.name?.trim() || undefined;

  if (!isValidEmail(email)) {
    throw new MailConfigurationError("Invalid email address");
  }

  return new Recipient(email, name);
}

function normalizeRecipients(to: MailAddress | MailAddress[]) {
  const recipients = (Array.isArray(to) ? to : [to]).map(normalizeAddress);

  if (!recipients.length) {
    throw new MailConfigurationError("At least one recipient is required");
  }

  return recipients;
}

function htmlToText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getHeader(headers: Record<string, unknown> | undefined, name: string) {
  if (!headers) {
    return null;
  }

  const wanted = name.toLowerCase();
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted);
  const value = entry?.[1];

  if (Array.isArray(value)) {
    return String(value[0] || "") || null;
  }

  return typeof value === "string" && value ? value : null;
}

function getErrorStatusCode(error: unknown) {
  if (typeof error === "object" && error && "statusCode" in error) {
    const statusCode = Number((error as { statusCode?: unknown }).statusCode);
    return Number.isInteger(statusCode) ? statusCode : null;
  }

  return null;
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> {
  const fromEmail = process.env.MAIL_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL;
  const fromName = process.env.MAIL_FROM_NAME?.trim() || DEFAULT_FROM_NAME;

  if (!isValidEmail(fromEmail)) {
    throw new MailConfigurationError("MAIL_FROM_EMAIL is invalid");
  }

  if (!subject.trim()) {
    throw new MailConfigurationError("Email subject is required");
  }

  if (!html.trim()) {
    throw new MailConfigurationError("Email HTML is required");
  }

  const params = new EmailParams()
    .setFrom(new Sender(fromEmail, fromName))
    .setTo(normalizeRecipients(to))
    .setSubject(subject.trim())
    .setHtml(html)
    .setText(text?.trim() || htmlToText(html));

  if (replyTo) {
    params.setReplyTo(normalizeAddress(replyTo));
  }

  try {
    const response = (await getMailerSendClient().email.send(
      params
    )) as MailerSendApiResponse;
    const messageId =
      getHeader(response.headers, "x-message-id") ||
      getHeader(response.headers, "message-id") ||
      null;


    return {
      messageId,
      statusCode: response.statusCode ?? 202,
    };
  } catch (error) {
    const statusCode = getErrorStatusCode(error);


    throw new MailDeliveryError(statusCode);
  }
}
