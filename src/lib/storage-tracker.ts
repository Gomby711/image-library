import { kvGet, kvPut } from "./kv";

export const STORAGE_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB
const BLOCK_THRESHOLD_BYTES = 490 * 1024 * 1024;      // block at 490 MB (98%)

function monthKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `storage-tracker:${y}-${m}`;
}

interface MonthlyUsage {
  bytes: number;
}

async function getUsage(): Promise<number> {
  const raw = await kvGet(monthKey());
  if (!raw) return 0;
  try {
    return (JSON.parse(raw) as MonthlyUsage).bytes ?? 0;
  } catch {
    return 0;
  }
}

/** Returns false + current usage when the upload should be blocked. */
export async function checkAndRecord(
  newBytes: number
): Promise<{ allowed: boolean; usedBytes: number; limitBytes: number }> {
  const usedBytes = await getUsage();
  if (usedBytes + newBytes > BLOCK_THRESHOLD_BYTES) {
    return { allowed: false, usedBytes, limitBytes: STORAGE_LIMIT_BYTES };
  }
  const updated: MonthlyUsage = { bytes: usedBytes + newBytes };
  await kvPut(monthKey(), JSON.stringify(updated));
  return { allowed: true, usedBytes: updated.bytes, limitBytes: STORAGE_LIMIT_BYTES };
}

export async function getStorageStats(): Promise<{
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  month: string;
}> {
  const usedBytes = await getUsage();
  return {
    usedBytes,
    limitBytes: STORAGE_LIMIT_BYTES,
    remainingBytes: Math.max(0, BLOCK_THRESHOLD_BYTES - usedBytes),
    month: monthKey(),
  };
}
