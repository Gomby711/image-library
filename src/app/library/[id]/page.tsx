"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LibraryClient } from "@/components/library/library-client";
import { useLibraryPages } from "@/hooks/use-library-pages";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomLibraryPage() {
  const params = useParams<{ id: string }>();
  const { pages, loading } = useLibraryPages();
  const page = pages.find((p) => p.id === params.id);

  return (
    <AppShell>
      {loading ? (
        <div className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
      ) : (
        <div className="mb-6">
          <h1 className="font-[var(--font-display)] text-2xl font-semibold">{page?.name ?? "Library page"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {page ? (
              <>
                Showing images tagged <span className="font-medium text-foreground">{page.tag}</span>.
              </>
            ) : (
              "This library page no longer exists — it may have been removed."
            )}
          </p>
        </div>
      )}
      {page && <LibraryClient lockedTag={page.tag} />}
    </AppShell>
  );
}
