import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { computeReferenceName } from "@/lib/images";

/** Adds tags to every image in `ids` without touching tags they already
 *  have (additive, not a replace) — this is what backs multi-select
 *  "apply tag to all selected". */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids: unknown = body.ids;
  const addTags: unknown = body.addTags;

  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids must be a string array" }, { status: 400 });
  }
  if (!Array.isArray(addTags) || addTags.some((t) => typeof t !== "string")) {
    return NextResponse.json({ error: "addTags must be a string array" }, { status: 400 });
  }
  const tagsToAdd = (addTags as string[]).map((t) => t.trim()).filter(Boolean);
  if (tagsToAdd.length === 0) {
    return NextResponse.json({ error: "No tags provided" }, { status: 400 });
  }

  const updated = await mutateDb((db) => {
    const idSet = new Set(ids as string[]);
    const touched: typeof db.images = [];
    for (const image of db.images) {
      if (!idSet.has(image.id)) continue;
      const merged = [...image.tags];
      for (const tag of tagsToAdd) {
        if (!merged.includes(tag)) merged.push(tag);
      }
      image.tags = merged;
      const refName = computeReferenceName(image.tags, image.ext, db.images, image.id);
      if (refName) image.originalName = refName;
      touched.push(image);
    }
    return touched;
  });

  return NextResponse.json({ updated });
}
