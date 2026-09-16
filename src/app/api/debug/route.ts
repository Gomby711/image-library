import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Check env vars present
  results.envVars = {
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? "set" : "MISSING",
    KV_NAMESPACE_ID: process.env.KV_NAMESPACE_ID ? "set" : "MISSING",
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ? "set" : "MISSING",
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? "set" : "MISSING",
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? "set" : "MISSING",
    R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "MISSING",
    LUMINARY_SITE_PASSWORD: process.env.LUMINARY_SITE_PASSWORD ? "set" : "MISSING",
  };

  // Test KV
  try {
    await kvGet("__health_check__");
    results.kv = "ok";
  } catch (err) {
    results.kv = String(err);
  }

  // Test R2
  try {
    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true,
    });
    const res = await s3.send(
      new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME!, MaxKeys: 1 })
    );
    results.r2 = { ok: true, keyCount: res.KeyCount };
  } catch (err) {
    results.r2 = { ok: false, error: String(err) };
  }

  return NextResponse.json(results);
}
