import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getBucket() {
  const { env } = await getCloudflareContext({ async: true });
  return env.IMAGES_BUCKET;
}

export async function putImageFile(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  const bucket = await getBucket();
  await bucket.put(filename, buffer, { httpMetadata: { contentType } });
}

/** Fully drains any ReadableStream into a single ArrayBuffer. Used instead
 *  of handing a stream straight to the Response body: piping a raw R2/Images
 *  stream through several adapter layers (Next's Route Handler -> the
 *  OpenNext Cloudflare shim -> the actual edge Response) could have the
 *  underlying stream cut short for larger files — which doesn't throw or
 *  fire an error on the client, it just silently renders as a partially
 *  decoded ("half loaded") image or a truncated download. Buffering
 *  completely server-side means the response either has every byte or the
 *  request fails outright — never a silent partial file. */
async function readAll(stream: ReadableStream): Promise<ArrayBuffer> {
  return await new Response(stream as unknown as BodyInit).arrayBuffer();
}

export async function getImageFile(filename: string) {
  const bucket = await getBucket();
  const obj = await bucket.get(filename);
  if (!obj) return null;
  const buffer = await obj.arrayBuffer();
  return { buffer, contentType: obj.httpMetadata?.contentType, size: obj.size };
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
    const buffer = await readAll(result.image() as unknown as ReadableStream);
    return { buffer, contentType: result.contentType() };
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
