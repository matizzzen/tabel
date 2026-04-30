import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewAllBrigades } from "@/lib/rbac";
import { buildTimesheetXlsx } from "@/lib/excel";
import type { DayValue } from "@/generated/prisma/client";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  if (!canViewAllBrigades(session.user.role)) return new NextResponse("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const year = parseInt(url.searchParams.get("year") ?? "", 10);
  const month = parseInt(url.searchParams.get("month") ?? "", 10);
  const objectId = url.searchParams.get("objectId") ?? "all";

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const timesheets = await prisma.timesheet.findMany({
    where: {
      year,
      month,
      ...(objectId !== "all" ? { objectId } : {}),
    },
    include: {
      object: true,
      rows: {
        include: {
          employee: true,
          days: { orderBy: { day: "asc" } },
        },
        orderBy: [{ departmentSnapshot: "asc" }, { employee: { fullName: "asc" } }],
      },
    },
  });

  const deptMap = new Map<string, { name: string; rows: Parameters<typeof buildTimesheetXlsx>[0]["deptGroups"][number]["rows"] }>();

  for (const ts of timesheets) {
    for (const row of ts.rows) {
      const dayMap: Record<number, DayValue> = {};
      for (const d of row.days) dayMap[d.day] = d.value as DayValue;

      const dept = row.departmentSnapshot;
      if (!deptMap.has(dept)) deptMap.set(dept, { name: dept, rows: [] });
      deptMap.get(dept)!.rows.push({
        fullName: row.employee.fullName,
        positionSnapshot: row.positionSnapshot,
        objectName: ts.object.name,
        shiftRateSnapshot: Number(row.shiftRateSnapshot),
        paidAmount: Number(row.paidAmount),
        notes: row.notes,
        dayMap,
      });
    }
  }

  const deptGroups = [...deptMap.values()]
    .sort((a, b) => a.name.localeCompare(b.name, "ru"))
    .map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru")),
    }));

  let objectName: string;
  if (objectId === "all") {
    objectName = "Все объекты";
  } else {
    const obj = await prisma.object.findUnique({ where: { id: objectId } });
    objectName = obj?.name ?? objectId;
  }

  const buf = await buildTimesheetXlsx({ objectName, year, month, deptGroups, isAdmin: true });

  const filename = `tabel_полный_${year}_${String(month).padStart(2, "0")}${objectId !== "all" ? `_${objectName}` : ""}.xlsx`;

  return new Response(buf.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
