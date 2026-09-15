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
import type { ImageRecord } from "@/lib/types";

interface TagEditorDialogProps {
  image: ImageRecord | null;
  onClose: () => void;
  onSave: (id: string, tags: string[]) => Promise<boolean> | boolean;
}

export function TagEditorDialog({ image, onClose, onSave }: TagEditorDialogProps) {
  const [tags, setTags] = React.useState<string[]>([]);
  const [customInput, setCustomInput] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (image) setTags(image.tags);
  }, [image]);

  function togglePreset(preset: string) {
    setTags((prev) => (prev.includes(preset) ? prev.filter((t) => t !== preset) : [...prev, preset]));
  }

  function addCustom() {
    const value = customInput.trim();
    if (!value) return;
    if (!tags.includes(value)) setTags((prev) => [...prev, value]);
    setCustomInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

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
            Label with a preset, or type your own — custom tags become searchable immediately.
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

          {tags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Applied tags</p>
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
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save tags"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
