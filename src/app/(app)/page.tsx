"use client";

import { LibraryClient } from "@/components/library/library-client";

export default function LibraryPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every image in one place. Tag, sort, search, and rearrange from here.
        </p>
      </div>
      <LibraryClient />
    </>
  );
}
