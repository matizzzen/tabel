import type { Role, TimesheetStatus } from "@/generated/prisma/client";

export function canViewAllBrigades(role: Role) {
  return role === "ADMIN" || role === "DIRECTOR";
}

export function canApproveTimesheet(role: Role) {
  return role === "ADMIN" || role === "DIRECTOR";
}

export function canSubmitTimesheet(role: Role) {
  return role === "FOREMAN" || role === "ADMIN" || role === "DIRECTOR";
}

export function canEditTimesheet(role: Role, status: TimesheetStatus) {
  if (status === "APPROVED") return role === "ADMIN" || role === "DIRECTOR";
  return true;
}

export function canManageReferenceData(role: Role) {
  return role === "ADMIN" || role === "DIRECTOR";
}

export function assertRole(role: Role, allowed: Role[]) {
  if (!allowed.includes(role)) throw new Error("Forbidden");
}
