import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { PageTransition } from "@/components/page-transition";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageTransition />
      <AppShell>{children}</AppShell>
    </>
  );
}
