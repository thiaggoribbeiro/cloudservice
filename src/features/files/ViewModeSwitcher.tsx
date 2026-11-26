import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "../../components/ui/icons";
import { VIEW_MODES, useViewMode } from "./viewMode";

export function ViewModeSwitcher() {
  const { viewMode, setViewMode } = useViewMode();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = VIEW_MODES.find((mode) => mode.id === viewMode) ?? VIEW_MODES[0];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Modo de exibição: ${active.label}`}
        className="btn-ghost"
      >
        <span className="ms-icon text-[18px]" aria-hidden="true">
          {active.glyph}
        </span>
        <span className="hidden sm:inline">{active.label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 text-light-on-surface-variant transition-transform duration-state-change ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div role="menu" aria-label="Modo de exibição" className="menu-surface absolute right-0 top-full z-30 mt-1.5 w-52">
          {VIEW_MODES.map((mode) => {
            const selected = mode.id === viewMode;
            return (
              <button
                key={mode.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setViewMode(mode.id);
                  setOpen(false);
                }}
                className={`menu-item ${selected ? "bg-light-secondary-container text-light-on-secondary-container hover:bg-light-secondary-container" : ""}`}
              >
                <span
                  className={`ms-icon text-[18px] ${selected ? "material-symbols-filled" : "text-light-on-surface-variant"}`}
                  aria-hidden="true"
                >
                  {mode.glyph}
                </span>
                <span className="flex-1">{mode.label}</span>
                {selected && (
                  <span className="ms-icon text-[18px]" aria-hidden="true">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
