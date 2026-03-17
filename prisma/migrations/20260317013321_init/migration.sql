-- CreateEnum
CREATE TYPE "ShiftInputMode" AS ENUM ('hours', 'timeRange');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shiftDate" DATE NOT NULL,
    "inputMode" "ShiftInputMode" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "hoursWorked" DECIMAL(5,2) NOT NULL,
    "cashTips" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cardTips" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "basePay" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherIncome" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalEarned" DECIMAL(10,2) NOT NULL,
    "location" TEXT,
    "role" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "trackBasePay" BOOLEAN NOT NULL DEFAULT true,
    "splitTipsByType" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Shift_userId_idx" ON "Shift"("userId");

-- CreateIndex
CREATE INDEX "Shift_shiftDate_idx" ON "Shift"("shiftDate");

-- CreateIndex
CREATE INDEX "Shift_userId_shiftDate_idx" ON "Shift"("userId", "shiftDate");

-- CreateIndex
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
