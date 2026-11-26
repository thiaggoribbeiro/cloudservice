import { useSyncExternalStore } from "react";

export type ViewMode = "details" | "small" | "medium" | "large" | "photos";

export const VIEW_MODES: { id: ViewMode; label: string; glyph: string }[] = [
  { id: "details", label: "Detalhes", glyph: "table_rows" },
  { id: "small", label: "Ícones pequenos", glyph: "apps" },
  { id: "medium", label: "Ícones médios", glyph: "grid_view" },
  { id: "large", label: "Ícones grandes", glyph: "view_module" },
  { id: "photos", label: "Fotos", glyph: "photo_library" },
];

const STORAGE_KEY = "avestacloud-view-mode";

function readInitial(): ViewMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (VIEW_MODES.some((mode) => mode.id === stored)) return stored as ViewMode;
  } catch {
    // Storage blocked (private window etc.) - fall back to the default.
  }
  return "details";
}

// One app-wide preference: whichever mode the person picks follows them
// into every folder (Meus arquivos, repositórios, compartilhados...).
let current: ViewMode = readInitial();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useViewMode() {
  const viewMode = useSyncExternalStore(subscribe, () => current);

  function setViewMode(mode: ViewMode) {
    current = mode;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // Not persisted, but still applies for this session.
    }
    listeners.forEach((listener) => listener());
  }

  return { viewMode, setViewMode };
}
