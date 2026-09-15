import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import type { LibraryPageRecord } from "@/lib/types";

export async function GET() {
  const db = await readDb();
  return NextResponse.json({ pages: db.libraryPages });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const tag = typeof body.tag === "string" ? body.tag.trim() : "";

  if (!name) return NextResponse.json({ error: "Page name is required" }, { status: 400 });
  if (!tag) return NextResponse.json({ error: "A tag to filter by is required" }, { status: 400 });

  const page: LibraryPageRecord = {
    id: randomUUID(),
    name,
    tag,
    createdAt: new Date().toISOString(),
  };

  await mutateDb((db) => {
    db.libraryPages.push(page);
  });

  return NextResponse.json(page);
}
