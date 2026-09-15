"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BulkRemoveTagDialogProps {
  open: boolean;
  count: number;
  /** Union of every tag present across the selected images — the only
   *  tags there's anything to remove. */
  availableTags: string[];
  onClose: () => void;
  onApply: (tags: string[]) => Promise<boolean> | boolean;
}

export function BulkRemoveTagDialog({ open, count, availableTags, onClose, onApply }: BulkRemoveTagDialogProps) {
  const [picked, setPicked] = React.useState<string[]>([]);
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    if (open) setPicked([]);
  }, [open]);

  function toggle(tag: string) {
    setPicked((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleApply() {
    if (picked.length === 0) return;
    setApplying(true);
    const ok = await onApply(picked);
    setApplying(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove tags from {count} images</DialogTitle>
          <DialogDescription>
            Pick any tag below — it's removed from every selected image that has it. Images without a picked tag
            are left alone.
          </DialogDescription>
        </DialogHeader>

        {availableTags.length === 0 ? (
          <p className="text-sm text-muted-foreground">None of the selected images have any tags yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => toggle(tag)}
                className={cn(
                  "rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium transition-colors",
                  picked.includes(tag)
                    ? "border-destructive bg-destructive/15 text-destructive"
                    : "border-border bg-surface text-foreground hover:bg-surface-2"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {picked.length > 0 && (
          <div>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Will remove from all {count}
            </p>
            <div className="flex flex-wrap gap-2">
              {picked.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggle(tag)}
                    className="rounded-full p-0.5 hover:bg-background/40"
                    aria-label={`Keep ${tag}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleApply} disabled={applying || picked.length === 0}>
            {applying ? "Removing…" : `Remove from ${count} images`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
