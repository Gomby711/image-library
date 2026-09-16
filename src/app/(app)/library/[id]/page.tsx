"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { LibraryClient } from "@/components/library/library-client";
import { useLibraryPages } from "@/hooks/use-library-pages";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HERO_DRAG_MIME } from "@/components/library/image-card";
import type { LibraryPageRecord } from "@/lib/types";

function PageHero({
  page,
  setPageHeroImage,
}: {
  page: LibraryPageRecord;
  setPageHeroImage: (id: string, heroImageId: string | null) => Promise<boolean>;
}) {
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const heroSrc = page.heroImageId ? `/api/images/${page.heroImageId}/file?w=1600` : null;

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);

    // An image dragged from this page's own grid.
    const internalId = e.dataTransfer.getData(HERO_DRAG_MIME);
    if (internalId) {
      await setPageHeroImage(page.id, internalId);
      return;
    }

    // A file dropped in from the desktop / file explorer — upload it (tagged
    // for this page, same as the normal upload dropzone) and use it as hero.
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("files", file);
      form.append("tags", page.tag);
      const res = await fetch("/api/images", { method: "POST", body: form });
      if (res.ok) {
        const data = await res.json();
        const created = data.created?.[0];
        if (created) await setPageHeroImage(page.id, created.id);
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragActive(false);
      }}
      onDrop={handleDrop}
      className={cn(
        "relative mb-8 overflow-hidden rounded-[var(--radius-lg)] border transition-colors",
        dragActive ? "border-accent" : "border-border"
      )}
    >
      <div className="relative h-[200px] w-full sm:h-[260px] lg:h-[300px]">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, var(--surface), var(--surface-2))" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent" />

        <div className="relative flex h-full flex-col justify-end gap-3 p-6 sm:p-8">
          <span className="h-1 w-14 rounded-full" style={{ background: "var(--accent)" }} />
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{page.name}</h1>
          <p className="max-w-xl text-sm text-white/75 sm:text-base">
            Showing images tagged <span className="font-medium text-white">{page.tag}</span>.
            {!heroSrc && " Drag an image here (or drop one from your computer) to set a hero banner."}
          </p>
        </div>

        {(dragActive || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-accent/25 text-sm font-medium text-white backdrop-blur-sm">
            <ImagePlus className="size-5" />
            {uploading ? "Uploading…" : "Drop to set hero image"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomLibraryPage() {
  const params = useParams<{ id: string }>();
  const { pages, loading, setPageHeroImage } = useLibraryPages();
  const page = pages.find((p) => p.id === params.id);

  return (
    <>
      {loading ? (
        <Skeleton className="mb-8 h-[200px] w-full rounded-[var(--radius-lg)] sm:h-[260px] lg:h-[300px]" />
      ) : page ? (
        <PageHero page={page} setPageHeroImage={setPageHeroImage} />
      ) : (
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Library page</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This library page no longer exists — it may have been removed.
          </p>
        </div>
      )}
      {page && <LibraryClient lockedTag={page.tag} />}
    </>
  );
}
