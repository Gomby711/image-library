import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mutateDb, nextSiblingOrder, readDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import type { LibraryPageRecord } from "@/lib/types";

export async function GET() {
  return withApiErrors(async () => {
    const db = await readDb();
    return NextResponse.json({ pages: db.libraryPages });
  });
}

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const tag = typeof body.tag === "string" ? body.tag.trim() : "";
    const workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;

    if (!name) return NextResponse.json({ error: "Page name is required" }, { status: 400 });
    if (!tag) return NextResponse.json({ error: "A tag to filter by is required" }, { status: 400 });

    const page: LibraryPageRecord = {
      id: randomUUID(),
      name,
      tag,
      createdAt: new Date().toISOString(),
      workspaceId,
      icon: null,
      order: 0,
      heroImageId: null,
    };

    await mutateDb((db) => {
      page.order = nextSiblingOrder(db, workspaceId);
      db.libraryPages.push(page);
    });

    return NextResponse.json(page);
  });
}
