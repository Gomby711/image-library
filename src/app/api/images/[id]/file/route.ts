import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getImageFile, getResizedImageFile } from "@/lib/blob";
import { mimeForExtension } from "@/lib/images";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const asAttachment = url.searchParams.get("download") === "1";
  const extParam = url.searchParams.get("ext");
  const filenameParam = url.searchParams.get("filename");
  // Grid/list thumbnails pass ?w= for a resized copy instead of the full
  // original — never applied to downloads, and skipped for formats that
  // Sharp can't transform (getResizedImageFile falls back to null).
  const widthParam = !asAttachment ? Number(url.searchParams.get("w")) || null : null;

  // Every grid thumbnail hits this route independently, so it must not read
  // the whole library DB (a KV get + JSON.parse of every image's metadata)
  // just to serve bytes for one file — with dozens of images on a page that
  // turned into dozens of redundant full-DB reads per page load. The caller
  // already has the image's `ext` from the list response, so pass it through
  // and build the Blob filename (`${id}.${ext}`) directly. readDb() is now
  // only a fallback for any old/bookmarked URL that predates this and has no
  // ?ext=.
  let filename: string;
  let ext: string;
  let mimeType: string;
  // Downloads pass the real name via ?filename= (the client already has it
  // from the list response) specifically so this fast path doesn't need a
  // DB read just to know what to call the saved file — without it, every
  // download silently fell back to this default, saving as an extension-less
  // "download" that Explorer/Finder couldn't preview or open correctly.
  let originalName = filenameParam || "download";
  if (extParam) {
    ext = extParam;
    filename = `${id}.${ext}`;
    mimeType = mimeForExtension(ext);
  } else {
    const db = await readDb();
    const image = db.images.find((img) => img.id === id);
    if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });
    ext = image.ext;
    filename = image.filename;
    mimeType = image.mimeType;
    originalName = filenameParam || image.originalName;
  }

  if (widthParam) {
    const resized = await getResizedImageFile(filename, ext, widthParam);
    if (resized) {
      return new NextResponse(resized.buffer, {
        headers: {
          "Content-Type": resized.contentType,
          "Content-Length": String(resized.buffer.byteLength),
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    }
    // Fall through to the untransformed file below (unsupported format, or
    // the Images binding threw) — a slow-but-correct thumbnail beats none.
  }

  const file = await getImageFile(filename);
  if (!file) return NextResponse.json({ error: "File missing in storage" }, { status: 404 });

  // Buffered fully rather than streamed straight through — avoids silently
  // truncated responses for larger files that could decode as partial images.
  const headers = new Headers({
    "Content-Type": file.contentType ?? mimeType,
    "Content-Length": String(file.buffer.byteLength),
    "Cache-Control": "private, max-age=31536000, immutable",
  });
  if (asAttachment) {
    // A plain ASCII fallback for older clients, plus the RFC 5987
    // UTF-8-encoded form so names with accents/emoji/etc. still come
    // through intact in browsers that support it (all current ones do).
    // A header value with a stray control character (or anything else the
    // Headers API considers invalid) would throw here and take the whole
    // download down with it — degrade to a plain default name instead of
    // failing the request outright.
    try {
      const asciiFallback = originalName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'").trim() || "image";
      headers.set(
        "Content-Disposition",
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
      );
    } catch {
      headers.set("Content-Disposition", `attachment; filename="image.${ext}"`);
    }
  }

  return new NextResponse(file.buffer, { headers });
}
