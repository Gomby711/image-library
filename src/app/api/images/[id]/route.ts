import { NextResponse } from "next/server";
import { mutateDb, rememberTags } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { computeReferenceName } from "@/lib/images";
import { deleteImageFile } from "@/lib/blob";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const updated = await mutateDb((db) => {
      const image = db.images.find((img) => img.id === id);
      if (!image) return null;
      if (Array.isArray(body.tags)) {
        image.tags = body.tags.filter((t: unknown): t is string => typeof t === "string" && t.trim().length > 0);
        rememberTags(db, image.tags);
        // "Reference Image" drives an automatic REF_<tag>_<n> filename — recomputed
        // whenever the tag set changes so a swapped "other tag" or a fresh
        // "Reference Image" tag both land on the right name.
        const refName = computeReferenceName(image.tags, image.ext, db.images, image.id);
        if (refName) image.originalName = refName;
      }
      if ("folderId" in body) {
        image.folderId = body.folderId || null;
      }
      if (typeof body.originalName === "string" && body.originalName.trim()) {
        image.originalName = body.originalName.trim();
      }
      return image;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;

    const removed = await mutateDb((db) => {
      const idx = db.images.findIndex((img) => img.id === id);
      if (idx === -1) return null;
      const [image] = db.images.splice(idx, 1);
      return image;
    });

    if (!removed) return NextResponse.json({ error: "Not found" }, { status: 404 });

    try {
      await deleteImageFile(removed.filename);
    } catch {
      // file already gone — metadata removal still succeeds
    }

    return NextResponse.json({ ok: true });
  });
}
