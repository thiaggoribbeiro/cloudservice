import { useEffect, useId, type ReactNode } from "react";
import { CloseIcon } from "./icons";

// Most dialogs (rename, move, confirm...) are a couple of form fields and
// should stay compact; a file preview needs to fill the screen on a large
// monitor instead of floating in a postage-stamp box, hence the size knob.
const MAX_WIDTH_BY_SIZE = {
  default: "max-w-lg",
  large: "max-w-[min(96vw,88rem)]",
};

export function Modal({
  title,
  onClose,
  children,
  size = "default",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "default" | "large";
}) {
  const titleId = useId();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="animate-fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-light-scrim/55 px-3 py-3 backdrop-blur-[1px] sm:px-4 sm:py-6 md:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`stagger-0 flex max-h-[calc(100vh-1.5rem)] w-full ${MAX_WIDTH_BY_SIZE[size]} flex-col overflow-hidden rounded-2xl border border-light-outline-variant bg-light-surface-container-lowest shadow-2xl sm:max-h-[calc(100vh-3rem)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-light-outline-variant px-6 py-4">
          <h2 id={titleId} className="min-w-0 truncate font-headline text-headline-sm text-light-on-surface">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn-icon -mr-2" aria-label="Fechar">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
