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

export async function upsertEmployee(data: {
  id?: string;
  fullName: string;
  positionId: string;
  departmentId: string;
  defaultShiftRate: string;
  foremanId?: string;
}) {
  await requireAdmin();
  const fullName = data.fullName.trim();
  if (!fullName) throw new Error("ФИО обязательно");
  if (!data.positionId) throw new Error("Должность обязательна");
  if (!data.departmentId) throw new Error("Подразделение обязательно");
  const rate = parseFloat(data.defaultShiftRate);
  if (isNaN(rate) || rate < 0) throw new Error("Некорректная ставка");

  if (data.id) {
    await db.employee.update({
      where: { id: data.id },
      data: {
        fullName,
        positionId: data.positionId,
        departmentId: data.departmentId,
        defaultShiftRate: rate,
        ...(data.foremanId ? { foremanId: data.foremanId } : {}),
      },
    });
  } else {
    if (!data.foremanId) throw new Error("Бригадир обязателен");
    await db.employee.create({
      data: { fullName, positionId: data.positionId, departmentId: data.departmentId, defaultShiftRate: rate, foremanId: data.foremanId },
    });
  }
  revalidatePath("/admin/employees");
}

export async function toggleEmployee(id: string, isActive: boolean) {
  await requireAdmin();
  await db.employee.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/employees");
}

export async function deleteEmployee(id: string) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    const rowIds = await tx.timesheetRow.findMany({
      where: { employeeId: id },
      select: { id: true },
    });
    const rIds = rowIds.map((r) => r.id);
    if (rIds.length > 0) {
      await tx.timesheetDay.deleteMany({ where: { timesheetRowId: { in: rIds } } });
      await tx.timesheetRow.deleteMany({ where: { id: { in: rIds } } });
    }
    await tx.employee.delete({ where: { id } });
  });
  revalidatePath("/admin/employees");
}
