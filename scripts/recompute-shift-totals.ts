import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function round2(value: number) {
  return Number(value.toFixed(2));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL is not configured. Skipping recompute.");
    return;
  }

  const rows = await prisma.shift.findMany({
    select: {
      id: true,
      shiftDate: true,
      hoursWorked: true,
      cashTips: true,
      cardTips: true,
      basePay: true,
      otherIncome: true,
      totalEarned: true,
    },
  });

  let updated = 0;

  for (const row of rows) {
    const hoursWorked = Number(row.hoursWorked);
    const cashTips = Number(row.cashTips);
    const cardTips = Number(row.cardTips);
    const basePay = Number(row.basePay);
    const otherIncome = Number(row.otherIncome);
    const storedTotal = Number(row.totalEarned);

    const computedTotal = round2(
      basePay * hoursWorked + cashTips + cardTips + otherIncome,
    );

    if (Math.abs(computedTotal - storedTotal) <= 0.009) {
      continue;
    }

    await prisma.shift.update({
      where: { id: row.id },
      data: {
        totalEarned: computedTotal.toFixed(2),
      },
    });

    updated += 1;
    console.log(
      `Updated ${row.id} (${row.shiftDate.toISOString().slice(0, 10)}): ${storedTotal.toFixed(2)} -> ${computedTotal.toFixed(2)}`,
    );
  }

  console.log(`Done. Updated ${updated} of ${rows.length} shifts.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
