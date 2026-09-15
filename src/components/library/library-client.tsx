"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useImages } from "@/hooks/use-images";
import { UploadDropzone } from "@/components/library/upload-dropzone";
import { Toolbar } from "@/components/library/toolbar";
import { Pagination } from "@/components/library/pagination";
import { ImageCard, fileUrl } from "@/components/library/image-card";
import { Lightbox } from "@/components/library/lightbox";
import { TagEditorDialog } from "@/components/library/tag-editor-dialog";
import { RenameImageDialog } from "@/components/library/rename-image-dialog";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import type { ImageRecord, PageSize, SortKey, ViewMode } from "@/lib/types";

interface LibraryClientProps {
  hideUpload?: boolean;
  /** Locks this view to images carrying exactly this tag — used by custom Library Pages.
   *  New uploads made from this view are auto-tagged with it. */
  lockedTag?: string | null;
}

export function LibraryClient({ hideUpload = false, lockedTag = null }: LibraryClientProps) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("date-desc");
  const [pageSize, setPageSize] = React.useState<PageSize>(12);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<ViewMode>("grid");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [tagEditorImage, setTagEditorImage] = React.useState<ImageRecord | null>(null);
  const [renameImage, setRenameImage] = React.useState<ImageRecord | null>(null);

  const [reorderMode, setReorderMode] = React.useState(false);
  const prePageSize = React.useRef<PageSize | null>(null);
  const dragIndexRef = React.useRef<number | null>(null);

  const effectivePageSize: PageSize = view === "carousel" || reorderMode ? "all" : pageSize;
  const effectiveSort: SortKey = reorderMode ? "custom" : sort;

  const { items, total, loading, uploads, upload, updateImage, deleteImage, previewReorder, commitReorder } =
    useImages({
      search,
      sort: effectiveSort,
      tag: lockedTag,
      page,
      pageSize: effectivePageSize,
    });

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, pageSize, lockedTag]);

  function toggleReorder() {
    if (reorderMode) {
      setReorderMode(false);
      // Land on "Custom order" (not whatever sort was active before) so the
      // arrangement just dragged into place is what the user actually sees
      // next — reverting to "Newest first" here would silently re-hide it.
      setSort("custom");
      if (prePageSize.current) setPageSize(prePageSize.current);
      prePageSize.current = null;
    } else {
      prePageSize.current = pageSize;
      setReorderMode(true);
    }
  }

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragEnter(index: number) {
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const ids = items.map((img) => img.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(index, 0, moved);
    previewReorder(ids);
    dragIndexRef.current = index;
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    commitReorder(items.map((img) => img.id));
  }

  const slides: CoverflowSlide[] = items.map((img) => ({
    id: img.id,
    src: fileUrl(img.id),
    alt: img.originalName,
    title: img.originalName,
    subtitle: img.tags.join(" · ") || img.aspect,
    meta: [
      { label: "Uploaded", value: new Date(img.uploadedAt).toLocaleDateString() },
      { label: "Type", value: img.ext.toUpperCase() },
      { label: "Aspect", value: img.aspect },
    ],
  }));

  return (
    <div className="flex flex-col gap-6">
      {!hideUpload && !reorderMode && (
        <UploadDropzone
          onFiles={(files) => upload(files, { tags: lockedTag ? [lockedTag] : undefined })}
          uploads={uploads}
        />
      )}

      <Toolbar
        search={search}
        onSearchChange={setSearch}
        sort={sort}
        onSortChange={setSort}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        view={view}
        onViewChange={setView}
        total={total}
        reorderMode={reorderMode}
        onToggleReorder={toggleReorder}
      />

      {reorderMode && (
        <p className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Drag any card to set a custom order. Changes save automatically — click "Done" when finished.
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-border py-16 text-center text-muted-foreground">
          <Loader2 className="size-5 opacity-0" />
          <p className="text-sm">No images match yet. Upload something, or clear your search.</p>
        </div>
      ) : view === "carousel" ? (
        <CoverflowCarousel slides={slides} onSelect={(_, idx) => setLightboxIndex(idx)} />
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              layout="grid"
              onExpand={() => setLightboxIndex(idx)}
              onEditTags={() => setTagEditorImage(img)}
              onRename={() => setRenameImage(img)}
              onSaveName={(name) => updateImage(img.id, { originalName: name })}
              onDelete={() => deleteImage(img.id)}
              reorderMode={reorderMode}
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((img, idx) => (
            <ImageCard
              key={img.id}
              image={img}
              layout="list"
              onExpand={() => setLightboxIndex(idx)}
              onEditTags={() => setTagEditorImage(img)}
              onRename={() => setRenameImage(img)}
              onSaveName={(name) => updateImage(img.id, { originalName: name })}
              onDelete={() => deleteImage(img.id)}
              reorderMode={reorderMode}
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}

      {view !== "carousel" && !reorderMode && (
        <Pagination page={page} pageSize={effectivePageSize} total={total} onPageChange={setPage} />
      )}

      {lightboxIndex !== null && (
        <Lightbox
          images={items}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onEditTags={(img) => setTagEditorImage(img)}
        />
      )}

      <TagEditorDialog
        image={tagEditorImage}
        onClose={() => setTagEditorImage(null)}
        onSave={(id, tags) => updateImage(id, { tags })}
      />

      <RenameImageDialog
        image={renameImage}
        onClose={() => setRenameImage(null)}
        onSave={(id, originalName) => updateImage(id, { originalName })}
      />
    </div>
  );
}
