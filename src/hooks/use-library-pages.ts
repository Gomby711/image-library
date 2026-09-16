"use client";

import * as React from "react";
import type { LibraryPageRecord, PageIconName } from "@/lib/types";

export function useLibraryPages() {
  const [pages, setPages] = React.useState<LibraryPageRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/library-pages");
      const data = await res.json();
      setPages(data.pages ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const createPage = React.useCallback(
    async (name: string, tag: string | null, workspaceId: string | null = null) => {
      const res = await fetch("/api/library-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tag, workspaceId }),
      });
      if (res.ok) {
        const page: LibraryPageRecord = await res.json();
        setPages((prev) => [...prev, page]);
        return page;
      }
      return null;
    },
    []
  );

  // Changes which tag (if any) a page is filtered to — independent of its
  // name. Passing null clears the filter so the page shows every image.
  const setPageTag = React.useCallback(async (id: string, tag: string | null) => {
    const res = await fetch(`/api/library-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  const setPageIcon = React.useCallback(async (id: string, icon: PageIconName | null) => {
    const res = await fetch(`/api/library-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  // Reuses an existing library photo (dragged from the page's own grid) as
  // the hero — the image stays a normal library asset, nothing is added or
  // removed.
  const setPageHeroImage = React.useCallback(async (id: string, heroImageId: string | null) => {
    const res = await fetch(`/api/library-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ heroImageId }),
    });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  // Sets the hero to a file dropped in from outside the library (desktop /
  // file explorer). Uploaded straight to storage without ever becoming a
  // db.images entry, so it never shows up as a library asset in the grid.
  const uploadPageHero = React.useCallback(async (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/library-pages/${id}/hero`, { method: "POST", body: form });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  const clearPageHero = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/library-pages/${id}/hero`, { method: "DELETE" });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  // Repositions a page among its siblings (pages and workspaces share one
  // ordering space per parent) and, if it's moving into a different
  // workspace at the same time, reassigns that too — one PATCH either way.
  const reorderPage = React.useCallback(async (id: string, order: number, workspaceId: string | null) => {
    const res = await fetch(`/api/library-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, workspaceId }),
    });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  const renamePage = React.useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/library-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

  const deletePage = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/library-pages/${id}`, { method: "DELETE" });
    if (res.ok) setPages((prev) => prev.filter((p) => p.id !== id));
    return res.ok;
  }, []);

  return {
    pages,
    loading,
    createPage,
    renamePage,
    deletePage,
    setPageTag,
    setPageIcon,
    setPageHeroImage,
    uploadPageHero,
    clearPageHero,
    reorderPage,
    refresh,
  };
}
