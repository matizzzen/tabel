"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Column<T> {
  key: keyof T | string;
  label: React.ReactNode;
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends { id: string; isActive?: boolean }> {
  rows: T[];
  columns: Column<T>[];
  onEdit: (row: T) => void;
  onToggle?: (id: string, isActive: boolean) => void;
  onDelete?: (id: string) => void;
  showActive?: boolean;
}

export function RefTable<T extends { id: string; isActive?: boolean }>({
  rows,
  columns,
  onEdit,
  onToggle,
  onDelete,
  showActive = true,
}: Props<T>) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
            {showActive && (
              <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Статус
              </th>
            )}
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (showActive ? 2 : 1)}
                className="px-4 py-10 text-center text-sm text-muted-foreground"
              >
                Нет записей
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors"
            >
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-3 text-foreground">
                  {col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key as string] ?? "")}
                </td>
              ))}
              {showActive && (
                <td className="px-4 py-3">
                  {row.isActive ? (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-xs">
                      Активен
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-border text-xs">
                      Неактивен
                    </Badge>
                  )}
                </td>
              )}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(row)}
                    className="h-7 px-2.5 text-xs"
                  >
                    Изменить
                  </Button>
                  {showActive && onToggle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggle(row.id, !row.isActive!)}
                      className="h-7 px-2.5 text-xs text-muted-foreground"
                    >
                      {row.isActive ? "Деактивировать" : "Активировать"}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(row.id)}
                      className="h-7 px-2.5 text-xs text-destructive/60 hover:text-destructive"
                    >
                      Удалить
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
