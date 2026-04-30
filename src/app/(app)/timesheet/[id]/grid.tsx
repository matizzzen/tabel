"use client";

import React, { useState, useTransition, useMemo, useRef, useCallback, useEffect } from "react";
import { updateDay, removeTimesheetRow, updatePaidAmount, updateShiftRate, updateNotes } from "../actions";
import type { DayValue } from "@/generated/prisma/client";
import { calcShifts, calcRemainder } from "@/lib/payroll";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function useColResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback((colIdx: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { colIdx, startX: e.clientX, startW: widths[colIdx] };
  }, [widths]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const { colIdx, startX, startW } = dragging.current;
      const next = Math.max(20, startW + e.clientX - startX);
      setWidths((w) => { const a = [...w]; a[colIdx] = next; return a; });
    }
    function onUp() { dragging.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  return { widths, onMouseDown };
}

const DAY_CYCLE: DayValue[] = ["FULL", "HALF", "QUARTER", "THREE_QUARTERS", "SICK", "ABSENT"];
const DAY_LABEL: Record<DayValue, string> = {
  FULL: "1",
  THREE_QUARTERS: "¾",
  HALF: "½",
  QUARTER: "¼",
  ABSENT: "0",
  SICK: "б",
};
const DAY_STYLE: Record<DayValue, string> = {
  FULL: "bg-zinc-800 text-white",
  THREE_QUARTERS: "bg-zinc-600 text-white",
  HALF: "bg-zinc-400 text-white",
  QUARTER: "bg-zinc-200 text-zinc-700",
  ABSENT: "text-zinc-300",
  SICK: "bg-amber-100 text-amber-700",
};

interface Row {
  id: string;
  employeeId: string;
  fullName: string;
  positionSnapshot: string;
  shiftRateSnapshot: number;
  paidAmount: number;
  notes: string | null;
  dayMap: Record<number, DayValue>;
  shifts: number;
  pay: number;
}

interface DeptGroup {
  name: string;
  rows: Row[];
}

interface Props {
  timesheetId: string;
  days: number[];
  deptGroups: DeptGroup[];
  isAdmin: boolean;
  canEdit: boolean;
  year: number;
  month: number;
}

function DayCell({ timesheetId, rowId, day, value, canEdit }: {
  timesheetId: string; rowId: string; day: number; value: DayValue; canEdit: boolean;
}) {
  const [, startTransition] = useTransition();
  function cycle() {
    if (!canEdit) return;
    const next = DAY_CYCLE[(DAY_CYCLE.indexOf(value) + 1) % DAY_CYCLE.length];
    startTransition(() => updateDay(timesheetId, rowId, day, next));
  }
  return (
    <td
      onClick={cycle}
      title={`День ${day}`}
      className={`text-center text-xs font-semibold leading-none select-none border-r border-border/30 last:border-r-0 py-2.5 ${canEdit ? "cursor-pointer hover:ring-1 hover:ring-ring hover:ring-inset" : ""} ${DAY_STYLE[value]}`}
    >
      {DAY_LABEL[value]}
    </td>
  );
}

function PaidCell({ timesheetId, rowId, paidAmount, canEdit }: {
  timesheetId: string; rowId: string; paidAmount: number; canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(paidAmount));
  const [, startTransition] = useTransition();

  function commit() {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) {
      startTransition(() => updatePaidAmount(timesheetId, rowId, n));
    } else {
      setVal(String(paidAmount));
    }
    setEditing(false);
  }

  if (!canEdit || !editing) {
    return (
      <td
        onClick={() => canEdit && setEditing(true)}
        className={`px-2 py-2 text-right whitespace-nowrap text-muted-foreground ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""}`}
        title={canEdit ? "Нажмите для редактирования" : undefined}
      >
        {paidAmount > 0 ? paidAmount.toLocaleString("ru") : <span className="text-zinc-300">—</span>}
      </td>
    );
  }

  return (
    <td className="px-1 py-0.5">
      <input
        autoFocus
        type="number"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(String(paidAmount)); setEditing(false); } }}
        className="w-20 text-right text-xs border border-zinc-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </td>
  );
}

