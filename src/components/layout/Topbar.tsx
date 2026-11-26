import type { ReactNode } from "react";
import type { Folder } from "../../types/domain";
import { ChevronRightIcon } from "../ui/icons";

// Page header: breadcrumb (when browsing folders) over the page title, with
// an optional slot on the right for the page's own actions.
export function Topbar({
  path,
  onNavigate,
  title,
  subtitle,
  rootLabel = "Meus arquivos",
  actions,
}: {
  path: Folder[];
  onNavigate: (path: Folder[]) => void;
  title?: string;
  subtitle?: string;
  rootLabel?: string;
  actions?: ReactNode;
}) {
  const heading = title ?? (path.length ? path[path.length - 1].name : rootLabel);
  const showBreadcrumb = !title && path.length > 0;

  return (
    <div className="flex flex-wrap items-end justify-between gap-gutter-md px-4 pb-4 pt-5 sm:px-6 sm:pt-6">
      <div className="min-w-0">
        {showBreadcrumb && (
          <nav aria-label="Caminho" className="mb-1 flex min-w-0 items-center gap-0.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => onNavigate([])}
              className="shrink-0 rounded font-body text-body-sm text-light-on-surface-variant transition-colors duration-state-change hover:text-light-primary"
            >
              {rootLabel}
            </button>
            {path.slice(0, -1).map((folder, index) => (
              <span key={folder.id} className="flex shrink-0 items-center gap-0.5">
                <ChevronRightIcon className="h-4 w-4 text-light-outline" />
                <button
                  type="button"
                  onClick={() => onNavigate(path.slice(0, index + 1))}
                  className="max-w-[12rem] truncate rounded font-body text-body-sm text-light-on-surface-variant transition-colors duration-state-change hover:text-light-primary"
                >
                  {folder.name}
                </button>
              </span>
            ))}
            <ChevronRightIcon className="h-4 w-4 shrink-0 text-light-outline" />
          </nav>
        )}
        <h1 className="page-title truncate">{heading}</h1>
        {subtitle && <p className="mt-0.5 font-body text-body-sm text-light-on-surface-variant">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-gutter-sm">{actions}</div>}
    </div>
  );
}
