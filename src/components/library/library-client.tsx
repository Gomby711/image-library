"use client";

import * as React from "react";
import { Loader2, Tag, Tags, Trash2, X } from "lucide-react";
import { useImages } from "@/hooks/use-images";
import { UploadDropzone } from "@/components/library/upload-dropzone";
import { Toolbar } from "@/components/library/toolbar";
import { Pagination } from "@/components/library/pagination";
import { ImageCard, fileUrl, THUMB_WIDTH } from "@/components/library/image-card";
import { Lightbox } from "@/components/library/lightbox";
import { TagEditorDialog } from "@/components/library/tag-editor-dialog";
import { RenameImageDialog } from "@/components/library/rename-image-dialog";
import { BulkTagDialog } from "@/components/library/bulk-tag-dialog";
import { BulkRemoveTagDialog } from "@/components/library/bulk-remove-tag-dialog";
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
  // Which card is currently under the pointer during a reorder drag — shown
  // with a blue edge highlight so the drop position is unambiguous, not just
  // inferred from the live shuffle.
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false);
  const [bulkRemoveOpen, setBulkRemoveOpen] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const cardElRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [marquee, setMarquee] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);
  // Viewport-relative start point, used only to measure whether the pointer
  // has moved far enough to count as a drag (vs. a plain click on a card).
  const dragStartClientRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = React.useRef(false);
  // Set true for one tick right after a real drag ends, so the click event
  // the browser fires on mouseup doesn't also toggle whichever card the
  // cursor happened to land on.
  const suppressClickRef = React.useRef(false);
  // Snapshot of whatever was already selected (by individual clicks, or an
  // earlier drag) before this marquee drag began, so a new drag adds to the
  // selection instead of replacing it outright.
  const baseSelectionRef = React.useRef<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const effectivePageSize: PageSize = view === "carousel" || reorderMode ? "all" : pageSize;
  const effectiveSort: SortKey = reorderMode ? "custom" : sort;

  const {
    items,
    total,
    loading,
    uploads,
    upload,
    updateImage,
    bulkAddTags,
    bulkRemoveTags,
    bulkDelete,
    deleteImage,
    previewReorder,
    commitReorder,
  } = useImages({
      search,
      sort: effectiveSort,
      tag: lockedTag,
      page,
      pageSize: effectivePageSize,
    });

  React.useEffect(() => {
    setPage(1);
  }, [search, sort, pageSize, lockedTag]);

  // Deleting everything on the last page (or bulk-deleting past the end of
  // the current page) can leave `page` pointing past the new, smaller page
  // count — snap back to the last real page instead of showing an empty grid.
  React.useEffect(() => {
    if (effectivePageSize === "all") return;
    const pageCount = Math.max(1, Math.ceil(total / effectivePageSize));
    if (page > pageCount) setPage(pageCount);
  }, [total, effectivePageSize, page]);

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
    // Swallow the click that immediately follows a real marquee drag — the
    // browser fires it on mouseup regardless of what the drag already did,
    // and without this it would flip whatever card the cursor ended on a
    // second time.
    if (suppressClickRef.current) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedIds(new Set(items.map((img) => img.id)));
  }

  const allVisibleSelected = items.length > 0 && items.every((img) => selectedIds.has(img.id));

  function handleSelectAllToggle() {
    if (allVisibleSelected) setSelectedIds(new Set());
    else selectAllVisible();
  }

  const DRAG_THRESHOLD_PX = 4;

  // Rubber-band / marquee select: click-drag anywhere over the grid —
  // including starting on top of a card, not just the thin gaps between
  // them — selects every card the rectangle overlaps, same as a desktop
  // file manager. A short distance threshold before the rectangle appears
  // means an ordinary click-to-toggle on a single card still works exactly
  // as before; only a real drag engages the marquee. The start corner is
  // stored in document-absolute coordinates (client + scroll offset) rather
  // than "relative to the grid's rect right now" — that rect moves once
  // auto-scroll kicks in, so a rect-relative start point would silently
  // drift away from where the drag actually began.
  function handleGridMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (!selectMode || e.button !== 0) return;
    baseSelectionRef.current = new Set(selectedIds);
    dragStartRef.current = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY };
    dragStartClientRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }

  React.useEffect(() => {
    if (!selectMode) return;

    let lastClientX = 0;
    let lastClientY = 0;
    let autoScrollFrame: number | null = null;

    function computeSelection() {
      const rect = gridRef.current?.getBoundingClientRect();
      const start = dragStartRef.current;
      if (!rect || !start) return;
      // Both corners derived fresh from the CURRENT rect + current scroll
      // every tick, so the rectangle stays anchored to the real document
      // positions no matter how much the page has auto-scrolled since.
      const x0 = start.x - (rect.left + window.scrollX);
      const y0 = start.y - (rect.top + window.scrollY);
      const x1 = lastClientX - rect.left;
      const y1 = lastClientY - rect.top;
      setMarquee({ x0, y0, x1, y1 });

      const left = Math.min(x0, x1);
      const right = Math.max(x0, x1);
      const top = Math.min(y0, y1);
      const bottom = Math.max(y0, y1);

      const hit = new Set<string>();
      cardElRefs.current.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        const elLeft = r.left - rect.left;
        const elTop = r.top - rect.top;
        const elRight = elLeft + r.width;
        const elBottom = elTop + r.height;
        if (elLeft < right && elRight > left && elTop < bottom && elBottom > top) hit.add(id);
      });
      setSelectedIds(new Set([...baseSelectionRef.current, ...hit]));
    }

    // "Giant" selections need to reach content off-screen — while dragging
    // near the top/bottom edge of the viewport, keep scrolling the page so
    // the marquee can grow past what was visible when the drag started.
    const EDGE = 60;
    const MAX_SPEED = 22;
    function autoScrollTick() {
      if (!isDraggingRef.current) {
        autoScrollFrame = requestAnimationFrame(autoScrollTick);
        return;
      }
      const distFromBottom = window.innerHeight - lastClientY;
      let speed = 0;
      if (lastClientY < EDGE) speed = -MAX_SPEED * (1 - lastClientY / EDGE);
      else if (distFromBottom < EDGE) speed = MAX_SPEED * (1 - distFromBottom / EDGE);
      if (speed !== 0) {
        window.scrollBy(0, speed);
        computeSelection();
      }
      autoScrollFrame = requestAnimationFrame(autoScrollTick);
    }
    autoScrollFrame = requestAnimationFrame(autoScrollTick);

    function onMove(e: MouseEvent) {
      const start = dragStartClientRef.current;
      if (!start) return;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      if (!isDraggingRef.current) {
        const dx = Math.abs(e.clientX - start.x);
        const dy = Math.abs(e.clientY - start.y);
        if (dx < DRAG_THRESHOLD_PX && dy < DRAG_THRESHOLD_PX) return;
        isDraggingRef.current = true;
        const rect = gridRef.current?.getBoundingClientRect();
        if (rect) {
          const x = start.x - rect.left;
          const y = start.y - rect.top;
          setMarquee({ x0: x, y0: y, x1: x, y1: y });
        }
      }
      // Dragging is a text-selection / native-image-drag hazard once it's
      // confirmed as a real marquee — stop the browser from doing either.
      e.preventDefault();
      computeSelection();
    }

    function onUp() {
      if (isDraggingRef.current) {
        suppressClickRef.current = true;
        requestAnimationFrame(() => {
          suppressClickRef.current = false;
        });
      }
      dragStartRef.current = null;
      dragStartClientRef.current = null;
      isDraggingRef.current = false;
      setMarquee(null);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
    };
  }, [selectMode]);

  async function handleBulkApply(tags: string[]) {
    const ok = await bulkAddTags(Array.from(selectedIds), tags);
    if (ok) {
      setSelectedIds(new Set());
      setSelectMode(false);
    }
    return ok;
  }

  async function handleBulkRemove(tags: string[]) {
    const ok = await bulkRemoveTags(Array.from(selectedIds), tags);
    if (ok) {
      setSelectedIds(new Set());
      setSelectMode(false);
    }
    return ok;
  }

  async function handleBulkDelete() {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!window.confirm(`Delete ${count} selected image${count === 1 ? "" : "s"}? This can't be undone.`)) return;
    setBulkDeleting(true);
    const ok = await bulkDelete(Array.from(selectedIds));
    setBulkDeleting(false);
    if (ok) {
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }

  // Union of every tag across the currently-selected images — the removal
  // dialog only offers tags that actually exist somewhere in the selection.
  const selectedTagsUnion = React.useMemo(() => {
    const set = new Set<string>();
    for (const img of items) {
      if (selectedIds.has(img.id)) img.tags.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [items, selectedIds]);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
    setDragOverIndex(index);
  }

  function handleDragEnter(index: number) {
    setDragOverIndex(index);
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
    setDragOverIndex(null);
    commitReorder(items.map((img) => img.id));
  }

  const slides: CoverflowSlide[] = items.map((img) => ({
    id: img.id,
    // The carousel card tops out around 260px wide — loading every image's
    // full, often multi-MB original just to show it that small was why the
    // carousel lagged and images could fail to render at all once a
    // library had a lot of them (too much simultaneous bandwidth/decode
    // work). A resized copy is plenty sharp at this size.
    src: fileUrl(img, { width: THUMB_WIDTH }),
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
        visibleCount={items.length}
        allVisibleSelected={allVisibleSelected}
        onSelectAll={handleSelectAllToggle}
      />

      {reorderMode && (
        <p className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Drag any card to set a custom order. Changes save automatically — click "Done" when finished.
        </p>
      )}

      {selectMode && (
        <p className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground">
          Click a card to select it, click-and-drag across the grid to select several at once, or use "Select all".
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
                dragOver={reorderMode && dragOverIndex === idx}
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
                dragOver={reorderMode && dragOverIndex === idx}
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
            <Button variant="outline" size="sm" onClick={() => setBulkRemoveOpen(true)}>
              <Tags className="size-4" /> Remove tag
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
              <Trash2 className="size-4" /> {bulkDeleting ? "Deleting…" : "Delete"}
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

      <BulkRemoveTagDialog
        open={bulkRemoveOpen}
        count={selectedIds.size}
        availableTags={selectedTagsUnion}
        onClose={() => setBulkRemoveOpen(false)}
        onApply={handleBulkRemove}
      />
    </div>
  );
}
