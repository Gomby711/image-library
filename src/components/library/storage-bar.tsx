"use client";

import * as React from "react";
import { cn, formatBytes } from "@/lib/utils";

interface StorageStats {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  month: string;
}

export function StorageBar() {
  const [stats, setStats] = React.useState<StorageStats | null>(null);

  React.useEffect(() => {
    fetch("/api/storage")
      .then((r) => r.json())
      .then((data: StorageStats) => setStats(data))
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const pct = Math.min(100, (stats.usedBytes / stats.limitBytes) * 100);
  const isWarning = pct >= 60;
  const isDanger = pct >= 80;

  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Monthly upload storage</span>
        <span>
          {formatBytes(stats.usedBytes)} <span className="opacity-50">/</span> {formatBytes(stats.limitBytes)}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isDanger ? "bg-destructive" : isWarning ? "bg-yellow-500" : "bg-accent"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isDanger && (
        <p className="text-[11px] text-destructive">
          Storage nearly full — {formatBytes(stats.remainingBytes)} remaining this month.
        </p>
      )}
    </div>
  );
}
