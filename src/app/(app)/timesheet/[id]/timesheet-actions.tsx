"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitTimesheet, approveTimesheet, rejectTimesheet } from "../actions";
import type { TimesheetStatus } from "@/generated/prisma/client";

interface Props {
  timesheetId: string;
  status: TimesheetStatus;
  canEdit: boolean;
  canApprove: boolean;
}

export function TimesheetActions({ timesheetId, status, canEdit, canApprove }: Props) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<void>) {
    startTransition(async () => { await fn(); router.refresh(); });
  }

  return (
    <div className="flex items-center gap-2">
      {canEdit && status === "DRAFT" && (
        <Button
          size="sm"
          onClick={() => run(() => submitTimesheet(timesheetId))}
          disabled={pending}
        >
          {pending ? "…" : "Отправить на проверку"}
        </Button>
      )}
      {canApprove && status === "SUBMITTED" && (
        <>
          <Button
            size="sm"
            onClick={() => run(() => approveTimesheet(timesheetId))}
            disabled={pending}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {pending ? "…" : "Утвердить"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => run(() => rejectTimesheet(timesheetId))}
            disabled={pending}
          >
            Вернуть
          </Button>
        </>
      )}
    </div>
  );
}
