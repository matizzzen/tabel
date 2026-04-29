-- Replace Brigade with direct Object assignment on User and Timesheet

-- 1. Add objectId to User (nullable)
ALTER TABLE "User" ADD COLUMN "objectId" TEXT;

-- 2. Migrate User.brigadeId -> User.objectId via Brigade.objectId
UPDATE "User" u
SET "objectId" = b."objectId"
FROM "Brigade" b
WHERE u."brigadeId" = b."id"
  AND b."objectId" IS NOT NULL;

-- 3. Add objectId to Timesheet (nullable first)
ALTER TABLE "Timesheet" ADD COLUMN "objectId" TEXT;

-- 4. Migrate Timesheet.brigadeId -> Timesheet.objectId via Brigade.objectId
UPDATE "Timesheet" t
SET "objectId" = b."objectId"
FROM "Brigade" b
WHERE t."brigadeId" = b."id"
  AND b."objectId" IS NOT NULL;

-- 5. For timesheets whose brigade had no objectId, pick first active object or NULL
-- (data cleanup: dev data only, acceptable to lose)
UPDATE "Timesheet" t
SET "objectId" = (SELECT id FROM "Object" WHERE "isActive" = true ORDER BY name LIMIT 1)
WHERE t."objectId" IS NULL;

-- 6. Make Timesheet.objectId NOT NULL
ALTER TABLE "Timesheet" ALTER COLUMN "objectId" SET NOT NULL;

-- 7. Add FK constraints
ALTER TABLE "User" ADD CONSTRAINT "User_objectId_fkey"
  FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_objectId_fkey"
  FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 8. Add indexes
CREATE INDEX "User_objectId_idx" ON "User"("objectId");

-- 9. Add unique constraint
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_objectId_year_month_key"
  UNIQUE ("objectId", "year", "month");

-- 10. Drop old brigade constraints and columns
ALTER TABLE "Timesheet" DROP CONSTRAINT IF EXISTS "Timesheet_brigadeId_year_month_key";
ALTER TABLE "Timesheet" DROP CONSTRAINT IF EXISTS "Timesheet_brigadeId_fkey";
ALTER TABLE "Timesheet" DROP COLUMN "brigadeId";

ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_brigadeId_fkey";
ALTER TABLE "User" DROP COLUMN "brigadeId";

-- 11. Drop Brigade table
DROP TABLE IF EXISTS "Brigade";

-- 12. Drop old indexes
DROP INDEX IF EXISTS "User_brigadeId_idx";
