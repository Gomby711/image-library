"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderPlus,
  Images,
  LibraryBig,
  LogOut,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLibraryPages } from "@/hooks/use-library-pages";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { TextRoll } from "@/components/ui/text-roll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EMOJI_ICON_OPTIONS, type LibraryPageRecord, type WorkspaceRecord } from "@/lib/types";

const NAV = [{ href: "/", label: "Library", icon: Images }];
const WORKSPACE_COLLAPSE_KEY = "luminary-sidebar-workspace-collapsed";
const INDENT_PX = 16;

type DragItem = { kind: "page" | "workspace"; id: string };
type DropIntent = { mode: "reorder"; position: "before" | "after" } | { mode: "into"; workspaceId: string | null };
type DropTarget = { kind: "page" | "workspace" | "root"; id: string; intent: DropIntent };
/** One sibling in a unified page+workspace ordering list — see
 *  getSiblings below. */
type SiblingRef = { kind: "page" | "workspace"; id: string; order: number };

/** Small icon button that opens a grid of vehicle emoji to pick from —
 *  used for both library pages and workspaces. Nested inside a draggable
 *  row, so every handler stops propagation to avoid also navigating,
 *  toggling a workspace's collapse, or starting a drag. */
function EmojiPickerButton({
  emoji,
  fallbackIcon,
  isCustom,
  label,
  onPick,
}: {
  emoji: string | null;
  fallbackIcon?: React.ReactNode;
  isCustom: boolean;
  label: string;
  onPick: (emoji: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          draggable={false}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label={`Choose icon for ${label}`}
          title="Choose icon"
          className="flex size-[18px] shrink-0 items-center justify-center rounded transition-transform hover:scale-110"
        >
          {emoji ? <span className="text-[15px] leading-none">{emoji}</span> : fallbackIcon}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" onCloseAutoFocus={(e) => e.preventDefault()}>
        <DropdownMenuLabel>Choose an icon</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-6 gap-1 p-1">
          {EMOJI_ICON_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick(option);
              }}
              className={cn(
                "flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-lg transition-colors hover:bg-surface-2",
                emoji === option && "bg-accent/15 ring-1 ring-accent"
              )}
            >
              {option}
            </button>
          ))}
        </div>
        {isCustom && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPick(null);
              }}
            >
              Use default icon
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const [createPageOpen, setCreatePageOpen] = React.useState(false);
  const [createPageParentId, setCreatePageParentId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<LibraryPageRecord | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = React.useState(false);
  const [createWorkspaceParentId, setCreateWorkspaceParentId] = React.useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creatingWorkspace, setCreatingWorkspace] = React.useState(false);
  const [renameWorkspaceTarget, setRenameWorkspaceTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [renameWorkspaceValue, setRenameWorkspaceValue] = React.useState("");
  const [renamingWorkspace, setRenamingWorkspace] = React.useState(false);

  const [collapsedWorkspaces, setCollapsedWorkspaces] = React.useState<Record<string, boolean>>({});

  const {
    pages,
    createPage,
    renamePage,
    deletePage,
    setPageEmoji,
    reorderPage,
  } = useLibraryPages();
  const {
    workspaces,
    createWorkspace,
    renameWorkspace,
    setWorkspaceEmoji,
    reorderWorkspace,
    deleteWorkspace,
  } = useWorkspaces();

  // Drag-and-drop: one dragged item at a time, tracked in a ref (not state —
  // it doesn't need to trigger renders), and one "current drop target" in
  // state that drives the blue insertion-line / nest-highlight indicators.
  const dragItemRef = React.useRef<DragItem | null>(null);
  const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null);

  // Expanding the collapsed rail animates its width over 200ms; page names
  // wrap onto multiple lines, and letting that text render (and re-wrap)
  // while the box is still narrower than its final width made every row's
  // height jump around mid-transition — the "spasming" hover highlight and
  // text. Showing the text only once the width transition has actually
  // finished avoids any reflow happening while the box is an intermediate
  // size. Collapsing hides the text immediately, before the box shrinks, for
  // the same reason.
  const [textVisible, setTextVisible] = React.useState(!collapsed);
  const asideRef = React.useRef<HTMLElement>(null);
  const didMountRef = React.useRef(false);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      setTextVisible(!collapsed);
      return;
    }
    if (collapsed) {
      setTextVisible(false);
      return;
    }
    const el = asideRef.current;
    if (!el) {
      setTextVisible(true);
      return;
    }
    let done = false;
    function onEnd(e: TransitionEvent) {
      if (e.propertyName === "width") {
        done = true;
        setTextVisible(true);
      }
    }
    el.addEventListener("transitionend", onEnd);
    const fallback = setTimeout(() => {
      if (!done) setTextVisible(true);
    }, 240);
    return () => {
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(fallback);
    };
  }, [collapsed]);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("luminary-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
      const storedWorkspaces = window.localStorage.getItem(WORKSPACE_COLLAPSE_KEY);
      if (storedWorkspaces) setCollapsedWorkspaces(JSON.parse(storedWorkspaces));
    } catch {
      // ignore
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem("luminary-sidebar-collapsed", next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  function toggleWorkspaceCollapsed(id: string) {
    setCollapsedWorkspaces((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(WORKSPACE_COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const allLinks = [
    ...NAV,
    ...pages.map((p) => ({ href: `/library/${p.id}`, label: p.name, icon: LibraryBig })),
  ];
  const activeHref = allLinks.find((item) =>
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  )?.href;

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function openCreatePage(parentId: string | null) {
    setCreatePageParentId(parentId);
    setCreatePageOpen(true);
  }

  async function handleCreatePage() {
    if (!newName.trim()) return;
    setCreating(true);
    // The page's tag is just its name — creating "Car Images Library" makes a
    // "Car Images Library" tag; tag any image with it to show it on this page.
    const page = await createPage(newName.trim(), newName.trim(), createPageParentId);
    setCreating(false);
    if (page) {
      setCreatePageOpen(false);
      setNewName("");
      router.push(`/library/${page.id}`);
    }
  }

  async function handleRenamePage() {
    if (!renameTarget || !renameValue.trim()) return;
    setRenaming(true);
    await renamePage(renameTarget.id, renameValue.trim());
    setRenaming(false);
    setRenameTarget(null);
  }

  async function handleDeletePage(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Remove this library page? Images and tags are untouched.")) return;
    await deletePage(id);
    if (pathname === `/library/${id}`) router.push("/");
  }

  function openCreateWorkspace(parentId: string | null) {
    setCreateWorkspaceParentId(parentId);
    setCreateWorkspaceOpen(true);
  }

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return;
    setCreatingWorkspace(true);
    const workspace = await createWorkspace(newWorkspaceName.trim(), createWorkspaceParentId);
    setCreatingWorkspace(false);
    if (workspace) {
      setCreateWorkspaceOpen(false);
      setNewWorkspaceName("");
      if (createWorkspaceParentId) setCollapsedWorkspaces((prev) => ({ ...prev, [createWorkspaceParentId]: false }));
    }
  }

  async function handleRenameWorkspace() {
    if (!renameWorkspaceTarget || !renameWorkspaceValue.trim()) return;
    setRenamingWorkspace(true);
    await renameWorkspace(renameWorkspaceTarget.id, renameWorkspaceValue.trim());
    setRenamingWorkspace(false);
    setRenameWorkspaceTarget(null);
  }

  async function handleDeleteWorkspace(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Remove the "${name}" workspace? Its contents move up one level — nothing is deleted.`)) return;
    await deleteWorkspace(id);
  }

  // --- Drag and drop -------------------------------------------------
  //
  // Pages and workspaces share one ordering space per parent container
  // (root, or inside a given workspace) via each record's numeric `order`.
  // Rendering sorts by it, so a page and a workspace can sit in any order
  // relative to each other — dragging one above or below the other is just
  // picking a new `order` value, using the classic "midpoint between the
  // two neighbors" trick (fractional indexing) so moving one item never
  // requires touching any of its siblings.

  function wouldCreateCycle(dragWorkspaceId: string, candidateParentId: string): boolean {
    let cur: string | null = candidateParentId;
    while (cur) {
      if (cur === dragWorkspaceId) return true;
      cur = workspaces.find((w) => w.id === cur)?.parentId ?? null;
    }
    return false;
  }

  function getSiblings(containerId: string | null, excludeId?: string): SiblingRef[] {
    const ws: SiblingRef[] = workspaces
      .filter((w) => w.parentId === containerId && w.id !== excludeId)
      .map((w) => ({ kind: "workspace", id: w.id, order: w.order }));
    const pg: SiblingRef[] = pages
      .filter((p) => p.workspaceId === containerId && p.id !== excludeId)
      .map((p) => ({ kind: "page", id: p.id, order: p.order }));
    return [...ws, ...pg].sort((a, b) => a.order - b.order);
  }

  function appendOrder(containerId: string | null, excludeId?: string): number {
    const siblings = getSiblings(containerId, excludeId);
    return siblings.length > 0 ? siblings[siblings.length - 1].order + 1 : 0;
  }

  function orderRelativeTo(
    containerId: string | null,
    targetId: string,
    position: "before" | "after",
    excludeId: string
  ): number {
    const siblings = getSiblings(containerId, excludeId);
    const idx = siblings.findIndex((s) => s.id === targetId);
    if (idx === -1) return appendOrder(containerId, excludeId);
    const target = siblings[idx];
    if (position === "before") {
      const prev = siblings[idx - 1];
      return prev ? (prev.order + target.order) / 2 : target.order - 1;
    }
    const next = siblings[idx + 1];
    return next ? (target.order + next.order) / 2 : target.order + 1;
  }

  // Any row (page or workspace) offers "reorder before/after" from its own
  // top/bottom edge; a workspace additionally offers "move into it" from
  // its middle band, since only workspaces can contain other rows.
  function computeIntent(targetKind: "page" | "workspace", targetId: string, ratio: number): DropIntent {
    if (targetKind === "page") return { mode: "reorder", position: ratio <= 0.5 ? "before" : "after" };
    if (ratio < 0.25) return { mode: "reorder", position: "before" };
    if (ratio > 0.75) return { mode: "reorder", position: "after" };
    return { mode: "into", workspaceId: targetId };
  }

  async function applyDrop(drag: DragItem, target: DropTarget) {
    const { intent } = target;

    if (intent.mode === "into") {
      if (drag.id === intent.workspaceId) return;
      if (drag.kind === "page") {
        await reorderPage(drag.id, appendOrder(intent.workspaceId, drag.id), intent.workspaceId);
      } else if (intent.workspaceId === null || !wouldCreateCycle(drag.id, intent.workspaceId)) {
        await reorderWorkspace(drag.id, appendOrder(intent.workspaceId, drag.id), intent.workspaceId);
      }
      return;
    }

    const destContainer =
      target.kind === "page"
        ? (pages.find((p) => p.id === target.id)?.workspaceId ?? null)
        : (workspaces.find((w) => w.id === target.id)?.parentId ?? null);

    if (drag.kind === "workspace") {
      if (destContainer === drag.id) return;
      if (destContainer !== null && wouldCreateCycle(drag.id, destContainer)) return;
    }

    const order = orderRelativeTo(destContainer, target.id, intent.position, drag.id);
    if (drag.kind === "page") {
      await reorderPage(drag.id, order, destContainer);
    } else {
      await reorderWorkspace(drag.id, order, destContainer);
    }
  }

  function dragSourceProps(kind: DragItem["kind"], id: string) {
    return {
      draggable: true,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        dragItemRef.current = { kind, id };
      },
      onDragEnd: () => {
        dragItemRef.current = null;
        setDropTarget(null);
      },
    };
  }

  function dropTargetProps(targetKind: "page" | "workspace", targetId: string) {
    return {
      onDragOver: (e: React.DragEvent) => {
        const drag = dragItemRef.current;
        if (!drag || drag.id === targetId) return;
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = (e.clientY - rect.top) / rect.height;
        const intent = computeIntent(targetKind, targetId, ratio);
        if (drag.kind === "workspace") {
          const destParent =
            intent.mode === "into"
              ? intent.workspaceId
              : targetKind === "workspace"
                ? (workspaces.find((w) => w.id === targetId)?.parentId ?? null)
                : (pages.find((p) => p.id === targetId)?.workspaceId ?? null);
          if (destParent === drag.id || (destParent !== null && wouldCreateCycle(drag.id, destParent))) {
            setDropTarget(null);
            return;
          }
        }
        setDropTarget({ kind: targetKind, id: targetId, intent });
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const drag = dragItemRef.current;
        const dt = dropTarget;
        dragItemRef.current = null;
        setDropTarget(null);
        if (!drag || !dt || dt.id !== targetId || dt.kind !== targetKind) return;
        applyDrop(drag, dt);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropTarget((prev) => (prev && prev.id === targetId && prev.kind === targetKind ? null : prev));
      },
    };
  }

  // Reordering only ever worked by hovering another row's own top/bottom
  // half — fine for the middle of the list, but there was no row "above
  // the first one" or "below the last one" to hover, so a dragged item
  // could never land in the very first or very last slot. These two zones
  // (the header, and a spacer filling the rest of the nav) fix that by
  // aiming the drop at the current first/last sibling at the root — of
  // either kind, since ordering is unified — which drives the exact same
  // reorder-before/after path as a normal row-to-row drag, so the blue
  // insertion line still shows on that row.
  function rootBoundaryDropProps(edge: "top" | "bottom") {
    function boundaryTarget(): DropTarget {
      const drag = dragItemRef.current;
      if (drag) {
        const siblings = getSiblings(null, drag.id);
        const boundary = edge === "top" ? siblings[0] : siblings[siblings.length - 1];
        if (boundary) {
          return { kind: boundary.kind, id: boundary.id, intent: { mode: "reorder", position: edge === "top" ? "before" : "after" } };
        }
      }
      return { kind: "root", id: `root-${edge}`, intent: { mode: "into", workspaceId: null } };
    }

    return {
      onDragOver: (e: React.DragEvent) => {
        if (!dragItemRef.current) return;
        e.preventDefault();
        setDropTarget(boundaryTarget());
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const drag = dragItemRef.current;
        dragItemRef.current = null;
        const dt = dropTarget;
        setDropTarget(null);
        if (!drag || !dt) return;
        applyDrop(drag, dt);
      },
      onDragLeave: (e: React.DragEvent) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDropTarget((prev) => (prev && (prev.kind === "root" || prev.id === boundaryTarget().id) ? null : prev));
      },
    };
  }

  // --- Rendering -------------------------------------------------------

  function renderPageRow(p: LibraryPageRecord, depth: number) {
    const href = `/library/${p.id}`;
    const active = activeHref === href;
    const dt = dropTarget?.kind === "page" && dropTarget.id === p.id ? dropTarget : null;
    const showBefore = dt?.intent.mode === "reorder" && dt.intent.position === "before";
    const showAfter = dt?.intent.mode === "reorder" && dt.intent.position === "after";
    const showInto = dt?.intent.mode === "into";

    return (
      <Link
        key={p.id}
        href={href}
        title={collapsed ? p.name : undefined}
        {...dragSourceProps("page", p.id)}
        {...dropTargetProps("page", p.id)}
        className={cn(
          "group relative flex items-center gap-3 rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-2" : "pr-3",
          active ? "bg-[var(--sidebar-active-bg)]" : "sidebar-link-hoverable",
          "cursor-grab active:cursor-grabbing",
          showInto && "ring-2 ring-white/70 bg-white/10"
        )}
        style={{
          color: active ? "#ffffff" : "var(--sidebar-text)",
          paddingLeft: collapsed ? undefined : 12 + depth * INDENT_PX,
        }}
      >
        {showBefore && <span className="drop-indicator-line" style={{ top: -3 }} />}
        {showAfter && <span className="drop-indicator-line" style={{ bottom: -3 }} />}
        <EmojiPickerButton
          emoji={p.emoji}
          fallbackIcon={<LibraryBig className="size-[18px] shrink-0" style={{ color: active ? "#ffffff" : "var(--sidebar-text-muted)" }} />}
          isCustom={!!p.emoji}
          label={p.name}
          onPick={(emoji) => setPageEmoji(p.id, emoji)}
        />
        {!collapsed && textVisible && (
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug" title={p.name}>
            {p.name}
          </span>
        )}
        {!collapsed && (
          <span className="flex shrink-0 items-center gap-0.5 self-start opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRenameTarget(p);
                setRenameValue(p.name);
              }}
              aria-label={`Rename ${p.name}`}
              className="rounded p-0.5 hover:bg-white/15"
            >
              <Pencil className="size-3" />
            </button>
            <button
              onClick={(e) => handleDeletePage(e, p.id)}
              aria-label={`Remove ${p.name}`}
              className="rounded p-0.5 hover:bg-white/15"
            >
              <X className="size-3" />
            </button>
          </span>
        )}
      </Link>
    );
  }

  function renderWorkspace(w: WorkspaceRecord, depth: number) {
    const isCollapsed = !!collapsedWorkspaces[w.id];
    const dt = dropTarget?.kind === "workspace" && dropTarget.id === w.id ? dropTarget : null;
    const showBefore = dt?.intent.mode === "reorder" && dt.intent.position === "before";
    const showAfter = dt?.intent.mode === "reorder" && dt.intent.position === "after";
    const showInto = dt?.intent.mode === "into";

    return (
      <div key={w.id}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggleWorkspaceCollapsed(w.id)}
          onKeyDown={(e) => e.key === "Enter" && toggleWorkspaceCollapsed(w.id)}
          title={collapsed ? w.name : undefined}
          {...dragSourceProps("workspace", w.id)}
          {...dropTargetProps("workspace", w.id)}
          className={cn(
            "group relative flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] py-2 text-xs font-semibold uppercase tracking-wide transition-colors sidebar-link-hoverable",
            collapsed ? "justify-center px-2" : "pr-3",
            showInto && "ring-2 ring-white/70 bg-white/10"
          )}
          style={{
            color: "var(--sidebar-text-muted)",
            paddingLeft: collapsed ? undefined : 12 + depth * INDENT_PX,
          }}
        >
          {showBefore && <span className="drop-indicator-line" style={{ top: -3 }} />}
          {showAfter && <span className="drop-indicator-line" style={{ bottom: -3 }} />}
          {!collapsed && (
            <ChevronDown
              className="size-3.5 shrink-0 transition-transform"
              style={{ transform: isCollapsed ? "rotate(-90deg)" : "none" }}
            />
          )}
          <EmojiPickerButton
            emoji={w.emoji}
            fallbackIcon={<Folder className="size-4 shrink-0" />}
            isCustom={!!w.emoji}
            label={w.name}
            onPick={(emoji) => setWorkspaceEmoji(w.id, emoji)}
          />
          {!collapsed && (
            <span className="min-w-0 flex-1 truncate normal-case tracking-normal" title={w.name}>
              {w.name}
            </span>
          )}
          {!collapsed && (
            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Add to ${w.name}`}
                    title="Add library page or sub-workspace"
                    className="rounded p-0.5 hover:bg-white/15"
                  >
                    <Plus className="size-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreatePage(w.id);
                    }}
                  >
                    <LibraryBig className="size-4" /> New library page
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateWorkspace(w.id);
                    }}
                  >
                    <FolderPlus className="size-4" /> New sub-workspace
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameWorkspaceTarget({ id: w.id, name: w.name });
                  setRenameWorkspaceValue(w.name);
                }}
                aria-label={`Rename ${w.name}`}
                className="rounded p-0.5 hover:bg-white/15"
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={(e) => handleDeleteWorkspace(e, w.id, w.name)}
                aria-label={`Remove ${w.name} workspace`}
                className="rounded p-0.5 hover:bg-white/15"
              >
                <X className="size-3" />
              </button>
            </span>
          )}
        </div>
        {!isCollapsed && renderContainer(w.id, depth + 1)}
      </div>
    );
  }

  function renderContainer(parentId: string | null, depth: number) {
    return (
      <>
        {getSiblings(parentId).map((s) =>
          s.kind === "workspace"
            ? renderWorkspace(workspaces.find((w) => w.id === s.id)!, depth)
            : renderPageRow(pages.find((p) => p.id === s.id)!, depth)
        )}
      </>
    );
  }

  return (
    <aside
      ref={asideRef}
      className={cn(
        "relative hidden h-screen flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out md:flex",
        collapsed ? "w-[92px]" : "w-64"
      )}
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      <button
        onClick={toggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="absolute -right-4 top-1/2 z-30 flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-transform hover:scale-105"
        style={{
          background: "var(--sidebar-bg)",
          borderColor: "var(--sidebar-border)",
          color: "var(--sidebar-text-muted)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        <ChevronLeft
          className="size-4"
          style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.2s ease-in-out" }}
        />
      </button>

      <Link
        href="/"
        className={cn(
          "flex items-center justify-center border-b transition-opacity hover:opacity-90",
          collapsed ? "h-20 px-4" : "h-28 px-4"
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        {collapsed ? (
          <Image
            src="/brand/coverking-favicon.png"
            alt="Coverking"
            width={512}
            height={512}
            className="size-11 rounded-[var(--radius-md)] object-contain"
            priority
          />
        ) : (
          <Image
            src="/brand/coverking-logo-blue.png"
            alt="Coverking"
            width={1915}
            height={525}
            className="h-auto w-full object-contain"
            priority
          />
        )}
        <span className="sr-only">Coverking Asset Library</span>
      </Link>

      <nav className="relative flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = activeHref === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "px-3",
                active ? "bg-[var(--sidebar-active-bg)]" : "sidebar-link-hoverable"
              )}
              style={{ color: active ? "#ffffff" : "var(--sidebar-text)" }}
            >
              <Icon
                className="size-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ color: active ? "#ffffff" : "var(--sidebar-text-muted)" }}
              />
              {!collapsed && <TextRoll className="sidebar-label-in">{item.label}</TextRoll>}
              {!collapsed && active && (
                <span className="ml-auto size-1.5 shrink-0 rounded-full bg-white" />
              )}
            </Link>
          );
        })}

        {!collapsed ? (
          <div
            className={cn(
              "relative mb-1 mt-4 flex items-center justify-between rounded-[var(--radius-md)] px-3 py-1",
              dropTarget?.kind === "root" && "ring-2 ring-white/70 bg-white/10"
            )}
            {...rootBoundaryDropProps("top")}
          >
            <p
              className="sidebar-label-in whitespace-nowrap text-xs font-semibold uppercase tracking-widest"
              style={{ color: "var(--sidebar-text-muted)" }}
            >
              My Library Pages
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Add library page or workspace"
                  title="Add library page or workspace"
                  className="rounded p-0.5 transition-colors hover:bg-white/15"
                  style={{ color: "var(--sidebar-text-muted)" }}
                >
                  <Plus className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openCreatePage(null)}>
                  <LibraryBig className="size-4" /> New library page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openCreateWorkspace(null)}>
                  <FolderPlus className="size-4" /> New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <button
            onClick={() => openCreatePage(null)}
            aria-label="Add library page"
            title="Add library page"
            className="sidebar-link-hoverable relative mb-1 mt-2 flex items-center justify-center rounded-[var(--radius-md)] py-2"
            style={{ color: "var(--sidebar-text-muted)" }}
          >
            <Plus className="size-4" />
          </button>
        )}

        {/* Workspaces — renamable, nestable folders that group Library
            Pages. Drag a page or workspace onto another to move it in;
            drag between rows to reorder. Collapsing a workspace just hides
            its contents here — nothing about the pages, tags, or images
            changes. */}
        {renderContainer(null, 0)}

        {/* Fills the rest of the nav so dropping anywhere below the last
            row — not just precisely on its bottom edge — still lands the
            dragged item at the very end of the list. */}
        <div className="min-h-8 flex-1" {...rootBoundaryDropProps("bottom")} />
      </nav>

      <div className="border-t p-3" style={{ borderColor: "var(--sidebar-border)" }}>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? (loggingOut ? "Signing out…" : "Sign out") : undefined}
          className={cn(
            "sidebar-signout flex w-full items-center gap-2.5 rounded-[var(--radius-md)] py-2 text-sm transition-all",
            collapsed ? "justify-center px-2" : "px-3"
          )}
          style={{ color: "var(--sidebar-text)" }}
        >
          <LogOut className="size-[15px] shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">{loggingOut ? "Signing out…" : "Sign out"}</span>}
        </button>
      </div>

      <Dialog open={createPageOpen} onOpenChange={setCreatePageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New library page</DialogTitle>
            <DialogDescription>
              Name it and it's ready — e.g. "Car Images Library". Tag any image with that same name from its tag
              editor to make it show up here.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="page-name">Page name</Label>
            <Input
              id="page-name"
              autoFocus
              placeholder="e.g. Hero Banner Image Library"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreatePage()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreatePageOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePage} disabled={creating || !newName.trim()}>
              {creating ? "Creating…" : "Create page"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename library page</DialogTitle>
            <DialogDescription>
              Renaming updates the tag too, so images already tagged for this page stay attached.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-page-name">Page name</Label>
            <Input
              id="rename-page-name"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenamePage()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenamePage} disabled={renaming || !renameValue.trim()}>
              {renaming ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createWorkspaceOpen} onOpenChange={setCreateWorkspaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workspace</DialogTitle>
            <DialogDescription>
              A workspace is a folder for library pages (and other workspaces) — name it, then drag any page or
              workspace onto it to move it in. Collapse it any time to hide its contents.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="workspace-name">Workspace name</Label>
            <Input
              id="workspace-name"
              autoFocus
              placeholder="e.g. Viper"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateWorkspaceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateWorkspace} disabled={creatingWorkspace || !newWorkspaceName.trim()}>
              {creatingWorkspace ? "Creating…" : "Create workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameWorkspaceTarget} onOpenChange={(open) => !open && setRenameWorkspaceTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename workspace</DialogTitle>
            <DialogDescription>Rename it whenever you like — its contents are untouched.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="rename-workspace-name">Workspace name</Label>
            <Input
              id="rename-workspace-name"
              autoFocus
              value={renameWorkspaceValue}
              onChange={(e) => setRenameWorkspaceValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRenameWorkspace()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameWorkspaceTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameWorkspace} disabled={renamingWorkspace || !renameWorkspaceValue.trim()}>
              {renamingWorkspace ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
