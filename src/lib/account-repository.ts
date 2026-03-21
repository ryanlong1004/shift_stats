import { z } from "zod";

import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { getPrismaClient } from "@/lib/prisma";

export const accountFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name must be 80 characters or less."),
    currentPassword: z.string().optional().default(""),
    newPassword: z.string().optional().default(""),
    confirmNewPassword: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    const wantsPasswordChange = Boolean(
      data.newPassword || data.confirmNewPassword,
    );

    if (!wantsPasswordChange) {
      return;
    }

    if (!data.newPassword || data.newPassword.length < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New password must be at least 8 characters.",
        path: ["newPassword"],
      });
    }

    if (data.newPassword !== data.confirmNewPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New passwords do not match.",
        path: ["confirmNewPassword"],
      });
    }
  });

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export type AccountProfile = {
  email: string;
  name: string;
  hasPassword: boolean;
};

async function getCurrentUserContext() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    throw new Error("UNAUTHORIZED");
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new Error("User not found.");
  }

  return { user };
}

export async function getAccountProfile(): Promise<AccountProfile> {
  const { user } = await getCurrentUserContext();

  return {
    email: user.email,
    name: user.name ?? "",
    hasPassword: Boolean(user.passwordHash),
  };
}

export async function updateAccountProfile(values: AccountFormValues) {
  const parsed = accountFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      message: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { user } = await getCurrentUserContext();
  const prisma = getPrismaClient();
  const wantsPasswordChange = Boolean(
    parsed.data.newPassword || parsed.data.confirmNewPassword,
  );

  if (wantsPasswordChange && user.passwordHash) {
    if (!parsed.data.currentPassword) {
      return {
        ok: false as const,
        status: 400,
        message: "Current password is required to change your password.",
        fieldErrors: {
          currentPassword: ["Current password is required."],
        },
      };
    }

    const validCurrentPassword = verifyPassword(
      parsed.data.currentPassword,
      user.passwordHash,
    );

    if (!validCurrentPassword) {
      return {
        ok: false as const,
        status: 400,
        message: "Current password is incorrect.",
        fieldErrors: {
          currentPassword: ["Current password is incorrect."],
        },
      };
    }
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      passwordHash: wantsPasswordChange
        ? hashPassword(parsed.data.newPassword)
        : user.passwordHash,
    },
  });

  return {
    ok: true as const,
    profile: {
      email: updated.email,
      name: updated.name ?? "",
      hasPassword: Boolean(updated.passwordHash),
    },
  };
}
