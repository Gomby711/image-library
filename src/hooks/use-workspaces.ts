"use client";

import * as React from "react";
import type { WorkspaceRecord } from "@/lib/types";

/** Sidebar folders that group Library Page tabs — purely organizational,
 *  collapsing one just hides its member pages in the UI (see sidebar.tsx). */
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

  const createWorkspace = React.useCallback(async (name: string) => {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
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

  const deleteWorkspace = React.useCallback(async (id: string) => {
    const res = await fetch(`/api/workspaces/${id}`, { method: "DELETE" });
    if (res.ok) setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    return res.ok;
  }, []);

  return { workspaces, loading, createWorkspace, renameWorkspace, deleteWorkspace, refresh };
}
