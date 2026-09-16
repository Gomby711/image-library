"use client";

import * as React from "react";
import type { LibraryPageRecord } from "@/lib/types";

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

  const createPage = React.useCallback(async (name: string, tag: string, workspaceId: string | null = null) => {
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
  }, []);

  const setPageEmoji = React.useCallback(async (id: string, emoji: string | null) => {
    const res = await fetch(`/api/library-pages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const updated: LibraryPageRecord = await res.json();
      setPages((prev) => prev.map((p) => (p.id === id ? updated : p)));
    }
    return res.ok;
  }, []);

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
    setPageEmoji,
    setPageHeroImage,
    reorderPage,
    refresh,
  };
}
