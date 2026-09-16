"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Download, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadImage, fileUrl } from "@/components/library/image-card";

/** Large enough to look sharp full-screen on a big monitor, far smaller than
 *  most originals — requesting the full multi-MB file just to preview it was
 *  slow and, under load, could get cut off mid-stream (a truncated JPEG
 *  renders as only its top portion, which is what "the image only shows
 *  halfway" was). Downloads still use the untouched original. */
const LIGHTBOX_WIDTH = 1920;
import { formatBytes, formatDate } from "@/lib/utils";
import type { ImageRecord } from "@/lib/types";

interface LightboxProps {
  images: ImageRecord[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onEditTags: (image: ImageRecord) => void;
}

export function Lightbox({ images, index, onClose, onIndexChange, onEditTags }: LightboxProps) {
  const image = images[index];
  const imgRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(containerRef.current, { opacity: 0, duration: 0.2 });
      gsap.fromTo(imgRef.current, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: 0.3, ease: "power2.out" });
    },
    { dependencies: [index], scope: containerRef }
  );

  const goPrev = React.useCallback(
    () => onIndexChange((index - 1 + images.length) % images.length),
    [index, images.length, onIndexChange]
  );
  const goNext = React.useCallback(
    () => onIndexChange((index + 1) % images.length),
    [index, images.length, onIndexChange]
  );

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, goPrev, goNext]);

  const touchStartX = React.useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  if (!image) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-5 py-4 text-white/90">
        <div className="text-sm">
          <span className="font-medium">{image.originalName}</span>
          <span className="ml-3 text-white/50">
            {index + 1} / {images.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => onEditTags(image)} aria-label="Edit tags">
            <Tag className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => downloadImage(image)} aria-label="Download">
            <Download className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose} aria-label="Close">
            <X className="size-5" />
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-4">
        {images.length > 1 && (
          <button
            onClick={goPrev}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 hover:scale-105"
          >
            <ChevronLeft className="size-6" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={fileUrl(image, { width: LIGHTBOX_WIDTH })}
          alt={image.originalName}
          draggable={false}
          onError={(e) => {
            const el = e.currentTarget;
            if (el.dataset.fallback) return;
            el.dataset.fallback = "1";
            el.src = fileUrl(image);
          }}
          className="block h-auto max-h-full w-auto max-w-full rounded-[var(--radius-md)] object-contain shadow-[var(--shadow-lg)]"
        />
        {images.length > 1 && (
          <button
            onClick={goNext}
            aria-label="Next image"
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 hover:scale-105"
          >
            <ChevronRight className="size-6" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 px-5 pb-5 text-xs text-white/60">
        <span>{formatDate(image.uploadedAt)}</span>
        <span>·</span>
        <span>{formatBytes(image.size)}</span>
        <span>·</span>
        <span className="uppercase">{image.ext}</span>
        <span>·</span>
        <span>{image.aspect}</span>
        {image.tags.map((t) => (
          <Badge key={t} variant="secondary" className="bg-white/10 text-white">
            {t}
          </Badge>
        ))}
      </div>
    </div>
  );
}
