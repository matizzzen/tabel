"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { upsertPosition, deletePosition } from "./actions";

interface Position { id: string; name: string; userId: string; foremanName: string; employeeCount: number }
interface Foreman { id: string; fullName: string }

export function PositionsClient({ positions, foremen }: { positions: Position[]; foremen: Foreman[] }) {
  const [editing, setEditing] = useState<Position | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openAdd() { setEditing(null); setName(""); setUserId(""); setError(""); setAdding(true); }
  function openEdit(row: Position) { setAdding(false); setName(row.name); setUserId(row.userId); setError(""); setEditing(row); }
  function closeForm() { setAdding(false); setEditing(null); setName(""); setUserId(""); setError(""); }

  function submit() {
    if (!name.trim()) { setError("Введите название"); return; }
    if (!editing && !userId) { setError("Выберите бригадира"); return; }
    startTransition(async () => {
      try {
        await upsertPosition({ id: editing?.id, name, userId: userId || undefined });
        closeForm();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-foreground">Должности</h1>
        <Button size="sm" onClick={openAdd} disabled={adding}>+ Добавить</Button>
      </div>

      {(adding || editing) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 max-w-sm">
          <p className="text-sm font-medium text-foreground">
            {editing ? "Изменить должность" : "Новая должность"}
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-name">Название</Label>
            <Input id="pos-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Бригадир</Label>
            <Select value={userId} onValueChange={(v) => setUserId(v ?? "")} items={Object.fromEntries(foremen.map((f) => [f.id, f.fullName]))}>
              <SelectTrigger><SelectValue placeholder="Выберите бригадира" /></SelectTrigger>
              <SelectContent>{foremen.map((f) => <SelectItem key={f.id} value={f.id}>{f.fullName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
            <Button size="sm" variant="ghost" onClick={closeForm} disabled={pending}>Отмена</Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Название</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Бригадир</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Нет записей</td></tr>
            )}
            {positions.map((row) => (
              <tr key={row.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5 text-foreground">{row.name}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{row.foremanName}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)} className="h-7 px-2 text-xs text-zinc-600">Изменить</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const msg = row.employeeCount > 0
                          ? `Удалить должность «${row.name}»?\n\nБудет удалено ${row.employeeCount} сотрудник(ов) вместе с их строками табелей.`
                          : `Удалить должность «${row.name}»?`;
                        if (confirm(msg)) startTransition(() => deletePosition(row.id));
                      }}
                      className="h-7 px-2 text-xs text-destructive/60 hover:text-destructive"
                      disabled={pending}
                    >Удалить</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
