import { prisma as db } from "@/lib/db";
import { UsersClient } from "./client";

export default async function UsersPage() {
  const [users, objects] = await Promise.all([
    db.user.findMany({
      include: { object: true, _count: { select: { employees: true, createdTimesheets: true } } },
      orderBy: { fullName: "asc" },
    }),
    db.object.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <UsersClient
      users={users.map((u) => ({
        ...u,
        employeeCount: u._count.employees,
        timesheetCount: u._count.createdTimesheets,
      }))}
      objects={objects}
    />
  );
}
