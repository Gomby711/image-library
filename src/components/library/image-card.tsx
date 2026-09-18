"use client";

import * as React from "react";
import gsap from "gsap";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Download, GripVertical, Info, Maximize2, Pencil, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { ImageRecord } from "@/lib/types";

/** Passing `ext` lets the file route build the blob filename (`${id}.${ext}`)
 *  directly and skip reading/parsing the whole library DB just to serve
 *  thumbnail bytes. Passing `width` additionally asks for a resized copy
 *  instead of the full original — grid/list cards use this, the lightbox
 *  and downloads don't. */
export function fileUrl(
  image: { id: string; ext: string },
  opts?: { download?: boolean; width?: number; filename?: string }
) {
  const params = new URLSearchParams({ ext: image.ext });
  if (opts?.download) params.set("download", "1");
  if (opts?.width) params.set("w", String(opts.width));
  if (opts?.filename) params.set("filename", opts.filename);
  return `/api/images/${image.id}/file?${params.toString()}`;
}

/** Thumbnail width requested for grid/list cards — big enough to look sharp
 *  on a retina display at typical card sizes, far smaller than most
 *  originals. */
export const THUMB_WIDTH = 480;

/** Custom drag-data type used when dragging an image card out of the grid
 *  to drop it onto a Library Page's hero banner — distinct from a plain
 *  text/file drag so the hero drop zone can tell "an image from this page"
 *  apart from "a file from the desktop". */
export const HERO_DRAG_MIME = "application/x-luminary-image-id";

