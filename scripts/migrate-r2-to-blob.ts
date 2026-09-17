/**
 * One-time migration: copies every file from Cloudflare R2 into Vercel Blob.
 *
 * Requirements (all from your existing .env.local or Vercel env):
 *   R2 side  : CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *   Blob side: BLOB_READ_WRITE_TOKEN, BLOB_STORE_BASE_URL
 *   KV side  : CLOUDFLARE_API_TOKEN, KV_NAMESPACE_ID   (to read the image list)
 *
 * Run:  npx tsx scripts/migrate-r2-to-blob.ts
 * Add --dry-run to list what would be migrated without touching Vercel Blob.
 */

import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { put } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Load .env.local (if present) so the script works without pre-exporting vars
// ---------------------------------------------------------------------------
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

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------
const required = [
  "CLOUDFLARE_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "BLOB_READ_WRITE_TOKEN",
  "BLOB_STORE_BASE_URL",
  "CLOUDFLARE_API_TOKEN",
  "KV_NAMESPACE_ID",
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error("Missing required env vars:", missing.join(", "));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// R2 helpers
// ---------------------------------------------------------------------------
function r2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

async function r2Download(filename: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const s3 = r2Client();
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: filename })
    );
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return {
      buffer: Buffer.from(bytes),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "NoSuchKey") return null;
    throw err;
  }
}

async function r2ListAll(): Promise<string[]> {
  const s3 = r2Client();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

// ---------------------------------------------------------------------------
// KV helper — reads the DB so we know which filenames are still referenced
// ---------------------------------------------------------------------------
async function kvGet(key: string): Promise<string | null> {
  const base = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/${process.env.KV_NAMESPACE_ID}`;
  const res = await fetch(`${base}/values/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`KV get failed: ${res.status}`);
  return res.text();
}

// ---------------------------------------------------------------------------
// Vercel Blob helper
// ---------------------------------------------------------------------------
async function blobExists(filename: string): Promise<boolean> {
  const url = `${process.env.BLOB_STORE_BASE_URL}/${filename}`;
  const res = await fetch(url, { method: "HEAD" });
  return res.ok;
}

async function uploadToBlob(filename: string, buffer: Buffer, contentType: string): Promise<void> {
  await put(filename, buffer, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(DRY_RUN ? "DRY RUN — no files will be uploaded\n" : "");

  // 1. Get the set of filenames referenced in the DB
  console.log("Reading image list from KV...");
  const raw = await kvGet("db");
  type DbShape = {
    images: { filename: string }[];
    libraryPages: { heroUpload?: { filename: string } | null }[];
  };
  const db: DbShape = raw ? JSON.parse(raw) : { images: [], libraryPages: [] };

  const referencedFiles = new Set<string>();
  for (const img of db.images) referencedFiles.add(img.filename);
  for (const page of db.libraryPages) {
    if (page.heroUpload?.filename) referencedFiles.add(page.heroUpload.filename);
  }
  console.log(`Found ${referencedFiles.size} referenced files in DB\n`);

  // 2. List all objects actually in R2
  console.log("Listing objects in R2...");
  const r2Keys = await r2ListAll();
  console.log(`Found ${r2Keys.length} objects in R2\n`);

  // 3. Migrate each referenced file
  let migrated = 0;
  let skipped = 0;
  let missing = 0;
  let errors = 0;

  for (const filename of referencedFiles) {
    if (!r2Keys.includes(filename)) {
      console.warn(`  MISSING in R2: ${filename}`);
      missing++;
      continue;
    }

    // Check if already in Blob (resume-safe)
    if (!DRY_RUN) {
      const exists = await blobExists(filename);
      if (exists) {
        console.log(`  skip (already in Blob): ${filename}`);
        skipped++;
        continue;
      }
    }

    console.log(`  migrating: ${filename}`);
    if (DRY_RUN) {
      migrated++;
      continue;
    }

    try {
      const file = await r2Download(filename);
      if (!file) {
        console.warn(`    → download returned null, skipping`);
        missing++;
        continue;
      }
      await uploadToBlob(filename, file.buffer, file.contentType);
      migrated++;
    } catch (err) {
      console.error(`    → ERROR: ${err}`);
      errors++;
    }
  }

  console.log(`\nDone.`);
  console.log(`  Migrated : ${migrated}`);
  console.log(`  Skipped  : ${skipped} (already in Blob)`);
  console.log(`  Missing  : ${missing} (in DB but not in R2)`);
  console.log(`  Errors   : ${errors}`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
