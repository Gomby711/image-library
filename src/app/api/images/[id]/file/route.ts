import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getImageFile } from "@/lib/r2";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const asAttachment = url.searchParams.get("download") === "1";

  const db = await readDb();
  const image = db.images.find((img) => img.id === id);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const file = await getImageFile(image.filename);
  if (!file) return NextResponse.json({ error: "File missing in storage" }, { status: 404 });

  const headers = new Headers({
    "Content-Type": file.contentType ?? image.mimeType,
    "Content-Length": String(file.size),
    "Cache-Control": "private, max-age=31536000, immutable",
  });
  if (asAttachment) {
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(image.originalName)}"`);
  }

  return new NextResponse(file.body as unknown as ReadableStream, { headers });
}
