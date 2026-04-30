-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "backups_filename_key" ON "backups"("filename");