function ShiftRateCell({ timesheetId, rowId, rate, canEdit }: {
  timesheetId: string; rowId: string; rate: number; canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(rate));
  const [, startTransition] = useTransition();

  function commit() {
    const n = parseFloat(val);
    if (!isNaN(n) && n >= 0) {
      startTransition(() => updateShiftRate(timesheetId, rowId, n));
    } else {
      setVal(String(rate));
    }
    setEditing(false);
  }

  if (!canEdit || !editing) {
    return (
      <td
        onClick={() => canEdit && setEditing(true)}
        className={`px-2 py-2 text-right whitespace-nowrap text-muted-foreground ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""}`}
        title={canEdit ? "Нажмите для редактирования" : undefined}
      >
        {rate.toLocaleString("ru")}
      </td>
    );
  }

  return (
    <td className="px-1 py-0.5">
      <input
        autoFocus
        type="number"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(String(rate)); setEditing(false); } }}
        className="w-20 text-right text-xs border border-zinc-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </td>
  );
}

function NotesCell({ timesheetId, rowId, notes, canEdit }: {
  timesheetId: string; rowId: string; notes: string | null; canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(notes ?? "");
  const [, startTransition] = useTransition();

  function commit() {
    if (val !== (notes ?? "")) {
      startTransition(() => updateNotes(timesheetId, rowId, val));
    }
    setEditing(false);
  }

  if (!canEdit || !editing) {
    return (
      <td
        onClick={() => canEdit && setEditing(true)}
        className={`px-2 py-2 text-left text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px] ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""} ${notes ? "text-foreground" : "text-zinc-300"}`}
        title={notes ?? (canEdit ? "Нажмите для редактирования" : undefined)}
      >
        {notes || (canEdit ? <span className="italic text-zinc-300">—</span> : "—")}
      </td>
    );
  }

  return (
    <td className="px-1 py-0.5">
      <input
        autoFocus
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(notes ?? ""); setEditing(false); } }}
        className="w-40 text-xs border border-zinc-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </td>
  );
}

function RowActions({ timesheetId, rowId, canEdit }: { timesheetId: string; rowId: string; canEdit: boolean }) {
  const [, startTransition] = useTransition();
  if (!canEdit) return null;
  function handleDelete() {
    if (!confirm("Удалить строку сотрудника?")) return;
    startTransition(() => removeTimesheetRow(timesheetId, rowId));
  }
  return (
    <td className="px-1 py-1 text-right w-6">
      <button
        onClick={handleDelete}
        className="text-zinc-300 hover:text-red-400 transition-colors text-xs leading-none"
        title="Удалить строку"
      >
        ✕
      </button>
    </td>
  );
}

type SortMode = "dept-name" | "name";

// Resize handle rendered inside each <th>
function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <span
      onMouseDown={onMouseDown}
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none hover:bg-border/60 active:bg-border z-10"
      style={{ touchAction: "none" }}
    />
  );
}

