import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { getImageFile } from "@/lib/blob";
import { withApiErrors } from "@/lib/api-error";

export const maxDuration = 60;

export async function POST(req: Request) {
  return withApiErrors(async () => {
    const body = await req.json().catch(() => ({}));
    const ids: unknown = body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    const db = await readDb();
    const images = db.images.filter((img) => (ids as string[]).includes(img.id));
    if (images.length === 0) {
      return NextResponse.json({ error: "No matching images found" }, { status: 404 });
    }

    // Fetch all files in parallel
    const fileResults = await Promise.allSettled(
      images.map(async (img) => {
        const file = await getImageFile(img.filename);
        if (!file) throw new Error(`File not found: ${img.filename}`);
        return { name: img.originalName, buffer: file.buffer };
      })
    );

    // Build ZIP using fflate
    const { zipSync } = await import("fflate");

    const zipEntries: Record<string, Uint8Array> = {};
    const usedNames = new Map<string, number>();

    for (const result of fileResults) {
      if (result.status !== "fulfilled") continue;
      const { name, buffer } = result.value;

      // Deduplicate filenames
      let finalName = name;
      if (usedNames.has(name)) {
        const count = usedNames.get(name)! + 1;
        usedNames.set(name, count);
        const dot = name.lastIndexOf(".");
        finalName = dot >= 0 ? `${name.slice(0, dot)} (${count})${name.slice(dot)}` : `${name} (${count})`;
      } else {
        usedNames.set(name, 1);
      }

      zipEntries[finalName] = new Uint8Array(buffer);
    }

    const zipBuffer = zipSync(zipEntries, { level: 0 }); // level 0 = store (no compression, images are already compressed)

    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images.zip"`,
        "Content-Length": String(zipBuffer.byteLength),
      },
    });
  });
}
