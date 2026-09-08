type EmailAction = {
  label: string;
  href: string;
};

type RenderTradivixEmailInput = {
  preheader: string;
  title: string;
  greetingName?: string | null;
  body: string[];
  action?: EmailAction;
  code?: string;
  footerNote?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeName(name?: string | null) {
  return name?.trim() || "there";
}

export function renderTradivixEmail({
  preheader,
  title,
  greetingName,
  body,
  action,
  code,
  footerNote,
}: RenderTradivixEmailInput) {
  const plainName = safeName(greetingName);
  const footer =
    footerNote ||
    "This email was sent by Tradivix for an account-related action.";

  const bodyHtml = body
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.65">${escapeHtml(
          paragraph
        )}</p>`
    )
    .join("");

  const actionHtml = action
    ? `<tr>
        <td style="padding:8px 0 24px">
          <a href="${escapeHtml(action.href)}" style="display:inline-block;border-radius:8px;background:#0f172a;color:#ffffff;font-size:15px;font-weight:700;line-height:1;padding:15px 20px;text-decoration:none">${escapeHtml(
            action.label
          )}</a>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 18px">
          <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6">If the button does not work, open this link:</p>
          <p style="margin:6px 0 0;color:#0f766e;font-size:13px;line-height:1.6;word-break:break-all">${escapeHtml(
            action.href
          )}</p>
        </td>
      </tr>`
    : "";

  const codeHtml = code
    ? `<tr>
        <td style="padding:4px 0 24px">
          <div style="display:inline-block;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;color:#0f172a;font-size:28px;font-weight:800;letter-spacing:4px;line-height:1;padding:16px 20px">${escapeHtml(
            code
          )}</div>
        </td>
      </tr>`
    : "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;padding:0">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(
      preheader
    )}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;border-collapse:collapse;margin:0;padding:0;width:100%">
      <tr>
        <td align="center" style="padding:28px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e2e8f0;border-collapse:collapse;border-radius:8px;max-width:600px;overflow:hidden;width:100%">
            <tr>
              <td style="background:#0f172a;padding:22px 24px">
                <p style="margin:0;color:#ffffff;font-size:22px;font-weight:800;line-height:1">Tradivix</p>
                <p style="margin:8px 0 0;color:#99f6e4;font-size:13px;line-height:1.4">Trading intelligence and journal automation</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 24px 12px">
                <h1 style="margin:0 0 18px;color:#0f172a;font-size:24px;line-height:1.25">${escapeHtml(
                  title
                )}</h1>
                <p style="margin:0 0 16px;color:#334155;font-size:16px;line-height:1.65">Hi ${escapeHtml(
                  plainName
                )},</p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;width:100%">
                  ${codeHtml}
                  ${actionHtml}
                </table>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding:18px 24px 22px">
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">${escapeHtml(
                  footer
                )}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Tradivix",
    "",
    title,
    "",
    `Hi ${plainName},`,
    "",
    ...body.flatMap((paragraph) => [paragraph, ""]),
    action ? `${action.label}: ${action.href}` : "",
    code ? `Code: ${code}` : "",
    "",
    footer,
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n")
    .trim();

  return { html, text };
}

export function buildPasswordResetEmail({
  name,
  resetUrl,
}: {
  name?: string | null;
  resetUrl: string;
}) {
  return renderTradivixEmail({
    preheader: "Reset your Tradivix password securely.",
    title: "Reset your Tradivix password",
    greetingName: name,
    body: [
      "We received a request to reset the password for your Tradivix account.",
      "This link expires in 1 hour. If you did not request it, you can ignore this email.",
    ],
    action: {
      label: "Reset password",
      href: resetUrl,
    },
    footerNote:
      "For your security, Tradivix will never ask for your password or secret keys by email.",
  });
}

export function buildEmailVerificationEmail({
  name,
  verificationUrl,
}: {
  name?: string | null;
  verificationUrl: string;
}) {
  return renderTradivixEmail({
    preheader: "Confirm your email address for Tradivix.",
    title: "Confirm your email address",
    greetingName: name,
    body: [
      "Please confirm this email address so we can keep your Tradivix account secure.",
      "If you did not create a Tradivix account, you can ignore this email.",
    ],
    action: {
      label: "Confirm email",
      href: verificationUrl,
    },
  });
}

export function buildOtpEmail({
  name,
  code,
}: {
  name?: string | null;
  code: string;
}) {
  return renderTradivixEmail({
    preheader: "Your Tradivix login code.",
    title: "Your Tradivix login code",
    greetingName: name,
    body: [
      "Use this code to continue signing in to Tradivix.",
      "If you did not request this code, you can safely ignore this email.",
    ],
    code,
    footerNote: "This one-time code should only be entered on tradivix.com.",
  });
}

export function buildTestEmail() {
  return renderTradivixEmail({
    preheader: "MailerSend test email from Tradivix development.",
    title: "Tradivix email test",
    greetingName: "there",
    body: [
      "This is a development-only test email sent through the Tradivix MailerSend integration.",
      "If you received this, the transactional email service is configured correctly.",
    ],
  });
}
