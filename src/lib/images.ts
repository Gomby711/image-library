import type { AspectBucket } from "./types";
import { ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES } from "./types";

const KNOWN_RATIOS: { bucket: AspectBucket; ratio: number }[] = [
  { bucket: "1:1", ratio: 1 },
  { bucket: "4:3", ratio: 4 / 3 },
  { bucket: "3:2", ratio: 3 / 2 },
  { bucket: "16:9", ratio: 16 / 9 },
  { bucket: "21:9", ratio: 21 / 9 },
  { bucket: "3:4", ratio: 3 / 4 },
  { bucket: "2:3", ratio: 2 / 3 },
  { bucket: "9:16", ratio: 9 / 16 },
];

const TOLERANCE = 0.035;

/** Buckets a raw width/height into the nearest common aspect ratio, or "custom"
 *  when nothing standard is close enough (e.g. a screenshot at an odd crop). */
export function classifyAspect(width: number, height: number): AspectBucket {
  if (!width || !height) return "custom";
  const ratio = width / height;
  let best: { bucket: AspectBucket; diff: number } | null = null;
  for (const known of KNOWN_RATIOS) {
    const diff = Math.abs(ratio - known.ratio) / known.ratio;
    if (!best || diff < best.diff) best = { bucket: known.bucket, diff };
  }
  if (best && best.diff <= TOLERANCE) return best.bucket;
  return "custom";
}

export function extensionFromFilename(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function isAcceptedExtension(ext: string): boolean {
  return ACCEPTED_EXTENSIONS.includes(ext.toLowerCase() as (typeof ACCEPTED_EXTENSIONS)[number]);
}

export function mimeForExtension(ext: string): string {
  return ACCEPTED_MIME_TYPES[ext.toLowerCase()] ?? "application/octet-stream";
}

export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",");
