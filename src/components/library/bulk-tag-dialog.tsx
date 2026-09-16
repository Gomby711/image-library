"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PRESET_TAGS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCustomTags } from "@/hooks/use-custom-tags";

interface BulkTagDialogProps {
  open: boolean;
  count: number;
  onClose: () => void;
  onApply: (tags: string[]) => Promise<boolean> | boolean;
}

export function BulkTagDialog({ open, count, onClose, onApply }: BulkTagDialogProps) {
  const [tags, setTags] = React.useState<string[]>([]);
  const [customInput, setCustomInput] = React.useState("");
  const [applying, setApplying] = React.useState(false);
  const { tags: savedTags, noteTagUsed } = useCustomTags();

  React.useEffect(() => {
    if (open) {
      setTags([]);
      setCustomInput("");
    }
  }, [open]);

  function togglePreset(preset: string) {
    setTags((prev) => (prev.includes(preset) ? prev.filter((t) => t !== preset) : [...prev, preset]));
  }

  function addCustom() {
    const value = customInput.trim();
    if (!value) return;
    if (!tags.includes(value)) setTags((prev) => [...prev, value]);
    noteTagUsed(value);
    setCustomInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function addSaved(tag: string) {
    if (!tags.includes(tag)) setTags((prev) => [...prev, tag]);
  }

  const pickableSavedTags = savedTags.filter(
    (t) => !tags.includes(t) && !(PRESET_TAGS as readonly string[]).includes(t)
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

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Presets</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => togglePreset(preset)}
                  className={cn(
                    "rounded-[var(--radius-sm)] border px-2.5 py-1 text-xs font-medium transition-colors",
                    tags.includes(preset)
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-surface text-foreground hover:bg-surface-2"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Custom tag</p>
            <div className="flex gap-2">
              <Input
                placeholder="e.g. acura"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon" onClick={addCustom} aria-label="Add tag">
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          {pickableSavedTags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Saved tags — click to reuse
              </p>
              <div className="flex flex-wrap gap-2">
                {pickableSavedTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addSaved(tag)}
                    className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-2"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Will add to all {count}
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="rounded-full p-0.5 hover:bg-background/40"
                      aria-label={`Remove ${tag}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

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
