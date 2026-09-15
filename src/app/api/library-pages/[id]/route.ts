import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updated = await mutateDb((db) => {
    const page = db.libraryPages.find((p) => p.id === id);
    if (!page) return null;
    if (typeof body.name === "string" && body.name.trim()) page.name = body.name.trim();
    if (typeof body.tag === "string" && body.tag.trim()) page.tag = body.tag.trim();
    return page;
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await mutateDb((db) => {
    db.libraryPages = db.libraryPages.filter((p) => p.id !== id);
  });
  return NextResponse.json({ ok: true });
}
