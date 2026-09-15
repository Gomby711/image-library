"use client";

import * as React from "react";
import { Loader2, Tag, X } from "lucide-react";
import { useImages } from "@/hooks/use-images";
import { UploadDropzone } from "@/components/library/upload-dropzone";
import { Toolbar } from "@/components/library/toolbar";
import { Pagination } from "@/components/library/pagination";
import { ImageCard, fileUrl } from "@/components/library/image-card";
import { Lightbox } from "@/components/library/lightbox";
import { TagEditorDialog } from "@/components/library/tag-editor-dialog";
import { RenameImageDialog } from "@/components/library/rename-image-dialog";
import { BulkTagDialog } from "@/components/library/bulk-tag-dialog";
import { CoverflowCarousel, type CoverflowSlide } from "@/components/ui/coverflow-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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

  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const cardElRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [marquee, setMarquee] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);

  const effectivePageSize: PageSize = view === "carousel" || reorderMode ? "all" : pageSize;
  const effectiveSort: SortKey = reorderMode ? "custom" : sort;

  const { items, total, loading, uploads, upload, updateImage, bulkAddTags, deleteImage, previewReorder, commitReorder } =
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

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Rubber-band / marquee select: click-drag on empty grid space selects
  // every card the rectangle overlaps, same as a desktop file manager.
  function handleGridMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!selectMode || e.target !== e.currentTarget) return;
    const rect = gridRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    dragStartRef.current = { x, y };
    setMarquee({ x0: x, y0: y, x1: x, y1: y });
  }

  React.useEffect(() => {
    if (!marquee) return;

    function onMove(e: MouseEvent) {
      const rect = gridRef.current?.getBoundingClientRect();
      const start = dragStartRef.current;
      if (!rect || !start) return;
      const x1 = e.clientX - rect.left;
      const y1 = e.clientY - rect.top;
      setMarquee({ x0: start.x, y0: start.y, x1, y1 });

      const left = Math.min(start.x, x1);
      const right = Math.max(start.x, x1);
      const top = Math.min(start.y, y1);
      const bottom = Math.max(start.y, y1);

      const hit = new Set<string>();
      cardElRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        const elLeft = r.left - rect.left;
        const elTop = r.top - rect.top;
        const elRight = elLeft + r.width;
        const elBottom = elTop + r.height;
        if (elLeft < right && elRight > left && elTop < bottom && elBottom > top) hit.add(id);
      });
      setSelectedIds(hit);
    }

    function onUp() {
      dragStartRef.current = null;
      setMarquee(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!marquee]);

  async function handleBulkApply(tags: string[]) {
    const ok = await bulkAddTags(Array.from(selectedIds), tags);
    if (ok) {
      setSelectedIds(new Set());
      setSelectMode(false);
    }
    return ok;
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
      {!hideUpload && !reorderMode && !selectMode && (
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
        selectMode={selectMode}
        onToggleSelect={toggleSelectMode}
      />

      {reorderMode && (
        <p className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Drag any card to set a custom order. Changes save automatically — click "Done" when finished.
        </p>
      )}

      {selectMode && (
        <p className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Click cards to select them, or click-and-drag across empty space to select several at once.
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
        <div
          ref={gridRef}
          onMouseDown={handleGridMouseDown}
          className="relative grid select-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        >
          {items.map((img, idx) => (
            <div
              key={img.id}
              ref={(el) => {
                if (el) cardElRefs.current.set(img.id, el);
                else cardElRefs.current.delete(img.id);
              }}
            >
              <ImageCard
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
                selectMode={selectMode}
                selected={selectedIds.has(img.id)}
                onToggleSelect={() => toggleSelected(img.id)}
              />
            </div>
          ))}
          {marquee && (
            <div
              className="pointer-events-none absolute rounded-[var(--radius-sm)] border border-accent bg-accent/15"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}
        </div>
      ) : (
        <div ref={gridRef} onMouseDown={handleGridMouseDown} className="relative flex select-none flex-col gap-2">
          {items.map((img, idx) => (
            <div
              key={img.id}
              ref={(el) => {
                if (el) cardElRefs.current.set(img.id, el);
                else cardElRefs.current.delete(img.id);
              }}
            >
              <ImageCard
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
                selectMode={selectMode}
                selected={selectedIds.has(img.id)}
                onToggleSelect={() => toggleSelected(img.id)}
              />
            </div>
          ))}
          {marquee && (
            <div
              className="pointer-events-none absolute rounded-[var(--radius-sm)] border border-accent bg-accent/15"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}
        </div>
      )}

      {view !== "carousel" && !reorderMode && (
        <Pagination page={page} pageSize={effectivePageSize} total={total} onPageChange={setPage} />
      )}

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center">
          <div className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-border bg-surface-2 px-4 py-2.5 shadow-[var(--shadow-lg)]">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" onClick={() => setBulkTagOpen(true)}>
              <Tag className="size-4" /> Add tag
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="size-4" /> Clear
            </Button>
          </div>
        </div>
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

      <BulkTagDialog
        open={bulkTagOpen}
        count={selectedIds.size}
        onClose={() => setBulkTagOpen(false)}
        onApply={handleBulkApply}
      />
    </div>
  );
}
