import { put, get, BlobNotFoundError } from "@vercel/blob";

// KV values are stored as private blobs at kv/<key>
// This mirrors the Cloudflare Workers KV interface without any Cloudflare dependency.

// @vercel/blob prefers an ambient VERCEL_OIDC_TOKEN over BLOB_READ_WRITE_TOKEN
// whenever both are present, and throws if OIDC isn't authorized for the
// current environment — which broke every login (the token is written on
// each attempt). Pass the read-write token explicitly to skip OIDC.
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

export async function kvGet(key: string): Promise<string | null> {
  try {
    const result = await get(`kv/${key}`, { access: "private", token: blobToken });
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
    allowOverwrite: true,
    token: blobToken,
  });
}
