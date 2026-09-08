import "server-only";

import nodemailer from "nodemailer";

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
  fromName?: string;
};

type SendTransactionalEmailResult = {
  messageId: string | null;
  statusCode: number;
};

type NormalizedAddress = {
  address: string;
  name?: string;
};

const DEFAULT_FROM_EMAIL = "info@inguardy.com";
const DEFAULT_FROM_NAME = "Inguardy";
const DEFAULT_SMTP_HOST = "smtp.hostinger.com";
const DEFAULT_SMTP_PORT = 465;

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

function cleanEnvValue(value: string | undefined) {
  const trimmed = value?.trim() || "";

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function getFirstEnv(...names: string[]) {
  for (const name of names) {
    const value = cleanEnvValue(process.env[name]);

    if (value) {
      return value;
    }
  }

  return "";
}

function getRequiredEnv(names: string[], label: string) {
  const value = getFirstEnv(...names);

  if (!value) {
    throw new MailConfigurationError(`${label} is not configured`);
  }

  return value;
}

function getSmtpPort() {
  const rawPort =
    getFirstEnv("CONTACT_SMTP_PORT", "SMTP_PORT") ||
    String(DEFAULT_SMTP_PORT);
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new MailConfigurationError("SMTP port is invalid");
  }

  return port;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeAddress(address: MailAddress): NormalizedAddress {
  const email =
    typeof address === "string" ? address.trim() : address.email.trim();
  const name =
    typeof address === "string" ? undefined : address.name?.trim() || undefined;

  if (!isValidEmail(email)) {
    throw new MailConfigurationError("Invalid email address");
  }

  return { address: email, name };
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

function getErrorStatusCode(error: unknown) {
  if (typeof error === "object" && error) {
    const responseCode = Number(
      (error as { responseCode?: unknown }).responseCode
    );

    if (Number.isInteger(responseCode)) {
      return responseCode;
    }
  }

  return null;
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  fromName: inputFromName,
}: SendTransactionalEmailInput): Promise<SendTransactionalEmailResult> {
  const host =
    getFirstEnv("CONTACT_SMTP_HOST", "SMTP_HOST") || DEFAULT_SMTP_HOST;
  const port = getSmtpPort();
  const user = getRequiredEnv(
    ["CONTACT_SMTP_USER", "SMTP_USER"],
    "SMTP user"
  );
  const password = getRequiredEnv(
    ["CONTACT_SMTP_PASSWORD", "CONTACT_SMTP_PASS", "SMTP_PASS"],
    "SMTP password"
  );
  const fromEmail =
    getFirstEnv("MAIL_FROM_EMAIL", "CONTACT_EMAIL_FROM") ||
    DEFAULT_FROM_EMAIL;
  const fromName =
    inputFromName?.trim() ||
    getFirstEnv("MAIL_FROM_NAME", "CONTACT_EMAIL_FROM_NAME") ||
    DEFAULT_FROM_NAME;

  if (!isValidEmail(fromEmail)) {
    throw new MailConfigurationError("MAIL_FROM_EMAIL is invalid");
  }

  if (!subject.trim()) {
    throw new MailConfigurationError("Email subject is required");
  }

  if (!html.trim()) {
    throw new MailConfigurationError("Email HTML is required");
  }

  const recipients = normalizeRecipients(to);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass: password,
    },
  });

  try {
    const result = await transporter.sendMail({
      from: { address: fromEmail, name: fromName },
      to: recipients,
      replyTo: replyTo ? normalizeAddress(replyTo) : undefined,
      subject: subject.trim(),
      html,
      text: text?.trim() || htmlToText(html),
      envelope: {
        from: user,
        to: recipients.map((recipient) => recipient.address),
      },
    });

    return {
      messageId: result.messageId ?? null,
      statusCode: 250,
    };
  } catch (error) {
    throw new MailDeliveryError(getErrorStatusCode(error));
  }
}
