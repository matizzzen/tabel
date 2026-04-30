"use server";

import { auth } from "@/auth";
import { assertRole } from "@/lib/rbac";
import {
  createBackup,
  deleteBackup,
  getBackupForemen,
  restoreByForeman,
  restoreFull,
} from "@/lib/backup";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthenticated");
  assertRole(session.user.role, ["ADMIN", "DIRECTOR"]);
}

export async function createManualBackup(label?: string) {
  await requireAdmin();
  await createBackup(false, label);
  revalidatePath("/admin/backups");
}

export async function getForemenInBackup(backupId: string) {
  await requireAdmin();
  return getBackupForemen(backupId);
}

export async function restoreFullAction(backupId: string) {
  await requireAdmin();
  await restoreFull(backupId);
  revalidatePath("/");
}

export async function restoreByForemanAction(backupId: string, foremanId: string) {
  await requireAdmin();
  await restoreByForeman(backupId, foremanId);
  revalidatePath("/");
}

export async function deleteBackupAction(id: string) {
  await requireAdmin();
  await deleteBackup(id);
  revalidatePath("/admin/backups");
}
