-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "payPeriodAnchor" TEXT NOT NULL DEFAULT 'monday',
ADD COLUMN     "payPeriodType" TEXT NOT NULL DEFAULT 'weekly';
