import fs from "fs/promises";
import path from "path";
import { prisma as db } from "@/lib/db";
import type { DayValue, TimesheetStatus } from "@/generated/prisma/client";

const BACKUP_DIR = process.env.BACKUP_DIR ?? path.join(process.cwd(), "backups");

type BackupForeman = { id: string; name: string; timesheetCount: number };

type BackupTimesheet = {
  id: string;
  objectId: string;
  year: number;
  month: number;
  status: TimesheetStatus;
  createdByUserId: string;
  createdByName: string;
  submittedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  rows: Array<{
    id: string;
    employeeId: string;
    objectId: string;
    positionSnapshot: string;
    departmentSnapshot: string;
    shiftRateSnapshot: string;
    paidAmount: string;
    notes: string | null;
    days: Array<{ id: string; day: number; value: DayValue }>;
  }>;
};

export type BackupData = {
  version: number;
  createdAt: string;
  timesheets: BackupTimesheet[];
};

async function ensureBackupDir() {
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

export async function createBackup(isAutomatic = false, label?: string) {
  await ensureBackupDir();

  const timesheets = await db.timesheet.findMany({
    include: {
      createdBy: { select: { fullName: true } },
      rows: { include: { days: true } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const data: BackupData = {
    version: 1,
    createdAt: new Date().toISOString(),
    timesheets: timesheets.map((ts) => ({
      id: ts.id,
      objectId: ts.objectId,
      year: ts.year,
      month: ts.month,
      status: ts.status,
      createdByUserId: ts.createdByUserId,
      createdByName: ts.createdBy.fullName,
      submittedAt: ts.submittedAt?.toISOString() ?? null,
      approvedAt: ts.approvedAt?.toISOString() ?? null,
      approvedByUserId: ts.approvedByUserId ?? null,
      createdAt: ts.createdAt.toISOString(),
      updatedAt: ts.updatedAt.toISOString(),
      rows: ts.rows.map((row) => ({
        id: row.id,
        employeeId: row.employeeId,
        objectId: row.objectId,
        positionSnapshot: row.positionSnapshot,
        departmentSnapshot: row.departmentSnapshot,
        shiftRateSnapshot: row.shiftRateSnapshot.toString(),
        paidAmount: row.paidAmount.toString(),
        notes: row.notes ?? null,
        days: row.days.map((d) => ({ id: d.id, day: d.day, value: d.value })),
      })),
    })),
  };

  const json = JSON.stringify(data);
  const filename = `backup_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  const filepath = path.join(BACKUP_DIR, filename);
  await fs.writeFile(filepath, json, "utf-8");

  return db.backup.create({
    data: {
      filename,
      sizeBytes: Buffer.byteLength(json, "utf-8"),
      isAutomatic,
      label: label ?? null,
    },
  });
}

async function readBackupData(filename: string): Promise<BackupData> {
  const filepath = path.join(BACKUP_DIR, filename);
  const json = await fs.readFile(filepath, "utf-8");
  return JSON.parse(json) as BackupData;
}

export async function getBackupForemen(backupId: string): Promise<BackupForeman[]> {
  const record = await db.backup.findUniqueOrThrow({ where: { id: backupId } });
  const data = await readBackupData(record.filename);

  const map = new Map<string, BackupForeman>();
  for (const ts of data.timesheets) {
    const existing = map.get(ts.createdByUserId);
    if (existing) {
      existing.timesheetCount++;
    } else {
      map.set(ts.createdByUserId, {
        id: ts.createdByUserId,
        name: ts.createdByName,
        timesheetCount: 1,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function restoreTimesheets(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  timesheets: BackupTimesheet[],
) {
  for (const ts of timesheets) {
    await tx.timesheet.create({
      data: {
        id: ts.id,
        objectId: ts.objectId,
        year: ts.year,
        month: ts.month,
        status: ts.status,
        createdByUserId: ts.createdByUserId,
        submittedAt: ts.submittedAt ? new Date(ts.submittedAt) : null,
        approvedAt: ts.approvedAt ? new Date(ts.approvedAt) : null,
        approvedByUserId: ts.approvedByUserId,
        createdAt: new Date(ts.createdAt),
        rows: {
          create: ts.rows.map((row) => ({
            id: row.id,
            employeeId: row.employeeId,
            objectId: row.objectId,
            positionSnapshot: row.positionSnapshot,
            departmentSnapshot: row.departmentSnapshot,
            shiftRateSnapshot: row.shiftRateSnapshot,
            paidAmount: row.paidAmount,
            notes: row.notes,
            days: {
              create: row.days.map((d) => ({
                id: d.id,
                day: d.day,
                value: d.value,
              })),
            },
          })),
        },
      },
    });
  }
}

export async function restoreFull(backupId: string) {
  const record = await db.backup.findUniqueOrThrow({ where: { id: backupId } });
  const data = await readBackupData(record.filename);

  await db.$transaction(
    async (tx) => {
      await tx.timesheetDay.deleteMany({});
      await tx.timesheetRow.deleteMany({});
      await tx.timesheet.deleteMany({});
      await restoreTimesheets(tx, data.timesheets);
    },
    { timeout: 60000 },
  );
}

export async function restoreByForeman(backupId: string, foremanId: string) {
  const record = await db.backup.findUniqueOrThrow({ where: { id: backupId } });
  const data = await readBackupData(record.filename);
  const foremenTimesheets = data.timesheets.filter(
    (ts) => ts.createdByUserId === foremanId,
  );

  await db.$transaction(
    async (tx) => {
      await tx.timesheet.deleteMany({ where: { createdByUserId: foremanId } });
      await restoreTimesheets(tx, foremenTimesheets);
    },
    { timeout: 60000 },
  );
}

export async function deleteBackup(id: string) {
  const record = await db.backup.findUniqueOrThrow({ where: { id } });
  try {
    await fs.unlink(path.join(BACKUP_DIR, record.filename));
  } catch {
    // file may already be gone
  }
  await db.backup.delete({ where: { id } });
}

export async function listBackups() {
  return db.backup.findMany({ orderBy: { createdAt: "desc" } });
}
