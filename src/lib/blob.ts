import { put, del, get, BlobNotFoundError, issueSignedToken, presignUrl } from "@vercel/blob";
import type { IssuedSignedToken } from "@vercel/blob";
import sharp from "sharp";

function blobUrl(filename: string): string {
  const base = process.env.BLOB_STORE_BASE_URL;
  if (!base) throw new Error("BLOB_STORE_BASE_URL is not set");
  return `${base}/${filename}`;
}

// Module-level signed-token cache: issues one network call per hour instead of
// one per image request. Refreshed when < 10 minutes remain before expiry.
let cachedSignedToken: IssuedSignedToken | null = null;

async function getSignedToken(): Promise<IssuedSignedToken> {
  const now = Date.now();
  if (!cachedSignedToken || cachedSignedToken.validUntil - now < 10 * 60 * 1000) {
    cachedSignedToken = await issueSignedToken({
      operations: ["get"],
      validUntil: now + 60 * 60 * 1000,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });
  }
  return cachedSignedToken;
}

/** Returns a short-lived CDN URL for the given blob pathname (pure HMAC, no network). */
export async function getPresignedImageUrl(pathname: string, validForMs = 50 * 60 * 1000): Promise<string> {
  const token = await getSignedToken();
  const { presignedUrl: url } = await presignUrl(token, {
    operation: "get",
    pathname,
    access: "private",
    validUntil: Date.now() + validForMs,
  });
  return url;
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

/**
 * Returns either:
 * - `{ presignedUrl }` when a cached thumbnail already exists in Blob (fast redirect path)
 * - `{ buffer, contentType }` when the thumbnail was freshly generated (also uploads it async for next time)
 * - `null` when the format is unsupported or the source file is missing
 */
export async function getResizedImageFile(
  filename: string,
  ext: string,
  width: number
): Promise<{ presignedUrl: string } | { buffer: Buffer; contentType: string } | null> {
  if (!TRANSFORMABLE_EXT.has(ext.toLowerCase())) return null;

  // id is everything before the last dot in the filename
  const id = filename.lastIndexOf(".") > 0 ? filename.slice(0, filename.lastIndexOf(".")) : filename;
  const thumbPathname = `thumbs/${id}_${width}w.webp`;

  // Check if cached thumbnail exists in Blob
  try {
    const existing = await get(blobUrl(thumbPathname), { access: "private" });
    if (existing && existing.statusCode === 200) {
      // Cancel the stream — we only needed the existence check
      try { existing.stream.cancel(); } catch { /* ignore */ }
      const url = await getPresignedImageUrl(thumbPathname);
      return { presignedUrl: url };
    }
  } catch (err) {
    // BlobNotFoundError is expected when thumb doesn't exist yet; rethrow anything else
    if (!(err instanceof BlobNotFoundError)) throw err;
  }

  // Thumb not cached — download original and resize it
  const file = await getImageFile(filename);
  if (!file) return null;
  try {
    const resized = await sharp(file.buffer)
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    // Upload the thumb to Blob asynchronously so future requests can redirect directly
    put(thumbPathname, resized, {
      access: "private",
      contentType: "image/webp",
      addRandomSuffix: false,
    }).catch(() => {});

    return { buffer: resized, contentType: "image/webp" };
  } catch {
    return null;
  }
}

export async function deleteImageFile(filename: string): Promise<void> {
  await del(blobUrl(filename));
}

/** Deletes any cached thumbnails for an image (best-effort). */
export async function deleteImageThumbs(id: string, widths: number[]): Promise<void> {
  await Promise.allSettled(
    widths.map((w) => del(blobUrl(`thumbs/${id}_${w}w.webp`)))
  );
}
