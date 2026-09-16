import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";

/** Persists a full new order for all workspaces — mirrors
 *  /api/library-pages/reorder. The sidebar computes the full reordered id
 *  list client-side (see reorderWithinGroup in sidebar.tsx) so a drag
 *  within one folder's children doesn't disturb siblings elsewhere. */
export async function PATCH(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "ids must be a string array" }, { status: 400 });
    }
    const orderedIds = ids as string[];

    await mutateDb((db) => {
      const byId = new Map(db.workspaces.map((w) => [w.id, w]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((w): w is NonNullable<typeof w> => Boolean(w));
      if (reordered.length === db.workspaces.length) db.workspaces = reordered;
    });

    return NextResponse.json({ ok: true });
  });
}
