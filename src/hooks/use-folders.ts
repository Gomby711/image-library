"use client";

import * as React from "react";
import type { FolderRecord } from "@/lib/types";

export function useFolders() {
  const [folders, setFolders] = React.useState<FolderRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      setFolders(data.folders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const createFolder = React.useCallback(
    async (name: string, parentId: string | null) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId }),
      });
      if (res.ok) {
        const folder: FolderRecord = await res.json();
        setFolders((prev) => [...prev, folder]);
        return folder;
      }
      return null;
    },
    []
  );

  const renameFolder = React.useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/folders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated: FolderRecord = await res.json();
      setFolders((prev) => prev.map((f) => (f.id === id ? updated : f)));
    }
    return res.ok;
  }, []);

  const deleteFolder = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) await refresh();
    return res.ok;
  }, [refresh]);

  return { folders, loading, createFolder, renameFolder, deleteFolder, refresh };
}
