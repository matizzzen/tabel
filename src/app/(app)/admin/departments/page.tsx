import { prisma as db } from "@/lib/db";
import { DepartmentsClient } from "./client";

export default async function DepartmentsPage() {
  const [departments, foremen] = await Promise.all([
    db.department.findMany({ include: { user: true, _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "FOREMAN", isActive: true }, orderBy: { fullName: "asc" } }),
  ]);
  return (
    <DepartmentsClient
      departments={departments.map((d) => ({ id: d.id, name: d.name, userId: d.userId, isActive: d.isActive, foremanName: d.user.fullName, employeeCount: d._count.employees }))}
      foremen={foremen.map((f) => ({ id: f.id, fullName: f.fullName }))}
    />
  );
}
