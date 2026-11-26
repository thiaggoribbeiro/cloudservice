import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "avestacloud-theme";

// One module-level store so every consumer (sidebar logo, header toggle...)
// sees the same theme - a plain useState per component would drift apart.
function readInitialTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

let current: Theme = readInitialTheme();
const listeners = new Set<() => void>();
let transitionTimeout: ReturnType<typeof setTimeout> | undefined;

function apply(theme: Theme, animate: boolean) {
  const root = document.documentElement;
  if (animate) {
    // Design System Aptus §6.1: 200ms color crossfade, only on a user flip.
    root.classList.add("theme-transition");
    clearTimeout(transitionTimeout);
    transitionTimeout = setTimeout(() => root.classList.remove("theme-transition"), 250);
  }
  root.classList.toggle("dark", theme === "dark");
  root.setAttribute("data-theme", theme);
}

apply(current, false);

function setTheme(theme: Theme) {
  current = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  apply(theme, true);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current);

  function toggleTheme() {
    setTheme(theme === "light" ? "dark" : "light");
  }

  return { theme, toggleTheme };
}
