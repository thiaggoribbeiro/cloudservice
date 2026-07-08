import { useState } from "react";
import { useFolderChildren } from "./useFolderTree";
import type { Folder } from "../../types/domain";

function FolderTreeNode({
  folder,
  ancestors,
  currentFolderId,
  onNavigate,
}: {
  folder: Folder;
  ancestors: Folder[];
  currentFolderId: string | null;
  onNavigate: (path: Folder[]) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: children } = useFolderChildren(folder.id, undefined, expanded);
  const path = [...ancestors, folder];
  const isActive = currentFolderId === folder.id;

  return (
    <div>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-4 shrink-0 items-center justify-center text-brand-black/40 hover:text-brand-black dark:text-white/40 dark:hover:text-white"
          aria-label={expanded ? "Recolher" : "Expandir"}
        >
          <span
            className={`inline-block text-[10px] transition-transform duration-150 ${expanded ? "rotate-90" : "rotate-0"}`}
          >
            ▸
          </span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate(path)}
          className={`relative flex-1 truncate rounded-md py-1.5 pl-2 pr-2 text-left text-[0.85rem] transition-colors ${
            isActive
              ? "bg-white font-semibold text-brand-primary shadow-sm dark:bg-white/12 dark:text-white dark:shadow-none"
              : "text-brand-black/65 hover:bg-black/5 hover:text-brand-black dark:text-white/65 dark:hover:bg-white/10 dark:hover:text-white"
          }`}
        >
          {folder.name}
        </button>
      </div>
      {expanded && (
        <div className="ml-2 border-l border-black/10 pl-2 dark:border-white/15">
          {children?.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              ancestors={path}
              currentFolderId={currentFolderId}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FolderTree({
  ownerId,
  currentFolderId,
  onNavigate,
}: {
  ownerId: string;
  currentFolderId: string | null;
  onNavigate: (path: Folder[]) => void;
}) {
  const { data: rootFolders } = useFolderChildren(null, ownerId);

  return (
    <div className="flex flex-col gap-0.5">
      {rootFolders?.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          ancestors={[]}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
