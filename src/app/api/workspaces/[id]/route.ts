import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";

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
      return workspace;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  });
}

/** Deleting a workspace only ungroups its library pages (sets workspaceId
 *  back to null) — the pages themselves, and every image/tag on them, are
 *  untouched. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    await mutateDb((db) => {
      db.workspaces = db.workspaces.filter((w) => w.id !== id);
      db.libraryPages.forEach((p) => {
        if (p.workspaceId === id) p.workspaceId = null;
      });
    });
    return NextResponse.json({ ok: true });
  });
}
