import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.IMAGES_BUCKET;
}

export async function putImageFile(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  const bucket = await getBucket();
  await bucket.put(filename, buffer, { httpMetadata: { contentType } });
}

export async function getImageFile(filename: string) {
  const bucket = await getBucket();
  const obj = await bucket.get(filename);
  if (!obj) return null;
  // `obj.body` is workers-types' own ReadableStream declaration, structurally
  // identical to DOM's at runtime but a distinct type — left uncast here and
  // cast once at the actual NextResponse call site instead.
  return { body: obj.body, contentType: obj.httpMetadata?.contentType, size: obj.size };
}

/** Formats Cloudflare Images can actually transform — notably not svg or
 *  tiff, both of which this app otherwise accepts, so those must always be
 *  served at original size. */
const TRANSFORMABLE_EXT = new Set(["jpg", "jpeg", "png", "webp", "avif"]);

/**
 * Resizes an R2-stored image on the fly via the Cloudflare Images binding,
 * for grid/list thumbnails — serving a multi-MB original for a 200px card
 * was most of why the library felt slow to load. Returns null (caller
 * should fall back to the untransformed file) when the format isn't
 * transformable or the binding throws for any reason.
 */
export async function getResizedImageFile(filename: string, ext: string, width: number) {
  if (!TRANSFORMABLE_EXT.has(ext.toLowerCase())) return null;
  const bucket = await getBucket();
  const obj = await bucket.get(filename);
  if (!obj) return null;

  const { env } = await getCloudflareContext({ async: true });
  try {
    const result = await env.IMAGES.input(obj.body).transform({ width, fit: "scale-down" }).output({
      format: "image/webp",
      quality: 82,
    });
    return { body: result.image(), contentType: result.contentType() };
  } catch {
    // Any failure (corrupt file, binding hiccup, unsupported edge case) —
    // caller falls back to the original, never a broken thumbnail.
    return null;
  }
}

export async function deleteImageFile(filename: string): Promise<void> {
  const bucket = await getBucket();
  await bucket.delete(filename);
}
