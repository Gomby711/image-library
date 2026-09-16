import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { deleteImageFile } from "@/lib/r2";

/** Deletes every image in `ids` in one DB mutation (instead of N separate
 *  read-modify-write cycles), then cleans up their R2 files. This is what
 *  backs multi-select "delete selection". */
export async function POST(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string") || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty string array" }, { status: 400 });
    }
    const idSet = new Set(ids as string[]);

    const removed = await mutateDb((db) => {
      const removed: typeof db.images = [];
      db.images = db.images.filter((img) => {
        if (!idSet.has(img.id)) return true;
        removed.push(img);
        return false;
      });
      return removed;
    });

    await Promise.all(
      removed.map((img) =>
        deleteImageFile(img.filename).catch(() => {
          // file already gone — metadata removal still succeeds
        })
      )
    );

    return NextResponse.json({ deletedIds: removed.map((img) => img.id) });
  });
}
