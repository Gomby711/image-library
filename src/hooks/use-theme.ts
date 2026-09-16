"use client";

import * as React from "react";
import { type Theme, applyTheme, getStoredTheme } from "@/lib/theme";

export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>("dark");

  React.useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem("ck-theme", next);
    } catch {}
  }

  return { theme, toggle };
}
