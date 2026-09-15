import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import type { FolderRecord } from "@/lib/types";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ folders: db.folders });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const parentId = typeof body.parentId === "string" ? body.parentId : null;

  if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });

  const folder: FolderRecord = {
    id: randomUUID(),
    name,
    parentId,
    createdAt: new Date().toISOString(),
  };

  await mutateDb((db) => {
    db.folders.push(folder);
  });

  return NextResponse.json(folder);
}
