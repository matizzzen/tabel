-- AlterTable
ALTER TABLE "Brigade" ADD COLUMN     "objectId" TEXT;

-- AddForeignKey
ALTER TABLE "Brigade" ADD CONSTRAINT "Brigade_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES "Object"("id") ON DELETE SET NULL ON UPDATE CASCADE;
