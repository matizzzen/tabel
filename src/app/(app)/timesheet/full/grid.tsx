"use client";

import React, { useState, useTransition, useMemo } from "react";
import type { DayValue } from "@/generated/prisma/client";
import { calcShifts } from "@/lib/payroll";
import { updateShiftRate, updatePaidAmount, updateNotes, updateDay } from "../actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RowGroup } from "./page";

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

interface Props {
  days: number[];
  deptGroups: RowGroup[];
  showObject: boolean;
  isAdmin: boolean;
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
      className={`text-center text-xs font-semibold leading-none select-none border-r border-border/30 py-2.5 ${canEdit ? "cursor-pointer hover:ring-1 hover:ring-ring hover:ring-inset" : ""} ${DAY_STYLE[value]}`}
    >
      {DAY_LABEL[value]}
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
        className={`px-2 py-2 text-right whitespace-nowrap text-muted-foreground border-l-2 border-border/40 ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""}`}
        title={canEdit ? "Нажмите для редактирования" : undefined}
      >
        {paidAmount > 0 ? paidAmount.toLocaleString("ru") : <span className="text-zinc-300">—</span>}
      </td>
    );
  }

  return (
    <td className="px-1 py-0.5 border-l-2 border-border/40">
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
        className={`px-2 py-2 text-left text-xs truncate max-w-[160px] border-l border-border/40 ${canEdit ? "cursor-pointer hover:bg-muted/40" : ""} ${notes ? "text-muted-foreground" : "text-zinc-300"}`}
        title={notes ?? (canEdit ? "Нажмите для редактирования" : undefined)}
      >
        {notes || (canEdit ? <span className="italic text-zinc-300">—</span> : "—")}
      </td>
    );
  }

  return (
    <td className="px-1 py-0.5 border-l border-border/40">
      <input
        autoFocus
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setVal(notes ?? ""); setEditing(false); } }}
        className="w-36 text-xs border border-zinc-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-zinc-400"
      />
    </td>
  );
}

const ru = (a: string, b: string) => a.localeCompare(b, "ru");

