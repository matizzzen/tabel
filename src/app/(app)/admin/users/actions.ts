"use server";

import { auth } from "@/auth";
import { prisma as db } from "@/lib/db";
import { assertRole } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Role } from "@/generated/prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthenticated");
  assertRole(session.user.role, ["ADMIN", "DIRECTOR"]);
}

export async function createUser(data: {
  login: string;
  password: string;
  fullName: string;
  role: Role;
  objectId?: string;
}) {
  await requireAdmin();
  const login = data.login.trim();
  const fullName = data.fullName.trim();
  if (!login) throw new Error("Логин обязателен");
  if (!data.password || data.password.length < 4) throw new Error("Пароль минимум 4 символа");
  if (!fullName) throw new Error("ФИО обязательно");
  if (data.role === "FOREMAN" && !data.objectId) throw new Error("Укажите объект для бригадира");

  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.user.create({
    data: {
      login,
      passwordHash,
      fullName,
      role: data.role,
      objectId: data.role === "FOREMAN" ? data.objectId : null,
    },
  });
  revalidatePath("/admin/users");
}

export async function updateUser(data: {
  id: string;
  login: string;
  password?: string;
  fullName: string;
  role: Role;
  objectId?: string;
}) {
  await requireAdmin();
  const login = data.login.trim();
  const fullName = data.fullName.trim();
  if (!login) throw new Error("Логин обязателен");
  if (!fullName) throw new Error("ФИО обязательно");
  if (data.role === "FOREMAN" && !data.objectId) throw new Error("Укажите объект для бригадира");

  const updateData: Record<string, unknown> = {
    login,
    fullName,
    role: data.role,
    objectId: data.role === "FOREMAN" ? data.objectId : null,
  };

  if (data.password && data.password.length >= 4) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await db.user.update({ where: { id: data.id }, data: updateData });
  revalidatePath("/admin/users");
}

export async function toggleUser(id: string, isActive: boolean) {
  await requireAdmin();
  await db.user.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/users");
}

export async function deleteUser(id: string) {
  await requireAdmin();
  await db.$transaction(async (tx) => {
    // Delete timesheets created by this user (rows/days cascade via schema onDelete: Cascade)
    await tx.timesheet.deleteMany({ where: { createdByUserId: id } });

    // Delete employees of this foreman (with their timesheet rows/days)
    const employees = await tx.employee.findMany({
      where: { foremanId: id },
      select: { id: true },
    });
    const employeeIds = employees.map((e) => e.id);
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

    // Delete positions and departments owned by this foreman
    await tx.position.deleteMany({ where: { userId: id } });
    await tx.department.deleteMany({ where: { userId: id } });

    await tx.user.delete({ where: { id } });
  });
  revalidatePath("/admin/users");
}
