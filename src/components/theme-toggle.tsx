"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={cn(
        "flex items-center justify-center rounded-[var(--radius-md)] transition-colors",
        className
      )}
      style={style}
    >
      {theme === "dark" ? <Sun className="size-[15px] shrink-0" /> : <Moon className="size-[15px] shrink-0" />}
    </button>
  );
}
