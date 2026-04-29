"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { assertRole, canEditTimesheet, canApproveTimesheet } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import type { DayValue } from "@/generated/prisma/client";

async function getSession() {
  const session = await auth();
  if (!session) throw new Error("Unauthenticated");
  return session;
}

export async function createTimesheet(objectId: string, year: number, month: number) {
  const session = await getSession();
  assertRole(session.user.role, ["ADMIN", "DIRECTOR", "FOREMAN"]);

  if (session.user.role === "FOREMAN" && session.user.objectId !== objectId) {
    throw new Error("Forbidden");
  }

  const existing = await prisma.timesheet.findUnique({
    where: { objectId_createdByUserId_year_month: { objectId, createdByUserId: session.user.id, year, month } },
  });
  if (existing) return existing;

  const timesheet = await prisma.timesheet.create({
    data: { objectId, year, month, createdByUserId: session.user.id },
  });
  revalidatePath("/timesheet");
  return timesheet;
}

export async function upsertTimesheetRow(timesheetId: string, data: {
  employeeId: string;
  objectId: string;
  notes?: string;
}) {
  const session = await getSession();
  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });

  if (session.user.role === "FOREMAN" && timesheet.createdByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  const employee = await prisma.employee.findUniqueOrThrow({
    where: { id: data.employeeId },
    include: { position: true, department: true },
  });

  await prisma.timesheetRow.upsert({
    where: { timesheetId_employeeId: { timesheetId, employeeId: data.employeeId } },
    create: {
      timesheetId,
      employeeId: data.employeeId,
      positionSnapshot: employee.position.name,
      departmentSnapshot: employee.department.name,
      shiftRateSnapshot: employee.defaultShiftRate,
      objectId: data.objectId,
      notes: data.notes,
    },
    update: {
      objectId: data.objectId,
      notes: data.notes,
    },
  });
  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function createEmployeeAndAddRow(
  timesheetId: string,
  data: {
    fullName: string;
    positionId: string;
    departmentId: string;
    defaultShiftRate: string;
    objectId: string;
  }
) {
  const session = await getSession();
  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });

  if (session.user.role === "FOREMAN" && timesheet.createdByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  const fullName = data.fullName.trim();
  if (!fullName) throw new Error("ФИО обязательно");
  if (!data.positionId) throw new Error("Должность обязательна");
  if (!data.departmentId) throw new Error("Подразделение обязательно");
  const rate = parseFloat(data.defaultShiftRate);
  if (isNaN(rate) || rate < 0) throw new Error("Некорректная ставка");

  const [position, department] = await Promise.all([
    prisma.position.findUniqueOrThrow({ where: { id: data.positionId } }),
    prisma.department.findUniqueOrThrow({ where: { id: data.departmentId } }),
  ]);

  const employee = await prisma.employee.create({
    data: { fullName, positionId: data.positionId, departmentId: data.departmentId, defaultShiftRate: rate, foremanId: session.user.id },
  });

  await prisma.timesheetRow.create({
    data: {
      timesheetId,
      employeeId: employee.id,
      positionSnapshot: position.name,
      departmentSnapshot: department.name,
      shiftRateSnapshot: rate,
      objectId: data.objectId,
    },
  });

  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function removeTimesheetRow(timesheetId: string, rowId: string) {
  const session = await getSession();
  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });

  if (session.user.role === "FOREMAN" && timesheet.createdByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  await prisma.timesheetRow.delete({ where: { id: rowId } });
  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function updateDay(timesheetId: string, rowId: string, day: number, value: DayValue) {
  const session = await getSession();
  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });

  if (session.user.role === "FOREMAN" && timesheet.createdByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  await prisma.timesheetDay.upsert({
    where: { timesheetRowId_day: { timesheetRowId: rowId, day } },
    create: { timesheetRowId: rowId, day, value },
    update: { value },
  });
  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function submitTimesheet(timesheetId: string) {
  const session = await getSession();
  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });

  if (session.user.role === "FOREMAN" && timesheet.createdByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }
  if (timesheet.status !== "DRAFT") throw new Error("Только DRAFT можно отправить");

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });
  revalidatePath(`/timesheet/${timesheetId}`);
  revalidatePath("/timesheet");
}

