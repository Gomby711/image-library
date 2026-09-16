"use client";

import { LibraryClient } from "@/components/library/library-client";

export default function LibraryPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every image in one place. Tag, sort, search, and rearrange from here.
        </p>
      </div>
      <LibraryClient />
    </>
  );
}
