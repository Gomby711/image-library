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
    if (!name) return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });

    const workspace: WorkspaceRecord = {
      id: randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };

    await mutateDb((db) => {
      db.workspaces.push(workspace);
    });

    return NextResponse.json(workspace);
  });
}
