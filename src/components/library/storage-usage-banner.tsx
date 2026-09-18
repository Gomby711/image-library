"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, HardDrive } from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import type { StorageLevel } from "@/lib/storage-tracker";

interface StorageStats {
  usedBytes: number;
  limitBytes: number;
  warnBytes1: number;
  warnBytes2: number;
  blockBytes: number;
  level: StorageLevel;
}

/** Polls /api/storage and shows nothing until usage crosses the first
 *  warning threshold — the upload route itself is what actually pauses
 *  uploads at blockBytes, this is just the heads-up before that happens. */
export function StorageUsageBanner() {
  const [stats, setStats] = React.useState<StorageStats | null>(null);

  const refresh = React.useCallback(() => {
    fetch("/api/storage")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    refresh();
    // Uploads/deletes elsewhere on the page change usage without this
    // component re-mounting — a light poll keeps the banner from going
    // stale during a long session instead of only reflecting first load.
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!stats || stats.level === "ok") return null;

  const pct = Math.min(100, Math.round((stats.usedBytes / stats.limitBytes) * 100));
  const tone =
    stats.level === "blocked"
      ? {
          wrap: "border-destructive/40 bg-destructive/10 text-destructive",
          bar: "bg-destructive",
          label: "Uploads paused",
        }
      : stats.level === "critical"
        ? {
            wrap: "border-destructive/30 bg-destructive/5 text-destructive",
            bar: "bg-destructive",
            label: "Storage nearly full",
          }
        : {
            wrap: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
            bar: "bg-amber-500",
            label: "Storage getting full",
          };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm transition-colors duration-200",
        tone.wrap
      )}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={stats.level === "warning" ? "warning-icon" : "alert-icon"}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          {stats.level === "warning" ? <HardDrive className="size-4" /> : <AlertTriangle className="size-4" />}
        </motion.span>
      </AnimatePresence>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <AnimatePresence mode="wait">
            <motion.span
              key={tone.label}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className="font-medium"
            >
              {tone.label}
            </motion.span>
          </AnimatePresence>
          <span className="shrink-0 text-xs opacity-80">
            {formatBytes(stats.usedBytes)} / {formatBytes(stats.limitBytes)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div className={cn("h-full rounded-full transition-all", tone.bar)} style={{ width: `${pct}%` }} />
        </div>
        {stats.level === "blocked" && (
          <p className="mt-1 text-xs opacity-90">
            Uploads are paused until you free up space — delete some images to continue.
          </p>
        )}
      </div>
    </div>
  );
}
