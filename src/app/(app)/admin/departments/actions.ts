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

export async function upsertDepartment(data: { id?: string; name: string; userId?: string }) {
  await requireAdmin();
  const name = data.name.trim();
  if (!name) throw new Error("Название обязательно");

  if (data.id) {
    await db.department.update({
      where: { id: data.id },
      data: { name, ...(data.userId ? { userId: data.userId } : {}) },
    });
  } else {
    if (!data.userId) throw new Error("Бригадир обязателен");
    await db.department.create({ data: { name, userId: data.userId } });
  }
  revalidatePath("/admin/departments");
}

export async function toggleDepartment(id: string, isActive: boolean) {
  await requireAdmin();
  await db.department.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/departments");
}

export async function deleteDepartment(id: string) {
  await requireAdmin();
  const employees = await db.employee.findMany({
    where: { departmentId: id },
    select: { id: true },
  });
  const employeeIds = employees.map((e) => e.id);
  await db.$transaction(async (tx) => {
    if (employeeIds.length > 0) {
      const rowIds = await tx.timesheetRow.findMany({
        where: { employeeId: { in: employeeIds } },
        select: { id: true },
      });
      const rIds = rowIds.map((r) => r.id);
      if (rIds.length > 0) {
        await tx.timesheetDay.deleteMany({ where: { timesheetRowId: { in: rIds } } });
        await tx.timesheetRow.deleteMany({ where: { id: { in: rIds } } });
      }
      await tx.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }
    await tx.department.delete({ where: { id } });
  });
  revalidatePath("/admin/departments");
}
