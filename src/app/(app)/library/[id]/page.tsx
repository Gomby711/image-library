"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { ImagePlus, Pencil, X } from "lucide-react";
import { LibraryClient } from "@/components/library/library-client";
import { useLibraryPages } from "@/hooks/use-library-pages";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { HERO_DRAG_MIME } from "@/components/library/image-card";
import { ACCEPT_ATTR } from "@/lib/images";
import type { LibraryPageRecord } from "@/lib/types";

function PageHero({
  page,
  setPageHeroImage,
  uploadPageHero,
  clearPageHero,
}: {
  page: LibraryPageRecord;
  setPageHeroImage: (id: string, heroImageId: string | null) => Promise<boolean>;
  uploadPageHero: (id: string, file: File) => Promise<boolean>;
  clearPageHero: (id: string) => Promise<boolean>;
}) {
  const [dragActive, setDragActive] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const heroRef = React.useRef<HTMLDivElement>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    el.style.setProperty("--spot-x", `${x}%`);
    el.style.setProperty("--spot-y", `${y}%`);
  }

  const hasHero = !!page.heroImageId || !!page.heroUpload;
  const heroSrc = hasHero ? `/api/library-pages/${page.id}/hero` : null;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      await uploadPageHero(page.id, file);
    } finally {
      setUploading(false);
    }
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);

    // An image dragged from this page's own grid — it's already a library
    // asset, so this just points the hero at it (replacing whatever hero
    // was set before, if any), nothing else changes.
    const internalId = e.dataTransfer.getData(HERO_DRAG_MIME);
    if (internalId) {
      await setPageHeroImage(page.id, internalId);
      return;
    }

    // A file dropped in from the desktop / file explorer — this is purely
    // decoration, so it's uploaded straight to storage and never added to
    // the library (no db.images entry, doesn't show up in the grid). Same
    // path whether this is the first hero or replacing an existing one.
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  }

  async function handleRemove(e: React.MouseEvent) {
    e.stopPropagation();
    setRemoving(true);
    try {
      await clearPageHero(page.id);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => heroRef.current?.classList.add("hero-spotlight-active")}
      onMouseLeave={() => heroRef.current?.classList.remove("hero-spotlight-active")}
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
        "group relative mb-8 overflow-hidden rounded-[var(--radius-lg)] border transition-colors",
        dragActive ? "border-accent" : "border-border"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      <div className="relative h-[200px] w-full sm:h-[260px] lg:h-[300px]">
        {heroSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #121416, #1e2124)" }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="hero-spotlight-glow absolute inset-0 z-[5]" />

        <div className="relative z-10 flex h-full flex-col justify-end gap-3 p-6 sm:p-8">
          <span className="hero-line h-1 w-14 rounded-full" style={{ background: "var(--accent)" }} />
          <h1 className="hero-title text-3xl font-bold tracking-tight text-white sm:text-4xl">{page.name}</h1>
          <p className="hero-sub max-w-xl text-sm text-white/75 sm:text-base">
            {page.tag ? (
              <>
                Showing images tagged <span className="font-medium text-white">{page.tag}</span>.
              </>
            ) : (
              "Showing every image in your library."
            )}
            {!heroSrc && " Drag an image here (or drop one from your computer) to set a hero banner."}
          </p>
        </div>

        {/* Hover controls — always available once a hero is set, not just
            discoverable by trying a drag blind: replace via drag OR a file
            picker, or remove it entirely. */}
        {hasHero && !dragActive && !uploading && (
          <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
              title="Drag a new image onto the banner, or click to choose a file"
            >
              <Pencil className="size-3.5" />
              Replace hero
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={removing}
              className="flex items-center gap-1.5 rounded-[var(--radius-md)] bg-black/60 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80 disabled:opacity-50"
              title="Remove hero banner"
            >
              <X className="size-3.5" />
              {removing ? "Removing…" : "Remove"}
            </button>
          </div>
        )}

        {(dragActive || uploading) && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-accent/25 text-sm font-medium text-white backdrop-blur-sm">
            <ImagePlus className="size-5" />
            {uploading ? "Uploading…" : hasHero ? "Drop to replace hero image" : "Drop to set hero image"}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomLibraryPage() {
  const params = useParams<{ id: string }>();
  const { pages, loading, setPageHeroImage, uploadPageHero, clearPageHero } = useLibraryPages();
  const page = pages.find((p) => p.id === params.id);

  return (
    <>
      {loading ? (
        <Skeleton className="mb-8 h-[200px] w-full rounded-[var(--radius-lg)] sm:h-[260px] lg:h-[300px]" />
      ) : page ? (
        <PageHero
          page={page}
          setPageHeroImage={setPageHeroImage}
          uploadPageHero={uploadPageHero}
          clearPageHero={clearPageHero}
        />
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
