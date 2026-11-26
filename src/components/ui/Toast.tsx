import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircleIcon, ErrorIcon } from "./icons";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; message: string };

const AUTO_DISMISS_MS = 4000;

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-5 z-[100] flex flex-col items-end gap-2 sm:left-auto sm:right-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="animate-drawer-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl bg-light-inverse-surface px-4 py-3 font-body text-body-md text-light-inverse-on-surface shadow-lg"
          >
            {t.kind === "success" ? (
              <CheckCircleIcon className="h-5 w-5 text-light-inverse-primary" />
            ) : (
              <ErrorIcon className="h-5 w-5 text-light-inverse-primary" />
            )}
            <span className="min-w-0 pt-px">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
