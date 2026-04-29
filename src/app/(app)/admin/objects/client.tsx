"use client";

import { useState, useTransition } from "react";
import { RefTable } from "@/components/admin/ref-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertObject, toggleObject, deleteObject } from "./actions";

interface Obj { id: string; name: string; isActive: boolean }

const COLUMNS = [{ key: "name" as const, label: "Название" }];

export function ObjectsClient({ objects }: { objects: Obj[] }) {
  const [editing, setEditing] = useState<Obj | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function openAdd() { setEditing(null); setName(""); setError(""); setAdding(true); }
  function openEdit(row: Obj) { setAdding(false); setName(row.name); setError(""); setEditing(row); }
  function closeForm() { setAdding(false); setEditing(null); setName(""); setError(""); }

  function submit() {
    if (!name.trim()) { setError("Введите название"); return; }
    startTransition(async () => {
      try { await upsertObject({ id: editing?.id, name }); closeForm(); }
      catch (e: unknown) { setError(e instanceof Error ? e.message : "Ошибка"); }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight text-foreground">Объекты</h1>
        <Button size="sm" onClick={openAdd} disabled={adding}>+ Добавить</Button>
      </div>

      {(adding || editing) && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm flex flex-col gap-3 max-w-sm">
          <p className="text-sm font-medium text-foreground">{editing ? "Изменить объект" : "Новый объект"}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="obj-name">Название</Label>
            <Input id="obj-name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Сохранение…" : "Сохранить"}</Button>
            <Button size="sm" variant="ghost" onClick={closeForm} disabled={pending}>Отмена</Button>
          </div>
        </div>
      )}

      <RefTable
        rows={objects}
        columns={COLUMNS}
        onEdit={openEdit}
        onToggle={(id, v) => startTransition(() => toggleObject(id, v))}
        onDelete={(id) => {
          const obj = objects.find((o) => o.id === id);
          if (confirm(`Удалить объект «${obj?.name ?? ""}»?\n\nЭто невозможно, если с ним связаны табели или бригадиры — сервер вернёт ошибку.`)) {
            startTransition(async () => {
              try { await deleteObject(id); }
              catch (e: unknown) { alert(e instanceof Error ? e.message : "Ошибка удаления"); }
            });
          }
        }}
      />
    </div>
  );
}
