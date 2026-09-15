"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ChevronLeft, Images, LibraryBig, LogOut, Pencil, Plus, X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLibraryPages } from "@/hooks/use-library-pages";
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
import type { LibraryPageRecord } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const NAV = [{ href: "/", label: "Library", icon: Images }];

/** TextRoll's per-letter layout doesn't support CSS text-overflow:ellipsis
 *  (that needs one plain text node), so custom page names — which can be
 *  arbitrarily long — are pre-truncated here instead of relying on CSS. */
function truncateLabel(name: string, max = 20): string {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<LibraryPageRecord | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [renaming, setRenaming] = React.useState(false);
  const navRef = React.useRef<HTMLElement>(null);
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<string, HTMLAnchorElement>>(new Map());

  const { pages, createPage, renamePage, deletePage, previewReorderPages, commitReorderPages } = useLibraryPages();
  const pageDragIndexRef = React.useRef<number | null>(null);

  function handlePageDragStart(index: number) {
    pageDragIndexRef.current = index;
  }

  function handlePageDragEnter(index: number) {
    const from = pageDragIndexRef.current;
    if (from === null || from === index) return;
    const ids = pages.map((p) => p.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(index, 0, moved);
    previewReorderPages(ids);
    pageDragIndexRef.current = index;
  }

  function handlePageDragEnd() {
    pageDragIndexRef.current = null;
    commitReorderPages(pages.map((p) => p.id));
  }

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem("luminary-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
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
    { dependencies: [activeHref, collapsed, pages.length], scope: navRef }
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
      setCreateOpen(false);
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

  return (
    <aside
      className={cn(
        "relative hidden h-screen flex-shrink-0 flex-col transition-[width] duration-200 ease-in-out md:flex",
        collapsed ? "w-[76px]" : "w-60"
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
          "flex h-16 items-center gap-2.5 border-b transition-opacity hover:opacity-80",
          collapsed ? "justify-center px-2" : "px-5"
        )}
        style={{ borderColor: "var(--sidebar-border)" }}
      >
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-md)]">
          <Image src="/brand/gallery-icon.png" alt="" width={32} height={32} className="size-full object-cover" />
        </span>
        {!collapsed && (
          <span className="sidebar-label-in whitespace-nowrap font-[var(--font-display)] text-lg font-semibold text-white">
            Asset Library
          </span>
        )}
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
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Add library page"
              title="Add library page"
              className="rounded p-0.5 transition-colors hover:bg-white/10"
              style={{ color: "var(--sidebar-text-muted)" }}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreateOpen(true)}
            aria-label="Add library page"
            title="Add library page"
            className="sidebar-link-hoverable relative mb-1 mt-2 flex items-center justify-center rounded-[var(--radius-md)] py-2"
            style={{ color: "var(--sidebar-text-muted)" }}
          >
            <Plus className="size-4" />
          </button>
        )}

        {pages.map((p, index) => {
          const href = `/library/${p.id}`;
          const active = activeHref === href;
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
                handlePageDragStart(index);
              }}
              onDragEnter={(e) => {
                e.preventDefault();
                handlePageDragEnter(index);
              }}
              onDragOver={(e) => e.preventDefault()}
              onDragEnd={handlePageDragEnd}
              className={cn(
                "group relative flex items-center gap-3 rounded-[var(--radius-md)] py-2.5 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "px-3",
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
                <TextRoll className="sidebar-label-in min-w-0 flex-1" title={p.name}>
                  {truncateLabel(p.name)}
                </TextRoll>
              )}
              {!collapsed && (
                <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
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
        })}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
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
    </aside>
  );
}
