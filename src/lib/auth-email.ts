import { sendTransactionalEmail } from "@/lib/mail";
import {
  buildEmailVerificationCodeEmail,
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

type SendEmailVerificationCodeInput = {
  to: string;
  name?: string | null;
  code: string;
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
  const subject = "Reset your Inguardy password";
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
  const subject = "Confirm your Inguardy email";
  const { html, text } = buildEmailVerificationEmail({ name, verificationUrl });

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}

export async function sendEmailVerificationCodeEmail({
  to,
  name,
  code,
}: SendEmailVerificationCodeInput) {
  const subject = `${code} is your Inguardy verification code`;
  const { html, text } = buildEmailVerificationCodeEmail({ name, code });

  await sendEmail({
    to,
    subject,
    html,
    text,
  });
}
