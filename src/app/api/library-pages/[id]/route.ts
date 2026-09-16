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

      // The display name and the tag filter are independent — renaming a
      // page never touches which tag (if any) it's filtered to, or any
      // image's tags.
      if (typeof body.name === "string" && body.name.trim()) {
        page.name = body.name.trim();
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
