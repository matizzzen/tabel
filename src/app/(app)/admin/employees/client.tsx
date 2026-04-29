"use client";

import { useState, useTransition, useMemo } from "react";
import { RefTable } from "@/components/admin/ref-table";
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
import { upsertEmployee, toggleEmployee, deleteEmployee } from "./actions";

interface Position { id: string; name: string }
interface Department { id: string; name: string }
interface Foreman { id: string; fullName: string }
interface Employee {
  id: string;
  fullName: string;
  positionId: string;
  position: Position;
  departmentId: string;
  department: Department;
  foremanId: string;
  foremanName: string;
  defaultShiftRate: string;
  isActive: boolean;
}

interface Props { employees: Employee[]; positions: Position[]; departments: Department[]; foremen: Foreman[] }

type SortMode = "dept-name" | "name";

export function EmployeesClient({ employees, positions, departments, foremen }: Props) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [adding, setAdding] = useState(false);
  const [fullName, setFullName] = useState("");
  const [positionId, setPositionId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [foremanId, setForemanId] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const [sortMode, setSortMode] = useState<SortMode>("dept-name");
  const [filterDeptId, setFilterDeptId] = useState<string>("all");

  const displayedEmployees = useMemo(() => {
    let list = filterDeptId === "all"
      ? employees
      : employees.filter((e) => e.departmentId === filterDeptId);

    if (sortMode === "name") {
      list = [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, "ru"));
    } else {
      list = [...list].sort((a, b) => {
        const dept = a.department.name.localeCompare(b.department.name, "ru");
        if (dept !== 0) return dept;
        return a.fullName.localeCompare(b.fullName, "ru");
      });
    }
    return list;
  }, [employees, sortMode, filterDeptId]);

  const COLUMNS = [
    {
      key: "fullName" as const,
      label: (
        <button type="button" onClick={() => setSortMode((m) => m === "name" ? "dept-name" : "name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          ФИО {sortMode === "name" ? "↑" : ""}
        </button>
      ),
    },
    { key: "position", label: "Должность", render: (row: Employee) => row.position.name },
    {
      key: "department",
      label: (
        <button type="button" onClick={() => setSortMode((m) => m === "dept-name" ? "name" : "dept-name")} className="flex items-center gap-1 hover:text-foreground transition-colors">
          Подразделение {sortMode === "dept-name" ? "↑" : ""}
        </button>
      ),
      render: (row: Employee) => row.department.name,
    },
    { key: "defaultShiftRate", label: "Ставка", render: (row: Employee) => Number(row.defaultShiftRate).toLocaleString("ru") },
    { key: "foremanName", label: "Бригадир", render: (row: Employee) => <span className="text-xs text-muted-foreground">{row.foremanName}</span> },
  ];

  function openAdd() {
    setEditing(null); setFullName(""); setPositionId(""); setDepartmentId(""); setForemanId(""); setRate(""); setError(""); setAdding(true);
  }
  function openEdit(row: Employee) {
    setAdding(false);
    setFullName(row.fullName);
    setPositionId(row.positionId);
    setDepartmentId(row.departmentId);
    setForemanId(row.foremanId);
    setRate(String(row.defaultShiftRate));
    setError("");
    setEditing(row);
  }
  function closeForm() {
    setAdding(false); setEditing(null); setFullName(""); setPositionId(""); setDepartmentId(""); setForemanId(""); setRate(""); setError("");
  }

  function submit() {
    startTransition(async () => {
      try {
        await upsertEmployee({ id: editing?.id, fullName, positionId, departmentId, defaultShiftRate: rate, foremanId: foremanId || undefined });
        closeForm();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-foreground">Сотрудники</h1>
        <Button size="sm" onClick={openAdd} disabled={adding}>+ Добавить</Button>
      </div>

      {(adding || editing) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 max-w-sm">
          <p className="text-sm font-medium text-foreground">{editing ? "Изменить сотрудника" : "Новый сотрудник"}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emp-name">ФИО</Label>
            <Input id="emp-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Бригадир</Label>
            <Select value={foremanId} onValueChange={(v) => setForemanId(v ?? "")} items={Object.fromEntries(foremen.map((f) => [f.id, f.fullName]))}>
              <SelectTrigger><SelectValue placeholder="Выберите бригадира" /></SelectTrigger>
              <SelectContent>{foremen.map((f) => <SelectItem key={f.id} value={f.id}>{f.fullName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Должность</Label>
            <Select value={positionId} onValueChange={(v) => setPositionId(v ?? "")} items={Object.fromEntries(positions.map((p) => [p.id, p.name]))}>
              <SelectTrigger><SelectValue placeholder="Выберите должность" /></SelectTrigger>
              <SelectContent>{positions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Подразделение</Label>
            <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")} items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}>
              <SelectTrigger><SelectValue placeholder="Выберите подразделение" /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="emp-rate">Ставка (руб/смена)</Label>
            <Input id="emp-rate" type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
            <Button size="sm" variant="ghost" onClick={closeForm} disabled={pending}>Отмена</Button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Select value={filterDeptId} onValueChange={(v) => setFilterDeptId(v ?? "all")} items={{ all: "Все подразделения", ...Object.fromEntries(departments.map((d) => [d.id, d.name])) }}>
          <SelectTrigger className="w-56 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все подразделения</SelectItem>
            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{displayedEmployees.length} сотр.</span>
      </div>

      <RefTable
        rows={displayedEmployees}
        columns={COLUMNS}
        onEdit={openEdit}
        onToggle={(id, v) => startTransition(() => toggleEmployee(id, v))}
        onDelete={(id) => {
          const emp = displayedEmployees.find((e) => e.id === id);
          if (confirm(`Удалить сотрудника «${emp?.fullName ?? ""}»?`)) startTransition(() => deleteEmployee(id));
        }}
      />
    </div>
  );
}
