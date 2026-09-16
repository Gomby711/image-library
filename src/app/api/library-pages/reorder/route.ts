import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";

/** Persists a full new order for all library pages — the sidebar drags the
 *  whole list (there's no filtered subset like the image grid has), so this
 *  just replaces db.libraryPages with the pages in the order given. */
export async function PATCH(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "ids must be a string array" }, { status: 400 });
    }
    const orderedIds = ids as string[];

    await mutateDb((db) => {
      const byId = new Map(db.libraryPages.map((p) => [p.id, p]));
      const reordered = orderedIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
      if (reordered.length === db.libraryPages.length) db.libraryPages = reordered;
    });

    return NextResponse.json({ ok: true });
  });
}
