"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Download, Folder, Maximize2, Pencil, Tag, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDate } from "@/lib/utils";
import type { FolderRecord, ImageRecord } from "@/lib/types";

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
  folder?: FolderRecord | null;
  onExpand: () => void;
  onEditTags: () => void;
  onRename: () => void;
  onDelete: () => void;
  onFolderClick?: (folderId: string) => void;
}

export function ImageCard({ image, layout, folder, onExpand, onEditTags, onRename, onDelete, onFolderClick }: ImageCardProps) {
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
    gsap.to(cardRef.current, { y: -4, duration: 0.25, ease: "power2.out" });
  }
  function onMouseLeave() {
    gsap.to(cardRef.current, { y: 0, duration: 0.25, ease: "power2.out" });
  }

  if (layout === "list") {
    return (
      <div
        ref={cardRef}
        className="flex items-center gap-4 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3 shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-md)]"
      >
        <button
          onClick={onExpand}
          className="size-14 shrink-0 overflow-hidden rounded-[var(--radius-sm)] bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(image.id)} alt={image.originalName} className="h-full w-full object-cover" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{image.originalName}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(image.uploadedAt)}</span>
            <span>{formatBytes(image.size)}</span>
            <span className="uppercase">{image.ext}</span>
            <span>{image.aspect}</span>
            {folder && (
              <button
                onClick={() => onFolderClick?.(folder.id)}
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                <Folder className="size-3" /> {folder.name}
              </button>
            )}
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
        <div className="flex shrink-0 items-center gap-1">
          <IconButton onClick={onRename} label="Rename"><Pencil className="size-4" /></IconButton>
          <IconButton onClick={onEditTags} label="Edit tags"><Tag className="size-4" /></IconButton>
          <IconButton onClick={() => downloadImage(image)} label="Download"><Download className="size-4" /></IconButton>
          <IconButton onClick={onExpand} label="Expand"><Maximize2 className="size-4" /></IconButton>
          <IconButton onClick={onDelete} label="Delete" destructive><Trash2 className="size-4" /></IconButton>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-sm)] transition-shadow hover:shadow-[var(--shadow-lg)]"
    >
      <button onClick={onExpand} className="relative block aspect-[4/3] w-full overflow-hidden bg-surface-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl(image.id)}
          alt={image.originalName}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/30 group-hover:opacity-100">
          <Maximize2 className="size-6 text-white drop-shadow" />
        </div>
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="truncate text-sm font-medium">{image.originalName}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{formatDate(image.uploadedAt)}</span>
          <span>·</span>
          <span>{formatBytes(image.size)}</span>
          <span>·</span>
          <span className="uppercase">{image.ext}</span>
          <span>·</span>
          <span>{image.aspect}</span>
        </div>
        {folder && (
          <button
            onClick={() => onFolderClick?.(folder.id)}
            className="inline-flex w-fit items-center gap-1 text-xs text-accent hover:underline"
          >
            <Folder className="size-3" /> {folder.name}
          </button>
        )}
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

      <div className="flex items-center justify-end gap-1 border-t border-border px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <IconButton onClick={onRename} label="Rename"><Pencil className="size-4" /></IconButton>
        <IconButton onClick={onEditTags} label="Edit tags"><Tag className="size-4" /></IconButton>
        <IconButton onClick={() => downloadImage(image)} label="Download"><Download className="size-4" /></IconButton>
        <IconButton onClick={onDelete} label="Delete" destructive><Trash2 className="size-4" /></IconButton>
      </div>
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
