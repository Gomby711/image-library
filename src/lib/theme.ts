export type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    return (localStorage.getItem("ck-theme") as Theme) ?? "dark";
  } catch {
    return "dark";
  }
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}
