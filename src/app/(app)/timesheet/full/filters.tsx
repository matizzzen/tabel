"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const MONTHS = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];

interface Props {
  objects: { id: string; name: string }[];
  year: number;
  month: number;
  objectId: string;
}

export function FullTimesheetFilters({ objects, year, month, objectId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => router.push(`/timesheet/full?${params.toString()}`));
  }

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const objectLabel = objectId === "all" ? "Все объекты" : (objects.find((o) => o.id === objectId)?.name ?? objectId);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={String(year)} onValueChange={(v) => { if (v) update("year", v); }}>
        <SelectTrigger className="w-28 h-8 text-xs">
          <SelectValue>{String(year)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={String(month)} onValueChange={(v) => { if (v) update("month", v); }}>
        <SelectTrigger className="w-36 h-8 text-xs">
          <SelectValue>{MONTHS[month - 1]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((name, i) => (
            <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={objectId} onValueChange={(v) => { if (v) update("objectId", v); }}>
        <SelectTrigger className="w-52 h-8 text-xs">
          <SelectValue>{objectLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все объекты</SelectItem>
          {objects.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
