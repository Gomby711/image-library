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

export async function deleteImageFile(filename: string): Promise<void> {
  const bucket = await getBucket();
  await bucket.delete(filename);
}
