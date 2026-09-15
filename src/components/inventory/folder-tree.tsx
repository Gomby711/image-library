"use client";

import * as React from "react";
import { ChevronRight, Folder, FolderPlus, Images, Pencil, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FolderRecord } from "@/lib/types";

interface TreeNode extends FolderRecord {
  children: TreeNode[];
}

function buildTree(folders: FolderRecord[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(folders.map((f) => [f.id, { ...f, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const byName = (a: TreeNode, b: TreeNode) => a.name.localeCompare(b.name);
  const sortRec = (list: TreeNode[]) => {
    list.sort(byName);
    list.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function collectMatchIds(nodes: TreeNode[], query: string, ancestors: string[] = []): Set<string> {
  const result = new Set<string>();
  for (const node of nodes) {
    const path = [...ancestors, node.id];
    const selfMatches = node.name.toLowerCase().includes(query);
    const childMatches = collectMatchIds(node.children, query, path);
    if (selfMatches || childMatches.size > 0) {
      path.forEach((id) => result.add(id));
      childMatches.forEach((id) => result.add(id));
    }
  }
  return result;
}

interface FolderTreeProps {
  folders: FolderRecord[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (folder: FolderRecord) => void;
  onDelete: (folder: FolderRecord) => void;
  imageCounts: Map<string, number>;
}

export function FolderTree({ folders, selectedId, onSelect, onCreate, onRename, onDelete, imageCounts }: FolderTreeProps) {
  const [query, setQuery] = React.useState("");
  const tree = React.useMemo(() => buildTree(folders), [folders]);
  const visibleIds = React.useMemo(
    () => (query.trim() ? collectMatchIds(tree, query.trim().toLowerCase()) : null),
    [tree, query]
  );

  return (
    <div className="flex w-full flex-col gap-3 sm:w-72">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search folders…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Folders</p>
        <Button variant="ghost" size="sm" onClick={() => onCreate(null)}>
          <FolderPlus className="size-4" /> New
        </Button>
      </div>

      <button
        onClick={() => onSelect(null)}
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-sm transition-colors",
          selectedId === null ? "bg-accent text-accent-foreground" : "hover:bg-surface-2"
        )}
      >
        <Images className="size-4" /> All images
      </button>

      <div className="flex flex-col gap-0.5">
        {tree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            depth={0}
            selectedId={selectedId}
            visibleIds={visibleIds}
            onSelect={onSelect}
            onCreate={onCreate}
            onRename={onRename}
            onDelete={onDelete}
            imageCounts={imageCounts}
          />
        ))}
        {tree.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No folders yet — create one to start organizing.
          </p>
        )}
      </div>
    </div>
  );
}

function FolderNode({
  node,
  depth,
  selectedId,
  visibleIds,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  imageCounts,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  visibleIds: Set<string> | null;
  onSelect: (id: string | null) => void;
  onCreate: (parentId: string | null) => void;
  onRename: (folder: FolderRecord) => void;
  onDelete: (folder: FolderRecord) => void;
  imageCounts: Map<string, number>;
}) {
  const [open, setOpen] = React.useState(true);
  if (visibleIds && !visibleIds.has(node.id)) return null;

  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-[var(--radius-sm)] pr-1 text-sm transition-colors",
          selectedId === node.id ? "bg-accent text-accent-foreground" : "hover:bg-surface-2"
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        <button
          onClick={() => hasChildren && setOpen((v) => !v)}
          className={cn("shrink-0 rounded p-0.5", !hasChildren && "opacity-0")}
          aria-label="Toggle folder"
        >
          <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        </button>
        <button onClick={() => onSelect(node.id)} className="flex flex-1 items-center gap-1.5 py-1.5 text-left">
          <Folder className="size-4 shrink-0" />
          <span className="truncate">{node.name}</span>
          <span className="ml-auto shrink-0 text-[11px] opacity-60">{imageCounts.get(node.id) ?? 0}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={() => onCreate(node.id)} className="rounded p-1 hover:bg-background/30" aria-label="New subfolder">
            <FolderPlus className="size-3.5" />
          </button>
          <button onClick={() => onRename(node)} className="rounded p-1 hover:bg-background/30" aria-label="Rename folder">
            <Pencil className="size-3.5" />
          </button>
          <button onClick={() => onDelete(node)} className="rounded p-1 hover:bg-background/30" aria-label="Delete folder">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              visibleIds={visibleIds}
              onSelect={onSelect}
              onCreate={onCreate}
              onRename={onRename}
              onDelete={onDelete}
              imageCounts={imageCounts}
            />
          ))}
        </div>
      )}
    </div>
  );
}
