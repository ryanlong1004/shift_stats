import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

type CsvShiftRow = {
  shiftDate: string;
  totalEarned: string;
  hoursWorked: string;
  hourlyRate: string;
  dayName: string;
};

async function loadSampleRows(): Promise<CsvShiftRow[]> {
  const csvPath = path.join(process.cwd(), "sample-data", "initial-shifts.csv");
  const contents = await readFile(csvPath, "utf8");
  const [header, ...lines] = contents.trim().split(/\r?\n/);

  if (!header) {
    return [];
  }

  return lines.filter(Boolean).map((line) => {
    const [shiftDate, totalEarned, hoursWorked, hourlyRate, dayName] =
      line.split(",");

    return {
      shiftDate,
      totalEarned,
      hoursWorked,
      hourlyRate,
      dayName,
    };
  });
}

async function main() {
  const rows = await loadSampleRows();

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@shiftstats.local" },
    update: {},
    create: {
      email: "demo@shiftstats.local",
      name: "Shiftstats Demo",
      userSettings: {
        create: {
          currencyCode: "USD",
          timezone: "America/Chicago",
          trackBasePay: true,
          splitTipsByType: true,
        },
      },
    },
  });

  await prisma.shift.deleteMany({ where: { userId: demoUser.id } });

  await prisma.shift.createMany({
    data: rows.map((row) => ({
      userId: demoUser.id,
      shiftDate: new Date(`${row.shiftDate}T00:00:00.000Z`),
      inputMode: "hours",
      hoursWorked: new Decimal(row.hoursWorked).toFixed(2),
      cashTips: new Decimal(0).toFixed(2),
      cardTips: new Decimal(0).toFixed(2),
      basePay: new Decimal(0).toFixed(2),
      otherIncome: new Decimal(row.totalEarned).toFixed(2),
      totalEarned: new Decimal(row.totalEarned).toFixed(2),
      notes: `Imported from starter sample (${row.dayName}, ${row.hourlyRate}/hr).`,
    })),
  });

  console.log(`Seeded ${rows.length} sample shifts for ${demoUser.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
