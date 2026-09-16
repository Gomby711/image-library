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
  // Flipping page/pageSize/sort quickly (or switching "Show all" back to a
  // small page size) used to fire overlapping requests with no guarantee
  // they'd resolve in order — a slower earlier request landing after a
  // faster later one would silently overwrite it with stale items/total,
  // which is what made pagination look like it "didn't adjust" or briefly
  // showed the wrong page's images. Only the most recently *fired* request
  // is ever applied.
  const requestIdRef = React.useRef(0);

  const refresh = React.useCallback(async () => {
    const requestId = ++requestIdRef.current;
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
      if (requestId !== requestIdRef.current) return;
      setItems(data.items);
      setTotal(data.total);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [filters.sort, filters.page, filters.pageSize, filters.search, filters.tag]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const upload = React.useCallback(
    (files: File[], opts?: { folderId?: string | null; tags?: string[] }) => {
      if (files.length === 0) return;

      // Register all files in the UI immediately so progress bars appear.
      const batchStamp = `${Date.now()}-${Math.random()}`;
      const ids = files.map((_, i) => `${batchStamp}-${i}`);
      setUploads((prev) => [
        ...prev,
        ...files.map((file, i) => ({ id: ids[i], name: file.name, progress: 0, status: "uploading" as const })),
      ]);

      // Send all files in ONE request so the server issues a single KV write
      // instead of racing N concurrent writes across Vercel isolates (which
      // causes most of the batch to silently fail against the KV rate limit).
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      if (opts?.folderId) form.append("folderId", opts.folderId);
      if (opts?.tags?.length) form.append("tags", opts.tags.join(","));

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/images");

      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return;
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploads((prev) => prev.map((u) => (ids.includes(u.id) ? { ...u, progress } : u)));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let rejected: { name: string; reason: string }[] = [];
          try {
            rejected = JSON.parse(xhr.responseText)?.rejected ?? [];
          } catch {
            // ignore parse errors
          }
          const rejectedMap = new Map(rejected.map((r) => [r.name, r.reason]));

          setUploads((prev) =>
            prev.map((u, _) => {
              if (!ids.includes(u.id)) return u;
              const reason = rejectedMap.get(u.name);
              if (reason) return { ...u, progress: 100, status: "error" as const, error: reason };
              return { ...u, progress: 100, status: "done" as const };
            })
          );

          refresh();

          setTimeout(() => {
            // Keep errored items visible; remove the successfully uploaded ones.
            setUploads((prev) => prev.filter((u) => !ids.includes(u.id) || u.status === "error"));
          }, 1800);
        } else {
          let message = "Upload failed";
          try {
            message = JSON.parse(xhr.responseText)?.error ?? message;
          } catch {
            // ignore parse errors
          }
          setUploads((prev) =>
            prev.map((u) => (ids.includes(u.id) ? { ...u, status: "error" as const, error: message } : u))
          );
        }
      };

      xhr.onerror = () => {
        setUploads((prev) =>
          prev.map((u) => (ids.includes(u.id) ? { ...u, status: "error" as const, error: "Network error" } : u))
        );
      };

      xhr.send(form);
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

  // Deletes re-fetch the current page from the server (via refresh()) rather
  // than just patching `items`/`total` locally. A local-only patch shrinks
  // the *visible* page without pulling in the next item to backfill it, so
  // the page would silently show fewer than pageSize images — and total/
  // pagination could drift out of sync with what the grid actually shows.
  // Refetching keeps both always correct after any add/delete.
  const deleteImage = React.useCallback(
    async (id: string) => {
      const res = await fetch(`/api/images/${id}`, { method: "DELETE" });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  const bulkDelete = React.useCallback(
    async (ids: string[]) => {
      const res = await fetch("/api/images/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) await refresh();
      return res.ok;
    },
    [refresh]
  );

  return {
    items,
    total,
    loading,
    uploads,
    upload,
    updateImage,
    bulkAddTags,
    bulkRemoveTags,
    bulkDelete,
    deleteImage,
    previewReorder,
    commitReorder,
    refresh,
  };
}
