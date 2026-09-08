import "server-only";

import nodemailer from "nodemailer";

type ContactEmailInput = {
  name: string;
  email: string;
  subject: string;
  message: string;
  html: string;
  text: string;
};

type ContactMailResult = {
  messageId: string | null;
  provider: "smtp";
};

const DEFAULT_CONTACT_EMAIL = "info@tradivix.com";
const DEFAULT_SMTP_HOST = "smtp.hostinger.com";
const DEFAULT_SMTP_PORT = 465;

export class ContactMailConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactMailConfigurationError";
  }
}

export class ContactMailDeliveryError extends Error {
  constructor() {
    super("Contact SMTP email delivery failed");
    this.name = "ContactMailDeliveryError";
  }
}

function getOptionalEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function cleanEnvValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function getRequiredSmtpPassword() {
  const password =
    cleanEnvValue(getOptionalEnv("CONTACT_SMTP_PASSWORD")) ||
    cleanEnvValue(getOptionalEnv("CONTACT_SMTP_PASS"));

  if (!password) {
    throw new ContactMailConfigurationError(
      "CONTACT_SMTP_PASSWORD is not configured"
    );
  }

  return password;
}

function getSmtpPort() {
  const rawPort = getOptionalEnv("CONTACT_SMTP_PORT");
  const port = Number(rawPort || DEFAULT_SMTP_PORT);

  if (!Number.isInteger(port) || port <= 0) {
    throw new ContactMailConfigurationError("CONTACT_SMTP_PORT is invalid");
  }

  return port;
}

export async function sendContactEmailViaSmtp({
  name,
  email,
  subject,
  html,
  text,
}: ContactEmailInput): Promise<ContactMailResult> {
  const host =
    cleanEnvValue(getOptionalEnv("CONTACT_SMTP_HOST")) ||
    DEFAULT_SMTP_HOST;
  const port = getSmtpPort();
  const user =
    cleanEnvValue(getOptionalEnv("CONTACT_SMTP_USER")) ||
    DEFAULT_CONTACT_EMAIL;
  const password = getRequiredSmtpPassword();
  const to =
    cleanEnvValue(getOptionalEnv("CONTACT_EMAIL_TO")) ||
    DEFAULT_CONTACT_EMAIL;
  const from =
    cleanEnvValue(getOptionalEnv("CONTACT_EMAIL_FROM")) ||
    DEFAULT_CONTACT_EMAIL;
  const fromName =
    cleanEnvValue(getOptionalEnv("CONTACT_EMAIL_FROM_NAME")) || "Tradivix";

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
      from: `"${fromName}" <${from}>`,
      to,
      replyTo: `"${name}" <${email}>`,
      subject: `Tradivix contact: ${subject}`,
      html,
      text,
      envelope: {
        from,
        to,
      },
    });


    return {
      messageId: result.messageId ?? null,
      provider: "smtp",
    };
  } catch {
    throw new ContactMailDeliveryError();
  }
}
