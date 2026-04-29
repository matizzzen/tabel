import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewAllBrigades, canEditTimesheet, canApproveTimesheet } from "@/lib/rbac";
import { notFound, redirect } from "next/navigation";
import { allDays, calcShifts, calcPay } from "@/lib/payroll";
import { TimesheetGrid } from "./grid";
import { AddRowButton } from "./add-row-button";
import { TimesheetActions } from "./timesheet-actions";
import Link from "next/link";
import type { DayValue } from "@/generated/prisma/client";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export default async function TimesheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const { role, id: userId } = session!.user;

  const timesheet = await prisma.timesheet.findUnique({
    where: { id },
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

  if (!timesheet) notFound();

  if (!canViewAllBrigades(role) && timesheet.createdByUserId !== userId) {
    redirect("/timesheet");
  }

  const days = allDays(timesheet.year, timesheet.month);
  const isAdmin = canViewAllBrigades(role);
  const canEdit = canEditTimesheet(role, timesheet.status);
  const canApprove = canApproveTimesheet(role);
  const isForeman = role === "FOREMAN";

  const rows = timesheet.rows.map((row) => {
    const dayMap = new Map(row.days.map((d) => [d.day, d.value as DayValue]));
    const shifts = calcShifts(days.map((d) => ({ value: dayMap.get(d) ?? "ABSENT" })));
    const pay = calcPay(shifts, Number(row.shiftRateSnapshot));
    return { ...row, dayMap, shifts, pay, paidAmount: Number(row.paidAmount) };
  });

  const deptMap = new Map<string, { name: string; rows: typeof rows }>();
  for (const row of rows) {
    const key = row.departmentSnapshot;
    if (!deptMap.has(key)) deptMap.set(key, { name: row.departmentSnapshot, rows: [] });
    deptMap.get(key)!.rows.push(row);
  }

  const [employees, objects, positions, departments] = canEdit
    ? await Promise.all([
        prisma.employee.findMany({ where: { isActive: true, ...(isForeman ? { foremanId: userId } : {}) }, include: { position: true, department: true }, orderBy: { fullName: "asc" } }),
        isForeman ? [] : prisma.object.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
        prisma.position.findMany({ where: isForeman ? { userId } : {}, orderBy: { name: "asc" } }),
        prisma.department.findMany({ where: { isActive: true, ...(isForeman ? { userId } : {}) }, orderBy: { name: "asc" } }),
      ])
    : [[], [], [], []];

  const existingEmployeeIds = new Set(timesheet.rows.map((r) => r.employeeId));

  const STATUS_LABEL = { DRAFT: "Черновик", SUBMITTED: "На проверке", APPROVED: "Утверждён" };
  const STATUS_COLOR = { DRAFT: "text-muted-foreground", SUBMITTED: "text-amber-600", APPROVED: "text-emerald-600" };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {timesheet.object.name}
            </h1>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-base text-muted-foreground">{MONTHS[timesheet.month - 1]} {timesheet.year}</span>
          </div>
          <p className={`text-xs mt-0.5 ${STATUS_COLOR[timesheet.status]}`}>
            {STATUS_LABEL[timesheet.status]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/api/timesheet/${id}/export`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            ↓ XLSX
          </Link>
          <TimesheetActions
            timesheetId={id}
            status={timesheet.status}
            canEdit={canEdit}
            canApprove={canApprove}
          />
        </div>
      </div>

      <TimesheetGrid
        timesheetId={id}
        days={days}
        deptGroups={[...deptMap.values()].map((g) => ({
          name: g.name,
          rows: g.rows.map((r) => ({
            id: r.id,
            employeeId: r.employeeId,
            fullName: r.employee.fullName,
            positionSnapshot: r.positionSnapshot,
            shiftRateSnapshot: Number(r.shiftRateSnapshot),
            paidAmount: r.paidAmount,
            notes: r.notes,
            dayMap: Object.fromEntries(r.dayMap),
            shifts: r.shifts,
            pay: r.pay,
          })),
        }))}
        isAdmin={isAdmin}
        canEdit={canEdit}
        year={timesheet.year}
        month={timesheet.month}
      />

      {canEdit && (
        <AddRowButton
          timesheetId={id}
          employees={employees
            .filter((e) => !existingEmployeeIds.has(e.id))
            .map((e) => ({ id: e.id, fullName: e.fullName, departmentName: e.department?.name ?? "", positionName: e.position.name }))}
          objects={objects}
          departments={departments}
          positions={positions}
          timesheetObjectId={timesheet.objectId}
          isForeman={isForeman}
        />
      )}
    </div>
  );
}
