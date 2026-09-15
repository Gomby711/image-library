"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { AlertCircle, Check, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPT_ATTR } from "@/lib/images";
import { cn } from "@/lib/utils";
import type { UploadProgressItem } from "@/hooks/use-images";

interface UploadDropzoneProps {
  onFiles: (files: File[]) => void;
  uploads: UploadProgressItem[];
}

export function UploadDropzone({ onFiles, uploads }: UploadDropzoneProps) {
  const [dragActive, setDragActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const zoneRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (dragActive) {
        gsap.to(zoneRef.current, { scale: 1.01, duration: 0.25, ease: "power2.out" });
      } else {
        gsap.to(zoneRef.current, { scale: 1, duration: 0.25, ease: "power2.out" });
      }
    },
    { dependencies: [dragActive], scope: zoneRef }
  );

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={zoneRef}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragActive ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/60 hover:bg-surface-2"
        )}
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-accent/15 text-accent transition-transform group-hover:scale-105">
          <UploadCloud className="size-6" />
        </span>
        <p className="text-sm font-medium text-foreground">
          Drag &amp; drop images, or <span className="text-accent underline-offset-4 group-hover:underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground">JPG, PNG, TIFF, AVIF, WEBP, SVG</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onFiles(files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <div className="flex flex-col gap-2">
          {uploads.map((u) => (
            <UploadRow key={u.id} item={u} />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadRow({ item }: { item: UploadProgressItem }) {
  const barRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.to(barRef.current, { width: `${item.progress}%`, duration: 0.35, ease: "power2.out" });
    },
    { dependencies: [item.progress], scope: barRef }
  );

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{item.name}</span>
          {item.status === "done" ? (
            <Check className="size-4 shrink-0 text-accent" />
          ) : item.status === "error" ? (
            <AlertCircle className="size-4 shrink-0 text-destructive" />
          ) : (
            <span className="shrink-0 text-xs text-muted-foreground">{item.progress}%</span>
          )}
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            ref={barRef}
            className={cn(
              "h-full rounded-full",
              item.status === "error" ? "bg-destructive" : "bg-accent"
            )}
            style={{ width: 0 }}
          />
        </div>
        {item.status === "error" && item.error && (
          <p className="mt-1 text-xs text-destructive">{item.error}</p>
        )}
      </div>
    </div>
  );
}
