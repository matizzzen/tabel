import { listBackups } from "@/lib/backup";
import { BackupsClient } from "./client";

export default async function BackupsPage() {
  const backups = await listBackups();
  return <BackupsClient initialBackups={backups} />;
}
