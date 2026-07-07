import type { Folder } from "../../types/domain";

export function Topbar({
  path,
  onNavigate,
  title,
  rootLabel = "Meu Drive",
}: {
  path: Folder[];
  onNavigate: (path: Folder[]) => void;
  title?: string;
  rootLabel?: string;
}) {
  return (
    <div className="flex items-center border-b border-brand-border px-6 py-4">
      {title ? (
        <h2 className="text-xl text-brand-black">{title}</h2>
      ) : (
        <nav className="mono-tag flex min-w-0 items-center gap-1.5 text-[0.8rem]">
          <button
            type="button"
            onClick={() => onNavigate([])}
            className={`transition-colors hover:text-brand-primary ${
              path.length === 0 ? "font-bold text-brand-black" : "text-brand-gray"
            }`}
          >
            {rootLabel}
          </button>
          {path.map((folder, index) => (
            <span key={folder.id} className="flex items-center gap-1.5">
              <span className="text-brand-border">/</span>
              <button
                type="button"
                onClick={() => onNavigate(path.slice(0, index + 1))}
                className={`truncate transition-colors hover:text-brand-primary ${
                  index === path.length - 1 ? "font-bold text-brand-black" : "text-brand-gray"
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
