"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Download, GripVertical, Maximize2, Pencil, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import type { ImageRecord } from "@/lib/types";

export function fileUrl(id: string, download = false) {
  return `/api/images/${id}/file${download ? "?download=1" : ""}`;
}

export function downloadImage(image: ImageRecord) {
  const a = document.createElement("a");
  a.href = fileUrl(image.id, true);
  a.download = image.originalName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface ImageCardProps {
  image: ImageRecord;
  layout: "grid" | "list";
  onExpand: () => void;
  onEditTags: () => void;
  onRename: () => void;
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
}

export function ImageCard({
  image,
  layout,
  onExpand,
  onEditTags,
  onRename,
  onSaveName,
  onDelete,
  reorderMode = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: ImageCardProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(cardRef.current, {
        opacity: 0,
        y: 14,
        duration: 0.45,
        ease: "power2.out",
      });
    },
    { scope: cardRef }
  );

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
        "rounded-[var(--radius-sm)] border border-accent bg-surface-2 px-1 -mx-1 text-sm font-medium outline-none",
        layout === "list" ? "" : "w-full"
      )}
    />
  ) : (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditingName(true);
      }}
      title="Double-click to rename"
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
        className={cn(
          "flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]",
          reorderMode && "cursor-grab active:cursor-grabbing"
        )}
      >
        {reorderMode && <GripVertical className="size-4 shrink-0 text-muted-foreground" />}
        <button
          onClick={reorderMode ? undefined : onExpand}
          className="size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(image.id)} alt={image.originalName} className="h-full w-full object-cover" />
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
        {!reorderMode && (
          <div className="flex shrink-0 items-center gap-1">
            <IconButton onClick={onRename} label="Rename"><Pencil className="size-4" /></IconButton>
            <IconButton onClick={onEditTags} label="Edit tags"><Tag className="size-4" /></IconButton>
            <IconButton onClick={() => downloadImage(image)} label="Download"><Download className="size-4" /></IconButton>
            <IconButton onClick={onExpand} label="Expand"><Maximize2 className="size-4" /></IconButton>
            <IconButton onClick={onDelete} label="Delete" destructive><Trash2 className="size-4" /></IconButton>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...dragProps}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-lg)]",
        reorderMode && "cursor-grab active:cursor-grabbing"
      )}
    >
      <button onClick={reorderMode ? undefined : onExpand} className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl(image.id)}
          alt={image.originalName}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {reorderMode ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <GripVertical className="size-6 text-white drop-shadow" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
            <Maximize2 className="size-6 text-white drop-shadow" />
          </div>
        )}
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

      {!reorderMode && (
        <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <IconButton onClick={onRename} label="Rename"><Pencil className="size-4" /></IconButton>
          <IconButton onClick={onEditTags} label="Edit tags"><Tag className="size-4" /></IconButton>
          <IconButton onClick={() => downloadImage(image)} label="Download"><Download className="size-4" /></IconButton>
          <IconButton onClick={onDelete} label="Delete" destructive><Trash2 className="size-4" /></IconButton>
        </div>
      )}
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
