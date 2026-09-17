/**
 * One-time migration: copies Cloudflare KV keys into Vercel Blob.
 * Run this BEFORE removing the Cloudflare env vars from Vercel.
 *
 * Requirements (from your existing .env.local):
 *   Cloudflare: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, KV_NAMESPACE_ID
 *   Vercel Blob: BLOB_READ_WRITE_TOKEN
 *
 * Run:  npm run migrate:kv-to-blob
 */

import { put } from "@vercel/blob";
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

const required = ["CLOUDFLARE_ACCOUNT_ID", "KV_NAMESPACE_ID", "CLOUDFLARE_API_TOKEN", "BLOB_READ_WRITE_TOKEN"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

async function cfKvGet(key: string): Promise<string | null> {
  const base = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}`;
  const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV get failed: ${res.status}`);
  return res.text();
}

async function blobPut(key: string, value: string): Promise<void> {
  await put(`kv/${key}`, value, {
    access: "private",
    contentType: "text/plain",
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });
}

async function main() {
  // 1. Migrate the main DB
  console.log("Reading db from Cloudflare KV...");
  const db = await cfKvGet("db");
  if (db) {
    await blobPut("db", db);
    const parsed = JSON.parse(db) as { images?: unknown[] };
    console.log(`  ✓ Migrated db (${parsed.images?.length ?? 0} images)`);
  } else {
    console.log("  db key not found in KV (treating as empty DB)");
    await blobPut("db", JSON.stringify({ images: [], libraryPages: [], customTags: [], workspaces: [] }));
  }

  // 2. Migrate current month's storage tracker
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const trackerKey = `storage-tracker:${month}`;
  console.log(`Reading ${trackerKey} from Cloudflare KV...`);
  const tracker = await cfKvGet(trackerKey);
  if (tracker) {
    await blobPut(trackerKey, tracker);
    console.log(`  ✓ Migrated ${trackerKey}: ${tracker} bytes`);
  } else {
    console.log(`  ${trackerKey} not in KV (no uploads tracked yet this month — fine to skip)`);
  }

  console.log("\nDone! The DB is now in Vercel Blob.");
  console.log("\nNext steps:");
  console.log("  1. Push and deploy this branch");
  console.log("  2. Confirm the live site works");
  console.log("  3. Remove these env vars from the Vercel dashboard:");
  console.log("       CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, KV_NAMESPACE_ID");
  console.log("       R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME");
  console.log("  4. Delete the R2 bucket and KV namespace from Cloudflare dashboard");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
