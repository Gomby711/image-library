"use client";

import * as React from "react";
import type { PageIconName, WorkspaceRecord } from "@/lib/types";

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

  const setWorkspaceIcon = React.useCallback(async (id: string, icon: PageIconName | null) => {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ icon }),
    });
    if (res.ok) {
      const updated: WorkspaceRecord = await res.json();
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? updated : w)));
    }
    return res.ok;
  }, []);

  // Repositions a workspace among its siblings (pages and workspaces share
  // one ordering space per parent) and, if it's moving into a different
  // parent workspace at the same time, reassigns that too.
  const reorderWorkspace = React.useCallback(async (id: string, order: number, parentId: string | null) => {
    const res = await fetch(`/api/workspaces/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order, parentId }),
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

  return {
    workspaces,
    loading,
    createWorkspace,
    renameWorkspace,
    setWorkspaceIcon,
    reorderWorkspace,
    deleteWorkspace,
    refresh,
  };
}
