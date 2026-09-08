import { sendTransactionalEmail } from "@/lib/mail";
import {
  buildEmailVerificationEmail,
  buildPasswordResetEmail,
} from "@/lib/mail-templates";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type SendPasswordResetEmailInput = {
  to: string;
  name?: string | null;
  resetUrl: string;
};

type SendEmailVerificationInput = {
  to: string;
  name?: string | null;
  verificationUrl: string;
};

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailInput) {
  await sendTransactionalEmail({
    to,
    subject,
    html,
    text,
    replyTo,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: SendPasswordResetEmailInput) {
  const subject = "Reset your Tradivix password";
  const { html, text } = buildPasswordResetEmail({ name, resetUrl });

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}

export async function sendEmailVerificationEmail({
  to,
  name,
  verificationUrl,
}: SendEmailVerificationInput) {
  const subject = "Confirm your Tradivix email";
  const { html, text } = buildEmailVerificationEmail({ name, verificationUrl });

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}
