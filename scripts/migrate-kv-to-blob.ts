/**
 * One-time migration: copies Cloudflare KV keys into Vercel Blob.
 * Safe to re-run — reads what is already in Blob before deciding what to write.
 *
 * Run:  npm run migrate:kv-to-blob
 */

import { put, get, BlobNotFoundError } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

function loadEnvFile(file: string) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Missing required env var: BLOB_READ_WRITE_TOKEN");
  process.exit(1);
}

async function blobGet(key: string): Promise<string | null> {
  try {
    const result = await get(`kv/${key}`, {
      access: "private",
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    } as Parameters<typeof get>[1]);
    if (!result || result.statusCode !== 200) return null;
    return new Response(result.stream).text();
  } catch (err) {
    if (err instanceof BlobNotFoundError) return null;
    throw err;
  }
}

async function blobPut(key: string, value: string): Promise<void> {
  await put(`kv/${key}`, value, {
    access: "private",
    contentType: "text/plain",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });
}

async function cfKvGet(key: string): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const namespaceId = process.env.KV_NAMESPACE_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !namespaceId || !token) return null;
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
  try {
    const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 404 || !res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function main() {
  // 1. Check what's already in Vercel Blob
  console.log("Checking existing kv/db in Vercel Blob...");
  const existing = await blobGet("db");
  if (existing) {
    const parsed = JSON.parse(existing) as { images?: unknown[] };
    const imageCount = parsed.images?.length ?? 0;
    console.log(`  Found existing kv/db with ${imageCount} images.`);
    if (imageCount > 0) {
      console.log("  DB already has data — no migration needed.");
      console.log("\nYour database is already in Vercel Blob. You're good to deploy.");
      return;
    }
    console.log("  Existing blob has 0 images — will try to restore from Cloudflare KV.");
  } else {
    console.log("  No kv/db blob found yet.");
  }

  // 2. Try to read from Cloudflare KV
  console.log("Reading db from Cloudflare KV...");
  const kvDb = await cfKvGet("db");
  if (kvDb) {
    const parsed = JSON.parse(kvDb) as { images?: unknown[] };
    await blobPut("db", kvDb);
    console.log(`  ✓ Migrated db from Cloudflare KV (${parsed.images?.length ?? 0} images)`);
  } else {
    console.log("  db not found in Cloudflare KV (namespace may be deleted).");
    console.log("  Writing empty DB to Vercel Blob as a safe starting point.");
    await blobPut("db", JSON.stringify({ images: [], libraryPages: [], customTags: [], workspaces: [] }));
    console.log("\n⚠️  WARNING: No image DB was found. Your library may appear empty.");
    console.log("   If you still have a Cloudflare KV namespace with data, check that");
    console.log("   CLOUDFLARE_ACCOUNT_ID, KV_NAMESPACE_ID, and CLOUDFLARE_API_TOKEN");
    console.log("   are correct in .env.local and re-run this script.");
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
