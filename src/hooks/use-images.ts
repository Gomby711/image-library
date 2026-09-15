"use client";

import * as React from "react";
import type { ImageRecord, PageSize, SortKey } from "@/lib/types";

export interface ImageFilters {
  search: string;
  sort: SortKey;
  tag?: string | null; // exact-match tag lock, used by custom Library Pages
  page: number;
  pageSize: PageSize;
}

interface ListResponse {
  items: ImageRecord[];
  total: number;
}

export interface UploadProgressItem {
  id: string;
  name: string;
  progress: number; // 0-100
  status: "uploading" | "done" | "error";
  error?: string;
}

export function useImages(filters: ImageFilters) {
  const [items, setItems] = React.useState<ImageRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [uploads, setUploads] = React.useState<UploadProgressItem[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("sort", filters.sort);
    params.set("page", String(filters.page));
    params.set("pageSize", String(filters.pageSize));
    if (filters.search) params.set("search", filters.search);
    if (filters.tag) params.set("tag", filters.tag);
    try {
      const res = await fetch(`/api/images?${params.toString()}`);
      const data: ListResponse = await res.json();
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters.sort, filters.page, filters.pageSize, filters.search, filters.tag]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = React.useCallback(
    (files: File[], opts?: { folderId?: string | null; tags?: string[] }) => {
      files.forEach((file) => {
        const uploadId = `${file.name}-${Date.now()}-${Math.random()}`;
        setUploads((prev) => [...prev, { id: uploadId, name: file.name, progress: 0, status: "uploading" }]);

        const form = new FormData();
        form.append("files", file);
        if (opts?.folderId) form.append("folderId", opts.folderId);
        if (opts?.tags?.length) form.append("tags", opts.tags.join(","));

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/images");
        xhr.upload.onprogress = (e) => {
          if (!e.lengthComputable) return;
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress } : u)));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploads((prev) => prev.map((u) => (u.id === uploadId ? { ...u, progress: 100, status: "done" } : u)));
            refresh();
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => u.id !== uploadId));
            }, 1800);
          } else {
            let message = "Upload failed";
            try {
              message = JSON.parse(xhr.responseText)?.rejected?.[0]?.reason ?? message;
            } catch {
              // ignore parse errors
            }
            setUploads((prev) =>
              prev.map((u) => (u.id === uploadId ? { ...u, status: "error", error: message } : u))
            );
          }
        };
        xhr.onerror = () => {
          setUploads((prev) =>
            prev.map((u) => (u.id === uploadId ? { ...u, status: "error", error: "Network error" } : u))
          );
        };
        xhr.send(form);
      });
    },
    [refresh]
  );

  const updateImage = React.useCallback(
    async (id: string, patch: { tags?: string[]; folderId?: string | null; originalName?: string }) => {
      const res = await fetch(`/api/images/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated: ImageRecord = await res.json();
        setItems((prev) => prev.map((img) => (img.id === id ? updated : img)));
      }
      return res.ok;
    },
    []
  );

  // Live drag feedback: reorders the in-memory list only, no network call —
  // called on every drag-over so the grid visibly shuffles as you drag.
  const previewReorder = React.useCallback((newOrderIds: string[]) => {
    setItems((prev) => {
      const byId = new Map(prev.map((img) => [img.id, img]));
      const reordered = newOrderIds.map((id) => byId.get(id)).filter((img): img is ImageRecord => !!img);
      return reordered.length === prev.length ? reordered : prev;
    });
  }, []);

  // Persists the current order to disk — called once on drop, not per drag-over.
  const commitReorder = React.useCallback((newOrderIds: string[]) => {
    fetch("/api/images/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newOrderIds }),
    }).catch(() => {});
  }, []);

  const bulkEditTags = React.useCallback(
    async (ids: string[], edit: { addTags?: string[]; removeTags?: string[] }) => {
      const res = await fetch("/api/images/bulk-tag", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, ...edit }),
      });
      if (res.ok) {
        const { updated }: { updated: ImageRecord[] } = await res.json();
        const byId = new Map(updated.map((img) => [img.id, img]));
        setItems((prev) => prev.map((img) => byId.get(img.id) ?? img));
      }
      return res.ok;
    },
    []
  );

  const bulkAddTags = React.useCallback(
    (ids: string[], addTags: string[]) => bulkEditTags(ids, { addTags }),
    [bulkEditTags]
  );

  const bulkRemoveTags = React.useCallback(
    (ids: string[], removeTags: string[]) => bulkEditTags(ids, { removeTags }),
    [bulkEditTags]
  );

  const deleteImage = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((img) => img.id !== id));
      setTotal((t) => Math.max(0, t - 1));
    }
    return res.ok;
  }, []);

  return {
    items,
    total,
    loading,
    uploads,
    upload,
    updateImage,
    bulkAddTags,
    bulkRemoveTags,
    deleteImage,
    previewReorder,
    commitReorder,
    refresh,
  };
}
