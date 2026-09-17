import { kvGet, kvPut } from "./kv";
import { readDb } from "./db";

const USAGE_KEY = "storage-usage";

// Vercel Blob's free Hobby-plan tier is 1 GB of storage. Going over it
// doesn't just block new uploads -- it blocks ALL Blob access (including
// viewing existing images) for 30 days. These thresholds stay well under
// that ceiling so there's room to react before anything breaks.
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB (Vercel Blob Hobby free tier)
export const WARN_BYTES_1 = 800 * 1024 * 1024; // first warning
export const WARN_BYTES_2 = 900 * 1024 * 1024; // second, more urgent warning
export const BLOCK_BYTES = 950 * 1024 * 1024; // uploads pause here

export type StorageLevel = "ok" | "warning" | "critical" | "blocked";

interface UsageState {
  bytes: number;
}

async function computeBootstrapBytes(): Promise<number> {
  const db = await readDb();
  return db.images.reduce((sum, img) => sum + (img.size || 0), 0);
}

async function getUsage(): Promise<number> {
  const raw = await kvGet(USAGE_KEY);
  if (raw) {
    try {
      return (JSON.parse(raw) as UsageState).bytes ?? 0;
    } catch {
      return 0;
    }
  }
  // No counter yet: bootstrap it from the real total of everything already
  // stored (summed from the image catalog) instead of starting from a false
  // "0 used" that would let uploads sail straight past actual Blob usage.
  const bootstrapBytes = await computeBootstrapBytes();
  await kvPut(USAGE_KEY, JSON.stringify({ bytes: bootstrapBytes } satisfies UsageState));
  return bootstrapBytes;
}

async function setUsage(bytes: number): Promise<void> {
  await kvPut(USAGE_KEY, JSON.stringify({ bytes: Math.max(0, bytes) } satisfies UsageState));
}

function levelFor(usedBytes: number): StorageLevel {
  if (usedBytes >= BLOCK_BYTES) return "blocked";
  if (usedBytes >= WARN_BYTES_2) return "critical";
  if (usedBytes >= WARN_BYTES_1) return "warning";
  return "ok";
}

/** Reserves `newBytes` against the budget before an upload proceeds.
 *  Returns allowed:false (reserving nothing) if it would push usage at or
 *  past BLOCK_BYTES. Callers should reconcile with `adjustBytes` once the
 *  real outcome (bytes actually written) is known -- e.g. some files in a
 *  batch get rejected, or the whole write later gets rolled back. */
export async function reserveBytes(newBytes: number): Promise<{ allowed: boolean; usedBytes: number }> {
  const usedBytes = await getUsage();
  if (usedBytes + newBytes > BLOCK_BYTES) {
    return { allowed: false, usedBytes };
  }
  await setUsage(usedBytes + newBytes);
  return { allowed: true, usedBytes: usedBytes + newBytes };
}

/** Adjusts the running total directly -- positive to add (e.g. a hero
 *  upload that doesn't need a block check), negative to release (a delete,
 *  or correcting an earlier over-reservation). Never drops below zero. */
export async function adjustBytes(delta: number): Promise<void> {
  if (delta === 0) return;
  const usedBytes = await getUsage();
  await setUsage(usedBytes + delta);
}

export async function getStorageStats(): Promise<{
  usedBytes: number;
  limitBytes: number;
  warnBytes1: number;
  warnBytes2: number;
  blockBytes: number;
  level: StorageLevel;
}> {
  const usedBytes = await getUsage();
  return {
    usedBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    warnBytes1: WARN_BYTES_1,
    warnBytes2: WARN_BYTES_2,
    blockBytes: BLOCK_BYTES,
    level: levelFor(usedBytes),
  };
}
