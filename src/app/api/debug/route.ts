import { NextResponse } from "next/server";
import { kvGet } from "@/lib/kv";

export async function GET() {
  const results: Record<string, unknown> = {};

  results.envVars = {
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN ? "set" : "MISSING",
    BLOB_STORE_BASE_URL: process.env.BLOB_STORE_BASE_URL || "MISSING",
    LUMINARY_SITE_PASSWORD: process.env.LUMINARY_SITE_PASSWORD ? "set" : "MISSING",
  };

  try {
    await kvGet("__health_check__");
    results.blobKv = "ok";
  } catch (err) {
    results.blobKv = String(err);
  }

  return NextResponse.json(results);
}
