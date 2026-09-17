import { put, get, BlobNotFoundError } from "@vercel/blob";

// KV values are stored as private blobs at kv/<key>
// This mirrors the Cloudflare Workers KV interface without any Cloudflare dependency.

export async function kvGet(key: string): Promise<string | null> {
  try {
    const result = await get(`kv/${key}`, { access: "private" });
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).text();
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

export async function kvPut(key: string, value: string): Promise<void> {
  await put(`kv/${key}`, value, {
    access: "private",
    contentType: "text/plain",
    addRandomSuffix: false,
  });
}
