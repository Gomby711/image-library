import { NextResponse } from "next/server";
import { getLockStatus } from "@/lib/auth-state";

export async function GET() {
  const lock = await getLockStatus();
  return NextResponse.json(lock);
}
