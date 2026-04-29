import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewAllBrigades } from "@/lib/rbac";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { CreateTimesheetButton } from "./create-button";

const STATUS_LABEL = { DRAFT: "Черновик", SUBMITTED: "На проверке", APPROVED: "Утверждён" } as const;
const STATUS_STYLE = {
  DRAFT: "text-muted-foreground border-border",
  SUBMITTED: "text-amber-600 border-amber-200 bg-amber-50",
  APPROVED: "text-emerald-600 border-emerald-200 bg-emerald-50",
} as const;

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

export default async function TimesheetListPage() {
  const session = await auth();
  const { role, objectId } = session!.user;
  const isAdmin = canViewAllBrigades(role);

  const timesheets = await prisma.timesheet.findMany({
    where: isAdmin ? {} : { createdByUserId: session!.user.id },
    include: { object: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const objects = isAdmin
    ? await prisma.object.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    : [];

  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-foreground">Табели</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href={`/timesheet/full?year=${now.getFullYear()}&month=${now.getMonth() + 1}&objectId=all`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Полный табель
            </Link>
          )}
          <CreateTimesheetButton
            objects={isAdmin ? objects : objectId ? [{ id: objectId, name: "" }] : []}
            defaultObjectId={isAdmin ? undefined : objectId ?? undefined}
            defaultYear={now.getFullYear()}
            defaultMonth={now.getMonth() + 1}
            isAdmin={isAdmin}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {isAdmin && <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Объект</th>}
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Период</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Статус</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {timesheets.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Нет табелей. Создайте первый.
                </td>
              </tr>
            )}
            {timesheets.map((t) => (
              <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors group">
                {isAdmin && <td className="px-4 py-3 font-medium text-foreground">{t.object.name}</td>}
                <td className="px-4 py-3 text-foreground">
                  {MONTHS[t.month - 1]} {t.year}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={STATUS_STYLE[t.status]}>
                    {STATUS_LABEL[t.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/timesheet/${t.id}`}
                    className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors"
                  >
                    Открыть →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
