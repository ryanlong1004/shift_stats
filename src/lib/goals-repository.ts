import { z } from "zod";

import { auth } from "@/auth";
import { getPrismaClient } from "@/lib/prisma";

export const GOAL_PERIODS = ["daily", "weekly", "monthly", "yearly"] as const;
export const GOAL_METRICS = ["takeHome", "hours", "avgHourly"] as const;

export type GoalPeriod = (typeof GOAL_PERIODS)[number];
export type GoalMetric = (typeof GOAL_METRICS)[number];

export const goalFormSchema = z.object({
  period: z.enum(GOAL_PERIODS),
  metricType: z.enum(GOAL_METRICS),
  targetValue: z
    .number()
    .positive("Target must be greater than zero.")
    .multipleOf(0.01, "Target can have at most 2 decimal places."),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export type GoalRecord = {
  id: string;
  period: GoalPeriod;
  metricType: GoalMetric;
  targetValue: number;
  createdAt: string;
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

  const settings = await prisma.userSettings.findUnique({
    where: { userId: user.id },
  });

  if (!settings) {
    throw new Error("User settings not found.");
  }

  return { userId: user.id, settingsId: settings.id };
}

export async function listGoals(): Promise<GoalRecord[]> {
  const { userId } = await getCurrentUserContext();
  const prisma = getPrismaClient();

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: [{ period: "asc" }, { metricType: "asc" }],
  });

  return goals.map((g) => ({
    id: g.id,
    period: g.period as GoalPeriod,
    metricType: g.metricType as GoalMetric,
    targetValue: Number(g.targetValue),
    createdAt: g.createdAt.toISOString(),
  }));
}

export async function upsertGoal(
  values: GoalFormValues,
): Promise<
  | { ok: true; goal: GoalRecord }
  | { ok: false; status: number; message: string }
> {
  const parsed = goalFormSchema.safeParse(values);

  if (!parsed.success) {
    return { ok: false, status: 400, message: "Validation failed." };
  }

  const { userId, settingsId } = await getCurrentUserContext();
  const prisma = getPrismaClient();

  // One goal per (userId, period, metricType) combo — upsert by those three.
  const existing = await prisma.goal.findFirst({
    where: {
      userId,
      period: parsed.data.period,
      metricType: parsed.data.metricType,
    },
  });

  const data = {
    userId,
    settingsId,
    period: parsed.data.period,
    metricType: parsed.data.metricType,
    targetValue: parsed.data.targetValue,
  };

  const goal = existing
    ? await prisma.goal.update({ where: { id: existing.id }, data })
    : await prisma.goal.create({ data });

  return {
    ok: true,
    goal: {
      id: goal.id,
      period: goal.period as GoalPeriod,
      metricType: goal.metricType as GoalMetric,
      targetValue: Number(goal.targetValue),
      createdAt: goal.createdAt.toISOString(),
    },
  };
}

export async function deleteGoal(
  id: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { userId } = await getCurrentUserContext();
  const prisma = getPrismaClient();

  const goal = await prisma.goal.findFirst({ where: { id, userId } });

  if (!goal) {
    return { ok: false, status: 404, message: "Goal not found." };
  }

  await prisma.goal.delete({ where: { id: goal.id } });

  return { ok: true };
}
