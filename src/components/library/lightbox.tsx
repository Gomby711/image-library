"use client";

import * as React from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronLeft, ChevronRight, Download, Info, SplitSquareHorizontal, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { downloadImage, fileUrl } from "@/components/library/image-card";

const LIGHTBOX_WIDTH = 1920;
import { formatBytes, formatDate } from "@/lib/utils";
import type { ExifData, ImageRecord } from "@/lib/types";

interface LightboxProps {
  images: ImageRecord[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  onEditTags: (image: ImageRecord) => void;
  onQuickTag?: (image: ImageRecord, tags: string[]) => Promise<void>;
}

export function Lightbox({ images, index, onClose, onIndexChange, onEditTags, onQuickTag }: LightboxProps) {
  const image = images[index];
  const imgRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const closingRef = React.useRef(false);
  const [showDetail, setShowDetail] = React.useState(false);
  const [showQuickTag, setShowQuickTag] = React.useState(false);
  const [quickTagInput, setQuickTagInput] = React.useState("");
  const [compareMode, setCompareMode] = React.useState(false);
  const [compareSlider, setCompareSlider] = React.useState(50);
  const compareRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);

  useGSAP(
    () => {
      gsap.from(containerRef.current, { opacity: 0, duration: 0.2 });
      gsap.fromTo(
        imgRef.current,
        { opacity: 0, scale: 0.95 },
        {
          opacity: 1,
          scale: 1,
          duration: 0.3,
          ease: "power2.out",
          // Remove inline transform/opacity after the animation so the img is
          // governed purely by CSS again — stale GSAP inline transforms can
          // mis-anchor the image in certain flex layouts.
          onComplete: () => gsap.set(imgRef.current, { clearProps: "transform,opacity" }),
        }
      );
    },
    { dependencies: [index], scope: containerRef }
  );

