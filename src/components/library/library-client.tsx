"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ImageOff, Tag, Tags, Trash2, X } from "lucide-react";
import { useImages } from "@/hooks/use-images";
import { UploadDropzone } from "@/components/library/upload-dropzone";
import { StorageBar } from "@/components/library/storage-bar";
import { Toolbar } from "@/components/library/toolbar";
import { Pagination } from "@/components/library/pagination";
import { HERO_DRAG_MIME, ImageCard, fileUrl, THUMB_WIDTH } from "@/components/library/image-card";
import { Lightbox } from "@/components/library/lightbox";
import { ActivityLog } from "@/components/library/activity-log";
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
  lockedTag?: string | null;
}

const DEFAULT_ACCENT = "#117fd1";

export function LibraryClient({ hideUpload = false, lockedTag = null }: LibraryClientProps) {
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<SortKey>("custom");
  const [pageSize, setPageSize] = React.useState<PageSize>(12);
  const [page, setPage] = React.useState(1);
  const [view, setView] = React.useState<ViewMode>("grid");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);
  const [tagEditorImage, setTagEditorImage] = React.useState<ImageRecord | null>(null);
  const [renameImage, setRenameImage] = React.useState<ImageRecord | null>(null);
  const [showActivityLog, setShowActivityLog] = React.useState(false);
  const [accentColor, setAccentColor] = React.useState(DEFAULT_ACCENT);

  // Load accent color from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("accent-color");
      if (stored) setAccentColor(stored);
    } catch { /* ignore */ }
  }, []);

  // Apply accent color as CSS variable
  React.useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
    try { localStorage.setItem("accent-color", accentColor); } catch { /* ignore */ }
  }, [accentColor]);

  const [reorderMode, setReorderMode] = React.useState(false);
  const prePageSize = React.useRef<PageSize | null>(null);
  const dragIndexRef = React.useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = React.useState<number | null>(null);

  const [selectMode, setSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkTagOpen, setBulkTagOpen] = React.useState(false);
  const [bulkRemoveOpen, setBulkRemoveOpen] = React.useState(false);
  const [bulkDownloading, setBulkDownloading] = React.useState(false);
  const gridRef = React.useRef<HTMLDivElement>(null);
  const cardElRefs = React.useRef<Map<string, HTMLElement>>(new Map());
  const [marquee, setMarquee] = React.useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const dragStartRef = React.useRef<{ x: number; y: number } | null>(null);
  const dragStartClientRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = React.useRef(false);
  const suppressClickRef = React.useRef(false);
  const baseSelectionRef = React.useRef<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  // Keyboard navigation within the grid
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null);

  // Infinite scroll sentinel
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [infiniteScroll, setInfiniteScroll] = React.useState(false);

  const effectivePageSize: PageSize = view === "carousel" || reorderMode ? "all" : infiniteScroll ? "all" : pageSize;
  const effectiveSort: SortKey = reorderMode ? "custom" : sort;

  const heroDraggable = !!lockedTag && !selectMode && !reorderMode;
  function handleHeroDragStart(e: React.DragEvent, imageId: string) {
    if (!heroDraggable) return;
    e.dataTransfer.setData(HERO_DRAG_MIME, imageId);
    e.dataTransfer.effectAllowed = "copy";
  }

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
    refresh,
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

  React.useEffect(() => {
    if (effectivePageSize === "all") return;
    const pageCount = Math.max(1, Math.ceil(total / effectivePageSize));
    if (page > pageCount) setPage(pageCount);
  }, [total, effectivePageSize, page]);

  function toggleReorder() {
    if (reorderMode) {
      setReorderMode(false);
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

  // Keyboard navigation in grid/list/masonry
  React.useEffect(() => {
    if (lightboxIndex !== null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (view === "carousel") return;

      const cols = view === "list" ? 1 : 4; // approximate columns
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(items.length - 1, (prev ?? -1) + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, (prev ?? 0) - 1));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(items.length - 1, (prev ?? -1) + cols));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, (prev ?? cols) - cols));
      } else if (e.key === "Enter" && focusedIndex !== null) {
        setLightboxIndex(focusedIndex);
      } else if (e.key === "Delete" && focusedIndex !== null && !selectMode) {
        const img = items[focusedIndex];
        if (img && window.confirm(`Delete "${img.originalName}"?`)) {
          deleteImage(img.id);
          setFocusedIndex(null);
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items, focusedIndex, view, lightboxIndex, selectMode, deleteImage]);

  // Click outside grid clears focused index
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (gridRef.current && !gridRef.current.contains(e.target as Node)) {
        setFocusedIndex(null);
      }
    }
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

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

  async function handleBulkDownload() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setBulkDownloading(true);
    try {
      const res = await fetch("/api/images/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `images-${ids.length}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBulkDownloading(false);
    }
  }

  async function handleQuickTag(image: ImageRecord, tags: string[]) {
    await updateImage(image.id, { tags });
  }

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

  const sharedCardProps = (img: ImageRecord, idx: number) => ({
    image: img,
    onExpand: () => setLightboxIndex(idx),
    onEditTags: () => setTagEditorImage(img),
    onRename: () => setRenameImage(img),
    onSaveName: (name: string) => updateImage(img.id, { originalName: name }),
    onDelete: () => deleteImage(img.id),
    reorderMode,
    dragOver: reorderMode && dragOverIndex === idx,
    onDragStart: () => handleDragStart(idx),
    onDragEnter: () => handleDragEnter(idx),
    onDragEnd: handleDragEnd,
    selectMode,
    selected: selectedIds.has(img.id),
    onToggleSelect: () => toggleSelected(img.id),
    staggerIndex: idx,
  });

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex flex-1 flex-col gap-6 min-w-0">
        {!hideUpload && !reorderMode && !selectMode && (
          <div className="flex flex-col gap-3">
            <StorageBar />
            <UploadDropzone
              onFiles={(files) => upload(files, { tags: lockedTag ? [lockedTag] : undefined })}
              uploads={uploads}
            />
          </div>
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
          selectedCount={selectedIds.size}
          onBulkDownload={handleBulkDownload}
          showActivityLog={showActivityLog}
          onToggleActivityLog={() => setShowActivityLog((v) => !v)}
          accentColor={accentColor}
          onAccentColorChange={setAccentColor}
        />

        <AnimatePresence>
          {reorderMode && (
            <motion.p
              key="reorder-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground"
            >
              Drag any card to set a custom order. Changes save automatically — click "Done" when finished.
            </motion.p>
          )}
          {selectMode && (
            <motion.p
              key="select-banner"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-[var(--radius-md)] border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-foreground"
            >
              Click a card to select it, click-and-drag to select several. Use{" "}
              <kbd className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs">Del</kbd> on a focused card to delete.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Infinite scroll toggle */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setInfiniteScroll((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5 transition hover:border-accent hover:text-accent"
          >
            <span className={`size-2 rounded-full ${infiniteScroll ? "bg-accent" : "bg-muted"}`} />
            {infiniteScroll ? "Infinite scroll on" : "Infinite scroll off"}
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state-in flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-border py-20 text-center text-muted-foreground">
            <div className="rounded-full border border-border bg-surface p-4">
              <ImageOff className="size-8 opacity-40" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">No images found</p>
              <p className="text-xs opacity-60">Upload some images, or clear your search filters.</p>
            </div>
          </div>
        ) : view === "carousel" ? (
          <CoverflowCarousel slides={slides} onSelect={(_, idx) => setLightboxIndex(idx)} />
        ) : view === "masonry" ? (
          <div
            ref={gridRef}
            onMouseDown={handleGridMouseDown}
            className="relative select-none"
            style={{ columnCount: 3, columnGap: "1rem" }}
          >
            {items.map((img, idx) => (
              <div
                key={img.id}
                ref={(el) => {
                  if (el) cardElRefs.current.set(img.id, el);
                  else cardElRefs.current.delete(img.id);
                }}
                draggable={heroDraggable}
                onDragStart={(e) => handleHeroDragStart(e, img.id)}
                onClick={() => setFocusedIndex(idx)}
                className={focusedIndex === idx ? "ring-2 ring-accent rounded-[var(--radius-lg)]" : undefined}
              >
                <ImageCard
                  {...sharedCardProps(img, idx)}
                  layout="masonry"
                />
              </div>
            ))}
          </div>
        ) : view === "list" ? (
          <div ref={gridRef} onMouseDown={handleGridMouseDown} className="relative flex select-none flex-col gap-2">
            {items.map((img, idx) => (
              <motion.div
                key={img.id}
                layout
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                ref={(el) => {
                  if (el) cardElRefs.current.set(img.id, el as HTMLElement);
                  else cardElRefs.current.delete(img.id);
                }}
                style={{ "--card-index": idx } as React.CSSProperties}
                draggable={heroDraggable}
                onDragStart={(e) => handleHeroDragStart(e as unknown as React.DragEvent, img.id)}
                onClick={() => setFocusedIndex(idx)}
                className={focusedIndex === idx ? "ring-2 ring-accent rounded-[var(--radius-md)]" : undefined}
              >
                <ImageCard
                  {...sharedCardProps(img, idx)}
                  layout="list"
                />
              </motion.div>
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
          /* grid view */
          <div
            ref={gridRef}
            onMouseDown={handleGridMouseDown}
            className="relative grid select-none grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          >
            {items.map((img, idx) => (
              <motion.div
                key={img.id}
                layout
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                ref={(el) => {
                  if (el) cardElRefs.current.set(img.id, el as HTMLElement);
                  else cardElRefs.current.delete(img.id);
                }}
                style={{ "--card-index": idx } as React.CSSProperties}
                draggable={heroDraggable}
                onDragStart={(e) => handleHeroDragStart(e as unknown as React.DragEvent, img.id)}
                onClick={() => setFocusedIndex(idx)}
                className={focusedIndex === idx ? "ring-2 ring-accent rounded-[var(--radius-lg)]" : undefined}
              >
                <ImageCard
                  {...sharedCardProps(img, idx)}
                  layout="grid"
                />
              </motion.div>
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

        {/* Infinite scroll sentinel / pagination */}
        {view !== "carousel" && !reorderMode && !infiniteScroll && (
          <Pagination page={page} pageSize={effectivePageSize} total={total} onPageChange={setPage} />
        )}
        {infiniteScroll && (
          <div ref={sentinelRef} className="h-4" />
        )}

        {/* Floating bulk action bar */}
        <AnimatePresence>
          {selectMode && selectedIds.size > 0 && (
            <motion.div
              key="bulk-bar"
              initial={{ y: 72, opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 72, opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="fixed inset-x-2 bottom-6 z-40 flex justify-center sm:inset-x-0"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-border bg-surface-2 px-3 py-2.5 shadow-[var(--shadow-lg)] backdrop-blur-md sm:gap-3 sm:px-4">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={selectedIds.size}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm font-medium"
                  >
                    {selectedIds.size} selected
                  </motion.span>
                </AnimatePresence>
                <Button size="sm" onClick={() => setBulkTagOpen(true)}>
                  <Tag className="size-4" /> Add tag
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkRemoveOpen(true)}>
                  <Tags className="size-4" /> Remove tag
                </Button>
                <Button variant="outline" size="sm" onClick={handleBulkDownload} disabled={bulkDownloading}>
                  <Download className="size-4" /> {bulkDownloading ? "Zipping…" : "Download ZIP"}
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} disabled={bulkDeleting}>
                  <Trash2 className="size-4" /> {bulkDeleting ? "Deleting…" : "Delete"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  <X className="size-4" /> Clear
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {lightboxIndex !== null && (
          <Lightbox
            images={items}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onIndexChange={setLightboxIndex}
            onEditTags={(img) => setTagEditorImage(img)}
            onQuickTag={handleQuickTag}
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

      {/* Activity log side panel */}
      <AnimatePresence>
        {showActivityLog && (
          <motion.div
            key="activity-log"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 288, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="overflow-hidden"
          >
            <ActivityLog onClose={() => setShowActivityLog(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
