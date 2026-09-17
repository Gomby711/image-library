import { NextResponse } from "next/server";
import { mutateDb, rememberTags } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { deleteImageFile } from "@/lib/blob";
import { PAGE_ICON_OPTIONS } from "@/lib/types";
import { computeReferenceName } from "@/lib/images";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    let orphanedHeroUpload: string | null = null;

    const updated = await mutateDb((db) => {
      const page = db.libraryPages.find((p) => p.id === id);
      if (!page) return null;

      if (typeof body.name === "string" && body.name.trim()) {
        const newName = body.name.trim();
        const oldName = page.name;
        const oldTag = page.tag;
        page.name = newName;

        // When the page's tag filter was named after the page (the common
        // convention), cascade the rename: update the tag on the page, on
        // every image carrying that tag, and in the custom-tag memory so
        // pickers and filenames stay consistent.
        if (oldTag !== null && oldTag === oldName && newName !== oldName) {
          page.tag = newName;
          for (const image of db.images) {
            const idx = image.tags.indexOf(oldTag);
            if (idx === -1) continue;
            image.tags[idx] = newName;
            const refName = computeReferenceName(image.tags, image.ext, db.images, image.id);
            if (refName) image.originalName = refName;
          }
          // Rename the remembered custom-tag entry so it shows up
          // correctly in tag pickers instead of leaving a stale old name.
          const ctEntry = db.customTags.find((t) => t.name === oldTag);
          if (ctEntry) {
            ctEntry.name = newName;
          } else {
            rememberTags(db, [newName]);
          }
        }
      }
      // Explicit null clears the filter entirely (page shows every image);
      // an empty/whitespace string is treated the same as null rather than
      // silently no-op-ing.
      if ("tag" in body) {
        page.tag = typeof body.tag === "string" && body.tag.trim() ? body.tag.trim() : null;
      }
      if ("workspaceId" in body) {
        page.workspaceId = typeof body.workspaceId === "string" ? body.workspaceId : null;
      }
      if ("icon" in body) {
        const icon = typeof body.icon === "string" ? body.icon : null;
        page.icon = icon && (PAGE_ICON_OPTIONS as readonly string[]).includes(icon) ? (icon as (typeof PAGE_ICON_OPTIONS)[number]) : null;
      }
      if (typeof body.order === "number" && Number.isFinite(body.order)) {
        page.order = body.order;
      }
      if ("heroImageId" in body) {
        const heroImageId = typeof body.heroImageId === "string" ? body.heroImageId : null;
        const valid = heroImageId && db.images.some((img) => img.id === heroImageId);
        page.heroImageId = valid ? heroImageId : null;
        // Reusing an existing library photo as the hero replaces whatever
        // standalone upload was there before — nothing else references
        // that file anymore, so it'd otherwise sit orphaned in Blob storage.
        if (valid && page.heroUpload) {
          orphanedHeroUpload = page.heroUpload.filename;
          page.heroUpload = null;
        }
      }
      return page;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (orphanedHeroUpload) await deleteImageFile(orphanedHeroUpload).catch(() => {});
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const removedHeroUpload = await mutateDb((db) => {
      const page = db.libraryPages.find((p) => p.id === id);
      db.libraryPages = db.libraryPages.filter((p) => p.id !== id);
      return page?.heroUpload?.filename ?? null;
    });
    if (removedHeroUpload) await deleteImageFile(removedHeroUpload).catch(() => {});
    return NextResponse.json({ ok: true });
  });
}
