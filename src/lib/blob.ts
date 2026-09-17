import { put, del } from "@vercel/blob";
import sharp from "sharp";

// Files are stored with addRandomSuffix: false so the URL is always
// deterministic: BLOB_STORE_BASE_URL + "/" + filename.
// Set BLOB_STORE_BASE_URL in Vercel env vars — shown on the Blob store page,
// format: https://<storeId>.public.blob.vercel-storage.com
function blobUrl(filename: string): string {
  const base = process.env.BLOB_STORE_BASE_URL;
  if (!base) throw new Error("BLOB_STORE_BASE_URL is not set");
  return `${base}/${filename}`;
}

export async function putImageFile(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  await put(filename, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
  });
}

export async function getImageFile(filename: string) {
  try {
    const res = await fetch(blobUrl(filename));
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Blob fetch failed: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      buffer,
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
      size: buffer.byteLength,
    };
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("404")) return null;
    throw err;
  }
}

const TRANSFORMABLE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

export async function getResizedImageFile(filename: string, ext: string, width: number) {
  if (!TRANSFORMABLE_EXT.has(ext.toLowerCase())) return null;
  try {
    const file = await getImageFile(filename);
    if (!file) return null;
    const resized = await sharp(file.buffer)
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { buffer: resized, contentType: "image/webp" };
  } catch {
    return null;
  }
}

export async function deleteImageFile(filename: string): Promise<void> {
  await del(blobUrl(filename));
}