export async function approveTimesheet(timesheetId: string) {
  const session = await getSession();
  if (!canApproveTimesheet(session.user.role)) throw new Error("Forbidden");

  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });
  if (timesheet.status !== "SUBMITTED") throw new Error("Только SUBMITTED можно утвердить");

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { status: "APPROVED", approvedAt: new Date(), approvedByUserId: session.user.id },
  });
  revalidatePath(`/timesheet/${timesheetId}`);
  revalidatePath("/timesheet");
}

export async function rejectTimesheet(timesheetId: string) {
  const session = await getSession();
  if (!canApproveTimesheet(session.user.role)) throw new Error("Forbidden");

  await prisma.timesheet.update({
    where: { id: timesheetId },
    data: { status: "DRAFT", approvedAt: null, approvedByUserId: null, submittedAt: null },
  });
  revalidatePath(`/timesheet/${timesheetId}`);
  revalidatePath("/timesheet");
}

export async function updatePaidAmount(timesheetId: string, rowId: string, paidAmount: number) {
  const session = await getSession();
  if (!canApproveTimesheet(session.user.role)) throw new Error("Forbidden");
  if (isNaN(paidAmount) || paidAmount < 0) throw new Error("Некорректная сумма");

  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  await prisma.timesheetRow.update({ where: { id: rowId }, data: { paidAmount } });
  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function updateNotes(timesheetId: string, rowId: string, notes: string) {
  const session = await getSession();
  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });

  if (session.user.role === "FOREMAN" && timesheet.createdByUserId !== session.user.id) {
    throw new Error("Forbidden");
  }
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  await prisma.timesheetRow.update({ where: { id: rowId }, data: { notes: notes.trim() || null } });
  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function updateShiftRate(timesheetId: string, rowId: string, rate: number) {
  const session = await getSession();
  if (!canApproveTimesheet(session.user.role)) throw new Error("Forbidden");
  if (isNaN(rate) || rate < 0) throw new Error("Некорректная ставка");

  const timesheet = await prisma.timesheet.findUniqueOrThrow({ where: { id: timesheetId } });
  if (!canEditTimesheet(session.user.role, timesheet.status)) throw new Error("Forbidden");

  const row = await prisma.timesheetRow.findUniqueOrThrow({ where: { id: rowId } });
  await Promise.all([
    prisma.timesheetRow.update({ where: { id: rowId }, data: { shiftRateSnapshot: rate } }),
    prisma.employee.update({ where: { id: row.employeeId }, data: { defaultShiftRate: rate } }),
  ]);
  revalidatePath(`/timesheet/${timesheetId}`);
}

export async function createPosition(name: string) {
  const session = await getSession();
  assertRole(session.user.role, ["ADMIN", "DIRECTOR", "FOREMAN"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Название обязательно");
  const position = await prisma.position.create({ data: { name: trimmed, userId: session.user.id } });
  revalidatePath("/admin/positions");
  return position;
}

export async function deletePositionForeman(id: string) {
  const session = await getSession();
  assertRole(session.user.role, ["ADMIN", "DIRECTOR", "FOREMAN"]);
  await prisma.position.delete({ where: { id } });
  revalidatePath("/admin/positions");
}

export async function createDepartment(name: string) {
  const session = await getSession();
  assertRole(session.user.role, ["ADMIN", "DIRECTOR", "FOREMAN"]);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Название обязательно");
  const dept = await prisma.department.create({ data: { name: trimmed, userId: session.user.id } });
  revalidatePath("/admin/departments");
  return dept;
}

export async function deleteDepartmentForeman(id: string) {
  const session = await getSession();
  assertRole(session.user.role, ["ADMIN", "DIRECTOR", "FOREMAN"]);
  await prisma.department.delete({ where: { id } });
  revalidatePath("/admin/departments");
}
