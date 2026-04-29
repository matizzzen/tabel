"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthenticated");
  assertRole(session.user.role, ["ADMIN", "DIRECTOR"]);
}

export async function upsertObject(data: { id?: string; name: string }) {
  await requireAdmin();
  const name = data.name.trim();
  if (!name) throw new Error("Название обязательно");

  if (data.id) {
    await db.object.update({ where: { id: data.id }, data: { name } });
  } else {
    await db.object.create({ data: { name } });
  }
  revalidatePath("/admin/objects");
}

export async function toggleObject(id: string, isActive: boolean) {
  await requireAdmin();
  await db.object.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/objects");
}

export async function deleteObject(id: string) {
  await requireAdmin();
  const [timesheetCount, foremanCount] = await Promise.all([
    db.timesheet.count({ where: { objectId: id } }),
    db.user.count({ where: { objectId: id } }),
  ]);
  if (timesheetCount > 0 || foremanCount > 0) {
    throw new Error(
      `Нельзя удалить: объект используется в ${timesheetCount} табел${timesheetCount === 1 ? "е" : "ях"} и привязан к ${foremanCount} бригадир${foremanCount === 1 ? "у" : "ам"}. Сначала переназначьте или удалите их.`
    );
  }
  await db.object.delete({ where: { id } });
  revalidatePath("/admin/objects");
}
