import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getImageFile, getPresignedImageUrl, getResizedImageFile } from "@/lib/blob";
import { mimeForExtension } from "@/lib/images";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const asAttachment = url.searchParams.get("download") === "1";
  const extParam = url.searchParams.get("ext");
  const filenameParam = url.searchParams.get("filename");
  const widthParam = !asAttachment ? Number(url.searchParams.get("w")) || null : null;

  let filename: string;
  let ext: string;
  let mimeType: string;
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

  // Thumbnail path: check Blob cache first (redirect), resize on miss (then cache async)
  if (widthParam) {
    const resized = await getResizedImageFile(filename, ext, widthParam);
    if (resized) {
      if ("presignedUrl" in resized) {
        // Cached thumb exists — redirect browser to CDN directly
        const response = NextResponse.redirect(resized.presignedUrl, { status: 307 });
        // Cache the redirect for 45 min; presigned URL is valid for 50 min
        response.headers.set("Cache-Control", "private, max-age=2700");
        return response;
      }
      return new NextResponse(resized.buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": resized.contentType,
          "Content-Length": String(resized.buffer.byteLength),
          "Cache-Control": "private, max-age=31536000, immutable",
        },
      });
    }
    // Fall through to serve the untransformed original below
  }

  // Downloads must be proxied (Content-Disposition cannot be set on a CDN redirect)
  if (asAttachment) {
    const file = await getImageFile(filename);
    if (!file) return NextResponse.json({ error: "File missing in storage" }, { status: 404 });
    const headers = new Headers({
      "Content-Type": file.contentType ?? mimeType,
      "Content-Length": String(file.buffer.byteLength),
      "Cache-Control": "private, max-age=31536000, immutable",
    });
    try {
      const asciiFallback = originalName.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'").trim() || "image";
      headers.set(
        "Content-Disposition",
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(originalName)}`
      );
    } catch {
      headers.set("Content-Disposition", `attachment; filename="image.${ext}"`);
    }
    return new NextResponse(file.buffer, { headers });
  }

  // Regular view (not download, not thumbnail): redirect to presigned CDN URL
  try {
    const presignedUrl = await getPresignedImageUrl(filename);
    const response = NextResponse.redirect(presignedUrl, { status: 307 });
    response.headers.set("Cache-Control", "private, max-age=2700");
    return response;
  } catch {
    // Presign failed — fall back to proxying
    const file = await getImageFile(filename);
    if (!file) return NextResponse.json({ error: "File missing in storage" }, { status: 404 });
    return new NextResponse(file.buffer, {
      headers: {
        "Content-Type": file.contentType ?? mimeType,
        "Content-Length": String(file.buffer.byteLength),
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  }
}
