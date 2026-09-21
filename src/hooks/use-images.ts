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
    async (files: File[], opts?: { folderId?: string | null; tags?: string[] }) => {
      if (files.length === 0) return;

      const BATCH_SIZE = 10;
      const batchStamp = `${Date.now()}-${Math.random()}`;
      const entries = files.map((file, i) => ({ id: `${batchStamp}-${i}`, file }));

      // Register every file in the UI immediately so all progress rows appear.
      setUploads((prev) => [
        ...prev,
        ...entries.map(({ id, file }) => ({ id, name: file.name, progress: 0, status: "uploading" as const })),
      ]);

      // Send in sequential batches of BATCH_SIZE — one server request and one
      // DB write per batch. Each batch handles its own dismiss timers so that
      // an earlier batch's rows clear even if a later one is still in-flight.
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const batchIds = new Set(batch.map((e) => e.id));

        try {
          const form = new FormData();
          batch.forEach(({ file }) => form.append("files", file));
          if (opts?.folderId) form.append("folderId", opts.folderId);
          if (opts?.tags?.length) form.append("tags", opts.tags.join(","));

          // 90-second hard timeout so a hung server request doesn't block the
          // loop forever and leave rows stuck in the uploading state.
          // AbortSignal.timeout is Chrome 103+ / Safari 16+; fall back to no
          // timeout on older browsers rather than crashing the upload.
          const timeoutSignal = typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(90_000)
            : undefined;
          const res = await fetch("/api/images", {
            method: "POST",
            body: form,
            signal: timeoutSignal,
          });

          if (res.ok) {
            let rejected: { name: string; reason: string }[] = [];
            try { rejected = (await res.json())?.rejected ?? []; } catch { /* ignore */ }
            const rejectedMap = new Map(rejected.map((r) => [r.name, r.reason]));

            // Compute done/err IDs synchronously before setUploads — React
            // state updaters run during render (async), so any push() inside
            // the updater is invisible to code running after the setUploads()
            // call, which would leave the dismiss Sets empty.
            const doneIds: string[] = [];
            const errIds: string[] = [];
            for (const { id, file } of batch) {
              if (rejectedMap.has(file.name)) errIds.push(id);
              else doneIds.push(id);
            }
            setUploads((prev) =>
              prev.map((u) => {
                if (!batchIds.has(u.id)) return u;
                const entry = batch.find((e) => e.id === u.id);
                const reason = entry ? rejectedMap.get(entry.file.name) : undefined;
                return reason
                  ? { ...u, progress: 100, status: "error" as const, error: reason }
                  : { ...u, progress: 100, status: "done" as const };
              })
            );
            refresh();
            // Dismiss done rows 1.8 s after this batch completes; keep errors
            // visible for 8 s so the user can read them.
            const doneSet = new Set(doneIds);
            const errSet = new Set(errIds);
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => !doneSet.has(u.id)));
            }, 1800);
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => !errSet.has(u.id)));
            }, 8000);
          } else {
            let message = "Upload failed";
            try { message = (await res.json())?.error ?? message; } catch { /* ignore */ }
            const ids = new Set(batch.map((e) => e.id));
            setUploads((prev) =>
              prev.map((u) =>
                ids.has(u.id) ? { ...u, progress: 100, status: "error" as const, error: message } : u
              )
            );
            setTimeout(() => {
              setUploads((prev) => prev.filter((u) => !ids.has(u.id)));
            }, 8000);
          }
        } catch (err) {
          const message = (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError"))
            ? "Upload timed out — try fewer files at once"
            : "Network error";
          const ids = new Set(batch.map((e) => e.id));
          setUploads((prev) =>
            prev.map((u) =>
              ids.has(u.id) ? { ...u, progress: 100, status: "error" as const, error: message } : u
            )
          );
          setTimeout(() => {
            setUploads((prev) => prev.filter((u) => !ids.has(u.id)));
          }, 8000);
        }
      }
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