export function downloadImage(image: ImageRecord) {
  const a = document.createElement("a");
  // The route's ?ext= fast path (see file/route.ts) skips reading the DB
  // entirely, so it never knew the image's real name and always fell back
  // to a hardcoded "download" — that's why saved files had no extension,
  // showed no preview, and ignored the site's file name. Passing the name
  // through explicitly keeps that fast path while fixing the filename.
  a.href = fileUrl(image, { download: true, filename: image.originalName });
  a.download = image.originalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface ImageCardProps {
  image: ImageRecord;
  layout: "grid" | "list" | "masonry";
  onExpand: () => void;
  onEditTags: () => void;
  onRename: () => void;
  onDetail?: () => void;
  /** Double-click-on-name inline rename — commits straight from the card,
   *  no dialog. The pencil icon still opens the full RenameImageDialog. */
  onSaveName: (name: string) => void;
  onDelete: () => void;
  /** Drag-to-rearrange — when true the card becomes draggable and the
   *  action row hides so a drag can't be mistaken for a button click. */
  reorderMode?: boolean;
  onDragStart?: () => void;
  onDragEnter?: () => void;
  onDragEnd?: () => void;
  /** True while this card is the current drop target during a reorder drag
   *  — shown with a blue edge highlight so the exact drop position is
   *  visible, not just inferred from the live shuffle. */
  dragOver?: boolean;
  /** Multi-select — when true a checkbox overlays the card and clicking it
   *  (anywhere on the card) toggles selection instead of opening/expanding. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /** Stagger index for entrance animation delay */
  staggerIndex?: number;
}

export function ImageCard({
  image,
  layout,
  onExpand,
  onEditTags,
  onRename,
  onDetail,
  onSaveName,
  onDelete,
  reorderMode = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
  dragOver = false,
  selectMode = false,
  selected = false,
  onToggleSelect,
  staggerIndex = 0,
}: ImageCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [ctxMenu, setCtxMenu] = React.useState<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (!ctxMenu) return;
    function close() { setCtxMenu(null); }
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [ctxMenu]);

  // Mount fade is a plain CSS animation (see .card-fade-in in globals.css),
  // not a GSAP tween — "Show all" can mount 250+ of these at once, and
  // spinning up that many individual GSAP tweens simultaneously is exactly
  // what made switching page size feel like it hung.
  function onMouseEnter() {
    if (reorderMode) return;
    gsap.to(cardRef.current, { y: -4, duration: 0.25, ease: "power2.out" });
  }
  function onMouseLeave() {
    if (reorderMode) return;
    gsap.to(cardRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
  }

  const dragProps = reorderMode
    ? {
        draggable: true,
        onDragStart: (e: React.DragEvent) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart?.();
        },
        onDragEnter: (e: React.DragEvent) => {
          e.preventDefault();
          onDragEnter?.();
        },
        onDragOver: (e: React.DragEvent) => e.preventDefault(),
        onDragEnd: () => onDragEnd?.(),
      }
    : {};

  const [editingName, setEditingName] = React.useState(false);
  const [draftName, setDraftName] = React.useState(image.originalName);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!editingName) setDraftName(image.originalName);
  }, [image.originalName, editingName]);

  React.useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }
  }, [editingName]);

  function commitName() {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== image.originalName) onSaveName(trimmed);
    else setDraftName(image.originalName);
  }

  const NameLabel = editingName ? (
    <input
      ref={nameInputRef}
      value={draftName}
      onChange={(e) => setDraftName(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={commitName}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitName();
        if (e.key === "Escape") {
          setDraftName(image.originalName);
          setEditingName(false);
        }
      }}
      className={cn(
        "rounded-[var(--radius-sm)] border border-accent bg-surface-2 px-1 -mx-1 text-base sm:text-sm font-medium outline-none",
        layout === "list" ? "" : "w-full"
      )}
    />
  ) : (
    <button
      type="button"
      onClick={(e) => {
        if (!selectMode) e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        if (selectMode) return;
        e.stopPropagation();
        setEditingName(true);
      }}
      title={selectMode ? undefined : "Double-click to rename"}
      className={cn(
        "truncate text-left text-sm font-medium hover:text-accent",
        layout === "list" ? "" : "w-full"
      )}
    >
      {image.originalName}
    </button>
  );

  if (layout === "list") {
    return (
      <div
        ref={cardRef}
        {...dragProps}
        onClick={selectMode ? onToggleSelect : undefined}
        onContextMenu={(e) => {
          if (selectMode || reorderMode) return;
          e.preventDefault();
          setCtxMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          "card-fade-in drop-target-base flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]",
          reorderMode && "cursor-grab active:cursor-grabbing",
          selectMode && "cursor-pointer",
          selected && "ring-2 ring-accent",
          dragOver && "grid-drop-highlight"
        )}
        style={{ "--card-index": staggerIndex } as React.CSSProperties}
      >
        {reorderMode && <GripVertical className="size-4 shrink-0 text-muted-foreground" />}
        {selectMode && <SelectCheckbox selected={selected} />}
        <button
          onClick={reorderMode || selectMode ? undefined : onExpand}
          className="size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)]"
          style={{ backgroundColor: image.dominantColor ?? undefined }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl(image, { width: THUMB_WIDTH })}
            alt={image.originalName}
            draggable={false}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            onError={(e) => {
              const el = e.currentTarget;
              if (el.dataset.fallback) return;
              el.dataset.fallback = "1";
              el.src = fileUrl(image);
            }}
            className={cn(
              "h-full w-full object-cover transition-opacity duration-500",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
          />
        </button>
        <div className="min-w-0 flex-1">
          {NameLabel}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(image.uploadedAt)}</span>
            <span>{formatBytes(image.size)}</span>
            <span className="uppercase">{image.ext}</span>
            <span>{image.aspect}</span>
          </div>
          {image.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {image.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
        {!reorderMode && !selectMode && (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton onClick={onRename} label="Rename"><Pencil className="size-4" /></IconButton>
            <IconButton onClick={onEditTags} label="Edit tags"><Tag className="size-4" /></IconButton>
            <IconButton onClick={() => downloadImage(image)} label="Download"><Download className="size-4" /></IconButton>
            <IconButton onClick={onExpand} label="Expand"><Maximize2 className="size-4" /></IconButton>
            {onDetail && <IconButton onClick={onDetail} label="Details"><Info className="size-4" /></IconButton>}
            <IconButton onClick={onDelete} label="Delete" destructive><Trash2 className="size-4" /></IconButton>
          </div>
        )}
        {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onExpand={onExpand} onEditTags={onEditTags} onRename={onRename} onDetail={onDetail} onDownload={() => downloadImage(image)} onDelete={onDelete} />}
      </div>
    );
  }

  const isMasonry = layout === "masonry";

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={selectMode ? onToggleSelect : undefined}
      onContextMenu={(e) => {
        if (selectMode || reorderMode) return;
        e.preventDefault();
        setCtxMenu({ x: e.clientX, y: e.clientY });
      }}
      {...dragProps}
      className={cn(
        "card-fade-in drop-target-base group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)] transition-[box-shadow,border-color] hover:border-accent/40 hover:shadow-[var(--shadow-glow)]",
        isMasonry && "mb-4 break-inside-avoid",
        reorderMode && "cursor-grab active:cursor-grabbing",
        selectMode && "cursor-pointer",
        selected && "ring-2 ring-accent",
        dragOver && "grid-drop-highlight"
      )}
      style={{ "--card-index": staggerIndex } as React.CSSProperties}
    >
      {selectMode && (
        <div className="absolute left-2 top-2 z-10">
          <SelectCheckbox selected={selected} />
        </div>
      )}
      <button
        onClick={reorderMode || selectMode ? undefined : onExpand}
        className={cn(
          "relative block w-full overflow-hidden",
          isMasonry ? "aspect-auto" : "aspect-[4/3]"
        )}
        style={{ backgroundColor: image.dominantColor ?? undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl(image, { width: THUMB_WIDTH })}
          alt={image.originalName}
          draggable={false}
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.fallback) return;
            el.dataset.fallback = "1";
            el.src = fileUrl(image);
          }}
          className={cn(
            "w-full object-cover transition-[opacity,transform] duration-500 group-hover:scale-105",
            isMasonry ? "h-auto" : "h-full",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
        />
        {reorderMode ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <GripVertical className="size-6 text-white drop-shadow" />
          </div>
        ) : !selectMode ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <Maximize2 className="size-6 text-white drop-shadow" />
          </div>
        ) : selected ? (
          <div className="absolute inset-0 bg-accent/15" />
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {NameLabel}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{formatDate(image.uploadedAt)}</span>
          <span>·</span>
          <span>{formatBytes(image.size)}</span>
          <span>·</span>
          <span className="uppercase">{image.ext}</span>
          <span>·</span>
          <span>{image.aspect}</span>
        </div>
        {image.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {image.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!reorderMode && !selectMode && (
        <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5 sm:opacity-0 sm:transition-opacity sm:duration-[var(--duration-xs)] sm:ease-[var(--ease-out-quart)] sm:group-hover:opacity-100">
          <IconButton onClick={onRename} label="Rename"><Pencil className="size-4" /></IconButton>
          <IconButton onClick={onEditTags} label="Edit tags"><Tag className="size-4" /></IconButton>
          <IconButton onClick={() => downloadImage(image)} label="Download"><Download className="size-4" /></IconButton>
          {onDetail && <IconButton onClick={onDetail} label="Details"><Info className="size-4" /></IconButton>}
          <IconButton onClick={onDelete} label="Delete" destructive><Trash2 className="size-4" /></IconButton>
        </div>
      )}

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onExpand={onExpand} onEditTags={onEditTags} onRename={onRename} onDetail={onDetail} onDownload={() => downloadImage(image)} onDelete={onDelete} />}
    </div>
  );
}

function SelectCheckbox({ selected }: { selected: boolean }) {
  return (
    <div
      className={cn(
        "flex size-5 items-center justify-center rounded-[var(--radius-sm)] border-2 shadow-[var(--shadow-sm)] transition-[colors,transform] duration-150",
        selected
          ? "border-accent bg-accent text-accent-foreground scale-110"
          : "border-white/70 bg-black/40 scale-100"
      )}
    >
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 350 }}
          >
            <Check className="size-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function IconButton({
  onClick,
  label,
  destructive,
  children,
}: {
  onClick: () => void;
  label: string;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={destructive ? "text-destructive hover:bg-destructive/10" : undefined}
    >
      {children}
    </Button>
  );
}

function ContextMenu({
  x, y,
  onExpand, onEditTags, onRename, onDetail, onDownload, onDelete,
}: {
  x: number; y: number;
  onExpand: () => void;
  onEditTags: () => void;
  onRename: () => void;
  onDetail?: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x, y });

  React.useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPos({
      x: x + rect.width > vw ? x - rect.width : x,
      y: y + rect.height > vh ? y - rect.height : y,
    });
  }, [x, y]);

  const items = [
    { label: "Open", icon: <Maximize2 className="size-3.5" />, onClick: onExpand },
    { label: "Edit tags", icon: <Tag className="size-3.5" />, onClick: onEditTags },
    { label: "Rename", icon: <Pencil className="size-3.5" />, onClick: onRename },
    ...(onDetail ? [{ label: "Details", icon: <Info className="size-3.5" />, onClick: onDetail }] : []),
    { label: "Download", icon: <Download className="size-3.5" />, onClick: onDownload },
    { label: "Delete", icon: <Trash2 className="size-3.5" />, onClick: onDelete, destructive: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[200] min-w-[160px] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface shadow-[var(--shadow-lg)] py-1"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
          }}
          className={cn(
            "flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-surface-2",
            item.destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
