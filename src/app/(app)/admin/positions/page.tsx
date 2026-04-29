import { prisma as db } from "@/lib/db";
import { PositionsClient } from "./client";

export default async function PositionsPage() {
  const [positions, foremen] = await Promise.all([
    db.position.findMany({ include: { user: true, _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    db.user.findMany({ where: { role: "FOREMAN", isActive: true }, orderBy: { fullName: "asc" } }),
  ]);
  return (
    <PositionsClient
      positions={positions.map((p) => ({ id: p.id, name: p.name, userId: p.userId, foremanName: p.user.fullName, employeeCount: p._count.employees }))}
      foremen={foremen.map((f) => ({ id: f.id, fullName: f.fullName }))}
    />
  );
}
