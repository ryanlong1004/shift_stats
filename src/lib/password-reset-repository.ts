import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { hashPassword } from "@/lib/passwords";
import { getPrismaClient } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mailer";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

const genericRequestMessage =
  "If an account exists for that email, a password reset link has been generated.";

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const passwordResetConfirmSchema = z
  .object({
    token: z.string().min(32, "Reset token is invalid."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function shouldExposeResetUrl() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.AUTH_EXPOSE_RESET_URL === "true"
  );
}

export async function requestPasswordReset(values: unknown) {
  const parsed = passwordResetRequestSchema.safeParse(values);

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
      message: genericRequestMessage,
    };
  }

  const prisma = getPrismaClient();
  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return {
      ok: true as const,
      message: genericRequestMessage,
    };
  }

  const token = randomBytes(32).toString("hex");
  const hashedToken = tokenHash(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt,
    },
  });

  const result: {
    ok: true;
    message: string;
    resetUrl?: string;
  } = {
    ok: true,
    message: genericRequestMessage,
  };

  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

  if (shouldExposeResetUrl()) {
    result.resetUrl = resetUrl;
  }

  // Always attempt to send the email; log but don't surface SMTP errors to the user.
  try {
    await sendPasswordResetEmail(email, resetUrl);
  } catch (err) {
    console.error("[password-reset] sendPasswordResetEmail failed:", err);
  }

  return result;
}

export async function confirmPasswordReset(values: unknown) {
  const parsed = passwordResetConfirmSchema.safeParse(values);

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
      message: "Password reset requires a configured database.",
    };
  }

  const prisma = getPrismaClient();
  const hashedToken = tokenHash(parsed.data.token);
  const now = new Date();

  const resetRecord = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashedToken,
      usedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!resetRecord) {
    return {
      ok: false as const,
      status: 400,
      message: "Reset link is invalid or has expired.",
      fieldErrors: {
        token: ["Reset link is invalid or has expired."],
      },
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: {
        passwordHash: hashPassword(parsed.data.password),
      },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetRecord.userId,
        usedAt: null,
        id: { not: resetRecord.id },
      },
    }),
  ]);

  return {
    ok: true as const,
    message: "Password updated successfully. You can now sign in.",
  };
}
