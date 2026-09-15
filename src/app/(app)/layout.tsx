import { AppShell } from "@/components/app-shell";

/**
 * Shared shell for every authenticated page — the pinned sidebar +
 * independently-scrolling content pane lives here once, structurally, so
 * any page added under this group (now or later) gets it automatically
 * instead of relying on each page remembering to wrap itself in <AppShell>.
 * /login sits outside this group and is unaffected.
 */
export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
