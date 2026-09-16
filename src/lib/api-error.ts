import { NextResponse } from "next/server";
import { DbWriteError } from "@/lib/db";

/** Wraps a route handler body so a failed KV write (or any other unexpected
 *  throw) comes back as a normal JSON error response instead of an unhandled
 *  exception — the latter is what made rapid bulk actions look like "the
 *  site crashed" instead of "that action needs a retry". */
export async function withApiErrors(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof DbWriteError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
