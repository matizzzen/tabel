import { NextRequest, NextResponse } from "next/server";
import { createBackup } from "@/lib/backup";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const backup = await createBackup(true);
    return NextResponse.json({ success: true, id: backup.id });
  } catch (error) {
    console.error("Automatic backup failed:", error);
    return NextResponse.json({ error: "Backup failed" }, { status: 500 });
  }
}
