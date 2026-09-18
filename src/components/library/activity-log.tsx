"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityRecord } from "@/lib/types";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "Just now";
}

const KIND_COLOR: Record<string, string> = {
  upload: "bg-accent",
  delete: "bg-destructive",
  bulk_delete: "bg-destructive",
  rename: "bg-yellow-500",
  tag_add: "bg-green-500",
  tag_remove: "bg-orange-500",
  bulk_tag: "bg-purple-500",
};

interface ActivityLogProps {
  onClose: () => void;
}

export function ActivityLog({ onClose }: ActivityLogProps) {
  const [log, setLog] = React.useState<ActivityRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/activity?limit=50")
      .then((r) => r.json())
      .then((data) => setLog(data.log ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex w-72 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Activity Log</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">Loading…</div>
        )}
        {!loading && log.length === 0 && (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">No activity yet</div>
        )}
        {log.map((entry) => (
          <div key={entry.id} className="flex items-start gap-3 border-b border-border px-4 py-3">
            <span
              className={cn("mt-1.5 size-2 shrink-0 rounded-full", KIND_COLOR[entry.kind] ?? "bg-muted")}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{entry.description}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(entry.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
