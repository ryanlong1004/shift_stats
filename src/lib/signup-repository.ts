import { z } from "zod";

import {
  isEmailVerificationRequired,
  issueEmailVerificationToken,
} from "@/lib/email-verification-repository";
import { getPrismaClient } from "@/lib/prisma";
import { hashPassword } from "@/lib/passwords";

export const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name must be 80 characters or less."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

export async function createUserAccount(values: SignupValues) {
  const parsed = signupSchema.safeParse(values);

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
      message: "Signup requires a configured database.",
    };
  }

  const prisma = getPrismaClient();
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    return {
      ok: false as const,
      status: 409,
      message: "An account with that email already exists.",
    };
  }

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash: hashPassword(parsed.data.password),
      emailVerifiedAt: isEmailVerificationRequired() ? null : new Date(),
      userSettings: {
        create: {
          currencyCode: "USD",
          timezone: "America/Chicago",
          trackBasePay: true,
          splitTipsByType: true,
          trackSales: false,
          payPeriodType: "weekly",
          payPeriodAnchor: "monday",
        },
      },
    },
  });

  let verificationUrl: string | undefined;
  const requiresEmailVerification = isEmailVerificationRequired();

  if (requiresEmailVerification) {
    const issued = await issueEmailVerificationToken(user.id);
    verificationUrl = issued.verificationUrl;
  }

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    requiresEmailVerification,
    verificationUrl,
  };
}
