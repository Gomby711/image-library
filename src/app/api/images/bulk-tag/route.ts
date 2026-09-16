import { NextResponse } from "next/server";
import { mutateDb, rememberTags } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { computeReferenceName } from "@/lib/images";

function toStringArray(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((t) => typeof t !== "string")) return null;
  return (value as string[]).map((t) => t.trim()).filter(Boolean);
}

/** Adds and/or removes tags across every image in `ids` in one pass —
 *  additive/subtractive, never touching tags on those images that weren't
 *  named in either list. This is what backs multi-select "apply tag to all
 *  selected" and "remove tag from all selected" — always a single DB write
 *  no matter how many images are selected, so a big multi-select tagging
 *  action can't burst past the write-rate limit the way N separate
 *  per-image requests could. */
export async function PATCH(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
      return NextResponse.json({ error: "ids must be a string array" }, { status: 400 });
    }
    const tagsToAdd = toStringArray(body.addTags);
    const tagsToRemove = toStringArray(body.removeTags);
    if (tagsToAdd === null || tagsToRemove === null) {
      return NextResponse.json({ error: "addTags/removeTags must be string arrays" }, { status: 400 });
    }
    if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
      return NextResponse.json({ error: "No tags provided" }, { status: 400 });
    }

    const updated = await mutateDb((db) => {
      const idSet = new Set(ids as string[]);
      const removeSet = new Set(tagsToRemove);
      const touched: typeof db.images = [];
      for (const image of db.images) {
        if (!idSet.has(image.id)) continue;
        const merged = image.tags.filter((t) => !removeSet.has(t));
        for (const tag of tagsToAdd) {
          if (!merged.includes(tag)) merged.push(tag);
        }
        image.tags = merged;
        const refName = computeReferenceName(image.tags, image.ext, db.images, image.id);
        if (refName) image.originalName = refName;
        touched.push(image);
      }
      rememberTags(db, tagsToAdd);
      return touched;
    });

    return NextResponse.json({ updated });
  });
}
