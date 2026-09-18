import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";

export async function GET(req: Request) {
  return withApiErrors(async () => {
    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get("limit")) || 50);
    const db = await readDb();
    const log = db.activityLog.slice(0, limit);
    return NextResponse.json({ log });
  });
}
