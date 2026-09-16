"use client";

import * as React from "react";
import type { WorkspaceRecord } from "@/lib/types";

/** Sidebar folders that group Library Page tabs — purely organizational,
 *  collapsing one just hides its member pages in the UI (see sidebar.tsx).
 *  Workspaces can nest inside one another via parentId. */
export function useWorkspaces() {
  const [workspaces, setWorkspaces] = React.useState<WorkspaceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      setWorkspaces(data.workspaces ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const createWorkspace = React.useCallback(async (name: string, parentId: string | null = null) => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parentId }),
    });
    if (res.ok) {
      const workspace: WorkspaceRecord = await res.json();
      setWorkspaces((prev) => [...prev, workspace]);
      return workspace;
    }
    return null;
  }, []);

  const renameWorkspace = React.useCallback(async (id: string, name: string) => {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const updated: WorkspaceRecord = await res.json();
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
    }
    return res.ok;
  }, []);

  const setWorkspaceEmoji = React.useCallback(async (id: string, emoji: string | null) => {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    if (res.ok) {
      const updated: WorkspaceRecord = await res.json();
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
    }
    return res.ok;
  }, []);

  // Nests (or un-nests, with null) a workspace under another — the server
  // refuses anything that would turn a workspace into its own descendant.
  const moveWorkspace = React.useCallback(async (id: string, parentId: string | null) => {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId }),
    });
    if (res.ok) {
      const updated: WorkspaceRecord = await res.json();
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
    }
    return res.ok;
  }, []);

  const deleteWorkspace = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    if (res.ok) await refresh(); // children may have been reparented server-side
    return res.ok;
  }, [refresh]);

  // Live drag feedback, mirrors previewReorderPages in use-library-pages.
  const previewReorderWorkspaces = React.useCallback((newOrderIds: string[]) => {
    setWorkspaces((prev) => {
      const byId = new Map(prev.map((w) => [w.id, w]));
      const reordered = newOrderIds.map((id) => byId.get(id)).filter((w): w is WorkspaceRecord => !!w);
      return reordered.length === prev.length ? reordered : prev;
    });
  }, []);

  const commitReorderWorkspaces = React.useCallback((newOrderIds: string[]) => {
    fetch("/api/workspaces/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: newOrderIds }),
    }).catch(() => {});
  }, []);

  return {
    workspaces,
    loading,
    createWorkspace,
    renameWorkspace,
    setWorkspaceEmoji,
    moveWorkspace,
    deleteWorkspace,
    previewReorderWorkspaces,
    commitReorderWorkspaces,
    refresh,
  };
}
