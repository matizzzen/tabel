import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewAllBrigades } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { allDays, calcShifts, calcPay, calcRemainder } from "@/lib/payroll";
import { FullTimesheetFilters } from "./filters";
import { FullTimesheetGrid } from "./grid";
import Link from "next/link";
import type { DayValue } from "@/generated/prisma/client";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export default async function FullTimesheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!canViewAllBrigades(session!.user.role)) redirect("/timesheet");

  const sp = await searchParams;
  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10);
  const month = parseInt(sp.month ?? String(now.getMonth() + 1), 10);
  const objectId = sp.objectId ?? "all";

  const objects = await prisma.object.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  const timesheets = await prisma.timesheet.findMany({
    where: {
      year,
      month,
      ...(objectId !== "all" ? { objectId } : {}),
    },
    include: {
      object: true,
      createdBy: true,
      rows: {
        include: {
          employee: true,
          days: { orderBy: { day: "asc" } },
        },
        orderBy: [{ departmentSnapshot: "asc" }, { employee: { fullName: "asc" } }],
      },
    },
  });

  const days = allDays(year, month);

  // Build flat list of rows then group by object → foreman → dept
  const groupMap = new Map<string, RowGroup>();

  for (const ts of timesheets) {
    for (const row of ts.rows) {
      const dayMap = new Map(row.days.map((d) => [d.day, d.value as DayValue]));
      const dayValues = days.map((d) => ({ value: dayMap.get(d) ?? ("ABSENT" as DayValue) }));
      const shifts = calcShifts(dayValues);
      const pay = calcPay(shifts, Number(row.shiftRateSnapshot));
      const paidAmount = Number(row.paidAmount);
      const remainder = calcRemainder(pay, paidAmount);

      const objectName = ts.object.name;
      const foremanName = ts.createdBy.fullName;
      const deptName = row.departmentSnapshot;
      const groupKey = `${objectName}\0${foremanName}\0${deptName}`;

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, { objectName, foremanName, deptName, rows: [] });
      }
      groupMap.get(groupKey)!.rows.push({
        id: row.id,
        fullName: row.employee.fullName,
        positionSnapshot: row.positionSnapshot,
        shiftRateSnapshot: Number(row.shiftRateSnapshot),
        objectName,
        timesheetId: ts.id,
        foremanName,
        paidAmount,
        notes: row.notes,
        dayMap: Object.fromEntries(dayMap),
        shifts,
        pay,
        remainder,
      });
    }
  }

  const ru = (a: string, b: string) => a.localeCompare(b, "ru");
  const deptGroups = [...groupMap.values()]
    .sort((a, b) =>
      ru(a.objectName, b.objectName) ||
      ru(a.foremanName, b.foremanName) ||
      ru(a.deptName, b.deptName)
    )
    .map((g) => ({ ...g, rows: [...g.rows].sort((a, b) => ru(a.fullName, b.fullName)) }));

  const objectName = objectId !== "all"
    ? (objects.find((o) => o.id === objectId)?.name ?? "")
    : "Все объекты";

  const exportParams = new URLSearchParams({ year: String(year), month: String(month), objectId });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-foreground">Полный табель</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {objectName} · {MONTHS[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/timesheet/full/export?${exportParams.toString()}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            ↓ XLSX
          </Link>
          <Link
            href="/timesheet"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            ← Назад
          </Link>
        </div>
      </div>

      <FullTimesheetFilters
        objects={objects}
        year={year}
        month={month}
        objectId={objectId}
      />

      <FullTimesheetGrid
        days={days}
        deptGroups={deptGroups}
        showObject={objectId === "all"}
        isAdmin={canViewAllBrigades(session!.user.role)}
      />
    </div>
  );
}

export interface RowGroup {
  objectName: string;
  foremanName: string;
  deptName: string;
  rows: MergedRow[];
}

export interface MergedRow {
  id: string;
  fullName: string;
  positionSnapshot: string;
  shiftRateSnapshot: number;
  objectName: string;
  timesheetId: string;
  foremanName: string | null;
  paidAmount: number;
  notes: string | null;
  dayMap: Record<number, DayValue>;
  shifts: number;
  pay: number;
  remainder: number;
}
