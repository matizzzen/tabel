"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createManualBackup,
  deleteBackupAction,
  getForemenInBackup,
  restoreByForemanAction,
  restoreFullAction,
} from "./actions";
import type { Backup } from "@/generated/prisma/client";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(d: Date) {
  return new Date(d).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Foreman = { id: string; name: string; timesheetCount: number };

type RestoreDialog =
  | { type: "full"; backupId: string; filename: string }
  | { type: "foreman-select"; backupId: string; filename: string; foremen: Foreman[] }
  | { type: "foreman-confirm"; backupId: string; filename: string; foreman: Foreman };

export function BackupsClient({ initialBackups }: { initialBackups: Backup[] }) {
  const [backups, setBackups] = useState(initialBackups);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [restoreDialog, setRestoreDialog] = useState<RestoreDialog | null>(null);
  const [selectedForemanId, setSelectedForemanId] = useState("");

  function run(fn: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      }
    });
  }

  function handleCreate() {
    run(async () => {
      await createManualBackup();
      location.reload();
    });
  }

  function handleDelete(id: string, filename: string) {
    if (!confirm(`Удалить резервную копию ${filename}?`)) return;
    run(async () => {
      await deleteBackupAction(id);
      setBackups((prev) => prev.filter((b) => b.id !== id));
    });
  }

  function handleRestoreFull(backup: Backup) {
    setRestoreDialog({ type: "full", backupId: backup.id, filename: backup.filename });
  }

  function handleRestoreByForeman(backup: Backup) {
    run(async () => {
      const foremen = await getForemenInBackup(backup.id);
      setRestoreDialog({
        type: "foreman-select",
        backupId: backup.id,
        filename: backup.filename,
        foremen,
      });
      setSelectedForemanId(foremen[0]?.id ?? "");
    });
  }

  function confirmRestoreFull() {
    if (!restoreDialog || restoreDialog.type !== "full") return;
    const { backupId } = restoreDialog;
    setRestoreDialog(null);
    run(async () => {
      await restoreFullAction(backupId);
      alert("Данные восстановлены полностью.");
    });
  }

  function proceedForemanSelect() {
    if (!restoreDialog || restoreDialog.type !== "foreman-select") return;
    const foreman = restoreDialog.foremen.find((f) => f.id === selectedForemanId);
    if (!foreman) return;
    setRestoreDialog({
      type: "foreman-confirm",
      backupId: restoreDialog.backupId,
      filename: restoreDialog.filename,
      foreman,
    });
  }

  function confirmRestoreByForeman() {
    if (!restoreDialog || restoreDialog.type !== "foreman-confirm") return;
    const { backupId, foreman } = restoreDialog;
    setRestoreDialog(null);
    run(async () => {
      await restoreByForemanAction(backupId, foreman.id);
      alert(`Данные бригадира «${foreman.name}» восстановлены.`);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Резервные копии</h1>
        <Button onClick={handleCreate} disabled={isPending}>
          Создать резервную копию
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {backups.length === 0 ? (
        <p className="text-muted-foreground text-sm">Нет резервных копий.</p>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left">
                <th className="px-3 py-2 font-medium">Дата</th>
                <th className="px-3 py-2 font-medium">Метка</th>
                <th className="px-3 py-2 font-medium">Тип</th>
                <th className="px-3 py-2 font-medium">Размер</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2 tabular-nums">{formatDate(b.createdAt)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{b.label ?? "—"}</td>
                  <td className="px-3 py-2">
                    {b.isAutomatic ? (
                      <span className="text-muted-foreground">Авто</span>
                    ) : (
                      <span className="font-medium">Ручная</span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">{formatBytes(b.sizeBytes)}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreByForeman(b)}
                        disabled={isPending}
                      >
                        По бригадиру
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestoreFull(b)}
                        disabled={isPending}
                      >
                        Полностью
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(b.id, b.filename)}
                        disabled={isPending}
                      >
                        Удалить
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restore full confirmation */}
      <Dialog
        open={restoreDialog?.type === "full"}
        onOpenChange={(o) => !o && setRestoreDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Полное восстановление</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Все текущие табели будут удалены и заменены данными из резервной копии.
          </p>
          {restoreDialog?.type === "full" && (
            <p className="text-xs text-muted-foreground font-mono">{restoreDialog.filename}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={confirmRestoreFull} disabled={isPending}>
              Восстановить всё
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore by foreman — select foreman */}
      <Dialog
        open={restoreDialog?.type === "foreman-select"}
        onOpenChange={(o) => !o && setRestoreDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Восстановить по бригадиру</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Выберите бригадира. Его текущие табели будут заменены данными из резервной копии.
          </p>
          {restoreDialog?.type === "foreman-select" && (
            <select
              className="w-full rounded border px-3 py-2 text-sm bg-background"
              value={selectedForemanId}
              onChange={(e) => setSelectedForemanId(e.target.value)}
            >
              {restoreDialog.foremen.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.timesheetCount} табелей)
                </option>
              ))}
            </select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>
              Отмена
            </Button>
            <Button onClick={proceedForemanSelect} disabled={isPending || !selectedForemanId}>
              Далее
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore by foreman — confirm */}
      <Dialog
        open={restoreDialog?.type === "foreman-confirm"}
        onOpenChange={(o) => !o && setRestoreDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение</DialogTitle>
          </DialogHeader>
          {restoreDialog?.type === "foreman-confirm" && (
            <p className="text-sm">
              Табели бригадира{" "}
              <strong>«{restoreDialog.foreman.name}»</strong> будут удалены и заменены
              данными из резервной копии. Продолжить?
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRestoreByForeman}
              disabled={isPending}
            >
              Восстановить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
