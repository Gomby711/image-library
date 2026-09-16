"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ChevronDown,
  ChevronLeft,
  Folder,
  FolderInput,
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
import type { LibraryPageRecord } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const NAV = [{ href: "/", label: "Library", icon: Images }];
const WORKSPACE_COLLAPSE_KEY = "luminary-sidebar-workspace-collapsed";

/** Splices a reordered subset of ids back into their original relative
 *  positions within the full list — lets drag-to-reorder stay scoped to one
 *  Workspace group (or the ungrouped root list) without disturbing where
 *  that group's pages sit among every other page. */
function reorderWithinGroup(allIds: string[], groupIds: string[], fromIndex: number, toIndex: number): string[] {
  const reorderedGroup = [...groupIds];
  const [moved] = reorderedGroup.splice(fromIndex, 1);
  reorderedGroup.splice(toIndex, 0, moved);
  const groupSet = new Set(groupIds);
  let gi = 0;
  return allIds.map((id) => (groupSet.has(id) ? reorderedGroup[gi++] : id));
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const [createPageOpen, setCreatePageOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<LibraryPageRecord | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");
  const [creatingWorkspace, setCreatingWorkspace] = React.useState(false);
  const [renameWorkspaceTarget, setRenameWorkspaceTarget] = React.useState<{ id: string; name: string } | null>(null);
  const [renameWorkspaceValue, setRenameWorkspaceValue] = React.useState("");
  const [renamingWorkspace, setRenamingWorkspace] = React.useState(false);

  const [collapsedWorkspaces, setCollapsedWorkspaces] = React.useState<Record<string, boolean>>({});

  const navRef = React.useRef<HTMLElement>(null);
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLAnchorElement>>(new Map());

  const {
    pages,
    createPage,
    renamePage,
    deletePage,
    setPageWorkspace,
    previewReorderPages,
    commitReorderPages,
  } = useLibraryPages();
  const { workspaces, createWorkspace, renameWorkspace, deleteWorkspace } = useWorkspaces();
  const pageDragIndexRef = React.useRef<number | null>(null);

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

  // A single highlight slides between nav items on route change / collapse,
  // instead of every link independently repainting its own background.
  useGSAP(
    () => {
      const el = activeHref && itemRefs.current.get(activeHref);
      const nav = navRef.current;
      const indicator = indicatorRef.current;
      if (!el || !nav || !indicator) {
        if (indicator) gsap.to(indicator, { opacity: 0, duration: 0.15 });
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      gsap.to(indicator, {
        top: elRect.top - navRect.top,
        height: elRect.height,
        opacity: 1,
        duration: 0.38,
        ease: "back.out(1.5)",
      });
    },
    { dependencies: [activeHref, collapsed, pages.length, collapsedWorkspaces], scope: navRef }
  );

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function handleCreatePage() {
    if (!newName.trim()) return;
    setCreating(true);
    // The page's tag is just its name — creating "Car Images Library" makes a
    // "Car Images Library" tag; tag any image with it to show it on this page.
    const page = await createPage(newName.trim(), newName.trim());
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

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return;
    setCreatingWorkspace(true);
    const workspace = await createWorkspace(newWorkspaceName.trim());
    setCreatingWorkspace(false);
    if (workspace) {
      setCreateWorkspaceOpen(false);
      setNewWorkspaceName("");
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
    if (!window.confirm(`Remove the "${name}" workspace? Its library pages move back to the top level — nothing is deleted.`)) return;
    await deleteWorkspace(id);
  }

  function renderPageRow(p: LibraryPageRecord, groupPages: LibraryPageRecord[], index: number, indent: boolean) {
    const href = `/library/${p.id}`;
    const active = activeHref === href;
    const groupIds = groupPages.map((gp) => gp.id);

    return (
      <Link
        key={p.id}
        href={href}
        ref={(el) => {
          if (el) itemRefs.current.set(href, el);
        }}
        title={collapsed ? p.name : undefined}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          pageDragIndexRef.current = index;
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          const from = pageDragIndexRef.current;
          if (from === null || from === index) return;
          previewReorderPages(reorderWithinGroup(pages.map((pg) => pg.id), groupIds, from, index));
          pageDragIndexRef.current = index;
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragEnd={() => {
          pageDragIndexRef.current = null;
          commitReorderPages(pages.map((pg) => pg.id));
        }}
        className={cn(
          "group relative flex items-center gap-3 rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-2" : indent ? "pl-7 pr-3" : "px-3",
          !active && "sidebar-link-hoverable",
          "cursor-grab active:cursor-grabbing"
        )}
        style={{ color: active ? "#ffffff" : "var(--sidebar-text)" }}
      >
        <LibraryBig
          className="size-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
          style={{ color: active ? "var(--accent)" : "var(--sidebar-text-muted)" }}
        />
        {!collapsed && (
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-snug" title={p.name}>
            {p.name}
          </span>
        )}
        {!collapsed && (
          <span className="flex shrink-0 items-center gap-0.5 self-start opacity-0 transition-opacity group-hover:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  aria-label={`Move ${p.name} to a workspace`}
                  title="Move to workspace"
                  className="rounded p-0.5 hover:bg-white/10"
                >
                  <FolderInput className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" onCloseAutoFocus={(e) => e.preventDefault()}>
                <DropdownMenuLabel>Move to workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    setPageWorkspace(p.id, null);
                  }}
                >
                  No workspace
                </DropdownMenuItem>
                {workspaces.map((w) => (
                  <DropdownMenuItem
                    key={w.id}
                    onClick={(e) => {
                      e.preventDefault();
                      setPageWorkspace(p.id, w.id);
                    }}
                  >
                    {w.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setRenameTarget(p);
                setRenameValue(p.name);
              }}
              aria-label={`Rename ${p.name}`}
              className="rounded p-0.5 hover:bg-white/10"
            >
              <Pencil className="size-3" />
            </button>
            <button
              onClick={(e) => handleDeletePage(e, p.id)}
              aria-label={`Remove ${p.name}`}
              className="rounded p-0.5 hover:bg-white/10"
            >
              <X className="size-3" />
            </button>
          </span>
        )}
      </Link>
    );
  }

  const rootPages = pages.filter((p) => !p.workspaceId);

  return (
    <aside
      className={cn(
        "relative hidden h-screen flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out md:flex",
        collapsed ? "w-[76px]" : "w-64"
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
          "flex h-16 items-center border-b transition-opacity hover:opacity-80",
          collapsed ? "justify-center px-2" : "px-5"
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-white",
            collapsed ? "h-8 w-11 p-1" : "h-9 w-full max-w-[176px] p-1.5"
          )}
        >
          <Image
            src="/brand/coverking-logo.webp"
            alt="Coverking"
            width={352}
            height={96}
            className="h-full w-full object-contain"
            priority
          />
        </span>
        {!collapsed && <span className="sr-only">Coverking Asset Library</span>}
      </Link>

      <nav ref={navRef} className="relative flex flex-1 flex-col gap-0.5 overflow-x-hidden overflow-y-auto px-3 py-4">
        <div
          ref={indicatorRef}
          className="pointer-events-none absolute left-3 right-3 rounded-[var(--radius-md)]"
          style={{ top: 0, height: 0, opacity: 0, background: "var(--sidebar-active-bg)" }}
        />

        {NAV.map((item) => {
          const active = activeHref === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              ref={(el) => {
                if (el) itemRefs.current.set(item.href, el);
              }}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "px-3",
                !active && "sidebar-link-hoverable"
              )}
              style={{ color: active ? "#ffffff" : "var(--sidebar-text)" }}
            >
              <Icon
                className="size-[18px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                style={{ color: active ? "var(--accent)" : "var(--sidebar-text-muted)" }}
              />
              {!collapsed && <TextRoll className="sidebar-label-in">{item.label}</TextRoll>}
              {!collapsed && active && (
                <span className="ml-auto size-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              )}
            </Link>
          );
        })}

        {!collapsed ? (
          <div className="relative mb-1 mt-4 flex items-center justify-between px-3">
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
                  className="rounded p-0.5 transition-colors hover:bg-white/10"
                  style={{ color: "var(--sidebar-text-muted)" }}
                >
                  <Plus className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreatePageOpen(true)}>
                  <LibraryBig className="size-4" /> New library page
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCreateWorkspaceOpen(true)}>
                  <FolderPlus className="size-4" /> New workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <button
            onClick={() => setCreatePageOpen(true)}
            aria-label="Add library page"
            title="Add library page"
            className="sidebar-link-hoverable relative mb-1 mt-2 flex items-center justify-center rounded-[var(--radius-md)] py-2"
            style={{ color: "var(--sidebar-text-muted)" }}
          >
            <Plus className="size-4" />
          </button>
        )}

        {/* Workspaces — renamable folders that group Library Pages. Collapsing
            one just hides its member pages here; nothing about the pages,
            their tags, or their images changes. */}
        {workspaces.map((w) => {
          const memberPages = pages.filter((p) => p.workspaceId === w.id);
          const isCollapsed = !!collapsedWorkspaces[w.id];
          return (
            <div key={w.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => toggleWorkspaceCollapsed(w.id)}
                onKeyDown={(e) => e.key === "Enter" && toggleWorkspaceCollapsed(w.id)}
                title={collapsed ? w.name : undefined}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] py-2 text-xs font-semibold uppercase tracking-wide transition-colors sidebar-link-hoverable",
                  collapsed ? "justify-center px-2" : "px-3"
                )}
                style={{ color: "var(--sidebar-text-muted)" }}
              >
                {!collapsed && (
                  <ChevronDown
                    className="size-3.5 shrink-0 transition-transform"
                    style={{ transform: isCollapsed ? "rotate(-90deg)" : "none" }}
                  />
                )}
                <Folder className="size-4 shrink-0" />
                {!collapsed && (
                  <span className="min-w-0 flex-1 truncate normal-case tracking-normal" title={w.name}>
                    {w.name}
                  </span>
                )}
                {!collapsed && (
                  <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameWorkspaceTarget({ id: w.id, name: w.name });
                        setRenameWorkspaceValue(w.name);
                      }}
                      aria-label={`Rename ${w.name}`}
                      className="rounded p-0.5 hover:bg-white/10"
                    >
                      <Pencil className="size-3" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteWorkspace(e, w.id, w.name)}
                      aria-label={`Remove ${w.name} workspace`}
                      className="rounded p-0.5 hover:bg-white/10"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
              </div>
              {!isCollapsed &&
                memberPages.map((p, index) => renderPageRow(p, memberPages, index, true))}
            </div>
          );
        })}

        {rootPages.map((p, index) => renderPageRow(p, rootPages, index, false))}
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
              A workspace is a folder for library pages — name it, then move any page into it from that page's
              row menu. Collapse it any time to hide its pages.
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
            <DialogDescription>Rename it whenever you like — the pages inside are untouched.</DialogDescription>
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