export function FullTimesheetGrid({ days, deptGroups, showObject: showObjectProp, isAdmin }: Props) {
  const days1 = days.filter((d) => d <= 15);
  const days2 = days.filter((d) => d > 15);
  const [filterDept, setFilterDept] = useState<string>("all");
  const [sortMode, setSortMode] = useState<"grouped" | "name">("grouped");
  const [showP1, setShowP1] = useState(true);
  const [showP2, setShowP2] = useState(true);
  const [showPosition, setShowPosition] = useState(true);
  const [showObject, setShowObject] = useState(showObjectProp);
  const [showForeman, setShowForeman] = useState(true);

  const allDeptNames = useMemo(
    () => [...new Set(deptGroups.map((g) => g.deptName))].sort((a, b) => ru(a, b)),
    [deptGroups]
  );

  const displayedGroups = useMemo(() => {
    const groups = filterDept === "all"
      ? deptGroups
      : deptGroups.filter((g) => g.deptName === filterDept);

    if (sortMode === "name") {
      const flat = groups.flatMap((g) => g.rows).sort((a, b) => ru(a.fullName, b.fullName));
      return flat.length > 0
        ? [{ objectName: "", foremanName: "", deptName: "", rows: flat }]
        : [];
    }

    return [...groups]
      .sort((a, b) => ru(a.objectName, b.objectName) || ru(a.foremanName, b.foremanName) || ru(a.deptName, b.deptName))
      .map((g) => ({ ...g, rows: [...g.rows].sort((a, b) => ru(a.fullName, b.fullName)) }));
  }, [deptGroups, filterDept, sortMode]);

  const allRows = useMemo(() => displayedGroups.flatMap((g) => g.rows), [displayedGroups]);

  const totals = useMemo(() => ({
    shifts: allRows.reduce((s, r) => s + r.shifts, 0),
    shifts1: allRows.reduce((s, r) => s + calcShifts(days1.map((d) => ({ value: r.dayMap[d] ?? "ABSENT" as DayValue }))), 0),
    shifts2: allRows.reduce((s, r) => s + calcShifts(days2.map((d) => ({ value: r.dayMap[d] ?? "ABSENT" as DayValue }))), 0),
    pay: allRows.reduce((s, r) => s + r.pay, 0),
    paidAmount: allRows.reduce((s, r) => s + r.paidAmount, 0),
    remainder: allRows.reduce((s, r) => s + r.remainder, 0),
  }), [allRows, days1, days2]);

  const positionCol = showPosition ? 1 : 0;
  const objectCol = showObject ? 1 : 0;
  const foremanCol = showForeman ? 1 : 0;
  const visibleDayCols = (showP1 ? days1.length : 0) + (showP2 ? days2.length : 0);
  // ФИО + position? + object? + foreman? + ставка + days1 + sub1 + days2 + sub2 + смен + выплата + выплач + остаток + примечание
  const totalCols = 1 + positionCol + objectCol + foremanCol + 1 + visibleDayCols + 2 + 1 + 2 + 1 + 1;

  if (deptGroups.length === 0 || deptGroups.every((g) => g.rows.length === 0)) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Нет данных за выбранный период.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
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
          onClick={() => setSortMode((m) => m === "grouped" ? "name" : "grouped")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
        >
          {sortMode === "grouped" ? "Сортировка: Объект → Бригадир → Подразделение → ФИО" : "Сортировка: ФИО (все подряд)"}
        </button>
        <button
          type="button"
          onClick={() => setShowPosition((v) => !v)}
          className="text-xs transition-colors border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground"
        >
          {showPosition ? "Скрыть должность" : "Показать должность"}
        </button>
        {showObjectProp && (
          <button
            type="button"
            onClick={() => setShowObject((v) => !v)}
            className="text-xs transition-colors border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground"
          >
            {showObject ? "Скрыть объект" : "Показать объект"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowForeman((v) => !v)}
          className="text-xs transition-colors border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground"
        >
          {showForeman ? "Скрыть бригадира" : "Показать бригадира"}
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
            <col style={{ width: 192 }} />
            {showPosition && <col style={{ width: 112 }} />}
            {showObject && <col style={{ width: 128 }} />}
            {showForeman && <col style={{ width: 128 }} />}
            <col style={{ width: 72 }} />
            {showP1 && days1.map((d) => <col key={d} style={{ width: 26 }} />)}
            <col style={{ width: 44 }} />
            {showP2 && days2.map((d) => <col key={d} style={{ width: 26 }} />)}
            <col style={{ width: 44 }} />
            <col style={{ width: 48 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 80 }} />
            <col style={{ width: 160 }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/60 border-b-2 border-border">
              <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">ФИО</th>
              {showPosition && <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Должность</th>}
              {showObject && <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Объект</th>}
              {showForeman && <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Бригадир</th>}
              <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Ставка</th>
              {showP1 && days1.map((d) => (
                <th key={d} className="text-center text-xs font-semibold text-foreground/70 py-3 border-r border-border/50">{d}</th>
              ))}
              <th className="px-1 py-3 text-center text-xs font-semibold text-blue-500/70 uppercase tracking-wider border-l-2 border-blue-200 whitespace-nowrap">1–15</th>
              {showP2 && days2.map((d) => (
                <th key={d} className="text-center text-xs font-semibold text-foreground/70 py-3 border-r border-border/50">{d}</th>
              ))}
              <th className="px-1 py-3 text-center text-xs font-semibold text-blue-500/70 uppercase tracking-wider border-l-2 border-blue-200 whitespace-nowrap">16–кон.</th>
              <th className="px-1 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l-2 border-border">Смен</th>
              <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Выплата</th>
              <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate border-l-2 border-border/40">Выплач.</th>
              <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">Остаток</th>
              <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate border-l border-border/40">Примечание</th>
            </tr>
          </thead>
          <tbody>
            {displayedGroups.map((group) => {
              const groupKey = `${group.objectName}\0${group.foremanName}\0${group.deptName}`;
              return (
                <React.Fragment key={groupKey}>
                  {group.deptName && (
                    <tr className="bg-muted/40 border-y border-border">
                      <td colSpan={totalCols} className="px-3 py-2 text-xs uppercase tracking-widest">
                        <span className="font-semibold text-foreground/80">{group.objectName}</span>
                        <span className="text-muted-foreground mx-1.5">·</span>
                        <span className="text-foreground/70">{group.foremanName}</span>
                        <span className="text-muted-foreground mx-1.5">·</span>
                        <span className="text-muted-foreground">{group.deptName}</span>
                      </td>
                    </tr>
                  )}
                  {group.rows.map((row) => {
                    const s1 = calcShifts(days1.map((d) => ({ value: row.dayMap[d] ?? "ABSENT" as DayValue })));
                    const s2 = calcShifts(days2.map((d) => ({ value: row.dayMap[d] ?? "ABSENT" as DayValue })));
                    return (
                      <tr key={row.id} className="border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors">
                        <td className="px-2 py-2.5 font-medium text-foreground whitespace-nowrap" title={row.fullName}>{row.fullName}</td>
                        {showPosition && <td className="px-2 py-2.5 truncate text-muted-foreground" title={row.positionSnapshot}>{row.positionSnapshot}</td>}
                        {showObject && <td className="px-2 py-2.5 truncate text-muted-foreground" title={row.objectName}>{row.objectName}</td>}
                        {showForeman && <td className="px-2 py-2.5 truncate text-muted-foreground" title={row.foremanName ?? undefined}>{row.foremanName ?? <span className="text-zinc-300">—</span>}</td>}
                        <ShiftRateCell timesheetId={row.timesheetId} rowId={row.id} rate={row.shiftRateSnapshot} canEdit={isAdmin} />
                        {showP1 && days1.map((d) => (
                          <DayCell key={d} timesheetId={row.timesheetId} rowId={row.id} day={d} value={row.dayMap[d] ?? "ABSENT"} canEdit={isAdmin} />
                        ))}
                        <td className="px-1 py-2.5 text-center font-medium text-blue-600 border-l-2 border-blue-200">
                          {s1 % 1 === 0 ? s1 : s1.toFixed(2)}
                        </td>
                        {showP2 && days2.map((d) => (
                          <DayCell key={d} timesheetId={row.timesheetId} rowId={row.id} day={d} value={row.dayMap[d] ?? "ABSENT"} canEdit={isAdmin} />
                        ))}
                        <td className="px-1 py-2.5 text-center font-medium text-blue-600 border-l-2 border-blue-200">
                          {s2 % 1 === 0 ? s2 : s2.toFixed(2)}
                        </td>
                        <td className="px-1 py-2.5 text-center font-medium text-foreground border-l-2 border-border/40">
                          {row.shifts % 1 === 0 ? row.shifts : row.shifts.toFixed(2)}
                        </td>
                        <td className="px-2 py-2.5 text-right font-semibold text-foreground truncate">
                          {row.pay.toLocaleString("ru")}
                        </td>
                        <PaidCell timesheetId={row.timesheetId} rowId={row.id} paidAmount={row.paidAmount} canEdit={isAdmin} />
                        <td className={`px-2 py-2.5 text-right font-semibold truncate ${row.remainder < 0 ? "text-destructive" : "text-foreground"}`}>
                          {row.remainder.toLocaleString("ru")}
                        </td>
                        <NotesCell timesheetId={row.timesheetId} rowId={row.id} notes={row.notes} canEdit={isAdmin} />
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/50 font-semibold">
              <td colSpan={1 + positionCol + objectCol + foremanCol + 1} className="px-2 py-2.5 text-xs text-muted-foreground uppercase tracking-wider">
                Итого
              </td>
              {showP1 && days1.map((d) => <td key={d} />)}
              <td className="px-1 py-2.5 text-center text-sm text-blue-600 border-l-2 border-blue-200">
                {totals.shifts1 % 1 === 0 ? totals.shifts1 : totals.shifts1.toFixed(2)}
              </td>
              {showP2 && days2.map((d) => <td key={d} />)}
              <td className="px-1 py-2.5 text-center text-sm text-blue-600 border-l-2 border-blue-200">
                {totals.shifts2 % 1 === 0 ? totals.shifts2 : totals.shifts2.toFixed(2)}
              </td>
              <td className="px-1 py-2.5 text-center text-sm text-foreground border-l-2 border-border/40">
                {totals.shifts % 1 === 0 ? totals.shifts : totals.shifts.toFixed(2)}
              </td>
              <td className="px-2 py-2.5 text-right text-sm text-foreground">
                {totals.pay.toLocaleString("ru")}
              </td>
              <td className="px-2 py-2.5 text-right text-sm text-muted-foreground border-l-2 border-border/40">
                {totals.paidAmount > 0 ? totals.paidAmount.toLocaleString("ru") : "—"}
              </td>
              <td className={`px-2 py-2.5 text-right text-sm font-semibold ${totals.remainder < 0 ? "text-destructive" : "text-foreground"}`}>
                {totals.remainder.toLocaleString("ru")}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div></div>
    </div>
  );
}
