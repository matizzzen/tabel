import ExcelJS from "exceljs";
import { calcShifts, calcPay, calcRemainder, allDays } from "./payroll";
import type { DayValue } from "@/generated/prisma/client";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

const DAY_LABEL: Record<DayValue, string> = {
  FULL: "1", THREE_QUARTERS: "3/4", HALF: "1/2", QUARTER: "1/4", ABSENT: "0", SICK: "б",
};

interface ExcelRow {
  fullName: string;
  positionSnapshot: string;
  objectName: string;
  shiftRateSnapshot: number;
  paidAmount: number;
  notes?: string | null;
  dayMap: Record<number, DayValue>;
}

interface DeptGroup {
  name: string;
  rows: ExcelRow[];
}

interface TimesheetExcelData {
  objectName: string;
  year: number;
  month: number;
  deptGroups: DeptGroup[];
  isAdmin: boolean;
}

export async function buildTimesheetXlsx(data: TimesheetExcelData): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Tabel";
  wb.created = new Date();

  const ws = wb.addWorksheet(`${MONTHS[data.month - 1]} ${data.year}`, {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  const days = allDays(data.year, data.month);
  const adminCols = data.isAdmin ? 2 : 0; // Выплаты, Остаток
  const noteCol = 4 + days.length + 2 + adminCols + 1; // Примечание column index

  // ── Column widths ──────────────────────────────────────────────
  ws.getColumn(1).width = 28; // ФИО
  ws.getColumn(2).width = 18; // Должность
  ws.getColumn(3).width = 20; // Объект
  ws.getColumn(4).width = 10; // Ставка
  days.forEach((_, i) => { ws.getColumn(5 + i).width = 4; });
  const afterDays = 5 + days.length;
  ws.getColumn(afterDays).width = 8;     // Итого смен
  ws.getColumn(afterDays + 1).width = 12; // К выплате
  if (data.isAdmin) {
    ws.getColumn(afterDays + 2).width = 12; // Выплаты
    ws.getColumn(afterDays + 3).width = 12; // Остаток
  }
  ws.getColumn(noteCol).width = 24; // Примечание

  // ── Title ──────────────────────────────────────────────────────
  const titleRow = ws.addRow([`Табель — ${data.objectName} — ${MONTHS[data.month - 1]} ${data.year}`]);
  titleRow.font = { bold: true, size: 13 };
  ws.mergeCells(1, 1, 1, 4 + days.length + 2 + adminCols + 1);
  ws.addRow([]); // spacer

  // ── Header ─────────────────────────────────────────────────────
  const headerValues = [
    "ФИО", "Должность", "Объект", "Ставка",
    ...days.map(String),
    "Итого смен", "К выплате",
    ...(data.isAdmin ? ["Выплаты", "Остаток"] : []),
    "Примечание",
  ];
  const headerRow = ws.addRow(headerValues);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 9 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4F4F5" } };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FFD4D4D8" } },
      right: { style: "thin", color: { argb: "FFD4D4D8" } },
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: false };
  });
  // Left-align text headers
  headerRow.getCell(1).alignment = { horizontal: "left" };
  headerRow.getCell(2).alignment = { horizontal: "left" };
  headerRow.getCell(3).alignment = { horizontal: "left" };

  // ── Data rows ──────────────────────────────────────────────────
  for (const group of data.deptGroups) {
    // Department header
    const deptRow = ws.addRow([group.name]);
    deptRow.font = { bold: true, size: 9 };
    deptRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE4E4E7" } };
    ws.mergeCells(deptRow.number, 1, deptRow.number, 4 + days.length + 2 + adminCols + 1);

    for (const row of group.rows) {
      const dayValues = days.map((d) => ({ value: row.dayMap[d] ?? "ABSENT" as DayValue }));
      const shifts = calcShifts(dayValues);
      const pay = calcPay(shifts, row.shiftRateSnapshot);
      const remainder = calcRemainder(pay, row.paidAmount);

      const values: (string | number)[] = [
        row.fullName,
        row.positionSnapshot,
        row.objectName,
        row.shiftRateSnapshot,
        ...days.map((d) => (row.dayMap[d] ? DAY_LABEL[row.dayMap[d]] : "")),
        shifts,
        pay,
        ...(data.isAdmin ? [row.paidAmount, remainder] : []),
        row.notes ?? "",
      ];

      const dataRow = ws.addRow(values);
      dataRow.height = 16;
      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        cell.font = { size: 9 };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFE4E4E7" } },
          right: { style: "hair", color: { argb: "FFE4E4E7" } },
        };
        // Day columns: center
        if (colNum >= 5 && colNum < 5 + days.length) {
          cell.alignment = { horizontal: "center" };
        }
        // Numeric cols: right
        if (colNum === 4 || colNum >= 5 + days.length) {
          cell.alignment = { horizontal: "right" };
          if (typeof cell.value === "number" && colNum !== afterDays) {
            cell.numFmt = "#,##0";
          }
        }
        // Остаток: highlight negative
        if (data.isAdmin && colNum === afterDays + 3 && typeof cell.value === "number" && cell.value < 0) {
          cell.font = { size: 9, color: { argb: "FFDC2626" } };
        }
      });
    }
  }

  // Freeze panes: first 4 cols + header row
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: headerRow.number, activeCell: "E4" }];

  const arrayBuf = await wb.xlsx.writeBuffer();
  return new Uint8Array(arrayBuf as ArrayBuffer);
}
