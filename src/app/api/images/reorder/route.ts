import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";

/**
 * Re-sequences a subset of images (e.g. everything visible in the current
 * filtered/paged view) into a new relative order, without disturbing where
 * that block sits among images outside the subset. This is what makes
 * dragging cards inside a tag-filtered Library Page safe — it can't
 * scramble the position of images that page never showed.
 */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ids: unknown = body.ids;
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string")) {
    return NextResponse.json({ error: "ids must be a string array" }, { status: 400 });
  }
  const orderedIds = ids as string[];

  await mutateDb((db) => {
    const idSet = new Set(orderedIds);
    const firstIdx = db.images.findIndex((img) => idSet.has(img.id));
    if (firstIdx === -1) return;

    let before = 0;
    for (let i = 0; i < firstIdx; i++) {
      if (!idSet.has(db.images[i].id)) before++;
    }

    const untouched = db.images.filter((img) => !idSet.has(img.id));
    const reordered = orderedIds
      .map((id) => db.images.find((img) => img.id === id))
      .filter((img): img is NonNullable<typeof img> => Boolean(img));

    db.images = [...untouched.slice(0, before), ...reordered, ...untouched.slice(before)];
  });

  return NextResponse.json({ ok: true });
}
