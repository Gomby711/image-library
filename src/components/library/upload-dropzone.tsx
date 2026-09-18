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
        <p className="text-xs text-muted-foreground">JPG, PNG, TIFF, AVIF, WEBP, SVG, HEIC, CR2</p>
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

const RING_R = 14;
const RING_C = 2 * Math.PI * RING_R;

function UploadRow({ item }: { item: UploadProgressItem }) {
  const progressRef = React.useRef<SVGCircleElement>(null);

  useGSAP(
    () => {
      if (!progressRef.current) return;
      const offset = RING_C * (1 - item.progress / 100);
      gsap.to(progressRef.current, { strokeDashoffset: offset, duration: 0.35, ease: "power2.out" });
    },
    { dependencies: [item.progress] }
  );

  const isDone = item.status === "done";
  const isError = item.status === "error";

  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm">
      {/* SVG progress ring */}
      <div className="relative shrink-0">
        <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
          <circle
            cx="18" cy="18" r={RING_R}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-surface-2"
          />
          <circle
            ref={progressRef}
            cx="18" cy="18" r={RING_R}
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C}
            className={cn(
              "transition-none",
              isError ? "text-destructive stroke-destructive" : "stroke-accent"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {isDone ? (
            <Check className="size-3.5 text-accent" />
          ) : isError ? (
            <AlertCircle className="size-3 text-destructive" />
          ) : (
            <span className="text-[9px] font-semibold text-muted-foreground leading-none">{item.progress}</span>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <span className="truncate block text-sm">{item.name}</span>
        {isError && item.error && (
          <p className="mt-0.5 text-xs text-destructive">{item.error}</p>
        )}
      </div>
    </div>
  );
}
