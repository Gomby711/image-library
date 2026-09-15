"use client";

import { AppShell } from "@/components/app-shell";
import { LibraryClient } from "@/components/library/library-client";

export default function LibraryPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every image in one place. Tag, sort, search, and jump into any folder from here.
        </p>
      </div>
      <LibraryClient folderId={null} />
    </AppShell>
  );
}
