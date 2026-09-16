import { NextResponse } from "next/server";
import { mutateDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { PAGE_ICON_OPTIONS } from "@/lib/types";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const updated = await mutateDb((db) => {
      const page = db.libraryPages.find((p) => p.id === id);
      if (!page) return null;

      // A page's tag always matches its name (that's how images know to show
      // up on it) — renaming the page relabels the tag everywhere it's used
      // so previously-tagged images stay attached instead of falling off.
      if (typeof body.name === "string" && body.name.trim() && body.name.trim() !== page.name) {
        const oldTag = page.tag;
        const newName = body.name.trim();
        page.name = newName;
        page.tag = newName;
        db.images.forEach((img) => {
          if (img.tags.includes(oldTag)) {
            img.tags = img.tags.map((t) => (t === oldTag ? newName : t));
          }
        });
      }
      if (typeof body.tag === "string" && body.tag.trim()) page.tag = body.tag.trim();
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
        page.heroImageId = heroImageId && db.images.some((img) => img.id === heroImageId) ? heroImageId : null;
      }
      return page;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    await mutateDb((db) => {
      db.libraryPages = db.libraryPages.filter((p) => p.id !== id);
    });
    return NextResponse.json({ ok: true });
  });
}
