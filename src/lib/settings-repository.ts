import { z } from "zod";

import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

export const userSettingsSchema = z.object({
  currencyCode: z.string().length(3, "Currency code must be 3 characters."),
  timezone: z.string().min(1, "Timezone is required."),
  trackBasePay: z.boolean(),
  splitTipsByType: z.boolean(),
});

export type UserSettingsFormValues = z.infer<typeof userSettingsSchema>;

export type UserSettings = {
  id: string;
  currencyCode: string;
  timezone: string;
  trackBasePay: boolean;
  splitTipsByType: boolean;
};

async function getCurrentUserContext() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();

  if (!email) {
    throw new Error("UNAUTHORIZED");
  }

  const prisma = getPrismaClient();
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return { email, userId: user.id };
}

export async function getUserSettings(): Promise<UserSettings> {
  const { userId } = await getCurrentUserContext();
  const prisma = getPrismaClient();

  const settings = await prisma.userSettings.findUnique({
    where: { userId },
  });

  if (!settings) {
    throw new Error("User settings not found.");
  }

  return {
    id: settings.id,
    currencyCode: settings.currencyCode,
    timezone: settings.timezone,
    trackBasePay: settings.trackBasePay,
    splitTipsByType: settings.splitTipsByType,
  };
}

export async function updateUserSettings(values: UserSettingsFormValues) {
  const parsed = userSettingsSchema.safeParse(values);

  if (!parsed.success) {
    return {
      ok: false as const,
      status: 400,
      message: "Validation failed.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { userId } = await getCurrentUserContext();
  const prisma = getPrismaClient();

  const updated = await prisma.userSettings.update({
    where: { userId },
    data: {
      currencyCode: parsed.data.currencyCode,
      timezone: parsed.data.timezone,
      trackBasePay: parsed.data.trackBasePay,
      splitTipsByType: parsed.data.splitTipsByType,
    },
  });

  return {
    ok: true as const,
    settings: {
      id: updated.id,
      currencyCode: updated.currencyCode,
      timezone: updated.timezone,
      trackBasePay: updated.trackBasePay,
      splitTipsByType: updated.splitTipsByType,
    },
  };
}
