import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export type ContactPayload = {
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
};

export async function sendContactEmail(payload: ContactPayload): Promise<void> {
  const transporter = getTransporter();
  const recipient = process.env.CONTACT_RECIPIENT_EMAIL;

  if (!transporter || !recipient) {
    throw new Error("SMTP is not configured.");
  }

  await transporter.sendMail({
    from: `"${payload.fromName}" <${process.env.SMTP_USER}>`,
    replyTo: payload.fromEmail,
    to: recipient,
    subject: `[ShiftStats Contact] ${payload.subject}`,
    text: [
      `From: ${payload.fromName} <${payload.fromEmail}>`,
      `Subject: ${payload.subject}`,
      "",
      payload.message,
    ].join("\n"),
    html: `
      <p><strong>From:</strong> ${escapeHtml(payload.fromName)} &lt;${escapeHtml(payload.fromEmail)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(payload.subject)}</p>
      <hr />
      <p style="white-space:pre-wrap">${escapeHtml(payload.message)}</p>
    `,
  });
}

export function isMailerConfigured(): boolean {
  return !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.CONTACT_RECIPIENT_EMAIL
  );
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string,
): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error("SMTP is not configured.");
  }

  const senderAddress = process.env.SMTP_USER!;

  await transporter.sendMail({
    from: `"ShiftStats" <${senderAddress}>`,
    to: toEmail,
    subject: "Reset your ShiftStats password",
    text: [
      "You requested a password reset for your ShiftStats account.",
      "",
      `Reset link (expires in 1 hour): ${resetUrl}`,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>You requested a password reset for your ShiftStats account.</p>
      <p>
        <a href="${escapeHtml(resetUrl)}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600">Reset password</a>
      </p>
      <p style="font-size:12px;color:#64748b">This link expires in 1 hour. If you did not request a reset, ignore this email.</p>
    `,
  });
}

export async function sendVerificationEmail(
  toEmail: string,
  verificationUrl: string,
): Promise<void> {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error("SMTP is not configured.");
  }

  const senderAddress = process.env.SMTP_USER!;

  await transporter.sendMail({
    from: `"ShiftStats" <${senderAddress}>`,
    to: toEmail,
    subject: "Verify your ShiftStats email address",
    text: [
      "Please verify your email address for ShiftStats.",
      "",
      `Verification link (expires in 24 hours): ${verificationUrl}`,
      "",
      "If you did not create an account, you can safely ignore this email.",
    ].join("\n"),
    html: `
      <p>Please verify your email address to activate your ShiftStats account.</p>
      <p>
        <a href="${escapeHtml(verificationUrl)}" style="background:#0f172a;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none;font-weight:600">Verify email</a>
      </p>
      <p style="font-size:12px;color:#64748b">This link expires in 24 hours. If you did not sign up for ShiftStats, ignore this email.</p>
    `,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
