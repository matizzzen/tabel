"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTimesheet } from "./actions";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

interface Props {
  objects: { id: string; name: string }[];
  defaultObjectId?: string;
  defaultYear: number;
  defaultMonth: number;
  isAdmin: boolean;
}

export function CreateTimesheetButton({ objects, defaultObjectId, defaultYear, defaultMonth, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const [objectId, setObjectId] = useState(defaultObjectId ?? objects[0]?.id ?? "");
  const [year, setYear] = useState(String(defaultYear));
  const [month, setMonth] = useState(String(defaultMonth));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const years = [defaultYear - 1, defaultYear, defaultYear + 1].map(String);
  const objectItems: Record<string, string> = Object.fromEntries(objects.map((o) => [o.id, o.name]));
  const yearItems: Record<string, string> = Object.fromEntries(years.map((y) => [y, y]));
  const monthItems: Record<string, string> = Object.fromEntries(MONTHS.map((m, i) => [String(i + 1), m]));

  function submit() {
    if (!objectId) { setError("Выберите объект"); return; }
    startTransition(async () => {
      try {
        const t = await createTimesheet(objectId, parseInt(year), parseInt(month));
        router.push(`/timesheet/${t.id}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Создать табель
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3 w-72 shadow-sm">
      <p className="text-sm font-medium text-foreground">Новый табель</p>
      {isAdmin && (
        <div className="flex flex-col gap-1.5">
          <Label>Объект</Label>
          <Select value={objectId} onValueChange={(v) => setObjectId(v ?? "")} items={objectItems}>
            <SelectTrigger><SelectValue placeholder="Выберите объект" /></SelectTrigger>
            <SelectContent>
              {objects.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label>Год</Label>
          <Select value={year} onValueChange={(v) => setYear(v ?? year)} items={yearItems}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <Label>Месяц</Label>
          <Select value={month} onValueChange={(v) => setMonth(v ?? month)} items={monthItems}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Создание…" : "Создать"}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setError(""); }} disabled={pending}>Отмена</Button>
      </div>
    </div>
  );
}
