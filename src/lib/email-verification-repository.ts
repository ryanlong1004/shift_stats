import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { getPrismaClient } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mailer";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const genericVerificationRequestMessage =
  "If an unverified account exists for that email, a verification link has been generated.";

export const emailVerificationSchema = z.object({
  token: z.string().min(32, "Verification token is invalid."),
});

export const emailVerificationRequestSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isEmailVerificationRequired() {
  return process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
}

function shouldExposeVerificationUrl() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_EXPOSE_EMAIL_VERIFICATION_URL === "true"
  );
}

export async function issueEmailVerificationToken(
  userId: string,
  toEmail?: string,
) {
  const prisma = getPrismaClient();
  const token = randomBytes(32).toString("hex");
  const hashedToken = tokenHash(token);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    },
  });

  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const verificationUrl = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${token}`;

  // Always attempt to send the email when we have an address to send to.
  if (toEmail) {
    try {
      await sendVerificationEmail(toEmail, verificationUrl);
    } catch (err) {
      console.error("[email-verification] sendVerificationEmail failed:", err);
    }
  }

  if (!shouldExposeVerificationUrl()) {
    return { verificationUrl: undefined };
  }

  return { verificationUrl };
}

export async function requestEmailVerification(values: unknown) {
  const parsed = emailVerificationRequestSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      message: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      ok: true as const,
      message: genericVerificationRequestMessage,
    };
  }

  const prisma = getPrismaClient();
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    return {
      ok: true as const,
      message: genericVerificationRequestMessage,
    };
  }

  const issued = await issueEmailVerificationToken(user.id, email);

  return {
    ok: true as const,
    message: genericVerificationRequestMessage,
    verificationUrl: issued.verificationUrl,
  };
}

export async function verifyEmailToken(values: unknown) {
  const parsed = emailVerificationSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      message: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (!process.env.DATABASE_URL) {
    return {
      ok: false as const,
      status: 503,
      message: "Email verification requires a configured database.",
    };
  }

  const prisma = getPrismaClient();
  const now = new Date();
  const hashedToken = tokenHash(parsed.data.token);

  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash: hashedToken,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!record) {
    return {
      ok: false as const,
      status: 400,
      message: "Verification link is invalid or has expired.",
      fieldErrors: {
        token: ["Verification link is invalid or has expired."],
      },
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: now },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: now },
    }),
    prisma.emailVerificationToken.deleteMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
    }),
  ]);

  return {
    ok: true as const,
    message: "Email verified successfully. You can now sign in.",
  };
}
