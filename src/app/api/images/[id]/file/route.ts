import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { IMAGE_DIR, readDb } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const asAttachment = url.searchParams.get("download") === "1";

  const db = await readDb();
  const image = db.images.find((img) => img.id === id);
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(IMAGE_DIR, image.filename);
  const data = await fs.readFile(filePath).catch(() => null);
  if (!data) return NextResponse.json({ error: "File missing on disk" }, { status: 404 });

  const headers = new Headers({
    "Content-Type": image.mimeType,
    "Cache-Control": "private, max-age=31536000, immutable",
  });
  if (asAttachment) {
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(image.originalName)}"`);
  }

  return new NextResponse(data, { headers });
}
