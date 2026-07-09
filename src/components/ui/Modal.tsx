import type { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 px-3 py-3 backdrop-blur-[2px] sm:px-4 sm:py-6 md:items-center"
      onClick={onClose}
    >
      <div
        className="stagger-0 flex max-h-[calc(100vh-1.5rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-brand-border bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface sm:max-h-[calc(100vh-3rem)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-brand-border px-5 py-4 dark:border-white/10 sm:px-6">
          <h2 className="min-w-0 truncate text-lg text-brand-black dark:text-white sm:text-xl">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-brand-gray transition-colors hover:bg-brand-pale/60 hover:text-brand-black dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 pb-5 pt-4 sm:px-6 sm:pb-6">{children}</div>
      </div>
    </div>
  );
}
