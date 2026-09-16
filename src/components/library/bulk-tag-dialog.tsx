"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TagSelector } from "@/components/ui/tag-selector";
import { PRESET_TAGS } from "@/lib/types";
import { useCustomTags } from "@/hooks/use-custom-tags";

interface BulkTagDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onApply: (tags: string[]) => Promise<boolean> | boolean;
}

export function BulkTagDialog({ open, count, onClose, onApply }: BulkTagDialogProps) {
  const [tags, setTags] = React.useState<string[]>([]);
  const [applying, setApplying] = React.useState(false);
  const { tags: savedTags, noteTagUsed } = useCustomTags();

  React.useEffect(() => {
    if (open) setTags([]);
  }, [open]);

  const options = React.useMemo(
    () => Array.from(new Set([...PRESET_TAGS, ...savedTags])).sort((a, b) => a.localeCompare(b)),
    [savedTags]
  );

  async function handleApply() {
    if (tags.length === 0) return;
    setApplying(true);
    const ok = await onApply(tags);
    setApplying(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag {count} images</DialogTitle>
          <DialogDescription>
            These tags are added to every selected image — existing tags on each one are kept, not replaced.
          </DialogDescription>
        </DialogHeader>

        <TagSelector
          options={options}
          value={tags}
          onChange={setTags}
          onAddCustomTag={noteTagUsed}
          placeholder="e.g. acura"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying || tags.length === 0}>
            {applying ? "Applying…" : `Apply to ${count} images`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
