import type { DayValue } from "@/generated/prisma/client";

const DAY_WEIGHTS: Record<DayValue, number> = {
  FULL: 1,
  THREE_QUARTERS: 0.75,
  HALF: 0.5,
  QUARTER: 0.25,
  ABSENT: 0,
  SICK: 0,
};

export function dayWeight(value: DayValue): number {
  return DAY_WEIGHTS[value];
}

export function calcShifts(days: { value: DayValue }[]): number {
  return days.reduce((sum, d) => sum + dayWeight(d.value), 0);
}

export function calcPay(shifts: number, shiftRate: number): number {
  return shifts * shiftRate;
}

export function periodDays(year: number, month: number, period: 1 | 2): number[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  if (period === 1) return Array.from({ length: 15 }, (_, i) => i + 1);
  return Array.from({ length: daysInMonth - 15 }, (_, i) => i + 16);
}

export function allDays(year: number, month: number): number[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => i + 1);
}

export function calcSickDays(days: { value: DayValue }[]): number {
  return days.filter((d) => d.value === "SICK").length;
}

export function calcRemainder(pay: number, paidAmount: number): number {
  return pay - paidAmount;
}
