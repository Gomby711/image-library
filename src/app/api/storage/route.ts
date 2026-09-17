import { NextResponse } from "next/server";
import { withApiErrors } from "@/lib/api-error";
import { getStorageStats } from "@/lib/storage-tracker";

export async function GET() {
  return withApiErrors(async () => {
    const stats = await getStorageStats();
    return NextResponse.json(stats);
  });
}
