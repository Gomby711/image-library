import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import type { WorkspaceRecord } from "@/lib/types";

export async function GET() {
  return withApiErrors(async () => {
    const db = await readDb();
    return NextResponse.json({ workspaces: db.workspaces });
  });
}

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const parentId = typeof body.parentId === "string" ? body.parentId : null;
    if (!name) return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });

    const workspace: WorkspaceRecord = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
      parentId,
    };

    await mutateDb((db) => {
      // A parentId that doesn't resolve to a real workspace (stale/bad
      // input) just creates it at the top level instead of a folder that
      // can never be reached.
      if (parentId && !db.workspaces.some((w) => w.id === parentId)) workspace.parentId = null;
      db.workspaces.push(workspace);
    });

    return NextResponse.json(workspace);
  });
}
