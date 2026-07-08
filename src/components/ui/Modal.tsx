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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="stagger-0 w-full max-w-md rounded-xl border border-brand-border bg-white p-6 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-dark-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl text-brand-black dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-brand-gray transition-colors hover:bg-brand-pale/60 hover:text-brand-black dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
