"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Compact top bar — sidebar takes over on md+ */}
        <header className="sticky top-0 z-30 grid grid-cols-3 items-center border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
          <Button variant="ghost" size="sm" onClick={() => setMobileSidebarOpen(true)} aria-label="Open menu" className="justify-self-start">
            <Menu className="size-5" />
          </Button>
          <Link href="/" className="flex items-center justify-center">
            <span
              className="flex h-9 w-28 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] p-1.5"
              style={{ background: "var(--accent)" }}
            >
              <Image
                src="/brand/coverking-logo-white.png"
                alt="Coverking"
                width={1915}
                height={525}
                className="h-full w-full object-contain"
              />
            </span>
            <span className="sr-only">Coverking Asset Library</span>
          </Link>
          <div className="flex items-center justify-end gap-1">
            <ThemeToggle className="size-8 opacity-70 hover:opacity-100" />
            <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}>
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
