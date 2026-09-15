"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { ImageRecord } from "@/lib/types";

interface RenameImageDialogProps {
  image: ImageRecord | null;
  onClose: () => void;
  onSave: (id: string, name: string) => Promise<boolean> | boolean;
}

export function RenameImageDialog({ image, onClose, onSave }: RenameImageDialogProps) {
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (image) setName(image.originalName);
  }, [image]);

  async function handleSave() {
    if (!image || !name.trim()) return;
    setSaving(true);
    const ok = await onSave(image.id, name.trim());
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Dialog open={!!image} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename image</DialogTitle>
          <DialogDescription>This changes the display name only — the file on disk is untouched.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="image-name">Name</Label>
          <Input
            id="image-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
