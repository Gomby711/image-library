import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getImageFile } from "@/lib/r2";
import { mimeForExtension } from "@/lib/images";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const asAttachment = url.searchParams.get("download") === "1";
  const extParam = url.searchParams.get("ext");

  // Every grid thumbnail hits this route independently, so it must not read
  // the whole library DB (a KV get + JSON.parse of every image's metadata)
  // just to serve bytes for one file — with dozens of images on a page that
  // turned into dozens of redundant full-DB reads per page load, and was
  // both why images were slow to appear and, under load, why Cloudflare's
  // per-request CPU limit tripped (error 1102). The caller already has the
  // image's `ext` from the list response, so pass it through and build the
  // R2 key (`${id}.${ext}`) directly. readDb() is now only a fallback for
  // any old/bookmarked URL that predates this and has no ?ext=.
  let filename: string;
  let mimeType: string;
  let originalName = "download";
  if (extParam) {
    filename = `${id}.${extParam}`;
    mimeType = mimeForExtension(extParam);
  } else {
    const db = await readDb();
    const image = db.images.find((img) => img.id === id);
    if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });
    filename = image.filename;
    mimeType = image.mimeType;
    originalName = image.originalName;
  }

  const file = await getImageFile(filename);
  if (!file) return NextResponse.json({ error: "File missing in storage" }, { status: 404 });

  const headers = new Headers({
    "Content-Type": file.contentType ?? mimeType,
    "Content-Length": String(file.size),
    "Cache-Control": "private, max-age=31536000, immutable",
  });
  if (asAttachment) {
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(originalName)}"`);
  }

  return new NextResponse(file.body as unknown as ReadableStream, { headers });
}
