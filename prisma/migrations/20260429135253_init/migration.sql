/*
  Warnings:

  - You are about to drop the column `departmentId` on the `TimesheetRow` table. All the data in the column will be lost.
  - Added the required column `departmentId` to the `Employee` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departmentSnapshot` to the `TimesheetRow` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "TimesheetRow" DROP CONSTRAINT "TimesheetRow_departmentId_fkey";

-- DropIndex
DROP INDEX "TimesheetRow_departmentId_idx";

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "departmentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TimesheetRow" DROP COLUMN "departmentId",
ADD COLUMN     "departmentSnapshot" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Employee_departmentId_idx" ON "Employee"("departmentId");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