export function TimesheetGrid({ timesheetId, days, deptGroups, isAdmin, canEdit }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("dept-name");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [showP1, setShowP1] = useState(true);
  const [showP2, setShowP2] = useState(true);
  const [showPosition, setShowPosition] = useState(true);

  const allDeptNames = useMemo(() => [...new Set(deptGroups.map((g) => g.name))].sort((a, b) => a.localeCompare(b, "ru")), [deptGroups]);

  const displayedGroups = useMemo(() => {
    const groups = filterDept === "all" ? deptGroups : deptGroups.filter((g) => g.name === filterDept);

    if (sortMode === "name") {
      const allRows = groups.flatMap((g) => g.rows).sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
      return allRows.length > 0 ? [{ name: "", rows: allRows }] : [];
    }

    return [...groups].sort((a, b) => a.name.localeCompare(b.name, "ru")).map((g) => ({
      ...g,
      rows: [...g.rows].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru")),
    }));
  }, [deptGroups, sortMode, filterDept]);

  const days1 = days.filter((d) => d <= 15);
  const days2 = days.filter((d) => d > 15);

  // Column index mapping (fixed cols before day cells):
  // 0: ФИО, 1?: Должность, 1/2?: Ставка, then days1, subtotal1, days2, subtotal2, Смен, Выплата?, Выплач.?, Остаток?, delete?
  const fixedInitial: number[] = [
    192,                          // ФИО
    ...(showPosition ? [112] : []),
    ...(isAdmin ? [80] : []),     // Ставка
  ];
  const dayW = 26;
  const dayWidths = days1.map(() => dayW);
  const sub1W = [44];
  const day2Widths = days2.map(() => dayW);
  const sub2W = [44];
  const tailWidths: number[] = [
    48,                           // Смен
    ...(isAdmin ? [80] : []),     // Выплата
    ...(isAdmin ? [80, 80] : []), // Выплач., Остаток
    160,                          // Примечание
    ...(canEdit ? [24] : []),     // delete
  ];

  const initialWidths = useMemo(
    () => [...fixedInitial, ...dayWidths, ...sub1W, ...day2Widths, ...sub2W, ...tailWidths],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showPosition, isAdmin, canEdit, days1.length, days2.length]
  );

  const { widths, onMouseDown } = useColResize(initialWidths);

  // Map logical col name → index into widths array
  const idxFio = 0;
  const idxPos = showPosition ? 1 : -1;
  const idxRate = isAdmin ? (showPosition ? 2 : 1) : -1;
  const idxDays1Start = (showPosition ? 1 : 0) + (isAdmin ? 1 : 0) + 1;
  const idxSub1 = idxDays1Start + days1.length;
  const idxDays2Start = idxSub1 + 1;
  const idxSub2 = idxDays2Start + days2.length;
  const idxShifts = idxSub2 + 1;
  const idxPay = isAdmin ? idxShifts + 1 : -1;
  const idxPaid = isAdmin ? idxShifts + 2 : -1;
  const idxRem = isAdmin ? idxShifts + 3 : -1;
  const idxNotes = isAdmin ? idxShifts + 4 : idxShifts + 1;

  const positionCol = showPosition ? 1 : 0;
  const adminExtra = isAdmin ? 2 : 0;
  const adminCols = isAdmin ? 2 : 0;
  const visibleDayCols = (showP1 ? days1.length : 0) + (showP2 ? days2.length : 0);
  const totalCols = 1 + positionCol + adminCols + visibleDayCols + 2 + 1 + adminExtra + 1 + (canEdit ? 1 : 0);

  if (deptGroups.length === 0 || deptGroups.every((g) => g.rows.length === 0)) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Нет строк. Добавьте сотрудников.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Select value={filterDept} onValueChange={(v) => setFilterDept(v ?? "all")}>
          <SelectTrigger className="w-56 h-8 text-xs">
            <SelectValue>{filterDept === "all" ? "Все подразделения" : filterDept}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все подразделения</SelectItem>
            {allDeptNames.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <button
          type="button"
          onClick={() => setSortMode((m) => m === "dept-name" ? "name" : "dept-name")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
        >
          {sortMode === "dept-name" ? "Сортировка: Подразделение → ФИО" : "Сортировка: ФИО (все подряд)"}
        </button>
        <button
          type="button"
          onClick={() => setShowPosition((v) => !v)}
          className={`text-xs transition-colors border rounded px-2 py-1 ${showPosition ? "border-border text-muted-foreground hover:text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {showPosition ? "Скрыть должность" : "Показать должность"}
        </button>
        <button
          type="button"
          onClick={() => setShowP1((v) => !v)}
          className={`text-xs transition-colors border rounded px-2 py-1 ${showP1 ? "border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/50" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {showP1 ? "Скрыть 1–15" : "Показать 1–15"}
        </button>
        <button
          type="button"
          onClick={() => setShowP2((v) => !v)}
          className={`text-xs transition-colors border rounded px-2 py-1 ${showP2 ? "border-blue-200 text-blue-600 bg-blue-50/50 hover:bg-blue-100/50" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          {showP2 ? "Скрыть 16–кон." : "Показать 16–кон."}
        </button>
      </div>

      <div className="overflow-x-auto"><div className="inline-block rounded-xl border border-border bg-card">
        <table className="text-sm border-collapse" style={{ tableLayout: "fixed", width: "max-content" }}>
          <colgroup>
            <col style={{ width: widths[idxFio] }} />
            {showPosition && <col style={{ width: widths[idxPos] }} />}
            {isAdmin && <col style={{ width: widths[idxRate] }} />}
            {showP1 && days1.map((d, i) => <col key={d} style={{ width: widths[idxDays1Start + i] }} />)}
            <col style={{ width: widths[idxSub1] }} />
            {showP2 && days2.map((d, i) => <col key={d} style={{ width: widths[idxDays2Start + i] }} />)}
            <col style={{ width: widths[idxSub2] }} />
            <col style={{ width: widths[idxShifts] }} />
            {isAdmin && <col style={{ width: widths[idxPay] }} />}
            {isAdmin && <><col style={{ width: widths[idxPaid] }} /><col style={{ width: widths[idxRem] }} /></>}
            <col style={{ width: widths[idxNotes] }} />
            {canEdit && <col style={{ width: 24 }} />}
          </colgroup>
          <thead>
            <tr className="bg-muted/60 border-b-2 border-border">
              <th
                onClick={() => setSortMode((m) => m === "name" ? "dept-name" : "name")}
                className="relative px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate cursor-pointer hover:text-foreground transition-colors select-none"
              >
                ФИО {sortMode === "name" ? "↑" : ""}
                <ResizeHandle onMouseDown={onMouseDown(idxFio)} />
              </th>
              {showPosition && (
                <th className="relative px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Должность
                  <ResizeHandle onMouseDown={onMouseDown(idxPos)} />
                </th>
              )}
              {isAdmin && (
                <th className="relative px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Ставка
                  <ResizeHandle onMouseDown={onMouseDown(idxRate)} />
                </th>
              )}
              {showP1 && days1.map((d, i) => (
                <th key={d} className="relative text-center text-xs font-semibold text-foreground/70 py-3 border-r border-border/50">
                  {d}
                  <ResizeHandle onMouseDown={onMouseDown(idxDays1Start + i)} />
                </th>
              ))}
              <th className="relative px-1 py-3 text-center text-xs font-semibold text-blue-500/70 uppercase tracking-wider border-l-2 border-blue-200 whitespace-nowrap">
                1–15
                <ResizeHandle onMouseDown={onMouseDown(idxSub1)} />
              </th>
              {showP2 && days2.map((d, i) => (
                <th key={d} className="relative text-center text-xs font-semibold text-foreground/70 py-3 border-r border-border/50">
                  {d}
                  <ResizeHandle onMouseDown={onMouseDown(idxDays2Start + i)} />
                </th>
              ))}
              <th className="relative px-1 py-3 text-center text-xs font-semibold text-blue-500/70 uppercase tracking-wider border-l-2 border-blue-200 whitespace-nowrap">
                16–кон.
                <ResizeHandle onMouseDown={onMouseDown(idxSub2)} />
              </th>
              <th className="relative px-1 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l-2 border-border">
                Смен
                <ResizeHandle onMouseDown={onMouseDown(idxShifts)} />
              </th>
              {isAdmin && (
                <th className="relative px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Выплата
                  <ResizeHandle onMouseDown={onMouseDown(idxPay)} />
                </th>
              )}
              {isAdmin && <>
                <th className="relative px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate border-l-2 border-border">
                  Выплач.
                  <ResizeHandle onMouseDown={onMouseDown(idxPaid)} />
                </th>
                <th className="relative px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Остаток
                  <ResizeHandle onMouseDown={onMouseDown(idxRem)} />
                </th>
              </>}
              <th className="relative px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate border-l border-border/40">
                Примечание
                <ResizeHandle onMouseDown={onMouseDown(idxNotes)} />
              </th>
              {canEdit && <th className="w-6" />}
            </tr>
          </thead>
          <tbody>
            {displayedGroups.map((group) => (
              <React.Fragment key={`dept-${group.name}`}>
                {group.name && (
                  <tr className="bg-muted/40 border-y border-border">
                    <td
                      colSpan={totalCols}
                      className="px-3 py-2 font-semibold text-foreground/70 text-xs uppercase tracking-widest"
                    >
                      {group.name}
                    </td>
                  </tr>
                )}

                {group.rows.map((row) => {
                  const remainder = calcRemainder(row.pay, row.paidAmount);
                  const shifts1 = calcShifts(days1.map((d) => ({ value: row.dayMap[d] ?? "ABSENT" as DayValue })));
                  const shifts2 = calcShifts(days2.map((d) => ({ value: row.dayMap[d] ?? "ABSENT" as DayValue })));

                  return (
                    <tr key={row.id} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors group">
                      <td className="px-2 py-2.5 font-medium text-foreground whitespace-nowrap" title={row.fullName}>
                        {row.fullName}
                      </td>
                      {showPosition && <td className="px-2 py-2.5 truncate text-muted-foreground" title={row.positionSnapshot}>{row.positionSnapshot}</td>}
                      {isAdmin && <ShiftRateCell timesheetId={timesheetId} rowId={row.id} rate={row.shiftRateSnapshot} canEdit={canEdit} />}
                      {showP1 && days1.map((d) => (
                        <DayCell
                          key={d}
                          timesheetId={timesheetId}
                          rowId={row.id}
                          day={d}
                          value={row.dayMap[d] ?? "ABSENT"}
                          canEdit={canEdit}
                        />
                      ))}
                      <td className="px-1 py-2.5 text-center font-medium text-blue-600 border-l-2 border-blue-200">
                        {shifts1 % 1 === 0 ? shifts1 : shifts1.toFixed(2)}
                      </td>
                      {showP2 && days2.map((d) => (
                        <DayCell
                          key={d}
                          timesheetId={timesheetId}
                          rowId={row.id}
                          day={d}
                          value={row.dayMap[d] ?? "ABSENT"}
                          canEdit={canEdit}
                        />
                      ))}
                      <td className="px-1 py-2.5 text-center font-medium text-blue-600 border-l-2 border-blue-200">
                        {shifts2 % 1 === 0 ? shifts2 : shifts2.toFixed(2)}
                      </td>
                      <td className="px-1 py-2.5 text-center font-medium text-foreground border-l-2 border-border/40">
                        {row.shifts % 1 === 0 ? row.shifts : row.shifts.toFixed(2)}
                      </td>
                      {isAdmin && <td className="px-2 py-2.5 text-right font-semibold text-foreground truncate">
                        {row.pay.toLocaleString("ru")}
                      </td>}
                      {isAdmin && <>
                        <PaidCell
                          timesheetId={timesheetId}
                          rowId={row.id}
                          paidAmount={row.paidAmount}
                          canEdit={canEdit}
                        />
                        <td className={`px-2 py-2.5 text-right font-semibold truncate ${remainder < 0 ? "text-destructive" : "text-foreground"}`}>
                          {remainder.toLocaleString("ru")}
                        </td>
                      </>}
                      <NotesCell
                        timesheetId={timesheetId}
                        rowId={row.id}
                        notes={row.notes}
                        canEdit={canEdit}
                      />
                      <RowActions timesheetId={timesheetId} rowId={row.id} canEdit={canEdit} />
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div></div>
    </div>
  );
}
