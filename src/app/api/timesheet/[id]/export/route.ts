import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewAllBrigades } from "@/lib/rbac";
import { buildTimesheetXlsx } from "@/lib/excel";
import { allDays } from "@/lib/payroll";
import type { DayValue } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
    include: {
      object: true,
      rows: {
        include: {
          employee: true,
          object: true,
          days: { orderBy: { day: "asc" } },
        },
        orderBy: [{ departmentSnapshot: "asc" }, { employee: { fullName: "asc" } }],
      },
    },
  });

  if (!timesheet) return new NextResponse("Not found", { status: 404 });

  const isAdmin = canViewAllBrigades(session.user.role);
  if (!isAdmin && timesheet.objectId !== session.user.objectId) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const days = allDays(timesheet.year, timesheet.month);

  const deptMap = new Map<string, { name: string; rows: Parameters<typeof buildTimesheetXlsx>[0]["deptGroups"][number]["rows"] }>();
  for (const row of timesheet.rows) {
    const key = row.departmentSnapshot;
    if (!deptMap.has(key)) deptMap.set(key, { name: row.departmentSnapshot, rows: [] });
    const dayMap: Record<number, DayValue> = {};
    for (const d of row.days) dayMap[d.day] = d.value as DayValue;
    deptMap.get(key)!.rows.push({
      fullName: row.employee.fullName,
      positionSnapshot: row.positionSnapshot,
      objectName: row.object.name,
      shiftRateSnapshot: Number(row.shiftRateSnapshot),
      paidAmount: Number(row.paidAmount),
      notes: row.notes,
      dayMap,
    });
  }

  const deptGroups = [...deptMap.values()].map((g) => ({
    name: g.name,
    rows: g.rows.map((r) => ({
      ...r,
      paidAmount: isAdmin ? r.paidAmount : 0,
    })),
  }));

  const buf = await buildTimesheetXlsx({
    objectName: timesheet.object.name,
    year: timesheet.year,
    month: timesheet.month,
    deptGroups,
    isAdmin,
  });

  const filename = `tabel_${timesheet.object.name}_${timesheet.year}_${String(timesheet.month).padStart(2, "0")}.xlsx`;

  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
