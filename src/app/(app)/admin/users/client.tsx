"use client";

import { useState, useTransition } from "react";
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
import { createUser, updateUser, toggleUser, deleteUser } from "./actions";
import type { Role } from "@/generated/prisma/client";

interface Obj { id: string; name: string }
interface User {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  objectId: string | null;
  object: Obj | null;
  isActive: boolean;
  employeeCount: number;
  timesheetCount: number;
}

interface Props { users: User[]; objects: Obj[] }

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Администратор",
  DIRECTOR: "Директор",
  FOREMAN: "Бригадир",
};

const COLUMNS = [
  { key: "login" as const, label: "Логин" },
  { key: "fullName" as const, label: "ФИО" },
  { key: "role" as const, label: "Роль", render: (row: User) => ROLE_LABELS[row.role] },
  { key: "object" as const, label: "Объект", render: (row: User) => row.object?.name ?? "—" },
];

const EMPTY_FORM = { login: "", password: "", fullName: "", role: "FOREMAN" as Role, objectId: "" };

export function UsersClient({ users, objects }: Props) {
  const [editing, setEditing] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const objectItems = Object.fromEntries(objects.map((o) => [o.id, o.name]));

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM); setError(""); setAdding(true);
  }
  function openEdit(row: User) {
    setAdding(false);
    setForm({ login: row.login, password: "", fullName: row.fullName, role: row.role, objectId: row.objectId ?? "" });
    setError("");
    setEditing(row);
  }
  function closeForm() {
    setAdding(false); setEditing(null); setForm(EMPTY_FORM); setError("");
  }

  function submit() {
    startTransition(async () => {
      try {
        if (editing) {
          await updateUser({ id: editing.id, ...form, password: form.password || undefined, objectId: form.objectId || undefined });
        } else {
          await createUser({ ...form, objectId: form.objectId || undefined });
        }
        closeForm();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-foreground">Пользователи</h1>
        <Button size="sm" onClick={openAdd} disabled={adding}>+ Добавить</Button>
      </div>

      {(adding || editing) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 max-w-sm">
          <p className="text-sm font-medium text-foreground">
            {editing ? "Изменить пользователя" : "Новый пользователь"}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-login">Логин</Label>
            <Input id="u-login" value={form.login} onChange={(e) => set("login", e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-password">{editing ? "Новый пароль (оставьте пустым)" : "Пароль"}</Label>
            <Input id="u-password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="u-name">ФИО</Label>
            <Input id="u-name" value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Роль</Label>
            <Select value={form.role} onValueChange={(v) => set("role", v ?? "FOREMAN")} items={{ FOREMAN: "Бригадир", ADMIN: "Администратор", DIRECTOR: "Директор" }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FOREMAN">Бригадир</SelectItem>
                <SelectItem value="ADMIN">Администратор</SelectItem>
                <SelectItem value="DIRECTOR">Директор</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.role === "FOREMAN" && (
            <div className="flex flex-col gap-1.5">
              <Label>Объект</Label>
              <Select value={form.objectId} onValueChange={(v) => set("objectId", v ?? "")} items={objectItems}>
                <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
                <SelectContent>
                  {objects.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
            <Button size="sm" variant="ghost" onClick={closeForm} disabled={pending}>Отмена</Button>
          </div>
        </div>
      )}

      <RefTable
        rows={users}
        columns={COLUMNS}
        onEdit={openEdit}
        onToggle={(id, v) => startTransition(() => toggleUser(id, v))}
        onDelete={(id) => {
          const user = users.find((u) => u.id === id);
          if (!user) return;
          const parts: string[] = [`Удалить пользователя «${user.fullName}»?`];
          if (user.role === "FOREMAN") {
            if (user.timesheetCount > 0) parts.push(`• ${user.timesheetCount} табел${user.timesheetCount === 1 ? "ь" : "ей"} будут удалены`);
            if (user.employeeCount > 0) parts.push(`• ${user.employeeCount} сотрудник${user.employeeCount === 1 ? "" : "ов"} будут удалены`);
          }
          if (confirm(parts.join("\n"))) startTransition(() => deleteUser(id));
        }}
      />
    </div>
  );
}
