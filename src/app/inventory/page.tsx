"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { FolderTree } from "@/components/inventory/folder-tree";
import { CreateFolderDialog } from "@/components/inventory/create-folder-dialog";
import { LibraryClient } from "@/components/library/library-client";
import { useFolders } from "@/hooks/use-folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FolderRecord, ImageRecord } from "@/lib/types";

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedFolderId = searchParams.get("folder");

  const { folders, createFolder, renameFolder, deleteFolder } = useFolders();
  const [imageCounts, setImageCounts] = React.useState<Map<string, number>>(new Map());
  const [createParentId, setCreateParentId] = React.useState<string | null | undefined>(undefined);
  const [renameTarget, setRenameTarget] = React.useState<FolderRecord | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  React.useEffect(() => {
    fetch("/api/images?pageSize=all")
      .then((r) => r.json())
      .then((data: { items: ImageRecord[] }) => {
        const counts = new Map<string, number>();
        data.items.forEach((img) => {
          if (img.folderId) counts.set(img.folderId, (counts.get(img.folderId) ?? 0) + 1);
        });
        setImageCounts(counts);
      })
      .catch(() => {});
  }, [selectedFolderId]);

  function select(id: string | null) {
    router.push(id ? `/inventory?folder=${id}` : "/inventory");
  }

  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;
  const parentForCreate = folders.find((f) => f.id === createParentId) ?? null;

  async function handleDelete(folder: FolderRecord) {
    if (!window.confirm(`Delete "${folder.name}" and all its subfolders? Images move back to Unfiled.`)) return;
    await deleteFolder(folder.id);
    if (selectedFolderId === folder.id) select(null);
  }

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="font-[var(--font-display)] text-2xl font-semibold">Inventory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize images into folders and nested subfolders — every folder name is searchable.
        </p>
      </div>

      <div className="flex flex-col gap-8 sm:flex-row">
        <FolderTree
          folders={folders}
          selectedId={selectedFolderId}
          onSelect={select}
          onCreate={(parentId) => setCreateParentId(parentId)}
          onRename={(folder) => {
            setRenameTarget(folder);
            setRenameValue(folder.name);
          }}
          onDelete={handleDelete}
          imageCounts={imageCounts}
        />

        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-medium">{selectedFolder ? selectedFolder.name : "All images"}</h2>
          </div>
          <LibraryClient folderId={selectedFolderId} />
        </div>
      </div>

      <CreateFolderDialog
        open={createParentId !== undefined}
        parentName={parentForCreate?.name ?? null}
        onClose={() => setCreateParentId(undefined)}
        onCreate={(name) => createFolder(name, createParentId ?? null)}
      />

      <Dialog open={!!renameTarget} onOpenChange={(v) => !v && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename folder</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === "Enter" && renameTarget && renameValue.trim()) {
                await renameFolder(renameTarget.id, renameValue.trim());
                setRenameTarget(null);
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (renameTarget && renameValue.trim()) {
                  await renameFolder(renameTarget.id, renameValue.trim());
                  setRenameTarget(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
