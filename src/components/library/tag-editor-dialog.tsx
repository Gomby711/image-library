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
import type { ImageRecord } from "@/lib/types";

interface TagEditorDialogProps {
  image: ImageRecord | null;
  onClose: () => void;
  onSave: (id: string, tags: string[]) => Promise<boolean> | boolean;
}

export function TagEditorDialog({ image, onClose, onSave }: TagEditorDialogProps) {
  const [tags, setTags] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const { tags: savedTags, noteTagUsed } = useCustomTags();

  React.useEffect(() => {
    if (image) setTags(image.tags);
  }, [image]);

  const options = React.useMemo(
    () => Array.from(new Set([...PRESET_TAGS, ...savedTags])).sort((a, b) => a.localeCompare(b)),
    [savedTags]
  );

  async function handleSave() {
    if (!image) return;
    setSaving(true);
    const ok = await onSave(image.id, tags);
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tag image</DialogTitle>
          <DialogDescription>
            Click a tag below to select it, or type a custom one. Changes replace this image&apos;s current tags.
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save tags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