  function handleClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    gsap.to(containerRef.current, {
      opacity: 0,
      scale: 0.98,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => {
        closingRef.current = false;
        onClose();
      },
    });
  }

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
      if (e.key === "Escape") {
        if (showQuickTag) { setShowQuickTag(false); return; }
        if (showDetail) { setShowDetail(false); return; }
        handleClose();
      }
      if (!showQuickTag) {
        if (e.key === "ArrowLeft") goPrev();
        if (e.key === "ArrowRight") goNext();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goPrev, goNext, showQuickTag, showDetail]);

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

  // Comparison slider drag
  function onCompareDragStart(e: React.MouseEvent | React.TouchEvent) {
    draggingRef.current = true;
    e.preventDefault();
  }
  React.useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingRef.current || !compareRef.current) return;
      const rect = compareRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      setCompareSlider(pct);
    }
    function onUp() { draggingRef.current = false; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  async function handleQuickTagSubmit() {
    if (!quickTagInput.trim() || !onQuickTag) return;
    const newTags = [...image.tags, quickTagInput.trim()];
    await onQuickTag(image, newTags);
    setQuickTagInput("");
  }

  async function handleQuickTagRemove(tag: string) {
    if (!onQuickTag) return;
    const newTags = image.tags.filter((t) => t !== tag);
    await onQuickTag(image, newTags);
  }

  if (!image) return null;

  const prevImage = images[(index - 1 + images.length) % images.length];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex bg-black/92 backdrop-blur-sm"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 text-white/90">
          <div className="text-sm">
            <span className="font-medium">{image.originalName}</span>
            <span className="ml-3 text-white/50">
              {index + 1} / {images.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {images.length >= 2 && (
              <Button
                variant="ghost"
                size="icon"
                className={compareMode ? "text-accent hover:bg-white/10" : "text-white hover:bg-white/10"}
                onClick={() => setCompareMode((v) => !v)}
                aria-label="Compare with previous image"
                title="Compare with previous"
              >
                <SplitSquareHorizontal className="size-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={showQuickTag ? "text-accent hover:bg-white/10" : "text-white hover:bg-white/10"}
              onClick={() => { setShowQuickTag((v) => !v); setShowDetail(false); }}
              aria-label="Quick tag"
            >
              <Tag className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={showDetail ? "text-accent hover:bg-white/10" : "text-white hover:bg-white/10"}
              onClick={() => { setShowDetail((v) => !v); setShowQuickTag(false); }}
              aria-label="Image details"
            >
              <Info className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => downloadImage(image)} aria-label="Download">
              <Download className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={handleClose} aria-label="Close">
              <X className="size-5" />
            </Button>
          </div>
        </div>

        {/* Image area — uses dvh so height is always the visible viewport even
            on mobile browsers where the address bar shrinks/grows. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4 pb-2"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          {images.length > 1 && (
            <button
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 hover:scale-105"
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {compareMode ? (
            <div
              ref={compareRef}
              className="relative max-h-full max-w-full select-none overflow-hidden rounded-[var(--radius-md)] shadow-[var(--shadow-lg)]"
              style={{ userSelect: "none" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl(image, { width: LIGHTBOX_WIDTH })}
                alt={image.originalName}
                width={image.width || undefined}
                height={image.height || undefined}
                draggable={false}
                className="block h-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full"
              />
              <div
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${compareSlider}%` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(prevImage, { width: LIGHTBOX_WIDTH })}
                  alt={prevImage.originalName}
                  draggable={false}
                  className="absolute inset-0 block h-full w-auto max-w-none"
                  style={{ minWidth: `${10000 / compareSlider}%` }}
                />
              </div>
              {/* Divider */}
              <div
                className="absolute inset-y-0 z-10 flex items-center justify-center"
                style={{ left: `${compareSlider}%`, transform: "translateX(-50%)" }}
              >
                <div className="h-full w-0.5 bg-white/80" />
                <div
                  className="absolute flex size-8 cursor-col-resize items-center justify-center rounded-full bg-white shadow-[var(--shadow-md)]"
                  onMouseDown={onCompareDragStart}
                  onTouchStart={onCompareDragStart}
                >
                  <SplitSquareHorizontal className="size-4 text-black" />
                </div>
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={fileUrl(image, { width: LIGHTBOX_WIDTH })}
              alt={image.originalName}
              // width/height tell the browser the intrinsic aspect ratio before
              // the image finishes downloading — prevents layout jump that
              // misaligns the GSAP entrance animation.
              width={image.width || undefined}
              height={image.height || undefined}
              draggable={false}
              onError={(e) => {
                const el = e.currentTarget;
                if (el.dataset.fallback) return;
                el.dataset.fallback = "1";
                el.src = fileUrl(image);
              }}
              className="mx-auto my-auto block h-auto max-h-[calc(100dvh-12rem)] w-auto max-w-full rounded-[var(--radius-md)] object-contain shadow-[var(--shadow-lg)]"
            />
          )}

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

        {/* Footer info */}
        <div className="flex flex-wrap items-center justify-center gap-3 px-5 pb-4 text-xs text-white/60">
          <span>{formatDate(image.uploadedAt)}</span>
          <span>·</span>
          <span>{formatBytes(image.size)}</span>
          <span>·</span>
          <span className="uppercase">{image.ext}</span>
          <span>·</span>
          <span>{image.aspect}</span>
          {image.width && image.height && (
            <><span>·</span><span>{image.width}×{image.height}</span></>
          )}
          {image.tags.map((t) => (
            <Badge key={t} variant="secondary" className="bg-white/10 text-white">
              {t}
            </Badge>
          ))}
        </div>

        {/* Quick-tag floating panel */}
        {showQuickTag && (
          <div className="mx-auto mb-4 w-full max-w-md rounded-[var(--radius-lg)] border border-white/20 bg-black/80 p-4 backdrop-blur-md">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">Quick Tags</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {image.tags.length === 0 && (
                <span className="text-xs text-white/40">No tags yet</span>
              )}
              {image.tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleQuickTagRemove(t)}
                  className="flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-xs text-white transition hover:bg-white/20 hover:line-through"
                  title="Click to remove"
                >
                  {t}
                  <X className="size-2.5 opacity-60" />
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={quickTagInput}
                onChange={(e) => setQuickTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleQuickTagSubmit();
                  if (e.key === "Escape") setShowQuickTag(false);
                  e.stopPropagation();
                }}
                placeholder="Add tag…"
                className="flex-1 border-white/20 bg-white/10 text-white placeholder:text-white/40 focus:border-accent"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleQuickTagSubmit}
                disabled={!quickTagInput.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail side panel */}
      {showDetail && (
        <div className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-black/80 p-5 text-sm text-white/80">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-white">Details</h3>
            <button onClick={() => setShowDetail(false)} className="text-white/50 hover:text-white">
              <X className="size-4" />
            </button>
          </div>

          <DetailRow label="Name" value={image.originalName} />
          <DetailRow label="Size" value={formatBytes(image.size)} />
          <DetailRow label="Dimensions" value={`${image.width}×${image.height}`} />
          <DetailRow label="Format" value={image.ext.toUpperCase()} />
          <DetailRow label="Aspect" value={image.aspect} />
          <DetailRow label="Uploaded" value={formatDate(image.uploadedAt)} />
          {image.dominantColor && (
            <div className="mb-3">
              <p className="mb-1 text-xs text-white/40 uppercase tracking-wide">Dominant Color</p>
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full border border-white/20" style={{ backgroundColor: image.dominantColor }} />
                <span className="font-mono text-xs">{image.dominantColor}</span>
              </div>
            </div>
          )}
          {image.hash && (
            <div className="mb-3">
              <p className="mb-1 text-xs text-white/40 uppercase tracking-wide">SHA-256</p>
              <p className="break-all font-mono text-[10px] text-white/50">{image.hash}</p>
            </div>
          )}
          {image.exif && <ExifSection exif={image.exif} />}
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <p className="mb-0.5 text-xs text-white/40 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-white/90 break-words">{value}</p>
    </div>
  );
}

function ExifSection({ exif }: { exif: ExifData }) {
  const rows = [
    { label: "Camera", value: exif.camera },
    { label: "Lens", value: exif.lens },
    { label: "Focal length", value: exif.focalLength },
    { label: "Aperture", value: exif.aperture },
    { label: "Shutter", value: exif.shutterSpeed },
    { label: "ISO", value: exif.iso },
    { label: "Captured", value: exif.capturedAt },
  ].filter((r) => r.value);

  if (rows.length === 0) return null;

  return (
    <div className="mt-2 border-t border-white/10 pt-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/40">EXIF</p>
      {rows.map((r) => (
        <DetailRow key={r.label} label={r.label} value={r.value!} />
      ))}
    </div>
  );
}
