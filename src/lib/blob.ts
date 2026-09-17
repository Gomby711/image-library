import { put, del, get, BlobNotFoundError } from "@vercel/blob";
import sharp from "sharp";

// Files are stored with addRandomSuffix: false so the URL is always
// deterministic: BLOB_STORE_BASE_URL + "/" + filename.
// Set BLOB_STORE_BASE_URL in Vercel env vars — for a private store the format is:
// https://<storeId>.blob.vercel-storage.com  (no ".public." segment)
function blobUrl(filename: string): string {
  const base = process.env.BLOB_STORE_BASE_URL;
  if (!base) throw new Error("BLOB_STORE_BASE_URL is not set");
  return `${base}/${filename}`;
}

export async function putImageFile(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  await put(filename, buffer, {
    access: "private",
    contentType,
    addRandomSuffix: false,
  });
}

export async function getImageFile(filename: string) {
  try {
    const result = await get(blobUrl(filename), { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    return {
      buffer,
      contentType: result.blob.contentType ?? "application/octet-stream",
      size: buffer.byteLength,
    };
  } catch (err: unknown) {
    if (err instanceof BlobNotFoundError) return null;
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
