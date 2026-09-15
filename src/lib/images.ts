import type { AspectBucket, ImageRecord } from "./types";
import { ACCEPTED_EXTENSIONS, ACCEPTED_MIME_TYPES, PRESET_TAGS } from "./types";

export const REFERENCE_TAG = "Reference Image";

/** Strips whitespace from a tag so it can drop into a filename segment —
 *  "C8 Corvette" -> "C8Corvette". */
function slugifyTag(tag: string): string {
  return tag.replace(/\s+/g, "");
}

/**
 * Reference-image naming convention: any image tagged "Reference Image"
 * is automatically named REF_<OtherTag>_<N> — where <OtherTag> is the next
 * tag on it (any future custom tag works the same way, not just presets),
 * and <N> is a running count so multiple reference shots of the same
 * subject/tag number up instead of colliding. Returns null when the image
 * isn't tagged "Reference Image" (name is then left alone).
 */
export function computeReferenceName(
  tags: string[],
  ext: string,
  siblings: Pick<ImageRecord, "id" | "originalName">[],
  selfId: string
): string | null {
  if (!tags.includes(REFERENCE_TAG)) return null;

  // "Reference Image" claims the REF_ slot itself, so among the *other*
  // tags a preset (Hero Card, Asset Image, ...) takes the naming slot
  // ahead of a custom tag — e.g. ["Reference Image", "Hero Banner", "C8
  // Corvette"] names as REF_HeroBanner_N, not REF_C8Corvette_N. Falls back
  // to whatever custom tag is there when no other preset is present.
  const others = tags.filter((t) => t !== REFERENCE_TAG);
  const otherTag =
    others.find((t) => (PRESET_TAGS as readonly string[]).includes(t)) ?? others[0];
  const prefix = otherTag ? `REF_${slugifyTag(otherTag)}_` : "REF_";
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)`, "i");

  let maxN = 0;
  for (const img of siblings) {
    if (img.id === selfId) continue;
    const match = img.originalName.match(pattern);
    if (match) maxN = Math.max(maxN, parseInt(match[1], 10));
  }

  return `${prefix}${maxN + 1}${ext ? `.${ext}` : ""}`;
}

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
