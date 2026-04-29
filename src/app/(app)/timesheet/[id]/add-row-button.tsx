"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  upsertTimesheetRow,
  createEmployeeAndAddRow,
  createPosition,
  deletePositionForeman,
  createDepartment,
  deleteDepartmentForeman,
} from "../actions";

interface RefItem { id: string; name: string }

interface Props {
  timesheetId: string;
  employees: { id: string; fullName: string; departmentName: string; positionName: string }[];
  objects: { id: string; name: string }[];
  departments: RefItem[];
  positions: RefItem[];
  timesheetObjectId?: string;
  isForeman?: boolean;
}

type Mode = "closed" | "existing" | "new";

const EMPTY_NEW = { fullName: "", positionId: "", departmentId: "", defaultShiftRate: "", objectId: "" };
const EMPTY_EXISTING = { employeeId: "", objectId: "" };

function toRecord(items: RefItem[]): Record<string, string> {
  return Object.fromEntries(items.map((i) => [i.id, i.name]));
}

interface RefFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: RefItem[];
  onItemsChange: (items: RefItem[]) => void;
  onCreate: (name: string) => Promise<RefItem>;
  onDelete: (id: string) => Promise<void>;
  placeholder?: string;
}

function RefField({ label, value, onChange, items, onItemsChange, onCreate, onDelete, placeholder }: RefFieldProps) {
  const [managing, setManaging] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState("");

  function submitCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        const item = await onCreate(newName);
        onItemsChange([...items, item]);
        onChange(item.id);
        setAdding(false);
        setNewName("");
        setManaging(false);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  function submitDelete(id: string) {
    startTransition(async () => {
      try {
        await onDelete(id);
        onItemsChange(items.filter((i) => i.id !== id));
        if (value === id) onChange("");
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5 flex-1">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <button
          type="button"
          onClick={() => { setManaging((v) => !v); setAdding(false); setErr(""); }}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {managing ? "← Назад" : "Управление"}
        </button>
      </div>

      {managing ? (
        <div className="rounded-lg border border-border bg-muted/30 p-2 flex flex-col gap-1.5">
          {items.length === 0 && <p className="text-xs text-muted-foreground px-1">Нет записей</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-1 px-1">
              <span className="text-xs text-foreground truncate flex-1">{item.name}</span>
              <button
                type="button"
                onClick={() => submitDelete(item.id)}
                disabled={pending}
                className="text-zinc-300 hover:text-red-400 transition-colors text-xs shrink-0"
                title="Удалить"
              >
                ✕
              </button>
            </div>
          ))}
          {adding ? (
            <div className="flex gap-1 mt-1">
              <Input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitCreate(); if (e.key === "Escape") { setAdding(false); setNewName(""); } }}
                placeholder="Название"
                className="h-7 text-xs"
              />
              <Button size="sm" onClick={submitCreate} disabled={pending} className="h-7 px-2 text-xs">✓</Button>
              <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewName(""); }} disabled={pending} className="h-7 px-2 text-xs">✕</Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setAdding(true)} className="h-7 text-xs justify-start text-muted-foreground">
              + Добавить
            </Button>
          )}
          {err && <p className="text-xs text-destructive px-1">{err}</p>}
        </div>
      ) : (
        <Select value={value} onValueChange={(v) => onChange(v ?? "")} items={toRecord(items)}>
          <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
          <SelectContent>{items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
    </div>
  );
}

