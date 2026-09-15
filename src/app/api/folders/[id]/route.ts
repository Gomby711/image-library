import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";

function isDescendant(db: { folders: { id: string; parentId: string | null }[] }, folderId: string, candidateAncestorId: string): boolean {
  let current = db.folders.find((f) => f.id === folderId);
  while (current?.parentId) {
    if (current.parentId === candidateAncestorId) return true;
    current = db.folders.find((f) => f.id === current!.parentId);
  }
  return false;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const result = await mutateDb((db) => {
    const folder = db.folders.find((f) => f.id === id);
    if (!folder) return { error: "Not found" as const };

    if (typeof body.name === "string" && body.name.trim()) {
      folder.name = body.name.trim();
    }
    if ("parentId" in body) {
      const nextParentId = body.parentId || null;
      if (nextParentId === id || (nextParentId && isDescendant(db, nextParentId, id))) {
        return { error: "Cannot move a folder inside itself" as const };
      }
      folder.parentId = nextParentId;
    }
    return { folder };
  });

  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.folder);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await mutateDb((db) => {
    const childFolderIds = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const f of db.folders) {
        if (f.parentId && childFolderIds.has(f.parentId) && !childFolderIds.has(f.id)) {
          childFolderIds.add(f.id);
          grew = true;
        }
      }
    }
    db.folders = db.folders.filter((f) => !childFolderIds.has(f.id));
    db.images.forEach((img) => {
      if (img.folderId && childFolderIds.has(img.folderId)) img.folderId = null;
    });
  });

  return NextResponse.json({ ok: true });
}
