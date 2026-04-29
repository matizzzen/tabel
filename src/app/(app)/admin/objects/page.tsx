import { prisma as db } from "@/lib/db";
import { ObjectsClient } from "./client";

export default async function ObjectsPage() {
  const objects = await db.object.findMany({ orderBy: { name: "asc" } });
  return <ObjectsClient objects={objects} />;
}
