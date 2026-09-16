import { NextResponse } from "next/server";
import { readDb } from "@/lib/db";
import { withApiErrors } from "@/lib/api-error";

/** Every custom tag ever applied to an image, newest first — the tag editor
 *  and bulk-tag dialogs use this to offer a saved tag as a one-click chip
 *  instead of making the user retype it. Tags are remembered automatically
 *  whenever they're applied (see rememberTags in lib/db.ts); there's no
 *  separate "save a tag" action. */
export async function GET() {
  return withApiErrors(async () => {
    const db = await readDb();
    const tags = [...db.customTags].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((t) => t.name);
    return NextResponse.json({ tags });
  });
}
