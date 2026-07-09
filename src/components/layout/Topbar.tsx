import type { Folder } from "../../types/domain";

export function Topbar({
  path,
  onNavigate,
  title,
  rootLabel = "Meus arquivos",
}: {
  path: Folder[];
  onNavigate: (path: Folder[]) => void;
  title?: string;
  rootLabel?: string;
}) {
  const heading = title ?? (path.length ? path[path.length - 1].name : rootLabel);

  return (
    <div className="border-b border-brand-border px-4 py-3 dark:border-white/10 sm:px-6 sm:py-4">
      <h2 className="truncate text-xl text-brand-black dark:text-white">{heading}</h2>

      {!title && (
        <nav className="mono-tag mt-1.5 flex min-w-0 items-center gap-1.5 overflow-x-auto text-[0.8rem]">
          <button
            type="button"
            onClick={() => onNavigate([])}
            className={`transition-colors hover:text-brand-primary ${
              path.length === 0 ? "font-bold text-brand-black dark:text-white" : "text-brand-gray"
            }`}
          >
            {rootLabel}
          </button>
          {path.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-1.5">
              <span className="text-brand-border dark:text-white/20">/</span>
              <button
                type="button"
                onClick={() => onNavigate(path.slice(0, index + 1))}
                className={`truncate transition-colors hover:text-brand-primary ${
                  index === path.length - 1 ? "font-bold text-brand-black dark:text-white" : "text-brand-gray"
                }`}
              >
                {folder.name}
              </button>
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}
