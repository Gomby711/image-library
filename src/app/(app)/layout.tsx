import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { CovekingIntro } from "@/components/coverking-intro";

/**
 * Shared shell for every authenticated page — the pinned sidebar +
 * independently-scrolling content pane lives here once, structurally, so
 * any page added under this group (now or later) gets it automatically
 * instead of relying on each page remembering to wrap itself in <AppShell>.
 * /login sits outside this group and is unaffected.
 *
 * CovekingIntro is mounted here so it plays on every hard navigation into
 * the app (initial load, refresh, post-login redirect). Soft client-side
 * navigations within the group do not re-mount this layout, so the intro
 * doesn't replay on page-to-page links.
 */
export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <CovekingIntro />
      <AppShell>{children}</AppShell>
    </>
  );
}
