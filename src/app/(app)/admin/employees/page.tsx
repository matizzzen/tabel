import { prisma as db } from "@/lib/db";
import { EmployeesClient } from "./client";

export default async function EmployeesPage() {
  const [employees, positions, departments, foremen] = await Promise.all([
    db.employee.findMany({
      include: { position: true, department: true, foreman: true },
      orderBy: { fullName: "asc" },
    }),
    db.position.findMany({ orderBy: { name: "asc" } }),
    db.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "FOREMAN", isActive: true }, orderBy: { fullName: "asc" } }),
  ]);

  return (
    <EmployeesClient
      employees={employees.map((e) => ({
        ...e,
        defaultShiftRate: e.defaultShiftRate.toString(),
        foremanName: e.foreman.fullName,
      }))}
      positions={positions}
      departments={departments}
      foremen={foremen.map((f) => ({ id: f.id, fullName: f.fullName }))}
    />
  );
}
