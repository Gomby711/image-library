"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";
import { cn } from "@/lib/utils";

const NAV = [{ href: "/", label: "Library" }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Compact top bar — sidebar takes over on md+ */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/85 px-6 py-3.5 backdrop-blur md:hidden">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-24 items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-white p-1">
              <Image src="/brand/coverking-logo.webp" alt="Coverking" width={352} height={96} className="h-full w-full object-contain" />
            </span>
            <span className="sr-only">Coverking Asset Library</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                  pathname === item.href && "text-foreground"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="sm" onClick={handleLogout} disabled={loggingOut}>
            <LogOut className="size-4" />
          </Button>
        </header>

        <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
