-- AlterTable
ALTER TABLE "Shift" ADD COLUMN     "salesAmount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "trackSales" BOOLEAN NOT NULL DEFAULT false;
