import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import type { DbShape } from "@/lib/types";

/** True if `candidateParentId` is `workspaceId` itself, or nested somewhere
 *  inside it — used to refuse a move that would turn a workspace into its
 *  own descendant. */
function wouldCreateCycle(db: DbShape, workspaceId: string, candidateParentId: string): boolean {
  let cur: string | null = candidateParentId;
  while (cur) {
    if (cur === workspaceId) return true;
    cur = db.workspaces.find((w) => w.id === cur)?.parentId ?? null;
  }
  return false;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const updated = await mutateDb((db) => {
      const workspace = db.workspaces.find((w) => w.id === id);
      if (!workspace) return null;
      if (typeof body.name === "string" && body.name.trim()) {
        workspace.name = body.name.trim();
      }
      if ("parentId" in body) {
        const nextParentId = typeof body.parentId === "string" ? body.parentId : null;
        if (nextParentId === null || (db.workspaces.some((w) => w.id === nextParentId) && !wouldCreateCycle(db, id, nextParentId))) {
          workspace.parentId = nextParentId;
        }
      }
      if ("emoji" in body) {
        workspace.emoji = typeof body.emoji === "string" ? body.emoji : null;
      }
      if (typeof body.order === "number" && Number.isFinite(body.order)) {
        workspace.order = body.order;
      }
      return workspace;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  });
}

/** Deleting a workspace only ungroups its contents one level up — child
 *  workspaces and pages move to whatever this workspace's own parent was
 *  (top level, if it had none) — nothing is deleted but the folder itself. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    await mutateDb((db) => {
      const workspace = db.workspaces.find((w) => w.id === id);
      if (!workspace) return;
      const parentId = workspace.parentId;
      db.workspaces = db.workspaces.filter((w) => w.id !== id);
      db.workspaces.forEach((w) => {
        if (w.parentId === id) w.parentId = parentId;
      });
      db.libraryPages.forEach((p) => {
        if (p.workspaceId === id) p.workspaceId = parentId;
      });
    });
    return NextResponse.json({ ok: true });
  });
}
