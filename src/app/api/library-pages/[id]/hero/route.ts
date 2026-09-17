import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { mutateDb, readDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";
import { extensionFromFilename, isAcceptedExtension, mimeForExtension } from "@/lib/images";
import { deleteImageFile, getImageFile, putImageFile } from "@/lib/blob";
import { reserveBytes, adjustBytes } from "@/lib/storage-tracker";

/** Serves whichever hero source a page has — an existing library image
 *  (heroImageId) or a standalone hero-only upload (heroUpload) — behind one
 *  URL so the client never needs to know which one is set. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const db = await readDb();
    const page = db.libraryPages.find((p) => p.id === id);
    if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let filename: string | null = null;
    let mimeType = "application/octet-stream";
    if (page.heroImageId) {
      const image = db.images.find((img) => img.id === page.heroImageId);
      if (image) {
        filename = image.filename;
        mimeType = image.mimeType;
      }
    } else if (page.heroUpload) {
      filename = page.heroUpload.filename;
      mimeType = page.heroUpload.mimeType;
    }
    if (!filename) return NextResponse.json({ error: "No hero image set" }, { status: 404 });

    const file = await getImageFile(filename);
    if (!file) return NextResponse.json({ error: "File missing in storage" }, { status: 404 });

    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType ?? mimeType,
        "Content-Length": String(file.buffer.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  });
}

/** Sets this page's hero to a file dropped in from outside the library
 *  (desktop / file explorer). Deliberately does NOT touch db.images — a
 *  hero banner is decoration, not a library asset, so it should never show
 *  up in the grid the way a normal upload would. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = extensionFromFilename(file.name);
    if (!isAcceptedExtension(ext)) {
      return NextResponse.json({ error: `Unsupported file type ".${ext}"` }, { status: 400 });
    }

    const filename = `hero-${randomUUID()}.${ext}`;
    const mimeType = mimeForExtension(ext);
    const buffer = Buffer.from(await file.arrayBuffer());

    const reservation = await reserveBytes(buffer.byteLength);
    if (!reservation.allowed) {
      const usedMB = (reservation.usedBytes / 1024 / 1024).toFixed(0);
      return NextResponse.json(
        {
          error: `Storage is almost full (${usedMB} MB / 1024 MB used). Uploads are paused — delete some images to free up space.`,
          storageExceeded: true,
          usedBytes: reservation.usedBytes,
        },
        { status: 507 }
      );
    }
    await putImageFile(filename, buffer, mimeType);

    const updated = await mutateDb((db) => {
      const page = db.libraryPages.find((p) => p.id === id);
      if (!page) return null;
      const previousUpload = page.heroUpload;
      page.heroImageId = null;
      page.heroUpload = { filename, ext, mimeType, size: buffer.byteLength };
      return { page, previousUpload };
    });

    if (!updated) {
      await deleteImageFile(filename).catch(() => {});
      await adjustBytes(-buffer.byteLength);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Clean up whatever hero file this page had before, now that nothing
    // references it — otherwise every hero change leaves an orphaned file
    // behind in Blob storage forever.
    if (updated.previousUpload && updated.previousUpload.filename !== filename) {
      await deleteImageFile(updated.previousUpload.filename).catch(() => {});
      await adjustBytes(-(updated.previousUpload.size ?? 0));
    }

    return NextResponse.json(updated.page);
  });
}

/** Clears whichever hero this page has — deletes the underlying file only
 *  when it was a standalone upload (heroImageId points at a real library
 *  asset that should obviously survive its hero being unset). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const { id } = await params;
    const updated = await mutateDb((db) => {
      const page = db.libraryPages.find((p) => p.id === id);
      if (!page) return null;
      const previousUpload = page.heroUpload;
      page.heroImageId = null;
      page.heroUpload = null;
      return { page, previousUpload };
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (updated.previousUpload) {
      await deleteImageFile(updated.previousUpload.filename).catch(() => {});
      await adjustBytes(-(updated.previousUpload.size ?? 0));
    }
    return NextResponse.json(updated.page);
  });
}
