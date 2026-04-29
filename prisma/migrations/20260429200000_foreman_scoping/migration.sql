-- AlterTable
ALTER TABLE "Department" ADD COLUMN "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "foremanId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "userId" TEXT NOT NULL;

-- DropConstraint (was a UNIQUE CONSTRAINT, not plain index)
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_objectId_year_month_key";

-- CreateIndex
CREATE INDEX "Department_userId_idx" ON "Department"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_userId_key" ON "Department"("name", "userId");

-- CreateIndex
CREATE INDEX "Employee_foremanId_idx" ON "Employee"("foremanId");

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_userId_key" ON "Position"("name", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Timesheet_objectId_createdByUserId_year_month_key" ON "Timesheet"("objectId", "createdByUserId", "year", "month");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_foremanId_fkey" FOREIGN KEY ("foremanId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