export function AddRowButton({ timesheetId, employees, objects, departments, positions, timesheetObjectId, isForeman }: Props) {
  const [mode, setMode] = useState<Mode>("closed");
  const [ex, setEx] = useState(EMPTY_EXISTING);
  const [nw, setNw] = useState(EMPTY_NEW);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [positionList, setPositionList] = useState<RefItem[]>(positions);
  const [deptList, setDeptList] = useState<RefItem[]>(departments);

  const objectItems = toRecord(objects);
  const employeeItems: Record<string, string> = Object.fromEntries(
    employees.map((e) => [e.id, `${e.fullName} — ${e.departmentName} — ${e.positionName}`])
  );

  function close() { setMode("closed"); setEx(EMPTY_EXISTING); setNw(EMPTY_NEW); setError(""); }
  function setE(k: keyof typeof EMPTY_EXISTING, v: string) { setEx((p) => ({ ...p, [k]: v })); }
  function setN(k: keyof typeof EMPTY_NEW, v: string) { setNw((p) => ({ ...p, [k]: v })); }

  function submitExisting() {
    if (!ex.employeeId) { setError("Выберите сотрудника"); return; }
    const objectId = isForeman ? (timesheetObjectId ?? "") : ex.objectId;
    if (!objectId) { setError(isForeman ? "Объект не назначен" : "Выберите объект"); return; }
    startTransition(async () => {
      try {
        await upsertTimesheetRow(timesheetId, { employeeId: ex.employeeId, objectId });
        close();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Ошибка"); }
    });
  }

  function submitNew() {
    if (!nw.fullName.trim()) { setError("Введите ФИО"); return; }
    if (!nw.positionId) { setError("Выберите должность"); return; }
    if (!nw.defaultShiftRate) { setError("Введите ставку"); return; }
    const objectId = isForeman ? (timesheetObjectId ?? "") : nw.objectId;
    if (!objectId) { setError(isForeman ? "Объект не назначен" : "Выберите объект"); return; }
    if (!nw.departmentId) { setError("Выберите подразделение"); return; }
    startTransition(async () => {
      try {
        await createEmployeeAndAddRow(timesheetId, { ...nw, objectId });
        close();
      } catch (e: unknown) { setError(e instanceof Error ? e.message : "Ошибка"); }
    });
  }

  if (mode === "closed") {
    return (
      <Button variant="outline" size="sm" onClick={() => setMode("existing")}>
        + Добавить сотрудника
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 max-w-md shadow-sm">
      <div className="flex gap-0.5 rounded-lg bg-muted p-0.5 w-fit">
        <button
          onClick={() => { setMode("existing"); setError(""); }}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === "existing" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Существующий
        </button>
        <button
          onClick={() => { setMode("new"); setError(""); }}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${mode === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          Новый сотрудник
        </button>
      </div>

      {mode === "existing" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label>Сотрудник</Label>
            <Select value={ex.employeeId} onValueChange={(v) => setE("employeeId", v ?? "")} items={employeeItems}>
              <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
              <SelectContent>
                {employees.length === 0
                  ? <SelectItem value="__none" disabled>Все сотрудники уже добавлены</SelectItem>
                  : employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.fullName} — {e.departmentName} — {e.positionName}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {!isForeman && (
            <div className="flex flex-col gap-1.5">
              <Label>Объект</Label>
              <Select value={ex.objectId} onValueChange={(v) => setE("objectId", v ?? "")} items={objectItems}>
                <SelectTrigger><SelectValue placeholder="Объект" /></SelectTrigger>
                <SelectContent>{objects.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submitExisting} disabled={pending}>{pending ? "Добавление…" : "Добавить"}</Button>
            <Button size="sm" variant="ghost" onClick={close} disabled={pending}>Отмена</Button>
          </div>
        </>
      )}

      {mode === "new" && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-name">ФИО</Label>
            <Input id="new-name" value={nw.fullName} onChange={(e) => setN("fullName", e.target.value)} placeholder="Иванов Иван Иванович" autoFocus />
          </div>
          <div className="flex gap-3">
            <RefField
              label="Должность"
              value={nw.positionId}
              onChange={(v) => setN("positionId", v)}
              items={positionList}
              onItemsChange={setPositionList}
              onCreate={createPosition}
              onDelete={deletePositionForeman}
              placeholder="Должность"
            />
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="new-rate">Ставка</Label>
              <Input id="new-rate" type="number" min="0" value={nw.defaultShiftRate} onChange={(e) => setN("defaultShiftRate", e.target.value)} placeholder="5000" />
            </div>
          </div>
          <div className="flex gap-3">
            {!isForeman && (
              <div className="flex flex-col gap-1.5 flex-1">
                <Label>Объект</Label>
                <Select value={nw.objectId} onValueChange={(v) => setN("objectId", v ?? "")} items={objectItems}>
                  <SelectTrigger><SelectValue placeholder="Объект" /></SelectTrigger>
                  <SelectContent>{objects.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <RefField
              label="Подразделение"
              value={nw.departmentId}
              onChange={(v) => setN("departmentId", v)}
              items={deptList}
              onItemsChange={setDeptList}
              onCreate={createDepartment}
              onDelete={deleteDepartmentForeman}
              placeholder="Подразделение"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submitNew} disabled={pending}>{pending ? "Создание…" : "Создать и добавить"}</Button>
            <Button size="sm" variant="ghost" onClick={close} disabled={pending}>Отмена</Button>
          </div>
        </>
      )}
    </div>
  );
}
